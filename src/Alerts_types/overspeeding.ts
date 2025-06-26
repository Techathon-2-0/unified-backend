import { drizzle } from "drizzle-orm/mysql2";
import { eq , and, sql ,  } from "drizzle-orm";
// import { alarm } from "../db/schema";
import { gps_schema , alarm , entity , group , group_entity , alarm_alert , alarm_customer_group , alarm_email , alarm_geofence_group , alarm_group , alert , alert_shipment_relation , equipment } from "../db/schema";
import { sendAlertEmail } from "../services/email";
const db = drizzle(process.env.DATABASE_URL!);

export async function processOverspeedingAlerts() {
  try {
    // Get all overspeeding alarms
    const overspeedingAlarms = await db
      .select()
      .from(alarm)
      .where(
        and(
          eq(alarm.alarm_type_id, 2),
          eq(alarm.alarm_status, true)
        )
      );
    
    for (const alarmConfig of overspeedingAlarms) {
      // Get speed threshold from alarm configuration
      const speedThreshold = alarmConfig.alarm_value;
      
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
        // Get latest GPS data
        const latestGpsData = await db
          .select()
          .from(gps_schema)
          .where(eq(gps_schema.trailerNumber, vehicle.vehicleNumber))
          .orderBy(sql`${gps_schema.timestamp} DESC`)
          .limit(1);
        
        if (latestGpsData.length > 0) {
          const gpsData = latestGpsData[0];
          
          // Check if vehicle is overspeeding
          if (gpsData.speed !== null && gpsData.speed !== undefined && gpsData.speed > speedThreshold) {
            await createOverspeedingAlert(alarmConfig.id, vehicle.vehicleNumber, gpsData.speed, speedThreshold, gpsData.address ?? undefined, gpsData);
          } else {
            // Vehicle is not overspeeding, check if there's an active alert to deactivate
            await deactivateOverspeedingAlert(alarmConfig.id, vehicle.vehicleNumber);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing overspeeding alerts:", error);
    throw error;
  }
}

// Helper function to create overspeeding alert
async function createOverspeedingAlert(alarmId: number, vehicleNumber: string, currentSpeed: number, speedLimit: number, location: string | undefined, gpsData: any) {
  try {
    // Always create a new alert when overspeeding condition is met
    const [newAlert] = await db
      .insert(alert)
      .values({
        alert_type: alarmId,
        status: 1, // Active
        latitude: gpsData.latitude ?? 0,
        longitude: gpsData.longitude ?? 0
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
      const additionalInfo = `Current Speed: ${currentSpeed} km/h\nSpeed Limit: ${speedLimit} km/h${location ? `\nLocation: ${location}` : ''}`;
      await sendAlertEmail(newAlert.id, vehicleNumber, additionalInfo);
    } catch (emailError) {
      console.error("❌ Failed to send alert email, but alert was created:", emailError);
      // Don't throw error as alert creation was successful
    }

  } catch (error) {
    console.error("Error creating overspeeding alert:", error);
    throw error;
  }
}

// Helper function to deactivate overspeeding alert
async function deactivateOverspeedingAlert(alarmId: number, vehicleNumber: string) {
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
    console.error("Error deactivating overspeeding alert:", error);
    throw error;
  }
}