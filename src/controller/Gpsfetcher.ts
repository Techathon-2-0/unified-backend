import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import { transmission_header, shipment, equipment, stop, customer_lr_detail, gps_schema, vendor, entity, gps_details } from '../db/schema';
import { eq, inArray, and, desc } from "drizzle-orm";
import axios from "axios";

const db = drizzle(process.env.DATABASE_URL!);

// Store last En-Route notification timestamps per vehicle
const lastEnRouteNotification = new Map<string, number>();

// Helper: Haversine distance in meters
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper: Check if vehicle should send En-Route notification
function shouldSendEnRouteNotification(trailerNumber: string, gpsFrequency: number): boolean {
  const now = Date.now();
  const lastNotification = lastEnRouteNotification.get(trailerNumber) || 0;
  const intervalMs = (gpsFrequency / 100) * 1000; // Convert frequency to milliseconds (e.g., 3600 -> 36 seconds)
  
  return (now - lastNotification) >= intervalMs;
}

// Helper: Send En-Route notification
async function sendEnRouteNotification(vehicleData: any, activeShipment: any) {


  const domainName = activeShipment.domain_name || 'MM/ASOBEXE';

  const xmlData = `<TransmissionDetails>
    <Shipment>
      <Domain_Name>MM/ASOBEXE</Domain_Name>
      <Equipment>
        <Equipment_Id>${vehicleData.trailerNumber}</Equipment_Id>
      </Equipment>
      <Events>
        <Event>
          <EventCode>En-Route</EventCode>
          <EventDateTime>${new Date().toISOString()}</EventDateTime>
        </Event>
      </Events>
      <GPSDetails>
        <GPSUnitID>${vehicleData.GPSVendor}</GPSUnitID>
        <GPSVendor>${vehicleData.GPSVendor}</GPSVendor>
      </GPSDetails>
      <Shipment_Id>${activeShipment.shipment_id}</Shipment_Id>
      <Stops>
        <Stop>
          <Latitude>${vehicleData.latitude}</Latitude>
          <Longitude>${vehicleData.longitude}</Longitude>
        </Stop>
      </Stops>
    </Shipment>
  </TransmissionDetails>`;

  try {
    await axios.post(
      process.env.ENTER_API_URL!,
      xmlData,
      {
        headers: {
          'X-ShipX-API-Key': process.env.ENTER_API_KEY!,
          'Content-Type': 'application/xml',
          'Cookie': process.env.ENTER_API_COOKIE!
        }
      }
    );
    
    // Update last notification timestamp
    lastEnRouteNotification.set(vehicleData.trailerNumber, Date.now());
    console.log('🚛 En-Route notification sent for vehicle:', vehicleData.trailerNumber);
  } catch (err: any) {
    console.error('❌ Failed to send En-Route notification:', (err && err.response && err.response.data) || err?.message || err);
  }
}

