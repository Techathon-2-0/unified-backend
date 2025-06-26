import { drizzle } from "drizzle-orm/mysql2";
import { eq , and, sql ,  gte} from "drizzle-orm";
// import { alarm } from "../db/schema";
import { gps_schema , alarm , entity , group , group_entity , alarm_alert , alarm_customer_group , alarm_email , alarm_geofence_group , alarm_group , alert , alert_shipment_relation , geofence_group_relation , geofence_table ,  stop , equipment} from "../db/schema";
import { sendAlertEmail } from "../services/email";
const db = drizzle(process.env.DATABASE_URL!);


export async function processStoppageAlerts() {
  try {
    // Get all stoppage alarms
    const stoppageAlarms = await db
      .select()
      .from(alarm)
      .where(
        and(
          eq(alarm.alarm_type_id, 1),
          eq(alarm.alarm_status, true)
        )
      );
    
    for (const alarmConfig of stoppageAlarms) {
      // Get threshold in minutes from alarm configuration
      const thresholdMinutes = alarmConfig.alarm_value;
      
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
      
      // Check latest GPS data for each vehicle
      for (const vehicle of vehicleEntities) {
        // Get latest GPS data points to determine stoppage
        const gpsData = await db
          .select()
          .from(gps_schema)
          .where(eq(gps_schema.trailerNumber, vehicle.vehicleNumber))
          .orderBy(sql`${gps_schema.timestamp} DESC`)
          .limit(10);
        
        if (gpsData.length >= 2) {
          const latestGps = gpsData[0];
          const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
          
          // Check if vehicle is currently stopped (speed is 0 or very low)
          const isStopped = (latestGps.speed ?? 0) <= 3; // Speed less than 3 km/h
          
          if (isStopped) {
            // Find the last GPS record where the vehicle was moving
            let lastMovingIndex = -1;
            for (let i = 1; i < gpsData.length; i++) {
              if ((gpsData[i].speed ?? 0) > 3) {
                lastMovingIndex = i;
                break;
              }
            }
            
            if (lastMovingIndex !== -1) {
              const lastMovingTime = gpsData[lastMovingIndex].timestamp;
              const stoppageMinutes = getMinutesDifference(currentTime, lastMovingTime ?? 0);
              
              // Check if the stoppage duration exceeds the threshold
              if (stoppageMinutes >= thresholdMinutes) {
                // Check if the vehicle has moved significantly since stopping
                const epsilon = 50; // 50 meters threshold
                let hasMovedSignificantly = false;
                
                for (let i = 0; i < lastMovingIndex; i++) {
                  const distance = calculateDistance(
                    latestGps.latitude ?? 0,
                    latestGps.longitude ?? 0,
                    gpsData[i].latitude ?? 0,
                    gpsData[i].longitude ?? 0
                  );
                  
                  if (distance > epsilon) {
                    hasMovedSignificantly = true;
                    break;
                  }
                }
                
                if (!hasMovedSignificantly) {
                  // Vehicle has been stopped without significant movement
                  await createStoppageAlert(alarmConfig.id, vehicle.vehicleNumber, stoppageMinutes, latestGps);
                }
              }
            }
          } else {
            // Vehicle is moving, deactivate any existing stoppage alerts
            await deactivateStoppageAlert(alarmConfig.id, vehicle.vehicleNumber);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing stoppage alerts:", error);
    throw error;
  }
}

// Helper function to create stoppage alert
async function createStoppageAlert(alarmId: number, vehicleNumber: string, stoppageMinutes: number, latestGpsData: any) {
  try {
    // Always create a new alert when stoppage condition is met
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
      const additionalInfo = `Stoppage Duration: ${stoppageMinutes} minutes${latestGpsData.address ? `\nLocation: ${latestGpsData.address}` : ''}`;
      await sendAlertEmail(newAlert.id, vehicleNumber, additionalInfo);
    } catch (emailError) {
      console.error("❌ Failed to send alert email, but alert was created:", emailError);
      // Don't throw error as alert creation was successful
    }

  } catch (error) {
    console.error("Error creating stoppage alert:", error);
    throw error;
  }
}

// Helper function to deactivate stoppage alert
async function deactivateStoppageAlert(alarmId: number, vehicleNumber: string) {
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
    console.error("Error deactivating stoppage alert:", error);
    throw error;
  }
}

function getMinutesDifference(timestamp1: number, timestamp2: number): number {
  return Math.abs(timestamp1 - timestamp2) / 60;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}