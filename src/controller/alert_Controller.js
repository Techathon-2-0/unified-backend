"use strict";
// normal get all alerts , alert by user_id (i.e which geofence group access, vehicle group access , cusotmer group access)
// by default all if some feilds have not selected , if two feilds are selected intersection 
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
exports.getGeofenceAlertsByVehicle = exports.getAlertsByShipment = exports.getAlertCountsByTrip = exports.toggleAlertStatus = exports.getAlertsByUserAccess = exports.getAllAlerts = void 0;
const mysql2_1 = require("drizzle-orm/mysql2");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
// Utility: Calculate time difference in minutes
function getMinutesDifference(timestamp1, timestamp2) {
    return Math.abs(timestamp1 - timestamp2) / 60;
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
const getAllAlerts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, vehicleNumber, alarmType, startDate, endDate, limit = 50, offset = 0 } = req.query;
        const conditions = [];
        // Filter by status
        if (status !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.alert.status, parseInt(status)));
        }
        // Filter by date range
        if (startDate && endDate) {
            conditions.push((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.alert.created_at, new Date(startDate)), (0, drizzle_orm_1.lte)(schema_1.alert.created_at, new Date(endDate))));
        }
        let alerts;
        let total = 0;
        // Join with alarm and entity to get vehicle info
        if (conditions.length > 0) {
            // Get total count
            const countResult = yield db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(schema_1.alert)
                .where((0, drizzle_orm_1.and)(...conditions));
            total = Number(countResult[0].count);
            // Get paginated results
            alerts = yield db
                .select({
                id: schema_1.alert.id,
                status: schema_1.alert.status,
                alarmId: schema_1.alert.alert_type,
                createdAt: schema_1.alert.created_at,
                updatedAt: schema_1.alert.updated_at
            })
                .from(schema_1.alert)
                .where((0, drizzle_orm_1.and)(...conditions))
                .limit(Number(limit))
                .offset(Number(offset));
        }
        else {
            // Get total count without filters
            const countResult = yield db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(schema_1.alert);
            total = Number(countResult[0].count);
            // Get paginated results without filters
            alerts = yield db
                .select({
                id: schema_1.alert.id,
                status: schema_1.alert.status,
                alarmId: schema_1.alert.alert_type,
                createdAt: schema_1.alert.created_at,
                updatedAt: schema_1.alert.updated_at
            })
                .from(schema_1.alert)
                .limit(Number(limit))
                .offset(Number(offset));
        }
        // Enhance alerts with additional information
        const enhancedAlerts = yield Promise.all(alerts.map((alertItem) => __awaiter(void 0, void 0, void 0, function* () {
            // Get alarm details
            let alarmDetails = [];
            if (alertItem.alarmId !== null && alertItem.alarmId !== undefined) {
                alarmDetails = yield db
                    .select()
                    .from(schema_1.alarm)
                    .where((0, drizzle_orm_1.eq)(schema_1.alarm.id, alertItem.alarmId))
                    .limit(1);
            }
            // Find related entity/vehicle
            const alertEntity = yield db
                .select({
                vehicleId: schema_1.entity.id,
                vehicleNumber: schema_1.entity.vehicleNumber
            })
                .from(schema_1.alarm_alert)
                .innerJoin(schema_1.alarm_group, (0, drizzle_orm_1.eq)(schema_1.alarm_alert.alarm_id, schema_1.alarm_group.alarm_id))
                .innerJoin(schema_1.group_entity, (0, drizzle_orm_1.eq)(schema_1.alarm_group.vehicle_group_id, schema_1.group_entity.group_id))
                .innerJoin(schema_1.entity, (0, drizzle_orm_1.eq)(schema_1.group_entity.entity_id, schema_1.entity.id))
                .where((0, drizzle_orm_1.eq)(schema_1.alarm_alert.alert_id, alertItem.id))
                .limit(1);
            return Object.assign(Object.assign({}, alertItem), { alarmDetails: alarmDetails[0] || null, vehicleInfo: alertEntity[0] || null });
        })));
        return res.status(200).json({
            success: true,
            total,
            count: enhancedAlerts.length,
            data: enhancedAlerts
        });
    }
    catch (error) {
        console.error("Error fetching alerts:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch alerts",
            error
        });
    }
});
exports.getAllAlerts = getAllAlerts;
const getAlertsByUserAccess = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        // Get vehicle groups the user has access to
        const userVehicleGroups = yield db
            .select({
            groupId: schema_1.user_group.vehicle_group_id
        })
            .from(schema_1.user_group)
            .where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, parseInt(userId)));
        const vehicleGroupIds = userVehicleGroups.map(g => g.groupId);
        // Get geofence groups the user has access to
        const userGeofenceGroups = yield db
            .select({
            groupId: schema_1.user_geofence_group.geofence_group_id
        })
            .from(schema_1.user_geofence_group)
            .where((0, drizzle_orm_1.eq)(schema_1.user_geofence_group.user_id, parseInt(userId)));
        const geofenceGroupIds = userGeofenceGroups.map(g => g.groupId);
        // Get customer groups the user has access to
        const userCustomerGroups = yield db
            .select({
            groupId: schema_1.user_customer_group.customer_group_id
        })
            .from(schema_1.user_customer_group)
            .where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, parseInt(userId)));
        const customerGroupIds = userCustomerGroups.map(g => g.groupId);
        // Find all entities (vehicles) related to user's vehicle groups
        const userEntities = yield db
            .select({
            entityId: schema_1.group_entity.entity_id
        })
            .from(schema_1.group_entity)
            .where((0, drizzle_orm_1.inArray)(schema_1.group_entity.group_id, vehicleGroupIds.filter((id) => id !== null)));
        const entityIds = userEntities.map(e => e.entityId);
        // Find alerts related to these entities
        const userAlerts = yield db
            .select({
            alertId: schema_1.alert.id,
            status: schema_1.alert.status,
            alarmId: schema_1.alert.alert_type,
            createdAt: schema_1.alert.created_at
        })
            .from(schema_1.alert)
            .innerJoin(schema_1.alarm_alert, (0, drizzle_orm_1.eq)(schema_1.alert.id, schema_1.alarm_alert.alert_id))
            .innerJoin(schema_1.alarm_group, (0, drizzle_orm_1.eq)(schema_1.alarm_alert.alarm_id, schema_1.alarm_group.alarm_id))
            .innerJoin(schema_1.group_entity, (0, drizzle_orm_1.eq)(schema_1.alarm_group.vehicle_group_id, schema_1.group_entity.group_id))
            .where((0, drizzle_orm_1.inArray)(schema_1.group_entity.entity_id, entityIds))
            .orderBy(schema_1.alert.created_at);
        return res.status(200).json({
            success: true,
            count: userAlerts.length,
            data: userAlerts
        });
    }
    catch (error) {
        console.error("Error fetching user alerts:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user alerts",
            error
        });
    }
});
exports.getAlertsByUserAccess = getAlertsByUserAccess;
const toggleAlertStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // This is the alert ID
        const { status, shipmentId } = req.body;
        if (![0, 1, 2].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value. Must be 0 (inactive), 1 (active), or 2 (manually closed)"
            });
        }
        // Check if alert exists
        const existingAlert = yield db
            .select({
            id: schema_1.alert.id,
            status: schema_1.alert.status,
            alert_type: schema_1.alert.alert_type
        })
            .from(schema_1.alert)
            .where((0, drizzle_orm_1.eq)(schema_1.alert.id, parseInt(id)))
            .limit(1);
        if (existingAlert.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }
        const currentAlert = existingAlert[0];
        // If trying to manually close (status = 2), check additional conditions
        if (status === 2) {
            // Check if current status is active (1)
            if (currentAlert.status !== 1) {
                return res.status(400).json({
                    success: false,
                    message: "Only active alerts can be manually closed"
                });
            }
            // Check if alert type is allowed for manual closure
            if (currentAlert.alert_type) {
                const alarmDetails = yield db
                    .select({
                    alarm_type_id: schema_1.alarm.alarm_type_id
                })
                    .from(schema_1.alarm)
                    .where((0, drizzle_orm_1.eq)(schema_1.alarm.id, currentAlert.alert_type))
                    .limit(1);
                if (alarmDetails.length > 0) {
                    const alarmTypeId = alarmDetails[0].alarm_type_id;
                    // Define allowed alarm types for manual closure
                    // 1 = Overspeeding, 2 = Continuous driving, 3 = Route deviation, 4 = Stoppage
                    const allowedAlarmTypes = [1, 2, 3, 4];
                    if (!allowedAlarmTypes.includes(alarmTypeId)) {
                        return res.status(400).json({
                            success: false,
                            message: "This alert type cannot be manually closed. Only Overspeeding, Continuous driving, Route deviation, and Stoppage alerts can be manually closed."
                        });
                    }
                }
            }
            // If shipmentId is provided, verify the alert belongs to that shipment
            if (shipmentId) {
                const alertShipmentRelation = yield db
                    .select()
                    .from(schema_1.alert_shipment_relation)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alert_shipment_relation.alert_id, parseInt(id)), (0, drizzle_orm_1.eq)(schema_1.alert_shipment_relation.shipment_id, parseInt(shipmentId))))
                    .limit(1);
                if (alertShipmentRelation.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Alert does not belong to the specified shipment"
                    });
                }
            }
        }
        // Update alert status
        yield db
            .update(schema_1.alert)
            .set({
            status: status,
            updated_at: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.alert.id, parseInt(id)));
        // If shipmentId is provided, also update the alert_shipment_relation
        if (shipmentId && status === 2) {
            yield db
                .update(schema_1.alert_shipment_relation)
                .set({
                alert_method: 2, // Set to manually closed
                updated_at: new Date()
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alert_shipment_relation.alert_id, parseInt(id)), (0, drizzle_orm_1.eq)(schema_1.alert_shipment_relation.shipment_id, parseInt(shipmentId))));
        }
        return res.status(200).json({
            success: true,
            message: `Alert status updated successfully to ${status === 0 ? 'inactive' : status === 1 ? 'active' : 'manually closed'}`
        });
    }
    catch (error) {
        console.error("Error updating alert status:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update alert status",
            error
        });
    }
});
exports.toggleAlertStatus = toggleAlertStatus;
// shipment id de or terko uske against saare alert miljaaege , count bhi dena hain , manuallly closed ke ske frontend pr 
// Get alert counts for a specific trip
const getAlertCountsByTrip = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { shipmentId } = req.params;
        // Get all alerts for this shipment
        const alertCounts = yield db
            .select({
            total: (0, drizzle_orm_1.sql) `COUNT(*)`,
            active: (0, drizzle_orm_1.sql) `SUM(CASE WHEN ${schema_1.alert.status} = 1 THEN 1 ELSE 0 END)`,
            inactive: (0, drizzle_orm_1.sql) `SUM(CASE WHEN ${schema_1.alert.status} = 0 THEN 1 ELSE 0 END)`,
            manuallyClosed: (0, drizzle_orm_1.sql) `SUM(CASE WHEN ${schema_1.alert.status} = 2 THEN 1 ELSE 0 END)`
        })
            .from(schema_1.alert)
            .innerJoin(schema_1.alert_shipment_relation, (0, drizzle_orm_1.eq)(schema_1.alert.id, schema_1.alert_shipment_relation.alert_id))
            .where((0, drizzle_orm_1.eq)(schema_1.alert_shipment_relation.shipment_id, parseInt(shipmentId)));
        return res.status(200).json({
            success: true,
            data: alertCounts[0]
        });
    }
    catch (error) {
        console.error("Error fetching alert counts:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch alert counts",
            error
        });
    }
});
exports.getAlertCountsByTrip = getAlertCountsByTrip;
const getAlertsByShipment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { shipmentId } = req.params;
        const { status } = req.query; // Optional filter by status
        let conditions = [(0, drizzle_orm_1.eq)(schema_1.alert_shipment_relation.shipment_id, parseInt(shipmentId))];
        // Add status filter if provided
        if (status !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.alert.status, parseInt(status)));
        }
        // Get alerts with their alarm details
        const alertsData = yield db
            .select({
            alert_id: schema_1.alert.id,
            alert_status: schema_1.alert.status,
            alert_created_at: schema_1.alert.created_at,
            alert_updated_at: schema_1.alert.updated_at,
            alarm_id: schema_1.alarm.id,
            alarm_type_id: schema_1.alarm.alarm_type_id,
            alarm_category: schema_1.alarm.alarm_category,
            alarm_description: schema_1.alarm.descrption,
            shipment_id: schema_1.alert_shipment_relation.shipment_id,
            alert_method: schema_1.alert_shipment_relation.alert_method
        })
            .from(schema_1.alert_shipment_relation)
            .innerJoin(schema_1.alert, (0, drizzle_orm_1.eq)(schema_1.alert_shipment_relation.alert_id, schema_1.alert.id))
            .leftJoin(schema_1.alarm, (0, drizzle_orm_1.eq)(schema_1.alert.alert_type, schema_1.alarm.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy(schema_1.alert.created_at);
        // Group alerts by type and add manual closure capability info
        const enhancedAlerts = alertsData.map(alertItem => {
            const alarmTypeId = alertItem.alarm_type_id;
            const canManuallyClose = alarmTypeId && [1, 2, 3, 4].includes(alarmTypeId) && alertItem.alert_status === 1;
            let alertTypeName = "Unknown";
            switch (alarmTypeId) {
                case 1:
                    alertTypeName = "Overspeeding";
                    break;
                case 2:
                    alertTypeName = "Continuous driving";
                    break;
                case 3:
                    alertTypeName = "Route deviation";
                    break;
                case 4:
                    alertTypeName = "Stoppage";
                    break;
                default: alertTypeName = alertItem.alarm_description || "Unknown";
            }
            return {
                alert_id: alertItem.alert_id,
                alert_type_name: alertTypeName,
                alert_category: alertItem.alarm_category,
                alert_description: alertItem.alarm_description,
                status: alertItem.alert_status,
                status_text: alertItem.alert_status === 0 ? 'Inactive' :
                    alertItem.alert_status === 1 ? 'Active' : 'Manually Closed',
                can_manually_close: canManuallyClose,
                created_at: alertItem.alert_created_at,
                updated_at: alertItem.alert_updated_at
            };
        });
        return res.status(200).json({
            success: true,
            shipment_id: parseInt(shipmentId),
            total_alerts: enhancedAlerts.length,
            active_alerts: enhancedAlerts.filter(a => a.status === 1).length,
            manually_closed_alerts: enhancedAlerts.filter(a => a.status === 2).length,
            alerts: enhancedAlerts
        });
    }
    catch (error) {
        console.error("Error fetching shipment alerts:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch shipment alerts",
            error
        });
    }
});
exports.getAlertsByShipment = getAlertsByShipment;
// alert by geofence id and vehicle number  return me time when geofence alert was created and status of geofence alert , alert id , only return alerts i.e are created in less that 24 hours 
const getGeofenceAlertsByVehicle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { geofenceId, vehicleNumber } = req.params;
        if (!geofenceId || !vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: "Geofence ID and vehicle number are required"
            });
        }
        // Calculate 24 hours ago timestamp
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        // Find the vehicle entity
        const vehicleEntity = yield db
            .select({
            id: schema_1.entity.id,
            vehicleNumber: schema_1.entity.vehicleNumber
        })
            .from(schema_1.entity)
            .where((0, drizzle_orm_1.eq)(schema_1.entity.vehicleNumber, vehicleNumber))
            .limit(1);
        if (vehicleEntity.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }
        // Verify geofence exists
        const geofenceExists = yield db
            .select({
            id: schema_1.geofence_table.id,
            geofence_name: schema_1.geofence_table.geofence_name
        })
            .from(schema_1.geofence_table)
            .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, parseInt(geofenceId)))
            .limit(1);
        if (geofenceExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Geofence not found"
            });
        }
        // Get geofence alerts for the specific vehicle within last 24 hours
        const geofenceAlerts = yield db
            .select({
            alert_id: schema_1.alert.id,
            alert_status: schema_1.alert.status,
            alert_created_at: schema_1.alert.created_at,
            alert_updated_at: schema_1.alert.updated_at,
            alarm_id: schema_1.alarm.id,
            alarm_type_id: schema_1.alarm.alarm_type_id,
            alarm_category: schema_1.alarm.alarm_category,
            alarm_description: schema_1.alarm.descrption,
            geofence_status: schema_1.alarm.geofence_status,
            geofence_name: schema_1.geofence_table.geofence_name,
            vehicle_number: schema_1.entity.vehicleNumber
        })
            .from(schema_1.alert)
            .innerJoin(schema_1.alarm, (0, drizzle_orm_1.eq)(schema_1.alert.alert_type, schema_1.alarm.id))
            .innerJoin(schema_1.alarm_geofence_group, (0, drizzle_orm_1.eq)(schema_1.alarm.id, schema_1.alarm_geofence_group.alarm_id))
            .innerJoin(schema_1.geofence_group_relation, (0, drizzle_orm_1.eq)(schema_1.alarm_geofence_group.geofence_group_id, schema_1.geofence_group_relation.group_id))
            .innerJoin(schema_1.geofence_table, (0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.geofence_id, schema_1.geofence_table.id))
            .innerJoin(schema_1.alarm_group, (0, drizzle_orm_1.eq)(schema_1.alarm.id, schema_1.alarm_group.alarm_id))
            .innerJoin(schema_1.group_entity, (0, drizzle_orm_1.eq)(schema_1.alarm_group.vehicle_group_id, schema_1.group_entity.group_id))
            .innerJoin(schema_1.entity, (0, drizzle_orm_1.eq)(schema_1.group_entity.entity_id, schema_1.entity.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, parseInt(geofenceId)), (0, drizzle_orm_1.eq)(schema_1.entity.vehicleNumber, vehicleNumber), (0, drizzle_orm_1.gte)(schema_1.alert.created_at, twentyFourHoursAgo), 
        // Filter for geofence-related alarms (assuming geofence alarms have geofence_status field)
        (0, drizzle_orm_1.not)((0, drizzle_orm_1.isNull)(schema_1.alarm.geofence_status))))
            .orderBy(schema_1.alert.created_at);
        // Format the response with additional details
        const formattedAlerts = geofenceAlerts.map(alertItem => {
            let geofenceStatusText = "Unknown";
            switch (alertItem.geofence_status) {
                case 0:
                    geofenceStatusText = "Entry";
                    break;
                case 1:
                    geofenceStatusText = "Exit";
                    break;
                case 2:
                    geofenceStatusText = "Entry/Exit";
                    break;
            }
            let alertStatusText = "Unknown";
            switch (alertItem.alert_status) {
                case 0:
                    alertStatusText = "Inactive";
                    break;
                case 1:
                    alertStatusText = "Active";
                    break;
                case 2:
                    alertStatusText = "Manually Closed";
                    break;
            }
            return {
                alert_id: alertItem.alert_id,
                alert_status: alertItem.alert_status,
                alert_status_text: alertStatusText,
                geofence_event_type: geofenceStatusText,
                geofence_name: alertItem.geofence_name,
                vehicle_number: alertItem.vehicle_number,
                alarm_category: alertItem.alarm_category,
                alarm_description: alertItem.alarm_description,
                created_at: alertItem.alert_created_at,
                updated_at: alertItem.alert_updated_at,
                alarm_created_at: alertItem.alert_created_at,
            };
        });
        return res.status(200).json({
            success: true,
            geofence_id: parseInt(geofenceId),
            geofence_name: geofenceExists[0].geofence_name,
            vehicle_number: vehicleNumber,
            total_alerts: formattedAlerts.length,
            time_filter: "Last 24 hours",
            alerts: formattedAlerts
        });
    }
    catch (error) {
        console.error("Error fetching geofence alerts by vehicle:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch geofence alerts",
            error
        });
    }
});
exports.getGeofenceAlertsByVehicle = getGeofenceAlertsByVehicle;
exports.default = {
    getAllAlerts: exports.getAllAlerts,
    getAlertsByUserAccess: exports.getAlertsByUserAccess,
    toggleAlertStatus: exports.toggleAlertStatus,
    getAlertCountsByTrip: exports.getAlertCountsByTrip,
    getAlertsByShipment: exports.getAlertsByShipment,
    getGeofenceAlertsByVehicle: exports.getGeofenceAlertsByVehicle,
};
