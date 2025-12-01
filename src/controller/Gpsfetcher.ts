import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import { transmission_header, shipment, equipment, stop, customer_lr_detail, gps_schema, vendor, entity, gps_details } from '../db/schema';
import { eq, inArray, and, desc } from "drizzle-orm";
import axios from "axios";


interface GPSData {
  trailerNumber: string;
  GPSVendor: string;
  timestamp: number;
  gpstimestamp: number;
  gprstimestamp: number;
  longitude: number;
  latitude: number;
  heading: number;
  speed: number;
  numberOfSatellites: string;
  digitalInput1?: number;
  internalBatteryLevel?: string;
}

const db = drizzle(process.env.DATABASE_URL!);

// Store last En-Route notification timestamps per vehicle
const lastEnRouteNotification = new Map<string, number>();

// Helper: Haversine distance in meters
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Check if vehicle should send En-Route notification
function shouldSendEnRouteNotification(trailerNumber: string, gpsFrequency: number): boolean {
  const now = Date.now();
  const lastNotification = lastEnRouteNotification.get(trailerNumber) || 0;
  const intervalMs = (gpsFrequency / 100) * 1000; // Convert frequency to milliseconds (e.g., 3600 -> 36 seconds)

  return (now - lastNotification) >= intervalMs;
}

