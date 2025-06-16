import { drizzle } from "drizzle-orm/mysql2";
import { eq , and, sql ,  } from "drizzle-orm";
// import { alarm } from "../db/schema";
import { gps_schema , alarm , entity , group , group_entity , alarm_alert , alarm_customer_group , alarm_email , alarm_geofence_group , alarm_group , alert , alert_shipment_relation , equipment } from "../db/schema";

const db = drizzle(process.env.DATABASE_URL!);

export async function processOverspeedingAlerts() {
  try {
    // Get all overspeeding alarms
    const overspeedingAlarms = await db
      .select()
      .from(alarm)
      .where(
        and(
          eq(alarm.alarm_category, "Overspeeding"),
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
            // Always create a new alert when overspeeding condition is met
            const [newAlert] = await db
              .insert(alert)
              .values({
                alert_type: alarmConfig.id,
                status: 1 // Active
              })
              .$returningId();
            
            // Link alert to alarm
            await db
              .insert(alarm_alert)
              .values({
                alarm_id: alarmConfig.id,
                alert_id: newAlert.id
              });
            
            // If vehicle is linked to a shipment, link alert to shipment
            const vehicleShipment = await db
              .select({
                shipmentId: equipment.shipment_id
              })
              .from(equipment)
              .where(eq(equipment.equipment_id, vehicle.vehicleNumber))
              .limit(1);
            
            if (vehicleShipment.length > 0 && vehicleShipment[0].shipmentId) {
              await db
                .insert(alert_shipment_relation)
                .values({
                  alert_id: newAlert.id,
                  shipment_id: vehicleShipment[0].shipmentId
                });
            }
            
            // Here you would add code to send SMS/email notifications
          } else {
            // Vehicle is not overspeeding, check if there's an active alert to deactivate
            const activeAlert = await db
              .select({
                alertId: alert.id
              })
              .from(alert)
              .innerJoin(alarm_alert, eq(alert.id, alarm_alert.alert_id))
              .where(
                and(
                  eq(alarm_alert.alarm_id, alarmConfig.id),
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
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing overspeeding alerts:", error);
    throw error;
  }
}