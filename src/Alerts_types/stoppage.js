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
exports.processStoppageAlerts = processStoppageAlerts;
const mysql2_1 = require("drizzle-orm/mysql2");
const drizzle_orm_1 = require("drizzle-orm");
// import { alarm } from "../db/schema";
const schema_1 = require("../db/schema");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
function processStoppageAlerts() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        try {
            // Get all stoppage alarms
            const stoppageAlarms = yield db
                .select()
                .from(schema_1.alarm)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alarm.alarm_category, "Stoppage"), (0, drizzle_orm_1.eq)(schema_1.alarm.alarm_status, true)));
            for (const alarmConfig of stoppageAlarms) {
                // Get threshold in minutes from alarm configuration
                const thresholdMinutes = alarmConfig.alarm_value;
                // Get vehicle groups associated with this alarm
                const vehicleGroups = yield db
                    .select({
                    groupId: schema_1.alarm_group.vehicle_group_id
                })
                    .from(schema_1.alarm_group)
                    .where((0, drizzle_orm_1.eq)(schema_1.alarm_group.alarm_id, alarmConfig.id));
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
                // Check latest GPS data for each vehicle
                for (const vehicle of vehicleEntities) {
                    // Get latest GPS data points to determine stoppage
                    const gpsData = yield db
                        .select()
                        .from(schema_1.gps_schema)
                        .where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, vehicle.vehicleNumber))
                        .orderBy((0, drizzle_orm_1.sql) `${schema_1.gps_schema.timestamp} DESC`)
                        .limit(10);
                    if (gpsData.length >= 2) {
                        const latestGps = gpsData[0];
                        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
                        // Check if vehicle is currently stopped (speed is 0 or very low)
                        const isStopped = ((_a = latestGps.speed) !== null && _a !== void 0 ? _a : 0) <= 3; // Speed less than 3 km/h
                        if (isStopped) {
                            // Find the last GPS record where the vehicle was moving
                            let lastMovingIndex = -1;
                            for (let i = 1; i < gpsData.length; i++) {
                                if (((_b = gpsData[i].speed) !== null && _b !== void 0 ? _b : 0) > 3) {
                                    lastMovingIndex = i;
                                    break;
                                }
                            }
                            if (lastMovingIndex !== -1) {
                                const lastMovingTime = gpsData[lastMovingIndex].timestamp;
                                const stoppageMinutes = getMinutesDifference(currentTime, lastMovingTime !== null && lastMovingTime !== void 0 ? lastMovingTime : 0);
                                // Check if the stoppage duration exceeds the threshold
                                if (stoppageMinutes >= thresholdMinutes) {
                                    // Check if the vehicle has moved significantly since stopping
                                    const epsilon = 50; // 50 meters threshold
                                    let hasMovedSignificantly = false;
                                    for (let i = 0; i < lastMovingIndex; i++) {
                                        const distance = calculateDistance((_c = latestGps.latitude) !== null && _c !== void 0 ? _c : 0, (_d = latestGps.longitude) !== null && _d !== void 0 ? _d : 0, (_e = gpsData[i].latitude) !== null && _e !== void 0 ? _e : 0, (_f = gpsData[i].longitude) !== null && _f !== void 0 ? _f : 0);
                                        if (distance > epsilon) {
                                            hasMovedSignificantly = true;
                                            break;
                                        }
                                    }
                                    if (!hasMovedSignificantly) {
                                        // Vehicle has been stopped without significant movement
                                        yield createStoppageAlert(alarmConfig.id, vehicle.vehicleNumber, stoppageMinutes);
                                    }
                                }
                            }
                        }
                        else {
                            // Vehicle is moving, deactivate any existing stoppage alerts
                            yield deactivateStoppageAlert(alarmConfig.id, vehicle.vehicleNumber);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error("Error processing stoppage alerts:", error);
            throw error;
        }
    });
}
// Helper function to create stoppage alert
function createStoppageAlert(alarmId, vehicleNumber, stoppageMinutes) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Always create a new alert when stoppage condition is met
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
            console.error("Error creating stoppage alert:", error);
            throw error;
        }
    });
}
// Helper function to deactivate stoppage alert
function deactivateStoppageAlert(alarmId, vehicleNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Find active alert for this vehicle and alarm
            const activeAlert = yield db
                .select({
                alertId: schema_1.alert.id
            })
                .from(schema_1.alert)
                .innerJoin(schema_1.alarm_alert, (0, drizzle_orm_1.eq)(schema_1.alert.id, schema_1.alarm_alert.alert_id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alarm_alert.alarm_id, alarmId), (0, drizzle_orm_1.eq)(schema_1.alert.status, 1) // Active alert
            ))
                .limit(1);
            if (activeAlert.length > 0) {
                // Deactivate the alert
                yield db
                    .update(schema_1.alert)
                    .set({
                    status: 0, // Inactive
                    updated_at: new Date()
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.alert.id, activeAlert[0].alertId));
            }
        }
        catch (error) {
            console.error("Error deactivating stoppage alert:", error);
            throw error;
        }
    });
}
function getMinutesDifference(timestamp1, timestamp2) {
    return Math.abs(timestamp1 - timestamp2) / 60;
}
function calculateDistance(lat1, lon1, lat2, lon2) {
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
