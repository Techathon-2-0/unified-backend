import { drizzle } from "drizzle-orm/mysql2";
import { eq , and, sql ,  gte} from "drizzle-orm";
// import { alarm } from "../db/schema";
import { gps_schema , alarm , entity , group , group_entity , alarm_alert , alarm_customer_group , alarm_email , alarm_geofence_group , alarm_group , alert , alert_shipment_relation , geofence_group_relation , geofence_table ,  stop , equipment} from "../db/schema";
import { sendAlertEmail } from "../services/email";

const db = drizzle(process.env.DATABASE_URL!);

export async function processNoGPSFeedAlerts() {
  try {
    // Get all no GPS feed alarms
    const noGpsAlarms = await db
      .select()
      .from(alarm)
      .where(
        and(
          eq(alarm.alarm_type_id, 4), 
          eq(alarm.alarm_status, true)
        )
      );
    
    for (const alarmConfig of noGpsAlarms) {
      // Get threshold in minutes from alarm configuration
      const thresholdMinutes = 180; // Default threshold, can be fetched from alarmConfig if needed
      
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
      
      // Check GPS feed for each vehicle
      for (const vehicle of vehicleEntities) {
        // Get latest GPS data
        const latestGps = await db
          .select()
          .from(gps_schema)
          .where(eq(gps_schema.trailerNumber, vehicle.vehicleNumber))
          .orderBy(sql`${gps_schema.timestamp} DESC`)
          .limit(1);
        
        if (latestGps.length > 0) {
          const lastUpdateTime = latestGps[0].timestamp;
          const currentTime = Math.floor(Date.now() / 1000);
          if (lastUpdateTime !== null && lastUpdateTime !== undefined) {
            const timeSinceLastUpdateMinutes = getMinutesDifference(currentTime, lastUpdateTime);
            
            // Check if time since last update exceeds threshold
            if (timeSinceLastUpdateMinutes >= thresholdMinutes) {
              await createNoGPSFeedAlert(alarmConfig.id, vehicle.vehicleNumber, timeSinceLastUpdateMinutes, latestGps[0]);
            } else {
              await deactivateNoGPSFeedAlert(alarmConfig.id, vehicle.vehicleNumber);
            }
          } else {
            // No valid timestamp, treat as no GPS data
            await createNoGPSFeedAlert(alarmConfig.id, vehicle.vehicleNumber, thresholdMinutes, latestGps[0]);
          }
        } else {
          // No GPS data at all for this vehicle - use default coordinates
          await createNoGPSFeedAlert(alarmConfig.id, vehicle.vehicleNumber, thresholdMinutes, null);
        }
      }
    }
  } catch (error) {
    console.error("Error processing no GPS feed alerts:", error);
    throw error;
  }
}

// Helper function to create no GPS feed alert
async function createNoGPSFeedAlert(alarmId: number, vehicleNumber: string, timeWithoutUpdateMinutes: number, latestGpsData: any) {
  try {
      // Insert new alert
      const [newAlert] = await db
        .insert(alert)
        .values({
          alert_type: alarmId,
          status: 1, // Active
          latitude: latestGpsData?.latitude ?? 0,
          longitude: latestGpsData?.longitude ?? 0
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
        const hoursWithoutUpdate = Math.floor(timeWithoutUpdateMinutes / 60);
        const remainingMinutes = Math.floor(timeWithoutUpdateMinutes % 60);
        const additionalInfo = `GPS Signal Lost Duration: ${hoursWithoutUpdate} hours ${remainingMinutes} minutes\nLast GPS update: ${hoursWithoutUpdate > 0 ? `${hoursWithoutUpdate}h ${remainingMinutes}m` : `${Math.floor(timeWithoutUpdateMinutes)}m`} ago`;
        await sendAlertEmail(newAlert.id, vehicleNumber, additionalInfo);
      } catch (emailError) {
        console.error("❌ Failed to send alert email, but alert was created:", emailError);
        // Don't throw error as alert creation was successful
      }
  } catch (error) {
    console.error("Error creating no GPS feed alert:", error);
    throw error;
  }
}

// Helper function to deactivate no GPS feed alert
async function deactivateNoGPSFeedAlert(alarmId: number, vehicleNumber: string) {
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
    console.error("Error deactivating no GPS feed alert:", error);
    throw error;
  }
}

function getMinutesDifference(timestamp1: number, timestamp2: number): number {
  return Math.abs(timestamp1 - timestamp2) / 60;
}