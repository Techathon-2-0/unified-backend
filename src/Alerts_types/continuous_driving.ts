import { drizzle } from "drizzle-orm/mysql2";
import { eq , and, sql ,  gte} from "drizzle-orm";
// import { alarm } from "../db/schema";
import { gps_schema , alarm , entity , group , group_entity , alarm_alert , alarm_customer_group , alarm_email , alarm_geofence_group , alarm_group , alert , alert_shipment_relation , geofence_group_relation , geofence_table ,  stop , equipment} from "../db/schema";
import { sendAlertEmail } from "../services/email";

const db = drizzle(process.env.DATABASE_URL!);


export async function processContinuousDrivingAlerts() {
  try {
    // Get all continuous driving alarms
    const continuousDrivingAlarms = await db
      .select()
      .from(alarm)
      .where(
        and(
          eq(alarm.alarm_type_id , 3),
          eq(alarm.alarm_status, true)
        )
      );
    
    for (const alarmConfig of continuousDrivingAlarms) {
      // Get threshold in hours from alarm configuration
      const thresholdHours = alarmConfig.alarm_value;
      const thresholdMinutes = thresholdHours * 60;
      
      // Get vehicle groups associated with this alarm
      const vehicleGroups = await db
        .select({
          groupId: alarm_group.vehicle_group_id
        })
        .from(alarm_group)
        .where(eq(alarm_group.alarm_id, alarmConfig.id));
      
      // Get all vehicles in these groups
      const vehicleEntities = [];
      for (const group of vehicleGroups) {
        const entities = await db
          .select({
            entityId: group_entity.entity_id,
            vehicleNumber: entity.vehicleNumber
          })
          .from(group_entity)
          .innerJoin(entity, eq(group_entity.entity_id, entity.id))
          .where(eq(group_entity.group_id, group.groupId));
        
        vehicleEntities.push(...entities);
      }
      
      // Check driving patterns for each vehicle
      for (const vehicle of vehicleEntities) {
        // Get GPS data for the last few hours, ordered by timestamp
        const startTime = Math.floor(Date.now() / 1000) - (thresholdHours * 3600);
        const gpsData = await db
          .select()
          .from(gps_schema)
          .where(
            and(
              eq(gps_schema.trailerNumber, vehicle.vehicleNumber),
              gte(gps_schema.timestamp, startTime)
            )
          )
          .orderBy(gps_schema.timestamp);
        
        if (gpsData.length > 0) {
          // Find periods of continuous driving
          let drivingStartTime = null;
          let continuousDrivingMinutes = 0;
          let lastRestTime = null;
          
          for (let i = 0; i < gpsData.length; i++) {
            const currentGps = gpsData[i];
            const isMoving = (currentGps.speed ?? 0) > 3; // Speed greater than 3 km/h, treat null as 0
            
            if (isMoving) {
              if (drivingStartTime === null) {
                // Start of a new driving period
                drivingStartTime = currentGps.timestamp;
              }
              
              if (i < gpsData.length - 1) {
                // Calculate time gap to next record
                const nextGps = gpsData[i + 1];
                const timeDiffMinutes = getMinutesDifference(nextGps.timestamp ?? 0, currentGps.timestamp ?? 0);
                
                if (timeDiffMinutes > 15) {
                  // Gap in data, assume rest period
                  drivingStartTime = null;
                  lastRestTime = nextGps.timestamp;
                }
              }
            } else {
              // Vehicle is stopped
              if (drivingStartTime !== null) {
                // End of a driving period
                const stoppedTime = currentGps.timestamp;
                const drivingDurationMinutes = getMinutesDifference(stoppedTime ?? 0, drivingStartTime ?? 0);
                
                if (drivingDurationMinutes >= 15) {
                  // Add to continuous driving if stop is short
                  continuousDrivingMinutes += drivingDurationMinutes;
                }
                
                drivingStartTime = null;
              }
              
              // Check if this is a rest period (stopped for more than 30 minutes)
              if (i < gpsData.length - 1) {
                const nextGps = gpsData[i + 1];
                const stopDurationMinutes = getMinutesDifference(nextGps.timestamp ?? 0, currentGps.timestamp ?? 0);
                const restDurationMinutes = alarmConfig.rest_duration ?? 30; // Define rest period threshold, default to 30 if null
                if (restDurationMinutes !== null && restDurationMinutes !== undefined && stopDurationMinutes >= restDurationMinutes) {
                  continuousDrivingMinutes = 0;
                  lastRestTime = nextGps.timestamp;
                }
              }
            }
          }
          
          // If still driving at the end of data
          if (drivingStartTime !== null) {
            const currentTime = Math.floor(Date.now() / 1000);
            const finalDrivingMinutes = getMinutesDifference(currentTime, drivingStartTime ?? 0);
            continuousDrivingMinutes += finalDrivingMinutes;
          }
          
          // Check if continuous driving exceeds threshold
          if (continuousDrivingMinutes >= thresholdMinutes) {
            await createContinuousDrivingAlert(alarmConfig.id, vehicle.vehicleNumber, continuousDrivingMinutes, gpsData[gpsData.length - 1]);
          } else {
            await deactivateContinuousDrivingAlert(alarmConfig.id, vehicle.vehicleNumber);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing continuous driving alerts:", error);
    throw error;
  }
}

 // Helper function to create continuous driving alert
async function createContinuousDrivingAlert(alarmId: number, vehicleNumber: string, drivingMinutes: number, latestGpsData: any) {
  try {
    // Always create a new alert when continuous driving condition is met
    const [newAlert] = await db
      .insert(alert)
      .values({
        alert_type: alarmId,
        status: 1, // Active
        latitude: latestGpsData.latitude ?? 0,
        longitude: latestGpsData.longitude ?? 0
      })
      .$returningId();
    
    // Link alert to alarm
    await db
      .insert(alarm_alert)
      .values({
        alarm_id: alarmId,
        alert_id: newAlert.id
      });
    
    // If vehicle is linked to a shipment, link alert to shipment
    const vehicleShipment = await db
      .select({
        shipmentId: equipment.shipment_id
      })
      .from(equipment)
      .where(eq(equipment.equipment_id, vehicleNumber))
      .limit(1);
    
    if (vehicleShipment.length > 0 && vehicleShipment[0].shipmentId) {
      await db
        .insert(alert_shipment_relation)
        .values({
          alert_id: newAlert.id,
          shipment_id: String(vehicleShipment[0].shipmentId)
        });
    }
        try {
      const drivingHours = Math.floor(drivingMinutes / 60);
      const remainingMinutes = drivingMinutes % 60;
      const additionalInfo = `Continuous Driving Duration: ${drivingHours} hours ${remainingMinutes} minutes\nDriver needs rest break`;
      await sendAlertEmail(newAlert.id, vehicleNumber, additionalInfo);
    } catch (emailError) {
      console.error("❌ Failed to send alert email, but alert was created:", emailError);
      // Don't throw error as alert creation was successful
    }

  } catch (error) {
    console.error("Error creating continuous driving alert:", error);
    throw error;
  }
}

// Helper function to deactivate continuous driving alert
async function deactivateContinuousDrivingAlert(alarmId: number, vehicleNumber: string) {
  try {
    // Find active alert for this vehicle and alarm
    const activeAlert = await db
      .select({
        alertId: alert.id
      })
      .from(alert)
      .innerJoin(alarm_alert, eq(alert.id, alarm_alert.alert_id))
      .where(
        and(
          eq(alarm_alert.alarm_id, alarmId),
          eq(alert.status, 1) // Active alert
        )
      )
      .limit(1);
    
    if (activeAlert.length > 0) {
      // Deactivate the alert
      await db
        .update(alert)
        .set({
          status: 0, // Inactive
          updated_at: new Date()
        })
        .where(eq(alert.id, activeAlert[0].alertId));
    }
  } catch (error) {
    console.error("Error deactivating continuous driving alert:", error);
    throw error;
  }
}

function getMinutesDifference(timestamp1: number, timestamp2: number): number {
  return Math.abs(timestamp1 - timestamp2) / 60;
}