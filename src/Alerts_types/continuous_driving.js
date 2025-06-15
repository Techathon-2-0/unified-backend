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
exports.processContinuousDrivingAlerts = processContinuousDrivingAlerts;
const mysql2_1 = require("drizzle-orm/mysql2");
const drizzle_orm_1 = require("drizzle-orm");
// import { alarm } from "../db/schema";
const schema_1 = require("../db/schema");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
function processContinuousDrivingAlerts() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        try {
            // Get all continuous driving alarms
            const continuousDrivingAlarms = yield db
                .select()
                .from(schema_1.alarm)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alarm.alarm_category, "Continuous Driving"), (0, drizzle_orm_1.eq)(schema_1.alarm.alarm_status, true)));
            for (const alarmConfig of continuousDrivingAlarms) {
                // Get threshold in hours from alarm configuration
                const thresholdHours = alarmConfig.alarm_value;
                const thresholdMinutes = thresholdHours * 60;
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
                // Check driving patterns for each vehicle
                for (const vehicle of vehicleEntities) {
                    // Get GPS data for the last few hours, ordered by timestamp
                    const startTime = Math.floor(Date.now() / 1000) - (thresholdHours * 3600);
                    const gpsData = yield db
                        .select()
                        .from(schema_1.gps_schema)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, vehicle.vehicleNumber), (0, drizzle_orm_1.gte)(schema_1.gps_schema.timestamp, startTime)))
                        .orderBy(schema_1.gps_schema.timestamp);
                    if (gpsData.length > 0) {
                        // Find periods of continuous driving
                        let drivingStartTime = null;
                        let continuousDrivingMinutes = 0;
                        let lastRestTime = null;
                        for (let i = 0; i < gpsData.length; i++) {
                            const currentGps = gpsData[i];
                            const isMoving = ((_a = currentGps.speed) !== null && _a !== void 0 ? _a : 0) > 3; // Speed greater than 3 km/h, treat null as 0
                            if (isMoving) {
                                if (drivingStartTime === null) {
                                    // Start of a new driving period
                                    drivingStartTime = currentGps.timestamp;
                                }
                                if (i < gpsData.length - 1) {
                                    // Calculate time gap to next record
                                    const nextGps = gpsData[i + 1];
                                    const timeDiffMinutes = getMinutesDifference((_b = nextGps.timestamp) !== null && _b !== void 0 ? _b : 0, (_c = currentGps.timestamp) !== null && _c !== void 0 ? _c : 0);
                                    if (timeDiffMinutes > 15) {
                                        // Gap in data, assume rest period
                                        drivingStartTime = null;
                                        lastRestTime = nextGps.timestamp;
                                    }
                                }
                            }
                            else {
                                // Vehicle is stopped
                                if (drivingStartTime !== null) {
                                    // End of a driving period
                                    const stoppedTime = currentGps.timestamp;
                                    const drivingDurationMinutes = getMinutesDifference(stoppedTime !== null && stoppedTime !== void 0 ? stoppedTime : 0, drivingStartTime !== null && drivingStartTime !== void 0 ? drivingStartTime : 0);
                                    if (drivingDurationMinutes >= 15) {
                                        // Add to continuous driving if stop is short
                                        continuousDrivingMinutes += drivingDurationMinutes;
                                    }
                                    drivingStartTime = null;
                                }
                                // Check if this is a rest period (stopped for more than 30 minutes)
                                if (i < gpsData.length - 1) {
                                    const nextGps = gpsData[i + 1];
                                    const stopDurationMinutes = getMinutesDifference((_d = nextGps.timestamp) !== null && _d !== void 0 ? _d : 0, (_e = currentGps.timestamp) !== null && _e !== void 0 ? _e : 0);
                                    const restDurationMinutes = (_f = alarmConfig.rest_duration) !== null && _f !== void 0 ? _f : 30; // Define rest period threshold, default to 30 if null
                                    if (restDurationMinutes !== null && restDurationMinutes !== undefined && stopDurationMinutes >= restDurationMinutes) {
                                        continuousDrivingMinutes = 0;
                                        lastRestTime = nextGps.timestamp;
                                    }
                                }
                            }
                        }
                        // If still driving at the end of data
                        if (drivingStartTime !== null) {
                            const currentTime = Math.floor(Date.now() / 1000);
                            const finalDrivingMinutes = getMinutesDifference(currentTime, drivingStartTime !== null && drivingStartTime !== void 0 ? drivingStartTime : 0);
                            continuousDrivingMinutes += finalDrivingMinutes;
                        }
                        // Check if continuous driving exceeds threshold
                        if (continuousDrivingMinutes >= thresholdMinutes) {
                            yield createContinuousDrivingAlert(alarmConfig.id, vehicle.vehicleNumber, continuousDrivingMinutes);
                        }
                        else {
                            yield deactivateContinuousDrivingAlert(alarmConfig.id, vehicle.vehicleNumber);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error("Error processing continuous driving alerts:", error);
            throw error;
        }
    });
}
// Helper function to create continuous driving alert
function createContinuousDrivingAlert(alarmId, vehicleNumber, drivingMinutes) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Always create a new alert when continuous driving condition is met
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
            console.error("Error creating continuous driving alert:", error);
            throw error;
        }
    });
}
// Helper function to deactivate continuous driving alert
function deactivateContinuousDrivingAlert(alarmId, vehicleNumber) {
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
            console.error("Error deactivating continuous driving alert:", error);
            throw error;
        }
    });
}
function getMinutesDifference(timestamp1, timestamp2) {
    return Math.abs(timestamp1 - timestamp2) / 60;
}