export async function insertGpsData(d: any) {
  try {
    //console.log('Received GPS data:', d);
    // 1. Flatten data
    // const data = JSON.parse(d.toString())
    // const flatData = data.flat();
    
    // if (flatData.length === 0) {
    //   console.log('⚠️ No GPS data to insert.');
    //   return;
    // }
    // return d;
    // console.log("kuch kuch:",d.GPSData);
  const flatData = Array.isArray(d) ? d : [d];
  //console.log('Flattened GPS data:', flatData.length);

  if (flatData.length === 0) {
    console.log('⚠️ No GPS data to insert.');
    return;
  }

  const trailerNumbers = [...new Set(flatData.map((v: any) => v.trailerNumber as string))];
  const gpsVendors = [...new Set(flatData.map((v: any) => v.GPSVendor))];

  //console.log(`Processing ${flatData.length} GPS records for ${trailerNumbers.length} trailers and ${gpsVendors.length} vendors.`);

    // 3. Bulk fetch entities and vendors
    const [entities, vendors, equipments] = await Promise.all([
      db.select().from(entity).where(inArray(entity.vehicleNumber, trailerNumbers as string[])),
      db.select().from(vendor).where(inArray(vendor.name, gpsVendors as string[])),
      db.select().from(equipment).where(inArray(equipment.equipment_id, trailerNumbers as string[])),
    ]);

    // 4. Build lookup maps
    const entityMap = new Map(entities.map(e => [e.vehicleNumber, e]));
    const vendorMap = new Map(vendors.map(v => [v.name, v]));
    const equipmentMap = new Map(equipments.map(e => [e.equipment_id, e]));

    // 5. Prepare valid GPS data and process geofence logic
    const gpsRecordsToInsert = [];

    for (const v of flatData) {
      const entity = entityMap.get(v.trailerNumber);
      const vendor = vendorMap.get(v.GPSVendor);
      const equip = equipmentMap.get(v.trailerNumber);
      
      if (!entity || vendor?.status === false) {
        continue; // skip invalid
      }

      //console.log(`Processing GPS data for trailer: ${v.trailerNumber}, Vendor: ${v.GPSVendor}`);

      gpsRecordsToInsert.push({
        trailerNumber: v.trailerNumber,
        timestamp: max(v.gpstimestamp,v.gprstimestamp),
        gpstimestamp: v.timestamp,
        gprstimestamp: v.gprstimestamp,
        longitude: v.longitude,
        latitude: v.latitude,
        heading: v.heading,
        speed: v.speed,
        numberOfSatellites: v.numberOfSatellites,
        digitalInput1: v.digitalInput1,
        internalBatteryLevel: v.internalBatteryLevel,
        GPSVendor: v.GPSVendor,
      });



      if (equip?.shipment_id) {
        const [activeShipment] = await db
          .select()
          .from(shipment)
          .where(
            and(
              eq(shipment.status, 'Active'),
              eq(shipment.shipment_id, String(equip.shipment_id))
            )
          )
          .limit(1);

        if (!activeShipment) continue;

        // Get GPS frequency for this shipment
        const [gpsDetail] = await db
          .select()
          .from(gps_details)
          .where(eq(gps_details.shipment_id, activeShipment.id))
          .limit(1);

        const gpsFrequency = gpsDetail?.gps_frequency || 3600; // Default frequency

        // 2. Fetch stops for this active shipment
        const stops = await db.select().from(stop).where(eq(stop.shipment_id, activeShipment.id));

        // 3. Find the current max actual_sequence for this shipment's stops
        const maxActualSeq = stops.reduce((max, st) => Math.max(max, st.actual_sequence || 0), 0);

        let isInsideAnyGeofence = false;

        for (const st of stops) {
          if (st.latitude && st.longitude && st.geo_fence_radius) {
            const dist = haversine(
              Number(v.latitude),
              Number(v.longitude),
              Number(st.latitude),
              Number(st.longitude)
            );
            const inside = dist <= Number(st.geo_fence_radius);

            if (inside) {
              isInsideAnyGeofence = true;
            }

            // Fetch last GPS for this stop to determine previous state
            const lastGps = await db
              .select()
              .from(gps_schema)
              .where(eq(gps_schema.trailerNumber, v.trailerNumber))
              .orderBy(desc(gps_schema.timestamp))
              .limit(1);

            let wasInside = false;
            if (lastGps.length && st.latitude && st.longitude && st.geo_fence_radius) {
              const lastDist = haversine(
                Number(lastGps[0].latitude),
                Number(lastGps[0].longitude),
                Number(st.latitude),
                Number(st.longitude)
              );
              wasInside = lastDist <= Number(st.geo_fence_radius);
            }

            // Enter event: was outside, now inside
            if (!wasInside && inside) {
              await db.update(stop)
                .set({
                  entry_time: new Date().toISOString(),
                  actual_sequence: st.actual_sequence || maxActualSeq + 1
                })
                .where(eq(stop.id, st.id));

              const domainName = activeShipment.domain_name;

              const xmlData = `<TransmissionDetails>
                <Shipment>
                  <Domain_Name>${domainName}</Domain_Name>
                  <Equipment>
                    <Equipment_Id>${v.trailerNumber}</Equipment_Id>
                  </Equipment>
                  <Events>
                    <Event>
                      <EventCode>Vehicle Reached</EventCode>
                      <EventDateTime>${new Date().toISOString()}</EventDateTime>
                    </Event>
                  </Events>
                  <GPSDetails>
                    <GPSUnitID>${v.GPSVendor}</GPSUnitID>
                    <GPSVendor>${v.GPSVendor}</GPSVendor>
                  </GPSDetails>
                  <Shipment_Id>${activeShipment.shipment_id}</Shipment_Id>
                  <Stops>
                    <Stop>
                      <Latitude>${v.latitude}</Latitude>
                      <Location_Id>${st.location_id || st.id}</Location_Id>
                      <Longitude>${v.longitude}</Longitude>
                    </Stop>
                  </Stops>
                </Shipment>
              </TransmissionDetails>`;

              try {
                await axios.post(
                  process.env.ENTER_API_URL!,
                  xmlData,
                  {
                    headers: {
                      'X-ShipX-API-Key': process.env.ENTER_API_KEY!,
                      'Content-Type': 'application/xml',
                      'Cookie': process.env.ENTER_API_COOKIE!
                    }
                  }
                );
                console.log('🚚 Vehicle entered geofence, external API notified.');
              } catch (err: any) {
                console.error('❌ Failed to notify external API:', (err && err.response && err.response.data) || err?.message || err);
              }
            }
            // Exit event: was inside, now outside
            else if (wasInside && !inside) {
              await db.update(stop)
                .set({
                  exit_time: new Date().toISOString()
                })
                .where(eq(stop.id, st.id));

              const domainName = activeShipment.domain_name || 'MM/ASOBEXE';

              const xmlData = `<TransmissionDetails>
                <Shipment>
                  <Domain_Name>${domainName}</Domain_Name>
                  <Equipment>
                    <Equipment_Id>${v.trailerNumber}</Equipment_Id>
                  </Equipment>
                  <Events>
                    <Event>
                      <EventCode>Vehicle Exited</EventCode>
                      <EventDateTime>${new Date().toISOString()}</EventDateTime>
                    </Event>
                  </Events>
                  <GPSDetails>
                    <GPSUnitID>${v.GPSVendor}</GPSUnitID>
                    <GPSVendor>${v.GPSVendor}</GPSVendor>
                  </GPSDetails>
                  <Shipment_Id>${activeShipment.shipment_id}</Shipment_Id>
                  <Stops>
                    <Stop>
                      <Latitude>${v.latitude}</Latitude>
                      <Location_Id>${st.location_id || st.id}</Location_Id>
                      <Longitude>${v.longitude}</Longitude>
                    </Stop>
                  </Stops>
                </Shipment>
              </TransmissionDetails>`;

              try {
                await axios.post(
                  process.env.ENTER_API_URL!,
                  xmlData,
                  {
                    headers: {
                      'X-ShipX-API-Key': process.env.ENTER_API_KEY!,
                      'Content-Type': 'application/xml',
                      'Cookie': process.env.ENTER_API_COOKIE!
                    }
                  }
                );
                console.log('🚚 Vehicle exited geofence, external API notified.');
              } catch (err: any) {
                console.error('❌ Failed to notify external API:', err?.response?.data || err.message);
              }
            }
          }
        }

        // ✅ NEW: En-Route Logic - Send notification if vehicle is not inside any geofence
        // and is active (has an active shipment) and enough time has passed based on GPS frequency
        if (!isInsideAnyGeofence && shouldSendEnRouteNotification(v.trailerNumber, gpsFrequency)) {
          await sendEnRouteNotification(v, activeShipment);
        }
      }

      
    }

    console.log(`Prepared ${gpsRecordsToInsert[0]} valid GPS records for insertion.`);

    if (gpsRecordsToInsert.length > 0) {
      await db.insert(gps_schema).values(gpsRecordsToInsert);
      console.log(`✅ Inserted ${gpsRecordsToInsert.length} GPS records.`);
    } else {
      console.log('⚠️ No valid GPS records found to insert.');
    }

  } catch (err) {
    console.error('❌ Error inserting GPS data:', err);
  }
}

// ...existing code...

export async function fetchGpsDataByTrailerNumber(trailerNumber: string) {
    try {
        const gpsData = await db.select().from(gps_schema).where(eq(gps_schema.trailerNumber, trailerNumber));
        if (gpsData.length === 0) {
            console.error("No GPS data found for trailer number:", trailerNumber);
            return [];
        }
        return gpsData;
    } catch (error) {
        console.error("Error fetching GPS data:", error);
        throw error;
    }
}
function max(a: any, b: any) {
  // Try to convert both to numbers, fallback to 0 if NaN
  const numA = Number(a);
  const numB = Number(b);
  if (isNaN(numA) && isNaN(numB)) return 0;
  if (isNaN(numA)) return numB;
  if (isNaN(numB)) return numA;
  return numA > numB ? numA : numB;
}
