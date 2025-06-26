import { eq, and, sql, inArray } from 'drizzle-orm';
import { 
  alarm,
  alert,
  alarm_alert,
  stop,
  shipment,
  entity,
  alarm_group,
  group_entity,
  alarm_email,
  alarm_phoneNumber,
  geofence_table,
  alert_shipment_relation , 
  equipment , 

} from '../db/schema';
import { gps_schema } from '../db/schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { sendAlertEmail } from '../services/email';

const db = drizzle(process.env.DATABASE_URL!);

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */

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

export async function processReachedStopAlerts() {
  try {
    // Get all active ReachedStop alarms
    const reachedStopAlarms = await db
      .select()
      .from(alarm)
      .where(
        and(
          eq(alarm.alarm_type_id, 5),
          eq(alarm.alarm_status, true)
        )
      );

    if (reachedStopAlarms.length === 0) {
      return { success: true, message: "No ReachedStop alarms configured" };
    }
    
    for (const alarmConfig of reachedStopAlarms) {
      // Get vehicle groups associated with this alarm
      const vehicleGroups = await db
        .select({
          groupId: alarm_group.vehicle_group_id
        })
        .from(alarm_group)
        .where(eq(alarm_group.alarm_id, alarmConfig.id));

      if (vehicleGroups.length === 0) continue;
      
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

      if (vehicleEntities.length === 0) continue;
      
      // For each vehicle, check if it has reached any stops
      for (const vehicle of vehicleEntities) {
        // Get the latest GPS data for this vehicle
        const latestGpsData = await db
          .select()
          .from(gps_schema)
          .where(eq(gps_schema.trailerNumber, vehicle.vehicleNumber))
          .orderBy(sql`${gps_schema.timestamp} DESC`)
          .limit(1);
        
        if (latestGpsData.length === 0) continue;
        
        const gpsData = latestGpsData[0];
        
        // Find shipments associated with this vehicle
        const vehicleShipments = await db
          .select({
            shipmentId: shipment.id
          })
          .from(shipment)
          .innerJoin(
            equipment, 
            eq(equipment.shipment_id, shipment.id)
          )
          .where(eq(equipment.equipment_id, vehicle.vehicleNumber));

        if (vehicleShipments.length === 0) continue;
        
        // For each shipment, check if the vehicle has reached any stops
        for (const vehicleShipment of vehicleShipments) {
          // Get all stops for this shipment
          const shipmentStops = await db
            .select()
            .from(stop)
            .where(eq(stop.shipment_id, vehicleShipment.shipmentId));
          
          if (shipmentStops.length === 0) continue;
          
          // Check each stop to see if the vehicle has reached it
          for (const currentStop of shipmentStops) {
            // Skip stops that already have an entry time (already reached)
            if (currentStop.entry_time) continue;
            
            // Calculate distance between vehicle and stop
            const distance = calculateDistance(
              gpsData.latitude || 0, 
              gpsData.longitude || 0,
              currentStop.latitude || 0, 
              currentStop.longitude || 0
            );
            
            // Check if vehicle is within the geofence radius
            const radius = currentStop.geo_fence_radius || 100; // default 100m
            
            if (distance <= radius) {
              // Check if there's already an alert for this stop and vehicle
              const existingAlert = await db
                .select()
                .from(alert)
                .innerJoin(alarm_alert, eq(alert.id, alarm_alert.alert_id))
                .innerJoin(alert_shipment_relation, eq(alert.id, alert_shipment_relation.alert_id))
                .where(
                  and(
                    eq(alarm_alert.alarm_id, alarmConfig.id),
                    eq(alert_shipment_relation.shipment_id, String(vehicleShipment.shipmentId))
                  )
                )
                .limit(1);
              
              // If no alert exists, create a new one
              // if (existingAlert.length === 0) {
                // Insert new alert
                const insertResult = await db
                .insert(alert)
                .values({
                    alert_type: alarmConfig.id,
                    status: 0, // Immediately set to inactive
                    latitude: gpsData.latitude ?? 0,
                    longitude: gpsData.longitude ?? 0
                })
                .$returningId();

                // The insertResult will contain the inserted ID
                const newAlertId = insertResult[0].id;

                // Then use newAlertId in the subsequent operations:
                // Link alert to alarm
                await db
                .insert(alarm_alert)
                .values({
                    alarm_id: alarmConfig.id,
                    alert_id: newAlertId
                });

                // Link alert to shipment
                await db
                .insert(alert_shipment_relation)
                .values({
                    alert_id: newAlertId,
                    shipment_id: String(vehicleShipment.shipmentId),
                    alert_method: 1 // Default alert method
                });
                
                // Update stop with entry time
                await db
                  .update(stop)
                  .set({
                    entry_time: new Date().toISOString(),
                    updated_at: new Date()
                  })
                  .where(eq(stop.id, currentStop.id));
                
                                try {
                  const additionalInfo = `Stop Details: ${currentStop.stop_name || 'Unnamed Stop'}\nDistance from stop: ${Math.round(distance)} meters\:`
                  await sendAlertEmail(newAlertId, vehicle.vehicleNumber, additionalInfo);
                } catch (emailError) {
                  console.error("❌ Failed to send alert email, but alert was created:", emailError);
                  // Don't throw error as alert creation was successful
                }
              }
            }
          }
        }
      }
    // }
    
    return { success: true, message: "Reached stop alerts processed successfully" };
  } catch (error) {
    console.error("Error processing reached stop alerts:", error);
    throw error;
  }
}

// Export a function to manually trigger the alert processing
export async function triggerReachedStopAlertProcessing() {
  return processReachedStopAlerts();
}