"use strict";
// crud for alarm management
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
exports.searchAlarms = exports.deleteAlarm = exports.updateAlarm = exports.createAlarm = exports.getAlarmById = exports.getAllAlarms = void 0;
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const mysql2_1 = require("drizzle-orm/mysql2");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
// Get all alarms
const getAllAlarms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const alarms = yield db.select().from(schema_1.alarm);
        return res.status(200).json({ success: true, data: alarms });
    }
    catch (error) {
        console.error("Error fetching alarms:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch alarms", error });
    }
});
exports.getAllAlarms = getAllAlarms;
// Get alarm by ID
const getAlarmById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const alarmData = yield db.select().from(schema_1.alarm).where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        if (alarmData.length === 0) {
            return res.status(404).json({ success: false, message: "Alarm not found" });
        }
        // Get related phone numbers
        const phoneNumbers = yield db.select().from(schema_1.alarm_phoneNumber).where((0, drizzle_orm_1.eq)(schema_1.alarm_phoneNumber.alarm_id, parseInt(id)));
        // Get related emails
        const emails = yield db.select().from(schema_1.alarm_email).where((0, drizzle_orm_1.eq)(schema_1.alarm_email.alarm_id, parseInt(id)));
        // Get related vehicle groups
        const vehicleGroups = yield db.select().from(schema_1.alarm_group).where((0, drizzle_orm_1.eq)(schema_1.alarm_group.alarm_id, parseInt(id)));
        // Get related geofence groups
        const geofenceGroups = yield db.select().from(schema_1.alarm_geofence_group)
            .where((0, drizzle_orm_1.eq)(schema_1.alarm_geofence_group.alarm_id, parseInt(id)));
        // Get related customer groups
        const customerGroups = yield db.select().from(schema_1.alarm_customer_group)
            .where((0, drizzle_orm_1.eq)(schema_1.alarm_customer_group.alarm_id, parseInt(id)));
        return res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, alarmData[0]), { phoneNumbers,
                emails,
                vehicleGroups,
                geofenceGroups,
                customerGroups })
        });
    }
    catch (error) {
        console.error("Error fetching alarm:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch alarm", error });
    }
});
exports.getAlarmById = getAlarmById;
// Create new alarm
const createAlarm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { alarm_type_id, alarm_category, alarm_value, alarm_status, rest_duration, geofence_status, alarm_generation, active_start_time_range, active_end_time_range, active_trip, descrption, phoneNumbers, emails, vehicleGroups, geofenceGroups, customerGroups } = req.body;
        // Validate required fields
        if (!alarm_type_id || !alarm_category) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: alarm_type_id and alarm_category are required"
            });
        }
        // Insert alarm
        const result = yield db.insert(schema_1.alarm).values({
            alarm_type_id,
            alarm_category,
            alarm_value,
            alarm_status,
            rest_duration,
            geofence_status,
            alarm_generation,
            active_start_time_range,
            active_end_time_range,
            active_trip,
            descrption
        }).$returningId();
        const newAlarmId = result[0].id;
        // Insert related phone numbers if provided
        if (phoneNumbers && Array.isArray(phoneNumbers)) {
            for (const phoneNumber of phoneNumbers) {
                yield db.insert(schema_1.alarm_phoneNumber).values({
                    phone_number: phoneNumber,
                    alarm_id: newAlarmId
                });
            }
        }
        // Insert related emails if provided
        if (emails && Array.isArray(emails)) {
            for (const email of emails) {
                yield db.insert(schema_1.alarm_email).values({
                    email_address: email,
                    alarm_id: newAlarmId
                });
            }
        }
        // Insert related vehicle groups if provided
        if (vehicleGroups && Array.isArray(vehicleGroups)) {
            for (const groupId of vehicleGroups) {
                yield db.insert(schema_1.alarm_group).values({
                    alarm_id: newAlarmId,
                    vehicle_group_id: groupId
                });
            }
        }
        // Insert related geofence groups if provided
        if (geofenceGroups && Array.isArray(geofenceGroups)) {
            for (const groupId of geofenceGroups) {
                yield db.insert(schema_1.alarm_geofence_group).values({
                    alarm_id: newAlarmId,
                    geofence_group_id: groupId
                });
            }
        }
        // Insert related customer groups if provided
        if (customerGroups && Array.isArray(customerGroups)) {
            for (const groupId of customerGroups) {
                yield db.insert(schema_1.alarm_customer_group).values({
                    alarm_id: newAlarmId,
                    customer_group_id: groupId
                });
            }
        }
        return res.status(201).json({
            success: true,
            message: "Alarm created successfully",
            data: { id: newAlarmId }
        });
    }
    catch (error) {
        console.error("Error creating alarm:", error);
        return res.status(500).json({ success: false, message: "Failed to create alarm", error });
    }
});
exports.createAlarm = createAlarm;
// Update alarm by ID
const updateAlarm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { alarm_type_id, alarm_category, alarm_value, alarm_status, rest_duration, geofence_status, alarm_generation, active_start_time_range, active_end_time_range, active_trip, descrption, phoneNumbers, emails, vehicleGroups, geofenceGroups, customerGroups } = req.body;
        // Check if alarm exists
        const existingAlarm = yield db.select().from(schema_1.alarm).where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        if (existingAlarm.length === 0) {
            return res.status(404).json({ success: false, message: "Alarm not found" });
        }
        // Get current Indian time
        const getIndianTime = () => {
            const now = new Date();
            const indianTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Add 5 hours 30 minutes
            return indianTime;
        };
        // Update alarm
        yield db.update(schema_1.alarm)
            .set({
            alarm_type_id,
            alarm_category,
            alarm_value,
            alarm_status,
            rest_duration,
            geofence_status,
            alarm_generation,
            active_start_time_range,
            active_end_time_range,
            active_trip,
            descrption,
            updated_at: getIndianTime()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        // Update phone numbers if provided
        if (phoneNumbers && Array.isArray(phoneNumbers)) {
            // Remove existing phone numbers
            yield db.delete(schema_1.alarm_phoneNumber).where((0, drizzle_orm_1.eq)(schema_1.alarm_phoneNumber.alarm_id, parseInt(id)));
            // Add new phone numbers
            for (const phoneNumber of phoneNumbers) {
                yield db.insert(schema_1.alarm_phoneNumber).values({
                    phone_number: phoneNumber,
                    alarm_id: parseInt(id)
                });
            }
            // Update main alarm's updated_at since related data changed
            yield db.update(schema_1.alarm)
                .set({ updated_at: getIndianTime() })
                .where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        }
        // Update emails if provided
        if (emails && Array.isArray(emails)) {
            // Remove existing emails
            yield db.delete(schema_1.alarm_email).where((0, drizzle_orm_1.eq)(schema_1.alarm_email.alarm_id, parseInt(id)));
            // Add new emails
            for (const email of emails) {
                yield db.insert(schema_1.alarm_email).values({
                    email_address: email,
                    alarm_id: parseInt(id)
                });
            }
            // Update main alarm's updated_at since related data changed
            yield db.update(schema_1.alarm)
                .set({ updated_at: getIndianTime() })
                .where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        }
        // Update vehicle groups if provided
        if (vehicleGroups && Array.isArray(vehicleGroups)) {
            // Remove existing vehicle groups
            yield db.delete(schema_1.alarm_group).where((0, drizzle_orm_1.eq)(schema_1.alarm_group.alarm_id, parseInt(id)));
            // Add new vehicle groups
            for (const groupId of vehicleGroups) {
                yield db.insert(schema_1.alarm_group).values({
                    alarm_id: parseInt(id),
                    vehicle_group_id: groupId
                });
            }
            // Update main alarm's updated_at since related data changed
            yield db.update(schema_1.alarm)
                .set({ updated_at: getIndianTime() })
                .where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        }
        // Update geofence groups if provided
        if (geofenceGroups && Array.isArray(geofenceGroups)) {
            // Remove existing geofence groups
            yield db.delete(schema_1.alarm_geofence_group)
                .where((0, drizzle_orm_1.eq)(schema_1.alarm_geofence_group.alarm_id, parseInt(id)));
            // Add new geofence groups
            for (const groupId of geofenceGroups) {
                yield db.insert(schema_1.alarm_geofence_group).values({
                    alarm_id: parseInt(id),
                    geofence_group_id: groupId
                });
            }
            // Update main alarm's updated_at since related data changed
            yield db.update(schema_1.alarm)
                .set({ updated_at: getIndianTime() })
                .where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        }
        // Update customer groups if provided
        if (customerGroups && Array.isArray(customerGroups)) {
            // Remove existing customer groups
            yield db.delete(schema_1.alarm_customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.alarm_customer_group.alarm_id, parseInt(id)));
            // Add new customer groups
            for (const groupId of customerGroups) {
                yield db.insert(schema_1.alarm_customer_group).values({
                    alarm_id: parseInt(id),
                    customer_group_id: groupId
                });
            }
            // Update main alarm's updated_at since related data changed
            yield db.update(schema_1.alarm)
                .set({ updated_at: getIndianTime() })
                .where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        }
        return res.status(200).json({
            success: true,
            message: "Alarm updated successfully"
        });
    }
    catch (error) {
        console.error("Error updating alarm:", error);
        return res.status(500).json({ success: false, message: "Failed to update alarm", error });
    }
});
exports.updateAlarm = updateAlarm;
// Delete alarm by ID
const deleteAlarm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if alarm exists
        const existingAlarm = yield db.select().from(schema_1.alarm).where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        if (existingAlarm.length === 0) {
            return res.status(404).json({ success: false, message: "Alarm not found" });
        }
        // Delete related records first to maintain referential integrity
        yield db.delete(schema_1.alarm_phoneNumber).where((0, drizzle_orm_1.eq)(schema_1.alarm_phoneNumber.alarm_id, parseInt(id)));
        yield db.delete(schema_1.alarm_email).where((0, drizzle_orm_1.eq)(schema_1.alarm_email.alarm_id, parseInt(id)));
        yield db.delete(schema_1.alarm_group).where((0, drizzle_orm_1.eq)(schema_1.alarm_group.alarm_id, parseInt(id)));
        yield db.delete(schema_1.alarm_geofence_group).where((0, drizzle_orm_1.eq)(schema_1.alarm_geofence_group.alarm_id, parseInt(id)));
        yield db.delete(schema_1.alarm_customer_group).where((0, drizzle_orm_1.eq)(schema_1.alarm_customer_group.alarm_id, parseInt(id)));
        // Delete the alarm
        yield db.delete(schema_1.alarm).where((0, drizzle_orm_1.eq)(schema_1.alarm.id, parseInt(id)));
        return res.status(200).json({
            success: true,
            message: "Alarm and related data deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting alarm:", error);
        return res.status(500).json({ success: false, message: "Failed to delete alarm", error });
    }
});
exports.deleteAlarm = deleteAlarm;
// Search alarms by criteria
const searchAlarms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { alarm_category, alarm_type_id, active_trip } = req.query;
        const conditions = [];
        if (alarm_category) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.alarm.alarm_category, alarm_category));
        }
        if (alarm_type_id) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.alarm.alarm_type_id, parseInt(alarm_type_id)));
        }
        if (active_trip !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.alarm.active_trip, active_trip === 'true'));
        }
        let alarms;
        if (conditions.length > 0) {
            alarms = yield db.select().from(schema_1.alarm).where((0, drizzle_orm_1.and)(...conditions));
        }
        else {
            alarms = yield db.select().from(schema_1.alarm);
        }
        return res.status(200).json({
            success: true,
            count: alarms.length,
            data: alarms
        });
    }
    catch (error) {
        console.error("Error searching alarms:", error);
        return res.status(500).json({ success: false, message: "Failed to search alarms", error });
    }
});
exports.searchAlarms = searchAlarms;