// Helper: Send En-Route notification
// ✅ En-Route Notification
export async function sendEnRouteNotification(vehicleData: any, activeShipment: any) {
  try {
    console.log("🚀 Preparing EN-ROUTE XML Payload...");

    // 1️⃣ Fetch all stops for this shipment
    const stops = await db.select().from(stop).where(eq(stop.shipment_id, activeShipment.id));

    let nearestLocationId = "NA";
    let nearestStopName = "NA";
    let nearestStopDist: string | null = null;

    if (stops.length > 0 && vehicleData.latitude && vehicleData.longitude) {
      // Find nearest stop to current GPS
      type StopType = (typeof stops)[number] & { dist?: number };
      const nearestStop: StopType | null = stops.reduce<StopType | null>((closest, st) => {
        const dist = haversine(
          Number(vehicleData.latitude),
          Number(vehicleData.longitude),
          Number(st.latitude),
          Number(st.longitude)
        );
        if (!closest || dist < (closest.dist ?? Infinity)) {
          return { ...st, dist };
        }
        return closest;
      }, null);

      nearestLocationId = nearestStop?.location_id || nearestStop?.id?.toString() || "NA";
      nearestStopName = nearestStop?.stop_name || "Unknown Stop";
      nearestStopDist = nearestStop?.dist?.toFixed(2) || null;

      console.log(
        `📍 Nearest stop found: ${nearestStopName} (Location ID: ${nearestLocationId}, Distance: ${nearestStopDist} m)`
      );
    } else {
      console.warn("⚠️ No stops found or invalid GPS coordinates for vehicle.");
    }

    // 2️⃣ Prepare XML payload (include Location_Id like Enter/Exit)
    const eventDateTime = new Date().toISOString();
    const domainName = activeShipment.domain_name || "MM/ASOBEXE";

    const xmlData = `<TransmissionDetails>
      <Shipment>
        <Domain_Name>${domainName}</Domain_Name>
        <Equipment>
          <Equipment_Id>${vehicleData.trailerNumber}</Equipment_Id>
        </Equipment>
        <Events>
          <Event>
            <EventCode>En-Route</EventCode>
            <EventDateTime>${eventDateTime}</EventDateTime>
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
            <Location_Id>${nearestLocationId}</Location_Id>
          </Stop>
        </Stops>
      </Shipment>
    </TransmissionDetails>`;

    // 3️⃣ Log payload details (for debugging)
    console.table({
      EventCode: "En-Route",
      Domain_Name: domainName,
      TrailerNumber: vehicleData.trailerNumber,
      GPSVendor: vehicleData.GPSVendor,
      Shipment_Id: activeShipment.shipment_id,
      Latitude: vehicleData.latitude,
      Longitude: vehicleData.longitude,
      Location_Id: nearestLocationId,
      Distance_To_Stop: nearestStopDist,
      EventDateTime: eventDateTime,
    });

    const missingFields = Object.entries({
      Domain_Name: domainName,
      Equipment_Id: vehicleData.trailerNumber,
      GPSVendor: vehicleData.GPSVendor,
      Shipment_Id: activeShipment.shipment_id,
      Latitude: vehicleData.latitude,
      Longitude: vehicleData.longitude,
      Location_Id: nearestLocationId,
    })
      .filter(([_, val]) => val === undefined || val === null || val === "")
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.warn("⚠️ Missing or empty fields in En-Route XML:", missingFields.join(", "));
    }

    console.log("📄 Final XML Payload:\n", xmlData);

    // 4️⃣ Send XML to API
    const logifrightResponse = await axios.post(process.env.ENTER_API_URL!, xmlData, {
      headers: {
        "X-ShipX-API-Key": process.env.ENTER_API_KEY!,
        "Content-Type": "application/xml",
        Cookie: process.env.ENTER_API_COOKIE!,
      },
    });

    // 5️⃣ Track last notification timestamp
    lastEnRouteNotification.set(vehicleData.trailerNumber, Date.now());
    console.log("✅ Logifright Response:", logifrightResponse.data);
    console.log("🚛 En-Route notification sent for vehicle:", vehicleData.trailerNumber);
  } catch (err: any) {
    console.error(
      "❌ Failed to send En-Route notification:",
      err?.response?.data || err?.message || err
    );
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


    // console.log("🚛 [insertGpsData] RAW GPS DATA RECEIVED:");
    // console.dir(d, { depth: null });
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

      // console.log(`Processing GPS data for trailer: ${v.trailerNumber}, Vendor: ${v.GPSVendor}`);

      gpsRecordsToInsert.push({
        trailerNumber: v.trailerNumber,
        timestamp: max(v.gpstimestamp, v.gprstimestamp),
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

      console.log("Equipment found for trailer:", v.trailerNumber, equip);
      if (equip?.shipment_id) {
        // 1. Verify active shipment
        console.log(' Looking for active shipment:', equip.shipment_id);
        const [activeShipment] = await db
          .select()
          .from(shipment)
          .where(
            and(
              eq(shipment.status, 'in_transit'),
              eq(shipment.id, Number(equip.shipment_id))
            )
          )
          .limit(1);
        console.log(' Active shipment result:', activeShipment);

        if (!activeShipment) continue;

        // Get GPS frequency for this shipment
        const [gpsDetail] = await db
          .select()
          .from(gps_details)
          .where(eq(gps_details.shipment_id, activeShipment.id))
          .limit(1);

        const gpsFrequency = gpsDetail?.gps_frequency || 3600; // Default frequency
        console.log(`GPS Frequency for shipment ${activeShipment.shipment_id}: ${gpsFrequency}`);
        // 2. Fetch stops for this active shipment
        const stops = await db.select().from(stop).where(eq(stop.shipment_id, activeShipment.id));
        console.log(`Fetched ${stops.length} stops for shipment ${activeShipment.shipment_id}`);

        // 3. Find the current max actual_sequence for this shipment's stops
        const maxActualSeq = stops.reduce((max, st) => Math.max(max, st.actual_sequence || 0), 0);

        let isInsideAnyGeofence = false;
        console.log('Stops for shipment:', activeShipment.shipment_id, stops.length);
        for (const st of stops) {
          console.log('Processing stop ID:', st.id, 'for trailer:', v.trailerNumber);
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


              //  Check payload fields before sending
              const fieldChecks = {
                EventCode: "Vehicle Reached",
                Domain_Name: domainName,
                TrailerNumber: v.trailerNumber,
                GPSVendor: v.GPSVendor,
                Shipment_Id: activeShipment.shipment_id,
                Stop_Id: st.location_id || st.id,
                Latitude: v.latitude,
                Longitude: v.longitude,

              };

              const missingFields = Object.entries(fieldChecks)
                .filter(([_, val]) => val === undefined || val === null || val === "")
                .map(([key]) => key);

              console.log(" Preparing ENTER (Vehicle Reached) XML Payload...");
              console.table(fieldChecks);
              if (missingFields.length > 0) {
                console.warn(" Missing or empty XML fields:", missingFields.join(", "));
              } else {
                console.log(" All XML fields present for ENTER event.");
              }
              console.log(" XML Payload:\n", xmlData);

              try {
                console.log('LogifrightReqData------', xmlData);
                console.log("ENTER_API_URL:", process.env.ENTER_API_URL);
                const logifrightResponse = await axios.post(
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
                console.log('LogifrightResData------', logifrightResponse.data);
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
                      <EventCode>Vehicle Left</EventCode>
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

              // 🧠 Check payload fields before sending
              const fieldChecks = {
                EventCode: "Vehicle Left",
                Domain_Name: domainName,
                TrailerNumber: v.trailerNumber,
                GPSVendor: v.GPSVendor,
                Shipment_Id: activeShipment.shipment_id,
                Stop_Id: st.location_id || st.id,
                Latitude: v.latitude,
                Longitude: v.longitude,

              };

              const missingFields = Object.entries(fieldChecks)
                .filter(([_, val]) => val === undefined || val === null || val === "")
                .map(([key]) => key);

              console.log("🚀 Preparing EXIT (Vehicle Left) XML Payload...");
              console.table(fieldChecks);
              if (missingFields.length > 0) {
                console.warn("⚠️ Missing or empty XML fields:", missingFields.join(", "));
              } else {
                console.log("✅ All XML fields present for EXIT event.");
              }
              console.log("📄 XML Payload:\n", xmlData);

              try {
                console.log("ENTER_API_URL:", process.env.ENTER_API_URL);
                const logifrightResponse = await axios.post(
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
                console.log('🚚 Vehicle left geofence, external API notified.', logifrightResponse);
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

export async function insertGpsDataNew(flatDataArray: GPSData[]) {
  try {
    
    if (!Array.isArray(flatDataArray) || flatDataArray.length === 0) {
      console.warn("No GPS data to insert.");
      return;
    }

    for (const flatData of flatDataArray) {
      if (!flatData) continue;

      const { trailerNumber, GPSVendor } = flatData;

      // Fetch related entities in parallel
      const [entityDataArr, vendorDataArr, equipmentDataArr] = await Promise.all([
        db.select().from(entity).where(eq(entity.vehicleNumber, trailerNumber)).limit(1),
        db.select().from(vendor).where(eq(vendor.name, GPSVendor)).limit(1),
        db.select().from(equipment).where(eq(equipment.equipment_id, trailerNumber)).limit(1),
      ]);

      const entityData = entityDataArr[0];
      const vendorData = vendorDataArr[0];
      const quipData = equipmentDataArr[0];

      if (!entityData || vendorData?.status === false) {
        console.log(`Skipping GPS for trailer ${trailerNumber}: invalid entity/vendor.`);
        continue;
      }

      const gpsRecord = {
        trailerNumber,
        timestamp: Math.max(flatData.gpstimestamp, flatData.gprstimestamp),
        gpstimestamp: flatData.timestamp,
        gprstimestamp: flatData.gprstimestamp,
        longitude: flatData.longitude,
        latitude: flatData.latitude,
        heading: flatData.heading,
        speed: flatData.speed,
        numberOfSatellites: String(flatData.numberOfSatellites),
        digitalInput1: flatData.digitalInput1,
        internalBatteryLevel:
          flatData.internalBatteryLevel != null
            ? String(flatData.internalBatteryLevel)
            : null,
        GPSVendor,
      };

      console.log(`Equipment found for trailer ${trailerNumber}:`, quipData);

      if (quipData?.shipment_id) {
        const [activeShipment] = await db
          .select()
          .from(shipment)
          .where(
            and(
              eq(shipment.status, "in_transit"),
              eq(shipment.id, Number(quipData.shipment_id))
            )
          )
          .limit(1);

        if (!activeShipment) continue;

        const [gpsDetail] = await db
          .select()
          .from(gps_details)
          .where(eq(gps_details.shipment_id, activeShipment.id))
          .limit(1);

        const gpsFrequency = gpsDetail?.gps_frequency || 3600;

        const stops = await db
          .select()
          .from(stop)
          .where(eq(stop.shipment_id, activeShipment.id));

        const maxActualSeq = stops.reduce(
          (max, st) => Math.max(max, st.actual_sequence || 0),
          0
        );

        let isInsideAnyGeofence = false;

        for (const st of stops) {
          if (st.latitude && st.longitude && st.geo_fence_radius) {
            const dist = haversine(
              flatData.latitude,
              flatData.longitude,
              st.latitude,
              st.longitude
            );
            const inside = dist <= st.geo_fence_radius;

            if (inside) isInsideAnyGeofence = true;

            const lastGps = await db
              .select()
              .from(gps_schema)
              .where(eq(gps_schema.trailerNumber, trailerNumber))
              .orderBy(desc(gps_schema.timestamp))
              .limit(1);

            const wasInside =
              lastGps.length &&
              lastGps[0].latitude != null &&
              lastGps[0].longitude != null &&
              st.latitude != null &&
              st.longitude != null &&
              haversine(
                lastGps[0].latitude,
                lastGps[0].longitude,
                st.latitude,
                st.longitude
              ) <= st.geo_fence_radius!;

            const eventType =
              !wasInside && inside
                ? "Vehicle Reached"
                : wasInside && !inside
                ? "Vehicle Left"
                : null;

            if (eventType) {
              const updateData =
                eventType === "Vehicle Reached"
                  ? {
                      entry_time: new Date().toISOString(),
                      actual_sequence: st.actual_sequence || maxActualSeq + 1,
                    }
                  : { exit_time: new Date().toISOString() };

              await db.update(stop).set(updateData).where(eq(stop.id, st.id));

              const domainName = activeShipment.domain_name || "MM/ASOBEXE";

              const xmlData = `<TransmissionDetails>
                <Shipment>
                  <Domain_Name>${domainName}</Domain_Name>
                  <Equipment>
                    <Equipment_Id>${trailerNumber}</Equipment_Id>
                  </Equipment>
                  <Events>
                    <Event>
                      <EventCode>${eventType}</EventCode>
                      <EventDateTime>${new Date().toISOString()}</EventDateTime>
                    </Event>
                  </Events>
                  <GPSDetails>
                    <GPSUnitID>${GPSVendor}</GPSUnitID>
                    <GPSVendor>${GPSVendor}</GPSVendor>
                  </GPSDetails>
                  <Shipment_Id>${activeShipment.shipment_id}</Shipment_Id>
                  <Stops>
                    <Stop>
                      <Latitude>${flatData.latitude}</Latitude>
                      <Location_Id>${st.location_id || st.id}</Location_Id>
                      <Longitude>${flatData.longitude}</Longitude>
                    </Stop>
                  </Stops>
                </Shipment>
              </TransmissionDetails>`;

              try {
                await axios.post(process.env.ENTER_API_URL!, xmlData, {
                  headers: {
                    "X-ShipX-API-Key": process.env.ENTER_API_KEY!,
                    "Content-Type": "application/xml",
                    Cookie: process.env.ENTER_API_COOKIE!,
                  },
                });
                console.log(`${eventType} event sent for trailer ${trailerNumber}`);
              } catch (err: any) {
                console.error(
                  "Failed to notify external API:",
                  err?.response?.data || err.message
                );
              }
            }
          }
        }

        if (
          !isInsideAnyGeofence &&
          shouldSendEnRouteNotification(trailerNumber, gpsFrequency)
        ) {
          await sendEnRouteNotification(flatData, activeShipment);
        }
      }

      await db.insert(gps_schema).values(gpsRecord);
      console.log(`Inserted GPS record for trailer ${trailerNumber}`);
    }
  } catch (err) {
    console.error("Error inserting GPS data:", err);
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
