import { shipment, equipment, gps_schema, entity, user_group, group_entity, group } from '../db/schema';
import { eq, inArray, asc, desc, and, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { formatDate } from '../utilities/geofunc';
//import { reverseGeocode } from '../utilities/geofunc';
import axios from "axios";

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

const db = drizzle(process.env.DATABASE_URL!);

export async function getLiveData(userid: any, groups: any[] = []): Promise<any> {
    // 1. Get all group IDs for the user    
    const userGroups = await db.select({ vehicle_group_id: user_group.vehicle_group_id })
        .from(user_group)
        .where(eq(user_group.user_id, userid));
    const userGroupIds = userGroups.map(g => g.vehicle_group_id).filter(Boolean);

    // If groups is provided and not empty, use only those group IDs (but only if user has access)
    let filterGroupIds: number[];
    if (groups && groups.length > 0) {
        // Only allow groups that the user actually has access to
        filterGroupIds = groups.filter((id: number) => userGroupIds.includes(id));
        if (!filterGroupIds.length) return { data: [] };
    } else {
        filterGroupIds = userGroupIds.filter((id): id is number => id !== null);
    }

    if (!filterGroupIds.length) return { data: [] };

    // 2. Get all entities for these groups
    const groupEntities = await db.select({ entity_id: group_entity.entity_id, group_id: group_entity.group_id })
        .from(group_entity)
        .where(inArray(group_entity.group_id, filterGroupIds));

    // Map: entity_id -> Set of group_ids
    const entityToGroups = new Map<number, Set<number>>();
    for (const ge of groupEntities) {
        if (!entityToGroups.has(ge.entity_id)) entityToGroups.set(ge.entity_id, new Set());
        entityToGroups.get(ge.entity_id)!.add(ge.group_id);
    }

    // 3. Filter entities: 
    // - If groups.length === 0, include all entities
    // - If groups.length > 0, include only those mapped to ALL group ids in groups
    let entityIds: number[];
    if (groups && groups.length > 0) {
        entityIds = Array.from(entityToGroups.entries())
            .filter(([_, groupSet]) => groups.every((gid: number) => groupSet.has(gid)))
            .map(([eid]) => eid);
    } else {
        entityIds = Array.from(entityToGroups.keys());
    }

    if (!entityIds.length) return { data: [] };

    // 4. Get all active entities
    const entities = await db.select().from(entity).where(inArray(entity.id, entityIds));
    const activeEntities = entities.filter(e => e.status === true);

    if (!activeEntities.length) return { data: [] };

    // 5. Get all group names in one go
    const groupRows = await db.select().from(group).where(inArray(group.id, filterGroupIds));
    const groupNameMap = new Map(groupRows.map(g => [g.id, g.group_name]));

    // 6. Get latest gps_schema for all vehicleNumbers
    const vehicleNumbers = activeEntities.map(e => e.vehicleNumber);
    const gpsSchemas = await db.select().from(gps_schema)
        .where(inArray(gps_schema.trailerNumber, vehicleNumbers));
    // Map: vehicleNumber -> latest gps_schema
    const gpsMap = new Map<string, any>();
    for (const gps of gpsSchemas) {
        const key = gps.trailerNumber ?? "";
        if (!key) continue;

        // If this is the first record for this trailerNumber, or if this record is newer, set it
        if (
            !gpsMap.has(key) ||
            (
                gps.gpstimestamp != null &&
                gpsMap.get(key)?.gpstimestamp != null &&
                gps.gpstimestamp > gpsMap.get(key).gpstimestamp
            )
        ) {
            gpsMap.set(key, gps);
        }
    }

    // Fetch first and last GPS for each vehicle
    const gpsFirstLast: Record<string, { first: any, last: any }> = {};
    for (const vehicleNumber of vehicleNumbers) {
        const [first] = await db.select().from(gps_schema)
            .where(eq(gps_schema.trailerNumber, vehicleNumber))
            .orderBy(asc(gps_schema.timestamp))
            .limit(1);
        const [last] = await db.select().from(gps_schema)
            .where(eq(gps_schema.trailerNumber, vehicleNumber))
            .orderBy(desc(gps_schema.timestamp))
            .limit(1);
        gpsFirstLast[vehicleNumber] = { first, last };
    }

    // 7. Build the response
    const res = [];
    // 1. Fetch all equipment for these vehicles
    const equipmentRows = await db.select().from(equipment).where(inArray(equipment.equipment_id, vehicleNumbers));
    const equipmentMap = new Map(equipmentRows.map(e => [e.equipment_id, e]));

    // 2. Fetch all shipments for these equipment (active trips)
    const shipmentIds = equipmentRows.map(e => e.shipment_id).filter((id): id is number => id !== null && id !== undefined);
    const shipmentRows = await db.select().from(shipment).where(inArray(shipment.id, shipmentIds));
    const shipmentMap = new Map(shipmentRows.map(s => [s.id, s]));

    for (const ent of activeEntities) {
        // Find groupIds for this entity
        const groupIdsForEntity = entityToGroups.get(ent.id) || new Set();
        const groupNames = Array.from(groupIdsForEntity).map(gid => groupNameMap.get(gid)).filter(Boolean);

        // Get latest GPS data
        const gpsData = gpsMap.get(ent.vehicleNumber) || {};

        // Get equipment and shipment (trip) details
        const equip = equipmentMap.get(ent.vehicleNumber);
        let trip = null;
        let driverName = "";
        let driverMobile = "";
        let shipmentStatus = "";
        if (equip && equip.shipment_id) {
            trip = shipmentMap.get(equip.shipment_id);
            driverName = equip.driver_name ?? "";
            driverMobile = equip.driver_mobile_no ?? "";
            shipmentStatus = trip?.status ?? "";
        }

        // Reverse geocode if lat/lng present
        let address = "";
        // if (gpsData.latitude && gpsData.longitude) {
        //     address = await reverseGeocode(Number(gpsData.latitude), Number(gpsData.longitude));
        // }

        // Calculate distance and ping count for today
        let todayDistance = "";
        let todayPingCount = 0;
        let distance = ""; // Initialize distance variable

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
        const endOfDay = startOfDay + 86400;

        const gpsToday = await db.select()
            .from(gps_schema)
            .where(
                and(
                    eq(gps_schema.trailerNumber, ent.vehicleNumber),
                    gte(gps_schema.gpstimestamp, startOfDay),
                    lt(gps_schema.gpstimestamp, endOfDay)
                )
            )
            .orderBy(asc(gps_schema.gpstimestamp));

        todayPingCount = gpsToday.length;
        if (gpsToday.length >= 2) {
            const first = gpsToday[0];
            const last = gpsToday[gpsToday.length - 1];
            if (
                first.latitude != null && first.longitude != null &&
                last.latitude != null && last.longitude != null
            ) {
                todayDistance = (
                    haversine(
                        Number(first.latitude),
                        Number(first.longitude),
                        Number(last.latitude),
                        Number(last.longitude)
                    ) / 1000
                ).toFixed(2) + " km";
                distance = todayDistance; // Assign value to distance
            }
        }

        // Status based on last ping
        let liveStatus = "No Data";
        if (gpsData.gpstimestamp) {
            const lastPingTime = Number(gpsData.gpstimestamp) * 1000;
            const diffHours = (Date.now() - lastPingTime) / (1000 * 60 * 60);
            console.log(`(${diffHours} hours ago)`);
            if (diffHours <= 3) {
                liveStatus = "Active";
            } else {
                liveStatus = "No Update";
            }
        }



        let usedFastTag = false;
        let fastTagLat = "";
        let fastTagLng = "";
        let vendorName = gpsData.GPSVendor ?? "Unknown Vendor";

        // Check if we need to call FastTag API or use stored data
        if (liveStatus === "No Update" && ent.vehicleNumber) {
            // Check if we have existing FastTag data in the database
            const existingFastTagData = await db.select()
                .from(gps_schema)
                .where(eq(gps_schema.trailerNumber, ent.vehicleNumber))
                .orderBy(desc(gps_schema.timestamp))
                .limit(1);

            const hasExistingFastTagData = existingFastTagData[0]?.GPSVendor === "FASTAG";

            // Determine previous status based on GPS data from 3.1 hours ago
            let previousStatus = "No Data";
            const fourHoursAgo = Date.now() - (3.1 * 60 * 60 * 1000);
            const previousGpsData = await db.select()
                .from(gps_schema)
                .where(
                    and(
                        eq(gps_schema.trailerNumber, ent.vehicleNumber),
                        gte(gps_schema.gpstimestamp, fourHoursAgo / 1000),
                        lt(gps_schema.gpstimestamp, (Date.now() - (3 * 60 * 60 * 1000)) / 1000)
                    )
                )
                .orderBy(desc(gps_schema.gpstimestamp))
                .limit(1);

            if (previousGpsData.length > 0) {
                const prevPingTime = Number(previousGpsData[0].gpstimestamp) * 1000;
                const prevDiffHours = (Date.now() - prevPingTime) / (1000 * 60 * 60);
                if (prevDiffHours <= 3) {
                    previousStatus = "Active";
                }
            }

            // Only call FastTag API if status changed from Active to No Update and no existing FastTag data
            if (previousStatus === "Active" && !hasExistingFastTagData) {
                try {
                    const fastTagResp = await axios.post(
                        `${process.env.FAST_TAG_API_URL}`,
                        { vehiclenumber: ent.vehicleNumber },
                        {
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                                "api-key": `${process.env.FAST_TAG_API_KEY}`,
                                "seckey": `${process.env.FAST_TAG_API_SECRET}`,
                            }
                        }
                    );

                    const txnList = fastTagResp?.data?.json?.response?.[0]?.response?.vehicle?.vehltxnList?.txn;
                    console.log(`Fast Tag response for ${ent.vehicleNumber}:`, txnList);

                    if (Array.isArray(txnList) && txnList.length > 0) {
                        const latestTxn = txnList.reduce((a, b) =>
                            new Date(a.readerReadTime) > new Date(b.readerReadTime) ? a : b
                        );

                        if (latestTxn.tollPlazaGeocode) {
                            const [lat, lng] = latestTxn.tollPlazaGeocode.split(",");
                            fastTagLat = lat;
                            fastTagLng = lng;
                            address = latestTxn.tollPlazaName || "";
                            usedFastTag = true;
                            vendorName = "FASTAG";

                            // Store FastTag data in database
                            await db.insert(gps_schema).values({
                                trailerNumber: ent.vehicleNumber,
                                latitude: lat,
                                longitude: lng,
                                GPSVendor: "FASTAG",
                                timestamp: Date.now(),
                                gpstimestamp: Math.floor(Date.now() / 1000),
                                gprstimestamp: Math.floor(Date.now() / 1000)
                            });

                            console.log(`FastTag data stored for ${ent.vehicleNumber}:`, lat, lng);
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching Fast Tag data for ${ent.vehicleNumber}:`, err);
                }
            }
            // Use existing FastTag data if available
            else if (hasExistingFastTagData) {
                const fastTagData = existingFastTagData[0];
                fastTagLat = fastTagData.latitude !== undefined && fastTagData.latitude !== null ? String(fastTagData.latitude) : "";
                fastTagLng = fastTagData.longitude !== undefined && fastTagData.longitude !== null ? String(fastTagData.longitude) : "";
                usedFastTag = true;
                vendorName = "FASTAG";
                console.log(`Using existing FastTag data for ${ent.vehicleNumber}:`, fastTagLat, fastTagLng);
            }
        }

        res.push({
            id: ent.id?.toString() ?? "",
            vehicleNumber: ent.vehicleNumber ?? "",
            deviceName: "",
            speed: gpsData.speed ?? "",
            address: address ?? "",
            altitude: gpsData.altitude ?? "",
            gpsTime: gpsData.gpstimestamp ? formatDate(new Date(gpsData.gpstimestamp * 1000).toISOString()) : "",
            gprsTime: gpsData.gprstimestamp ? formatDate(new Date(gpsData.gprstimestamp * 1000).toISOString()) : "",
            type: ent.type ?? "",
            status: liveStatus,
            distance,
            todayDistance,
            gpsPing: todayPingCount,
            drivers: (ent as any).driverDetails ?? "",
            rfid: gpsData.rfid ?? "",
            tag: gpsData.tag ?? "",
            gpsStatus: gpsData.gpsStatus ?? "Active",
            gprsStatus: gpsData.gprsStatus ?? "Active",
            lastAlarm: gpsData.lastAlarm ?? "",
            ignitionStatus: gpsData.digitalInput1 == 1 ? "ON" : "OFF",
            sensor: gpsData.sensor ?? "",
            power: gpsData.power ?? "",
            battery: gpsData.internalBatteryLevel ?? "",
            ac: gpsData.ac ?? "",
            lockStatus: gpsData.lockStatus ?? "",
            domainName: trip ? trip.domain_name ?? "" : "",
            driverName,
            driverMobile,
            gpsType: gpsData.gpsType ?? "",
            shipmentId: trip ? trip.shipment_id : "",
            shipmentStatus,
            trip_status: trip ? trip.status ?? "" : "",
            shipmentSource: "Logifrieght",
            vendorName: vendorName,
            lastgpstime: gpsData.gpstimestamp ? formatDate(new Date(gpsData.gpstimestamp * 1000).toISOString()) : "",
            group: groupNames,
            hasSpeedChart: false,
            lat: usedFastTag ? fastTagLat : (gpsData.latitude ?? ""),
            lng: usedFastTag ? fastTagLng : (gpsData.longitude ?? "")
        });
    }
    console.log("Live data fetched successfully");
    return res;
}