import { drizzle } from "drizzle-orm/mysql2";
import { eq , and, sql ,  } from "drizzle-orm";
// import { alarm } from "../db/schema";
import { gps_schema , alarm , entity , group , group_entity , alarm_alert , alarm_customer_group , alarm_email , alarm_geofence_group , alarm_group , alert , alert_shipment_relation , geofence_group_relation , geofence_table ,  stop , equipment} from "../db/schema";
import { sendAlertEmail } from "../services/email";

const db = drizzle(process.env.DATABASE_URL!);
// Process geofence alerts
export async function processGeofenceAlerts() {
  try {
    // Get all geofence alarms
    const geofenceAlarms = await db
      .select()
      .from(alarm)
      .where(
        and(
          eq(alarm.alarm_category, "Geofence"),
          eq(alarm.alarm_status, true)
        )
      );
    
    for (const alarmConfig of geofenceAlarms) {
      // Get geofence status from alarm configuration (1 for entry, 2 for exit)
      const geofenceStatus = alarmConfig.geofence_status;
      
      // Get vehicle groups associated with this alarm
      const vehicleGroups = await db
        .select({
          groupId: alarm_group.vehicle_group_id
        })
        .from(alarm_group)
        .where(eq(alarm_group.alarm_id, alarmConfig.id));
      
      // Get geofence groups associated with this alarm
      const geofenceGroups = await db
        .select({
          groupId: alarm_geofence_group.geofence_group_id
        })
        .from(alarm_geofence_group)
        .where(eq(alarm_geofence_group.alarm_id, alarmConfig.id));
      
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
      
      // Get all geofences in these groups
      const geofences = [];
      for (const group of geofenceGroups) {
        const fences = await db
          .select({
            id: geofence_table.id,
            name: geofence_table.geofence_name,
            latitude: geofence_table.latitude,
            longitude: geofence_table.longitude,
            radius: geofence_table.radius,
            type: geofence_table.geofence_type
          })
          .from(geofence_group_relation)
          .innerJoin(geofence_table, eq(geofence_group_relation.geofence_id, geofence_table.id))
          .where(
            and(
              eq(geofence_group_relation.group_id, group.groupId),
              eq(geofence_table.status, true) // Active geofences only
            )
          );
        
        geofences.push(...fences);
      }
      
      // Check each vehicle against each geofence
      for (const vehicle of vehicleEntities) {
        // Get latest 2 GPS data points to determine entry/exit
        const latestGpsData = await db
          .select()
          .from(gps_schema)
          .where(eq(gps_schema.trailerNumber, vehicle.vehicleNumber))
          .orderBy(sql`${gps_schema.timestamp} DESC`)
          .limit(2);
        
        if (latestGpsData.length >= 2) {
          const currentGps = latestGpsData[0];
          const previousGps = latestGpsData[1];
          
          for (const geofence of geofences) {
            // Check if vehicle is inside the geofence
            let isCurrentlyInside = false;
            let wasPreviouslyInside = false;
            
            if (geofence.type === 0) { // Circle type
              isCurrentlyInside = isPointInGeofenceCircle(
                currentGps.latitude ?? 0, 
                currentGps.longitude ?? 0,
                geofence.latitude ?? 0,
                geofence.longitude ?? 0,
                geofence.radius ?? 0
              );
              
              wasPreviouslyInside = isPointInGeofenceCircle(
                previousGps.latitude ?? 0,
                previousGps.longitude ?? 0,
                geofence.latitude ?? 0,
                geofence.longitude ?? 0,
                geofence.radius ?? 0
              );
            } else if (geofence.type === 1) { // Polygon type
              // Get polygon coordinates for this geofence
              const polygonCoords = await getGeofencePolygonCoordinates(geofence.id);
              
              if (polygonCoords.length > 0) {
                isCurrentlyInside = isPointInPolygonWindingNumber(
                  currentGps.latitude ?? 0,
                  currentGps.longitude ?? 0,
                  polygonCoords
                );
                
                wasPreviouslyInside = isPointInPolygonWindingNumber(
                  previousGps.latitude ?? 0,
                  previousGps.longitude ?? 0,
                  polygonCoords
                );
              }
            }
            
            // Handle different geofence status configurations
            if (geofenceStatus === 0 || geofenceStatus === 2) {
              // Entry alert is enabled (status 0 = entry only, status 2 = both)
              if (isCurrentlyInside && !wasPreviouslyInside) {
                // Vehicle has entered the geofence
                await createGeofenceAlert(alarmConfig.id, vehicle.vehicleNumber, geofence.id, "entry", currentGps);
                
                // Update stop entry time if this geofence is associated with a stop
                await updateStopEntryTime(geofence.id, vehicle.vehicleNumber);
              }
            }
            
            if (geofenceStatus === 1 || geofenceStatus === 2) {
              // Exit alert is enabled (status 1 = exit only, status 2 = both)
              if (!isCurrentlyInside && wasPreviouslyInside) {
                // Vehicle has exited the geofence
                await createGeofenceAlert(alarmConfig.id, vehicle.vehicleNumber, geofence.id, "exit", currentGps);
                
                // Update stop exit time if this geofence is associated with a stop
                await updateStopExitTime(geofence.id, vehicle.vehicleNumber);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing geofence alerts:", error);
    throw error;
  }
}

// Helper function to create geofence alert
export async function createGeofenceAlert(alarmId: number, vehicleNumber: string, geofenceId: number, eventType: "entry" | "exit", currentGpsData: any) {
  try {
    // Always create a new alert when geofence condition is met
    const [newAlert] = await db
      .insert(alert)
      .values({
        alert_type: alarmId,
        status: 1, // Active
        latitude: currentGpsData.latitude ?? 0,
        longitude: currentGpsData.longitude ?? 0
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

    // Get geofence details for location info
    const geofenceDetails = await db
      .select({
        geofence_name: geofence_table.geofence_name,
        address: geofence_table.address
      })
      .from(geofence_table)
      .where(eq(geofence_table.id, geofenceId))
      .limit(1);

    const location = geofenceDetails.length > 0 ? 
      `${geofenceDetails[0].geofence_name} - ${geofenceDetails[0].address}` : 
      'Unknown geofence location';
        try {
      const additionalInfo = `Event Type: ${eventType === 'entry' ? 'Geofence Entry' : 'Geofence Exit'}${location ? `\nLocation: ${location}` : ''}`;
      await sendAlertEmail(newAlert.id, vehicleNumber, additionalInfo);
    } catch (emailError) {
      console.error("❌ Failed to send alert email, but alert was created:", emailError);
      // Don't throw error as alert creation was successful
    }
  } catch (error) {
    console.error(`Error creating ${eventType} geofence alert:`, error);
    throw error;
  }
}

// Helper function to update stop entry time
async function updateStopEntryTime(geofenceId: number, vehicleNumber: string) {
  try {
    // Find geofence location_id
    const geofence = await db
      .select({
        locationId: geofence_table.location_id
      })
      .from(geofence_table)
      .where(eq(geofence_table.id, geofenceId))
      .limit(1);
    
    if (geofence.length > 0) {
      // Find equipment and its shipment
      const equipment_variable = await db
        .select({
          shipmentId: equipment.shipment_id
        })
        .from(equipment)
        .where(eq(equipment.equipment_id, vehicleNumber))
        .limit(1);
      
      if (equipment_variable.length > 0 && equipment_variable[0].shipmentId) {
        // Find stop with matching location_id and shipment_id
        const matchingStop = await db
          .select()
          .from(stop)
          .where(
            and(
              eq(stop.location_id, geofence[0].locationId),
              eq(stop.shipment_id, equipment_variable[0].shipmentId)
            )
          )
          .limit(1);
        
        if (matchingStop.length > 0) {
          // Update stop entry time
          const now = new Date().toISOString();
          await db
            .update(stop)
            .set({
              entry_time: now
            })
            .where(eq(stop.id, matchingStop[0].id));
        }
      }
    }
  } catch (error) {
    console.error("Error updating stop entry time:", error);
    throw error;
  }
}

// Helper function to update stop exit time
async function updateStopExitTime(geofenceId: number, vehicleNumber: string) {
  try {
    // Find geofence location_id
    const geofence = await db
      .select({
        locationId: geofence_table.location_id
      })
      .from(geofence_table)
      .where(eq(geofence_table.id, geofenceId))
      .limit(1);
    
    if (geofence.length > 0) {
      // Find equipment and its shipment
      const equipment_variable = await db
        .select({
          shipmentId: equipment.shipment_id
        })
        .from(equipment)
        .where(eq(equipment.equipment_id, vehicleNumber))
        .limit(1);
      
      if (equipment_variable.length > 0 && equipment_variable[0].shipmentId) {
        // Find stop with matching location_id and shipment_id
        const matchingStop = await db
          .select()
          .from(stop)
          .where(
            and(
              eq(stop.location_id, geofence[0].locationId),
              eq(stop.shipment_id, equipment_variable[0].shipmentId)
            )
          )
          .limit(1);
        
        if (matchingStop.length > 0) {
          // Update stop exit time
          const now = new Date().toISOString();
          await db
            .update(stop)
            .set({
              exit_time: now,
              // Calculate detention time if entry_time exists
              ...(matchingStop[0].entry_time ? { 
                detention_time: calculateDetentionTime(matchingStop[0].entry_time, now)
              } : {})
            })
            .where(eq(stop.id, matchingStop[0].id));
        }
      }
    }
  } catch (error) {
    console.error("Error updating stop exit time:", error);
    throw error;
  }
}

// Helper function to calculate detention time
function calculateDetentionTime(entryTime: string, exitTime: string): string {
  const entry = new Date(entryTime).getTime();
  const exit = new Date(exitTime).getTime();
  const differenceMs = exit - entry;
  
  // Format as HH:MM:SS
  const hours = Math.floor(differenceMs / (1000 * 60 * 60));
  const minutes = Math.floor((differenceMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((differenceMs % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}


// Utility: Calculate distance between two GPS coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // in meters
}

// Check if a point is inside a geofence circle
function isPointInGeofenceCircle(
  pointLat: number, 
  pointLng: number,
  geofenceLat: number,
  geofenceLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(pointLat, pointLng, geofenceLat, geofenceLng);
  return distance <= radiusMeters;
}

// Helper function to get polygon coordinates for a geofence
async function getGeofencePolygonCoordinates(geofenceId: number): Promise<Array<{lat: number, lng: number}>> {
  try {
    // Assuming you have a geofence_coordinates table that stores polygon points
    // You'll need to adjust this based on your actual schema
    const coordinates = await db
      .select({
        latitude: sql<number>`latitude`,
        longitude: sql<number>`longitude`,
        sequence: sql<number>`sequence`
      })
      .from(sql`geofence_coordinates`) // Replace with your actual table name
      .where(sql`geofence_id = ${geofenceId}`)
      .orderBy(sql`sequence ASC`);
    
    return coordinates.map(coord => ({
      lat: coord.latitude,
      lng: coord.longitude
    }));
  } catch (error) {
    console.error("Error fetching geofence polygon coordinates:", error);
    return [];
  }
}

// Alternative point-in-polygon algorithm using winding number (more accurate for complex polygons)
function isPointInPolygonWindingNumber(pointLat: number, pointLng: number, polygon: Array<{lat: number, lng: number}>): boolean {
  if (polygon.length < 3) return false;
  
  let windingNumber = 0;
  
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const pi = polygon[i];
    const pj = polygon[j];
    
    if (pi.lng <= pointLng) {
      if (pj.lng > pointLng) { // Upward crossing
        if (isLeft(pi.lat, pi.lng, pj.lat, pj.lng, pointLat, pointLng) > 0) {
          windingNumber++;
        }
      }
    } else {
      if (pj.lng <= pointLng) { // Downward crossing
        if (isLeft(pi.lat, pi.lng, pj.lat, pj.lng, pointLat, pointLng) < 0) {
          windingNumber--;
        }
      }
    }
  }
  
  return windingNumber !== 0;
}

// Helper function for winding number algorithm
function isLeft(p0Lat: number, p0Lng: number, p1Lat: number, p1Lng: number, p2Lat: number, p2Lng: number): number {
  return ((p1Lat - p0Lat) * (p2Lng - p0Lng) - (p2Lat - p0Lat) * (p1Lng - p0Lng));
}