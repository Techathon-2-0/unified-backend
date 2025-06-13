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
exports.processOverspeedingAlerts = processOverspeedingAlerts;
const mysql2_1 = require("drizzle-orm/mysql2");
const drizzle_orm_1 = require("drizzle-orm");
// import { alarm } from "../db/schema";
const schema_1 = require("../db/schema");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
function processOverspeedingAlerts() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get all overspeeding alarms
            const overspeedingAlarms = yield db
                .select()
                .from(schema_1.alarm)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alarm.alarm_category, "Overspeeding"), (0, drizzle_orm_1.eq)(schema_1.alarm.alarm_status, true)));
            for (const alarmConfig of overspeedingAlarms) {
                // Get speed threshold from alarm configuration
                const speedThreshold = alarmConfig.alarm_value;
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
                    // Get latest GPS data
                    const latestGpsData = yield db
                        .select()
                        .from(schema_1.gps_schema)
                        .where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, vehicle.vehicleNumber))
                        .orderBy((0, drizzle_orm_1.sql) `${schema_1.gps_schema.timestamp} DESC`)
                        .limit(1);
                    if (latestGpsData.length > 0) {
                        const gpsData = latestGpsData[0];
                        // Check if vehicle is overspeeding
                        if (gpsData.speed !== null && gpsData.speed !== undefined && gpsData.speed > speedThreshold) {
                            // Always create a new alert when overspeeding condition is met
                            const [newAlert] = yield db
                                .insert(schema_1.alert)
                                .values({
                                alert_type: alarmConfig.id,
                                status: 1 // Active
                            })
                                .$returningId();
                            // Link alert to alarm
                            yield db
                                .insert(schema_1.alarm_alert)
                                .values({
                                alarm_id: alarmConfig.id,
                                alert_id: newAlert.id
                            });
                            // If vehicle is linked to a shipment, link alert to shipment
                            const vehicleShipment = yield db
                                .select({
                                shipmentId: schema_1.equipment.shipment_id
                            })
                                .from(schema_1.equipment)
                                .where((0, drizzle_orm_1.eq)(schema_1.equipment.equipment_id, vehicle.vehicleNumber))
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
                        else {
                            // Vehicle is not overspeeding, check if there's an active alert to deactivate
                            const activeAlert = yield db
                                .select({
                                alertId: schema_1.alert.id
                            })
                                .from(schema_1.alert)
                                .innerJoin(schema_1.alarm_alert, (0, drizzle_orm_1.eq)(schema_1.alert.id, schema_1.alarm_alert.alert_id))
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alarm_alert.alarm_id, alarmConfig.id), (0, drizzle_orm_1.eq)(schema_1.alert.status, 1) // Active alert
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
                    }
                }
            }
        }
        catch (error) {
            console.error("Error processing overspeeding alerts:", error);
            throw error;
        }
    });
}
