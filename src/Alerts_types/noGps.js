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
exports.processNoGPSFeedAlerts = processNoGPSFeedAlerts;
const mysql2_1 = require("drizzle-orm/mysql2");
const drizzle_orm_1 = require("drizzle-orm");
// import { alarm } from "../db/schema";
const schema_1 = require("../db/schema");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
function processNoGPSFeedAlerts() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get all no GPS feed alarms
            const noGpsAlarms = yield db
                .select()
                .from(schema_1.alarm)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alarm.alarm_type_id, 4), (0, drizzle_orm_1.eq)(schema_1.alarm.alarm_status, true)));
            for (const alarmConfig of noGpsAlarms) {
                // Get threshold in minutes from alarm configuration
                const thresholdMinutes = 180; // Default threshold, can be fetched from alarmConfig if needed
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
                // Check GPS feed for each vehicle
                for (const vehicle of vehicleEntities) {
                    // Get latest GPS data
                    const latestGps = yield db
                        .select()
                        .from(schema_1.gps_schema)
                        .where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, vehicle.vehicleNumber))
                        .orderBy((0, drizzle_orm_1.sql) `${schema_1.gps_schema.timestamp} DESC`)
                        .limit(1);
                    if (latestGps.length > 0) {
                        const lastUpdateTime = latestGps[0].timestamp;
                        const currentTime = Math.floor(Date.now() / 1000);
                        if (lastUpdateTime !== null && lastUpdateTime !== undefined) {
                            const timeSinceLastUpdateMinutes = getMinutesDifference(currentTime, lastUpdateTime);
                            // Check if time since last update exceeds threshold
                            if (timeSinceLastUpdateMinutes >= thresholdMinutes) {
                                yield createNoGpsFeedAlert(alarmConfig.id, vehicle.vehicleNumber, timeSinceLastUpdateMinutes);
                            }
                            else {
                                yield deactivateNoGpsFeedAlert(alarmConfig.id, vehicle.vehicleNumber);
                            }
                        }
                        else {
                            // No valid timestamp, treat as no GPS data
                            yield createNoGpsFeedAlert(alarmConfig.id, vehicle.vehicleNumber, thresholdMinutes);
                        }
                    }
                    else {
                        // No GPS data at all for this vehicle
                        yield createNoGpsFeedAlert(alarmConfig.id, vehicle.vehicleNumber, thresholdMinutes);
                    }
                }
            }
        }
        catch (error) {
            console.error("Error processing no GPS feed alerts:", error);
            throw error;
        }
    });
}
// Helper function to create no GPS feed alert
function createNoGpsFeedAlert(alarmId, vehicleNumber, timeWithoutUpdateMinutes) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Check if there's already an active alert for this vehicle and alarm
            const existingAlert = yield db
                .select()
                .from(schema_1.alert)
                .innerJoin(schema_1.alarm_alert, (0, drizzle_orm_1.eq)(schema_1.alert.id, schema_1.alarm_alert.alert_id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alarm_alert.alarm_id, alarmId), (0, drizzle_orm_1.eq)(schema_1.alert.status, 1) // Active alert
            ))
                .limit(1);
            if (existingAlert.length === 0) {
                // Insert new alert
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
        }
        catch (error) {
            console.error("Error creating no GPS feed alert:", error);
            throw error;
        }
    });
}
// Helper function to deactivate no GPS feed alert
function deactivateNoGpsFeedAlert(alarmId, vehicleNumber) {
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
            console.error("Error deactivating no GPS feed alert:", error);
            throw error;
        }
    });
}
function getMinutesDifference(timestamp1, timestamp2) {
    return Math.abs(timestamp1 - timestamp2) / 60;
}
