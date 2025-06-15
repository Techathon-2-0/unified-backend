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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processGeofenceAlerts = processGeofenceAlerts;
exports.createGeofenceAlert = createGeofenceAlert;
const mysql2_1 = require("drizzle-orm/mysql2");
const drizzle_orm_1 = require("drizzle-orm");
// import { alarm } from "../db/schema";
const schema_1 = require("../db/schema");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
// Process geofence alerts
function processGeofenceAlerts() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        try {
            // Get all geofence alarms
            const geofenceAlarms = yield db
                .select()
                .from(schema_1.alarm)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alarm.alarm_category, "Geofence"), (0, drizzle_orm_1.eq)(schema_1.alarm.alarm_status, true)));
            for (const alarmConfig of geofenceAlarms) {
                // Get geofence status from alarm configuration (1 for entry, 2 for exit)
                const geofenceStatus = alarmConfig.geofence_status;
                // Get vehicle groups associated with this alarm
                const vehicleGroups = yield db
                    .select({
                    groupId: schema_1.alarm_group.vehicle_group_id
                })
                    .from(schema_1.alarm_group)
                    .where((0, drizzle_orm_1.eq)(schema_1.alarm_group.alarm_id, alarmConfig.id));
                // Get geofence groups associated with this alarm
                const geofenceGroups = yield db
                    .select({
                    groupId: schema_1.alarm_geofence_group.geofence_group_id
                })
                    .from(schema_1.alarm_geofence_group)
                    .where((0, drizzle_orm_1.eq)(schema_1.alarm_geofence_group.alarm_id, alarmConfig.id));
                // Get all vehicles in these groups
                const vehicleEntities = [];
                for (const group of vehicleGroups) {
                    const entities = yield db
                        .select({
                        entityId: schema_1.group_entity.entity_id,
                        vehicleNumber: schema_1.entity.vehicleNumber
                    })
                        .from(schema_1.group_entity)
                        .innerJoin(schema_1.entity, (0, drizzle_orm_1.eq)(schema_1.group_entity.entity_id, schema_1.entity.id))
                        .where((0, drizzle_orm_1.eq)(schema_1.group_entity.group_id, group.groupId));
                    vehicleEntities.push(...entities);
                }
                // Get all geofences in these groups
                const geofences = [];
                for (const group of geofenceGroups) {
                    const fences = yield db
                        .select({
                        id: schema_1.geofence_table.id,
                        name: schema_1.geofence_table.geofence_name,
                        latitude: schema_1.geofence_table.latitude,
                        longitude: schema_1.geofence_table.longitude,
                        radius: schema_1.geofence_table.radius,
                        type: schema_1.geofence_table.geofence_type
                    })
                        .from(schema_1.geofence_group_relation)
                        .innerJoin(schema_1.geofence_table, (0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.geofence_id, schema_1.geofence_table.id))
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.group_id, group.groupId), (0, drizzle_orm_1.eq)(schema_1.geofence_table.status, true) // Active geofences only
                    ));
                    geofences.push(...fences);
                }
                // Check each vehicle against each geofence
                for (const vehicle of vehicleEntities) {
                    // Get latest 2 GPS data points to determine entry/exit
                    const latestGpsData = yield db
                        .select()
                        .from(schema_1.gps_schema)
                        .where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, vehicle.vehicleNumber))
                        .orderBy((0, drizzle_orm_1.sql) `${schema_1.gps_schema.timestamp} DESC`)
                        .limit(2);
                    if (latestGpsData.length >= 2) {
                        const currentGps = latestGpsData[0];
                        const previousGps = latestGpsData[1];
                        for (const geofence of geofences) {
                            // Check if vehicle is inside the geofence
                            let isCurrentlyInside = false;
                            let wasPreviouslyInside = false;
                            if (geofence.type === 0) { // Circle type
                                isCurrentlyInside = isPointInGeofenceCircle((_a = currentGps.latitude) !== null && _a !== void 0 ? _a : 0, (_b = currentGps.longitude) !== null && _b !== void 0 ? _b : 0, (_c = geofence.latitude) !== null && _c !== void 0 ? _c : 0, (_d = geofence.longitude) !== null && _d !== void 0 ? _d : 0, (_e = geofence.radius) !== null && _e !== void 0 ? _e : 0);
                                wasPreviouslyInside = isPointInGeofenceCircle((_f = previousGps.latitude) !== null && _f !== void 0 ? _f : 0, (_g = previousGps.longitude) !== null && _g !== void 0 ? _g : 0, (_h = geofence.latitude) !== null && _h !== void 0 ? _h : 0, (_j = geofence.longitude) !== null && _j !== void 0 ? _j : 0, (_k = geofence.radius) !== null && _k !== void 0 ? _k : 0);
                            }
                            else if (geofence.type === 1) { // Polygon type
                                // Get polygon coordinates for this geofence
                                const polygonCoords = yield getGeofencePolygonCoordinates(geofence.id);
                                if (polygonCoords.length > 0) {
                                    isCurrentlyInside = isPointInPolygonWindingNumber((_l = currentGps.latitude) !== null && _l !== void 0 ? _l : 0, (_m = currentGps.longitude) !== null && _m !== void 0 ? _m : 0, polygonCoords);
                                    wasPreviouslyInside = isPointInPolygonWindingNumber((_o = previousGps.latitude) !== null && _o !== void 0 ? _o : 0, (_p = previousGps.longitude) !== null && _p !== void 0 ? _p : 0, polygonCoords);
                                }
                            }
                            // Handle different geofence status configurations
                            if (geofenceStatus === 0 || geofenceStatus === 2) {
                                // Entry alert is enabled (status 0 = entry only, status 2 = both)
                                if (isCurrentlyInside && !wasPreviouslyInside) {
                                    // Vehicle has entered the geofence
                                    yield createGeofenceAlert(alarmConfig.id, vehicle.vehicleNumber, geofence.id, "entry");
                                    // Update stop entry time if this geofence is associated with a stop
                                    yield updateStopEntryTime(geofence.id, vehicle.vehicleNumber);
                                }
                            }
                            if (geofenceStatus === 1 || geofenceStatus === 2) {
                                // Exit alert is enabled (status 1 = exit only, status 2 = both)
                                if (!isCurrentlyInside && wasPreviouslyInside) {
                                    // Vehicle has exited the geofence
                                    yield createGeofenceAlert(alarmConfig.id, vehicle.vehicleNumber, geofence.id, "exit");
                                    // Update stop exit time if this geofence is associated with a stop
                                    yield updateStopExitTime(geofence.id, vehicle.vehicleNumber);
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error("Error processing geofence alerts:", error);
            throw error;
        }
    });
}
// Helper function to create geofence alert
function createGeofenceAlert(alarmId, vehicleNumber, geofenceId, eventType) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Always create a new alert when geofence condition is met
            const [newAlert] = yield db
                .insert(schema_1.alert)
                .values({
                alert_type: alarmId,
                status: 1 // Active
            })
                .$returningId();
            // Link alert to alarm
            yield db
                .insert(schema_1.alarm_alert)
                .values({
                alarm_id: alarmId,
                alert_id: newAlert.id
            });
            // If vehicle is linked to a shipment, link alert to shipment
            const vehicleShipment = yield db
                .select({
                shipmentId: schema_1.equipment.shipment_id
            })
                .from(schema_1.equipment)
                .where((0, drizzle_orm_1.eq)(schema_1.equipment.equipment_id, vehicleNumber))
                .limit(1);
            if (vehicleShipment.length > 0 && vehicleShipment[0].shipmentId) {
                yield db
                    .insert(schema_1.alert_shipment_relation)
                    .values({
                    alert_id: newAlert.id,
                    shipment_id: vehicleShipment[0].shipmentId
                });
            }
            // Here you would add code to send SMS/email notifications
        }
        catch (error) {
            console.error(`Error creating ${eventType} geofence alert:`, error);
            throw error;
        }
    });
}
// Helper function to update stop entry time
function updateStopEntryTime(geofenceId, vehicleNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Find geofence location_id
            const geofence = yield db
                .select({
                locationId: schema_1.geofence_table.location_id
            })
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, geofenceId))
                .limit(1);
            if (geofence.length > 0) {
                // Find equipment and its shipment
                const equipment_variable = yield db
                    .select({
                    shipmentId: schema_1.equipment.shipment_id
                })
                    .from(schema_1.equipment)
                    .where((0, drizzle_orm_1.eq)(schema_1.equipment.equipment_id, vehicleNumber))
                    .limit(1);
                if (equipment_variable.length > 0 && equipment_variable[0].shipmentId) {
                    // Find stop with matching location_id and shipment_id
                    const matchingStop = yield db
                        .select()
                        .from(schema_1.stop)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stop.location_id, geofence[0].locationId), (0, drizzle_orm_1.eq)(schema_1.stop.shipment_id, equipment_variable[0].shipmentId)))
                        .limit(1);
                    if (matchingStop.length > 0) {
                        // Update stop entry time
                        const now = new Date().toISOString();
                        yield db
                            .update(schema_1.stop)
                            .set({
                            entry_time: now
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.stop.id, matchingStop[0].id));
                    }
                }
            }
        }
        catch (error) {
            console.error("Error updating stop entry time:", error);
            throw error;
        }
    });
}
// Helper function to update stop exit time
function updateStopExitTime(geofenceId, vehicleNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Find geofence location_id
            const geofence = yield db
                .select({
                locationId: schema_1.geofence_table.location_id
            })
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, geofenceId))
                .limit(1);
            if (geofence.length > 0) {
                // Find equipment and its shipment
                const equipment_variable = yield db
                    .select({
                    shipmentId: schema_1.equipment.shipment_id
                })
                    .from(schema_1.equipment)
                    .where((0, drizzle_orm_1.eq)(schema_1.equipment.equipment_id, vehicleNumber))
                    .limit(1);
                if (equipment_variable.length > 0 && equipment_variable[0].shipmentId) {
                    // Find stop with matching location_id and shipment_id
                    const matchingStop = yield db
                        .select()
                        .from(schema_1.stop)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stop.location_id, geofence[0].locationId), (0, drizzle_orm_1.eq)(schema_1.stop.shipment_id, equipment_variable[0].shipmentId)))
                        .limit(1);
                    if (matchingStop.length > 0) {
                        // Update stop exit time
                        const now = new Date().toISOString();
                        yield db
                            .update(schema_1.stop)
                            .set(Object.assign({ exit_time: now }, (matchingStop[0].entry_time ? {
                            detention_time: calculateDetentionTime(matchingStop[0].entry_time, now)
                        } : {})))
                            .where((0, drizzle_orm_1.eq)(schema_1.stop.id, matchingStop[0].id));
                    }
                }
            }
        }
        catch (error) {
            console.error("Error updating stop exit time:", error);
            throw error;
        }
    });
}
// Helper function to calculate detention time
function calculateDetentionTime(entryTime, exitTime) {
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
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in meters
}
// Check if a point is inside a geofence circle
function isPointInGeofenceCircle(pointLat, pointLng, geofenceLat, geofenceLng, radiusMeters) {
    const distance = calculateDistance(pointLat, pointLng, geofenceLat, geofenceLng);
    return distance <= radiusMeters;
}
// Helper function to get polygon coordinates for a geofence
function getGeofencePolygonCoordinates(geofenceId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Assuming you have a geofence_coordinates table that stores polygon points
            // You'll need to adjust this based on your actual schema
            const coordinates = yield db
                .select({
                latitude: (0, drizzle_orm_1.sql) `latitude`,
                longitude: (0, drizzle_orm_1.sql) `longitude`,
                sequence: (0, drizzle_orm_1.sql) `sequence`
            })
                .from((0, drizzle_orm_1.sql) `geofence_coordinates`) // Replace with your actual table name
                .where((0, drizzle_orm_1.sql) `geofence_id = ${geofenceId}`)
                .orderBy((0, drizzle_orm_1.sql) `sequence ASC`);
            return coordinates.map(coord => ({
                lat: coord.latitude,
                lng: coord.longitude
            }));
        }
        catch (error) {
            console.error("Error fetching geofence polygon coordinates:", error);
            return [];
        }
    });
}
// Alternative point-in-polygon algorithm using winding number (more accurate for complex polygons)
function isPointInPolygonWindingNumber(pointLat, pointLng, polygon) {
    if (polygon.length < 3)
        return false;
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
        }
        else {
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
function isLeft(p0Lat, p0Lng, p1Lat, p1Lng, p2Lat, p2Lng) {
    return ((p1Lat - p0Lat) * (p2Lng - p0Lng) - (p2Lat - p0Lat) * (p1Lng - p0Lng));
}
