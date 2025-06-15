"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveData = getLiveData;
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const mysql2_1 = require("drizzle-orm/mysql2");
const geofunc_1 = require("../utilities/geofunc");
const geofunc_2 = require("../utilities/geofunc");
const axios_1 = __importDefault(require("axios"));
function haversine(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
function getLiveData(userid_1) {
    return __awaiter(this, arguments, void 0, function* (userid, groups = []) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11;
        // 1. Get all group IDs for the user    
        const userGroups = yield db.select({ vehicle_group_id: schema_1.user_group.vehicle_group_id })
            .from(schema_1.user_group)
            .where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, userid));
        const userGroupIds = userGroups.map(g => g.vehicle_group_id).filter(Boolean);
        // If groups is provided and not empty, use only those group IDs (but only if user has access)
        let filterGroupIds;
        if (groups && groups.length > 0) {
            // Only allow groups that the user actually has access to
            filterGroupIds = groups.filter((id) => userGroupIds.includes(id));
            if (!filterGroupIds.length)
                return { data: [] };
        }
        else {
            filterGroupIds = userGroupIds.filter((id) => id !== null);
        }
        if (!filterGroupIds.length)
            return { data: [] };
        // 2. Get all entities for these groups
        const groupEntities = yield db.select({ entity_id: schema_1.group_entity.entity_id, group_id: schema_1.group_entity.group_id })
            .from(schema_1.group_entity)
            .where((0, drizzle_orm_1.inArray)(schema_1.group_entity.group_id, filterGroupIds));
        // Map: entity_id -> Set of group_ids
        const entityToGroups = new Map();
        for (const ge of groupEntities) {
            if (!entityToGroups.has(ge.entity_id))
                entityToGroups.set(ge.entity_id, new Set());
            entityToGroups.get(ge.entity_id).add(ge.group_id);
        }
        // 3. Filter entities: 
        // - If groups.length === 0, include all entities
        // - If groups.length > 0, include only those mapped to ALL group ids in groups
        let entityIds;
        if (groups && groups.length > 0) {
            entityIds = Array.from(entityToGroups.entries())
                .filter(([_, groupSet]) => groups.every((gid) => groupSet.has(gid)))
                .map(([eid]) => eid);
        }
        else {
            entityIds = Array.from(entityToGroups.keys());
        }
        if (!entityIds.length)
            return { data: [] };
        // 4. Get all active entities
        const entities = yield db.select().from(schema_1.entity).where((0, drizzle_orm_1.inArray)(schema_1.entity.id, entityIds));
        const activeEntities = entities.filter(e => e.status === true);
        if (!activeEntities.length)
            return { data: [] };
        // 5. Get all group names in one go
        const groupRows = yield db.select().from(schema_1.group).where((0, drizzle_orm_1.inArray)(schema_1.group.id, filterGroupIds));
        const groupNameMap = new Map(groupRows.map(g => [g.id, g.group_name]));
        // 6. Get latest gps_schema for all vehicleNumbers
        const vehicleNumbers = activeEntities.map(e => e.vehicleNumber);
        const gpsSchemas = yield db.select().from(schema_1.gps_schema)
            .where((0, drizzle_orm_1.inArray)(schema_1.gps_schema.trailerNumber, vehicleNumbers));
        // Map: vehicleNumber -> latest gps_schema
        const gpsMap = new Map();
        for (const gps of gpsSchemas) {
            const key = (_a = gps.trailerNumber) !== null && _a !== void 0 ? _a : "";
            if (key &&
                (!gpsMap.has(key) ||
                    (gpsMap.get(key).timestamp != null &&
                        gps.timestamp != null &&
                        gpsMap.get(key).timestamp < gps.timestamp))) {
                gpsMap.set(key, gps);
            }
        }
        // Fetch first and last GPS for each vehicle
        const gpsFirstLast = {};
        for (const vehicleNumber of vehicleNumbers) {
            const [first] = yield db.select().from(schema_1.gps_schema)
                .where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, vehicleNumber))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.gps_schema.timestamp))
                .limit(1);
            const [last] = yield db.select().from(schema_1.gps_schema)
                .where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, vehicleNumber))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.gps_schema.timestamp))
                .limit(1);
            gpsFirstLast[vehicleNumber] = { first, last };
        }
        // 7. Build the response
        const res = [];
        // 1. Fetch all equipment for these vehicles
        const equipmentRows = yield db.select().from(schema_1.equipment).where((0, drizzle_orm_1.inArray)(schema_1.equipment.equipment_id, vehicleNumbers));
        const equipmentMap = new Map(equipmentRows.map(e => [e.equipment_id, e]));
        // 2. Fetch all shipments for these equipment (active trips)
        const shipmentIds = equipmentRows.map(e => e.shipment_id).filter((id) => id !== null && id !== undefined);
        const shipmentRows = yield db.select().from(schema_1.shipment).where((0, drizzle_orm_1.inArray)(schema_1.shipment.id, shipmentIds));
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
                driverName = (_b = equip.driver_name) !== null && _b !== void 0 ? _b : "";
                driverMobile = (_c = equip.driver_mobile_no) !== null && _c !== void 0 ? _c : "";
                shipmentStatus = (_d = trip === null || trip === void 0 ? void 0 : trip.status) !== null && _d !== void 0 ? _d : "";
            }
            // Reverse geocode if lat/lng present
            let address = "";
            if (gpsData.latitude && gpsData.longitude) {
                address = yield (0, geofunc_2.reverseGeocode)(Number(gpsData.latitude), Number(gpsData.longitude));
            }
            // Calculate distance and ping count for today
            let todayDistance = "";
            let todayPingCount = 0;
            let distance = ""; // Initialize distance variable
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
            const endOfDay = startOfDay + 86400;
            const gpsToday = yield db.select()
                .from(schema_1.gps_schema)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, ent.vehicleNumber), (0, drizzle_orm_1.gte)(schema_1.gps_schema.gpstimestamp, startOfDay), (0, drizzle_orm_1.lt)(schema_1.gps_schema.gpstimestamp, endOfDay)))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.gps_schema.gpstimestamp));
            todayPingCount = gpsToday.length;
            if (gpsToday.length >= 2) {
                const first = gpsToday[0];
                const last = gpsToday[gpsToday.length - 1];
                if (first.latitude != null && first.longitude != null &&
                    last.latitude != null && last.longitude != null) {
                    todayDistance = (haversine(Number(first.latitude), Number(first.longitude), Number(last.latitude), Number(last.longitude)) / 1000).toFixed(2) + " km";
                    distance = todayDistance; // Assign value to distance
                }
            }
            // Status based on last ping
            let liveStatus = "No Data";
            if (gpsData.gpstimestamp) {
                const lastPingTime = Number(gpsData.gpstimestamp) * 1000;
                const diffHours = (Date.now() - lastPingTime) / (1000 * 60 * 60);
                if (diffHours <= 3) {
                    liveStatus = "Active";
                }
                else {
                    liveStatus = "No Update";
                }
            }
            let usedFastTag = false;
            let fastTagLat = "";
            let fastTagLng = "";
            let vendorName = (_e = gpsData.GPSVendor) !== null && _e !== void 0 ? _e : "Unknown Vendor";
            // Check if we need to call FastTag API or use stored data
            if (liveStatus === "No Update" && ent.vehicleNumber) {
                // Check if we have existing FastTag data in the database
                const existingFastTagData = yield db.select()
                    .from(schema_1.gps_schema)
                    .where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, ent.vehicleNumber))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.gps_schema.timestamp))
                    .limit(1);
                const hasExistingFastTagData = ((_f = existingFastTagData[0]) === null || _f === void 0 ? void 0 : _f.GPSVendor) === "FASTAG";
                // Determine previous status based on GPS data from 3.1 hours ago
                let previousStatus = "No Data";
                const fourHoursAgo = Date.now() - (3.1 * 60 * 60 * 1000);
                const previousGpsData = yield db.select()
                    .from(schema_1.gps_schema)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, ent.vehicleNumber), (0, drizzle_orm_1.gte)(schema_1.gps_schema.gpstimestamp, fourHoursAgo / 1000), (0, drizzle_orm_1.lt)(schema_1.gps_schema.gpstimestamp, (Date.now() - (3 * 60 * 60 * 1000)) / 1000)))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.gps_schema.gpstimestamp))
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
                        const fastTagResp = yield axios_1.default.post(`${process.env.FAST_TAG_API_URL}`, { vehiclenumber: ent.vehicleNumber }, {
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                                "api-key": `${process.env.FAST_TAG_API_KEY}`,
                                "seckey": `${process.env.FAST_TAG_API_SECRET}`,
                            }
                        });
                        const txnList = (_o = (_m = (_l = (_k = (_j = (_h = (_g = fastTagResp === null || fastTagResp === void 0 ? void 0 : fastTagResp.data) === null || _g === void 0 ? void 0 : _g.json) === null || _h === void 0 ? void 0 : _h.response) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.response) === null || _l === void 0 ? void 0 : _l.vehicle) === null || _m === void 0 ? void 0 : _m.vehltxnList) === null || _o === void 0 ? void 0 : _o.txn;
                        console.log(`Fast Tag response for ${ent.vehicleNumber}:`, txnList);
                        if (Array.isArray(txnList) && txnList.length > 0) {
                            const latestTxn = txnList.reduce((a, b) => new Date(a.readerReadTime) > new Date(b.readerReadTime) ? a : b);
                            if (latestTxn.tollPlazaGeocode) {
                                const [lat, lng] = latestTxn.tollPlazaGeocode.split(",");
                                fastTagLat = lat;
                                fastTagLng = lng;
                                address = latestTxn.tollPlazaName || "";
                                usedFastTag = true;
                                vendorName = "FASTAG";
                                // Store FastTag data in database
                                yield db.insert(schema_1.gps_schema).values({
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
                    }
                    catch (err) {
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
                id: (_q = (_p = ent.id) === null || _p === void 0 ? void 0 : _p.toString()) !== null && _q !== void 0 ? _q : "",
                vehicleNumber: (_r = ent.vehicleNumber) !== null && _r !== void 0 ? _r : "",
                deviceName: "",
                speed: (_s = gpsData.speed) !== null && _s !== void 0 ? _s : "",
                address: address !== null && address !== void 0 ? address : "",
                altitude: (_t = gpsData.altitude) !== null && _t !== void 0 ? _t : "",
                gpsTime: gpsData.gpstimestamp ? (0, geofunc_1.formatDate)(new Date(gpsData.gpstimestamp * 1000).toISOString()) : "",
                gprsTime: gpsData.gprstimestamp ? (0, geofunc_1.formatDate)(new Date(gpsData.gprstimestamp * 1000).toISOString()) : "",
                type: (_u = ent.type) !== null && _u !== void 0 ? _u : "",
                status: liveStatus,
                distance,
                todayDistance,
                gpsPing: todayPingCount,
                drivers: (_v = ent.driverDetails) !== null && _v !== void 0 ? _v : "",
                rfid: (_w = gpsData.rfid) !== null && _w !== void 0 ? _w : "",
                tag: (_x = gpsData.tag) !== null && _x !== void 0 ? _x : "",
                gpsStatus: (_y = gpsData.gpsStatus) !== null && _y !== void 0 ? _y : "Active",
                gprsStatus: (_z = gpsData.gprsStatus) !== null && _z !== void 0 ? _z : "Active",
                lastAlarm: (_0 = gpsData.lastAlarm) !== null && _0 !== void 0 ? _0 : "",
                ignitionStatus: (_1 = gpsData.ignitionStatus) !== null && _1 !== void 0 ? _1 : "",
                sensor: (_2 = gpsData.sensor) !== null && _2 !== void 0 ? _2 : "",
                power: (_3 = gpsData.power) !== null && _3 !== void 0 ? _3 : "",
                battery: (_4 = gpsData.internalBatteryLevel) !== null && _4 !== void 0 ? _4 : "",
                ac: (_5 = gpsData.ac) !== null && _5 !== void 0 ? _5 : "",
                lockStatus: (_6 = gpsData.lockStatus) !== null && _6 !== void 0 ? _6 : "",
                domainName: trip ? (_7 = trip.domain_name) !== null && _7 !== void 0 ? _7 : "" : "",
                driverName,
                driverMobile,
                gpsType: (_8 = gpsData.gpsType) !== null && _8 !== void 0 ? _8 : "",
                shipmentId: trip ? trip.shipment_id : "",
                shipmentStatus,
                trip_status: trip ? (_9 = trip.status) !== null && _9 !== void 0 ? _9 : "" : "",
                shipmentSource: "Logifrieght",
                vendorName: vendorName,
                group: groupNames,
                hasSpeedChart: false,
                lat: usedFastTag ? fastTagLat : ((_10 = gpsData.latitude) !== null && _10 !== void 0 ? _10 : ""),
                lng: usedFastTag ? fastTagLng : ((_11 = gpsData.longitude) !== null && _11 !== void 0 ? _11 : "")
            });
        }
        console.log("Live data fetched successfully");
        return res;
    });
}
