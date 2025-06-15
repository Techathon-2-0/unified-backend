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
exports.insertGpsData = insertGpsData;
exports.insertGpsDataFromXML = insertGpsDataFromXML;
exports.fetchGpsDataByTrailerNumber = fetchGpsDataByTrailerNumber;
const mysql2_1 = require("drizzle-orm/mysql2");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const axios_1 = __importDefault(require("axios"));
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
// Helper: Haversine distance in meters
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
function insertGpsData(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 1. Flatten data
            const flatData = data.flat();
            if (flatData.length === 0) {
                console.log('⚠️ No GPS data to insert.');
                return;
            }
            // 2. Extract unique trailer numbers and GPS vendor names
            const trailerNumbers = [...new Set(flatData.map((v) => v.trailerNumber))];
            const gpsVendors = [...new Set(flatData.map((v) => v.GPSVendor))];
            // 3. Bulk fetch entities and vendors
            const [entities, vendors, equipments] = yield Promise.all([
                db.select().from(schema_1.entity).where((0, drizzle_orm_1.inArray)(schema_1.entity.vehicleNumber, trailerNumbers)),
                db.select().from(schema_1.vendor).where((0, drizzle_orm_1.inArray)(schema_1.vendor.name, gpsVendors)),
                db.select().from(schema_1.equipment).where((0, drizzle_orm_1.inArray)(schema_1.equipment.equipment_id, trailerNumbers)),
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
                if (!entity || (vendor === null || vendor === void 0 ? void 0 : vendor.status) === false) {
                    continue; // skip invalid
                }
                // 1. Find the active shipment for this equipment/trailer
                if (equip === null || equip === void 0 ? void 0 : equip.shipment_id) {
                    const [activeShipment] = yield db
                        .select()
                        .from(schema_1.shipment)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shipment.status, 'Active'), (0, drizzle_orm_1.eq)(schema_1.shipment.shipment_id, String(equip.shipment_id))))
                        .limit(1);
                    if (!activeShipment)
                        continue;
                    // 2. Fetch stops for this active shipment
                    const stops = yield db.select().from(schema_1.stop).where((0, drizzle_orm_1.eq)(schema_1.stop.shipment_id, activeShipment.id));
                    // 3. Find the current max actual_sequence for this shipment's stops
                    const maxActualSeq = stops.reduce((max, st) => Math.max(max, st.actual_sequence || 0), 0);
                    for (const st of stops) {
                        if (st.latitude && st.longitude && st.geo_fence_radius) {
                            const dist = haversine(Number(v.latitude), Number(v.longitude), Number(st.latitude), Number(st.longitude));
                            const inside = dist <= Number(st.geo_fence_radius);
                            // Fetch last GPS for this stop to determine previous state
                            const lastGps = yield db
                                .select()
                                .from(schema_1.gps_schema)
                                .where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, v.trailerNumber))
                                .orderBy(schema_1.gps_schema.timestamp)
                                .limit(1);
                            let wasInside = false;
                            if (lastGps.length && st.latitude && st.longitude && st.geo_fence_radius) {
                                const lastDist = haversine(Number(lastGps[0].latitude), Number(lastGps[0].longitude), Number(st.latitude), Number(st.longitude));
                                wasInside = lastDist <= Number(st.geo_fence_radius);
                            }
                            // Enter event: was outside, now inside
                            if (!wasInside && inside) {
                                yield db.update(schema_1.stop)
                                    .set({
                                    entry_time: new Date().toISOString(),
                                    actual_sequence: st.actual_sequence || maxActualSeq + 1 // set if not already set
                                })
                                    .where((0, drizzle_orm_1.eq)(schema_1.stop.id, st.id));
                            }
                            // Exit event: was inside, now outside
                            if (wasInside && !inside) {
                                yield db.update(schema_1.stop)
                                    .set({ exit_time: new Date().toISOString() })
                                    .where((0, drizzle_orm_1.eq)(schema_1.stop.id, st.id));
                            }
                        }
                    }
                }
                gpsRecordsToInsert.push({
                    trailerNumber: v.trailerNumber,
                    timestamp: v.timestamp,
                    gpstimestamp: v.gpstimestamp,
                    gprstimestamp: v.gprstimestamp,
                    longitude: v.longitude,
                    latitude: v.latitude,
                    heading: v.heading,
                    speed: v.speed,
                    numberOfSatellites: v.numberOfSatellites,
                    digitalInput1: v.digitalInput1,
                    internalBatteryLevel: v.internalBatteryLevel,
                    GPSVendor: v.GPSVendor,
                    // ...other fields...
                });
            }
            // 6. Bulk insert in one go
            if (gpsRecordsToInsert.length > 0) {
                yield db.insert(schema_1.gps_schema).values(gpsRecordsToInsert);
                console.log(`✅ Inserted ${gpsRecordsToInsert.length} GPS records.`);
            }
            else {
                console.log('⚠️ No valid GPS records found to insert.');
            }
        }
        catch (err) {
            console.error('❌ Error inserting GPS data:', err);
        }
    });
}
function insertGpsDataFromXML() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield axios_1.default.get(`${process.env.GPS_API_URL}/gpsdata`);
        const data = response.data.messages;
        console.log(data);
        if (!data) {
            console.error("No data received from the API");
            return { message: "errro" };
        }
        for (const item of data) {
            for (const item2 of item) {
                insertGpsData(item2);
            }
        }
        return { message: "success" };
    });
}
//create gps fetcher function to fetch gps data from gps_schema table for specific vehicle 
function fetchGpsDataByTrailerNumber(trailerNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const gpsData = yield db.select().from(schema_1.gps_schema).where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, trailerNumber));
            if (gpsData.length === 0) {
                console.error("No GPS data found for trailer number:", trailerNumber);
                return [];
            }
            return gpsData;
        }
        catch (error) {
            console.error("Error fetching GPS data:", error);
            throw error;
        }
    });
}
