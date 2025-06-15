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
exports.getTripById = getTripById;
exports.getAllTrips = getAllTrips;
exports.insertTripFromXML = insertTripFromXML;
exports.insertData = insertData;
exports.saveIntutrackDetails = saveIntutrackDetails;
exports.getAllCustomers = getAllCustomers;
exports.getTripsByCustomerId = getTripsByCustomerId;
const xmlfunc_1 = require("../utilities/xmlfunc");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const mysql2_1 = require("drizzle-orm/mysql2");
const geofunc_1 = require("../utilities/geofunc");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
function fetchallusercustomers(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Fetch all customer groups for the user
            const userCustomerGroups = yield db
                .select({ customerGroupId: schema_1.user_customer_group.customer_group_id })
                .from(schema_1.user_customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, userId));
            const customerGroupIds = userCustomerGroups.map(g => g.customerGroupId).filter((id) => id !== null && id !== undefined);
            if (customerGroupIds.length === 0) {
                return [];
            }
            // Fetch all customers in these groups
            const customerGroupRelations = yield db
                .select({ customerId: schema_1.customer_group_relation.customer_id })
                .from(schema_1.customer_group_relation)
                .where((0, drizzle_orm_1.inArray)(schema_1.customer_group_relation.group_id, customerGroupIds));
            const customerIds = customerGroupRelations.map(r => r.customerId).filter((id) => id !== null && id !== undefined);
            if (customerIds.length === 0) {
                return [];
            }
            // Fetch all customers for these IDs
            const customersData = yield db
                .select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.inArray)(schema_1.customers.id, customerIds));
            return customersData;
        }
        catch (error) {
            console.error('Error fetching user customers:', error);
            throw error;
        }
    });
}
// jo user ke andar customer grp h usko
//working
function getTripById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            // Fetch shipment data from the database
            const shipmentData = yield db.select()
                .from(schema_1.shipment)
                .where((0, drizzle_orm_1.eq)(schema_1.shipment.shipment_id, id))
                .limit(1);
            // console.log(shipmentData);
            if (!shipmentData || shipmentData.length === 0) {
                console.log(`No shipment found with ID: ${id}`);
                return null;
            }
            console.log(`Found shipment: ${JSON.stringify(shipmentData[0])}`);
            // Fetch related equipment data
            const equipmentData = yield db.select()
                .from(schema_1.equipment)
                .where((0, drizzle_orm_1.eq)(schema_1.equipment.shipment_id, shipmentData[0].id));
            if (!equipmentData || equipmentData.length === 0) {
                console.log(`No equipment found for shipment ID: ${shipmentData[0].id}`);
            }
            // Fetch related event data
            const eventData = yield db.select()
                .from(schema_1.event)
                .where((0, drizzle_orm_1.eq)(schema_1.event.shipment_id, shipmentData[0].id));
            // Fetch related stops with customer details
            const stopsData = yield db.select()
                .from(schema_1.stop)
                .where((0, drizzle_orm_1.eq)(schema_1.stop.shipment_id, shipmentData[0].id))
                .orderBy(schema_1.stop.stop_sequence);
            // Fetch customer LR details for each stop
            const stopsWithCustomerDetails = yield Promise.all(stopsData.map((stop) => __awaiter(this, void 0, void 0, function* () {
                const customerDetails = yield db.select({
                    lr_number: schema_1.customer_lr_detail.lr_number,
                    customer_id: schema_1.customers.customer_id,
                    customer_name: schema_1.customers.customer_name,
                    customer_location: schema_1.customers.customer_location
                })
                    .from(schema_1.customer_lr_detail)
                    .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.customer_id, schema_1.customers.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.stop_id, stop.id));
                return Object.assign(Object.assign({}, stop), { customerDetails });
            })));
            // Fetch GPS details
            const gpsData = yield db.select()
                .from(schema_1.gps_details)
                .where((0, drizzle_orm_1.eq)(schema_1.gps_details.shipment_id, shipmentData[0].id))
                .limit(1);
            // Map database entities to Trip type
            const tripData = {
                id: (_a = shipmentData[0].shipment_id) !== null && _a !== void 0 ? _a : '',
                status: shipmentData[0].status,
                routeId: shipmentData[0].route_id || '',
                routeName: shipmentData[0].route_name || '',
                routeType: shipmentData[0].route_type || '',
                startTime: shipmentData[0].start_time || '',
                endTime: shipmentData[0].end_time || '',
                driverName: ((_b = equipmentData[0]) === null || _b === void 0 ? void 0 : _b.driver_name) || '',
                driverMobile: ((_c = equipmentData[0]) === null || _c === void 0 ? void 0 : _c.driver_mobile_no) || '',
                driverDetails: ((_d = equipmentData[0]) === null || _d === void 0 ? void 0 : _d.driver_details) || '',
                location: shipmentData[0].current_location || '',
                locationDateTime: shipmentData[0].location_datetime || '',
                shipmentId: (_e = shipmentData[0].shipment_id) !== null && _e !== void 0 ? _e : '',
                vehicleName: ((_f = equipmentData[0]) === null || _f === void 0 ? void 0 : _f.vehicle_name) || '',
                vehicleStatus: ((_g = equipmentData[0]) === null || _g === void 0 ? void 0 : _g.vehicle_status) || 'Moving',
                statusDuration: ((_h = equipmentData[0]) === null || _h === void 0 ? void 0 : _h.status_duration) || '0h 0m',
                totalDetentionTime: shipmentData[0].total_detention_time || '0h 0m',
                totalStoppageTime: shipmentData[0].total_stoppage_time || '0h 0m',
                totalDriveTime: shipmentData[0].total_drive_time || '0h 0m',
                domainName: shipmentData[0].domain_name || '',
                equipmentId: ((_j = equipmentData[0]) === null || _j === void 0 ? void 0 : _j.equipment_id) || '',
                coordinates: [
                    shipmentData[0].current_latitude || 0,
                    shipmentData[0].current_longitude || 0
                ],
                stops: stopsWithCustomerDetails.map((stop, index) => ({
                    point: stop.point_number || index + 1,
                    name: String(stop.stop_name || stop.location_id || ''),
                    status: stop.stop_status || 'Pending',
                    locationId: String(stop.location_id || ''),
                    stopType: stop.stop_type === 'P' ? 'Pickup' : 'Delivery',
                    plannedTime: stop.planned_departure_date || '',
                    ceta: stop.ceta || '',
                    geta: stop.geta || '',
                    actualSequence: stop.actual_sequence || stop.stop_sequence || 0,
                    entryTime: stop.entry_time || '',
                    exitTime: stop.exit_time || '',
                    detentionTime: stop.detention_time || '',
                    customerDetails: stop.customerDetails || []
                }))
            };
            return tripData;
        }
        catch (error) {
            console.error('Error getting trip by ID:', error);
            throw error;
        }
    });
}
//working
// in this we need tp shjhpw pn;y actvive trip
function getAllTrips(userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 100, status, startDate, endDate) {
        try {
            // 1. Get user's vehicle group IDs
            const userGroups = yield db
                .select({ groupId: schema_1.user_group.vehicle_group_id })
                .from(schema_1.user_group)
                .where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, userId));
            const groupIds = userGroups.map(g => g.groupId).filter((id) => id !== null && id !== undefined);
            // 2. Get entities under these groups (active only)
            const groupEntities = yield db
                .select({ entityId: schema_1.group_entity.entity_id, groupId: schema_1.group_entity.group_id })
                .from(schema_1.group_entity)
                .where((0, drizzle_orm_1.inArray)(schema_1.group_entity.group_id, groupIds));
            const entityIds = groupEntities.map(e => e.entityId).filter(Boolean);
            const entities = yield db
                .select({ id: schema_1.entity.id, vehicleNumber: schema_1.entity.vehicleNumber, vehicle_type: schema_1.entity.type })
                .from(schema_1.entity)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.entity.id, entityIds), (0, drizzle_orm_1.eq)(schema_1.entity.status, true)));
            const entityMap = new Map(entities.map(e => [e.vehicleNumber, e]));
            // Create a map of vehicle number to group IDs
            const vehicleGroupMap = new Map();
            for (const groupEntity of groupEntities) {
                const entityInfo = entities.find(e => e.id === groupEntity.entityId);
                if (entityInfo) {
                    if (!vehicleGroupMap.has(entityInfo.vehicleNumber)) {
                        vehicleGroupMap.set(entityInfo.vehicleNumber, []);
                    }
                    vehicleGroupMap.get(entityInfo.vehicleNumber).push(groupEntity.groupId);
                }
            }
            // Get group names for the group IDs
            const groupsData = yield db
                .select({ id: schema_1.group.id, group_name: schema_1.group.group_name })
                .from(schema_1.group)
                .where((0, drizzle_orm_1.inArray)(schema_1.group.id, groupIds));
            const groupNamesMap = new Map(groupsData.map(g => [g.id, g.group_name]));
            const vehicleNumbers = entities.map(e => e.vehicleNumber);
            // 3. Determine status filter
            let statusFilter = null; // null means no status filter (show all)
            if (!status || status === 'active') {
                // Active means all statuses except inactive
                statusFilter = ['intransit', 'delivery', 'pickup', 'Active']; // Note: keeping 'Active' for backward compatibility
            }
            else if (status === 'inactive') {
                statusFilter = ['inactive', 'Inactive'];
            }
            else if (status === 'all') {
                // Show all statuses - no filter needed
                statusFilter = null;
            }
            else {
                // For specific status like 'intransit', 'delivery', 'pickup'
                statusFilter = [status, status.charAt(0).toUpperCase() + status.slice(1)]; // Handle case variations
            }
            // 4. Determine date range
            let filterStartDate;
            let filterEndDate;
            if (startDate && endDate) {
                filterStartDate = startDate;
                filterEndDate = endDate;
            }
            else {
                // Default: last 7 days
                filterEndDate = new Date();
                filterStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            }
            // 5. Query shipments with filters
            let shipmentQuery;
            if (statusFilter !== null) {
                shipmentQuery = db
                    .select({ id: schema_1.shipment.id })
                    .from(schema_1.shipment)
                    .leftJoin(schema_1.equipment, (0, drizzle_orm_1.eq)(schema_1.equipment.shipment_id, schema_1.shipment.id))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.equipment.equipment_id, vehicleNumbers), (0, drizzle_orm_1.inArray)(schema_1.shipment.status, statusFilter), (0, drizzle_orm_1.gte)(schema_1.shipment.created_at, filterStartDate), (0, drizzle_orm_1.lt)(schema_1.shipment.created_at, new Date(filterEndDate.getTime() + 24 * 60 * 60 * 1000))));
            }
            else {
                shipmentQuery = db
                    .select({ id: schema_1.shipment.id })
                    .from(schema_1.shipment)
                    .leftJoin(schema_1.equipment, (0, drizzle_orm_1.eq)(schema_1.equipment.shipment_id, schema_1.shipment.id))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.equipment.equipment_id, vehicleNumbers), (0, drizzle_orm_1.gte)(schema_1.shipment.created_at, filterStartDate), (0, drizzle_orm_1.lt)(schema_1.shipment.created_at, new Date(filterEndDate.getTime() + 24 * 60 * 60 * 1000))));
            }
            const shipmentIdRows = yield shipmentQuery;
            const shipmentIdsFromVehicles = shipmentIdRows.map(row => row.id);
            if (shipmentIdsFromVehicles.length === 0) {
                return [];
            }
            // Build the final shipment query
            let finalShipmentQuery;
            if (statusFilter !== null) {
                finalShipmentQuery = db
                    .select()
                    .from(schema_1.shipment)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.shipment.id, shipmentIdsFromVehicles), (0, drizzle_orm_1.inArray)(schema_1.shipment.status, statusFilter)));
            }
            else {
                finalShipmentQuery = db
                    .select()
                    .from(schema_1.shipment)
                    .where((0, drizzle_orm_1.inArray)(schema_1.shipment.id, shipmentIdsFromVehicles));
            }
            const shipments = yield finalShipmentQuery
                .limit(limit)
                .offset((page - 1) * limit);
            const shipmentIds = shipments.map(s => s.id);
            // Get alert counts for these shipments grouped by alert type
            const alertCounts = yield db
                .select({
                shipment_id: schema_1.alert_shipment_relation.shipment_id,
                alert_type: schema_1.alert.alert_type, // Assuming you have alert_type field
                alert_status: schema_1.alert.status,
                count: (0, drizzle_orm_1.sql) `count(*)`.as('count')
            })
                .from(schema_1.alert_shipment_relation)
                .leftJoin(schema_1.alert, (0, drizzle_orm_1.eq)(schema_1.alert_shipment_relation.alert_id, schema_1.alert.id))
                .where((0, drizzle_orm_1.inArray)(schema_1.alert_shipment_relation.shipment_id, shipmentIds))
                .groupBy(schema_1.alert_shipment_relation.shipment_id, schema_1.alert.alert_type, schema_1.alert.status);
            // Create alert counts map grouped by alert type
            const alertCountsMap = {};
            // Initialize alert counts for each shipment
            for (const shipmentId of shipmentIds) {
                alertCountsMap[shipmentId] = {
                    overspeeding: { active: 0, inactive: 0, manually_closed: 0 },
                    continuous_driving: { active: 0, inactive: 0, manually_closed: 0 },
                    route_deviation: { active: 0, inactive: 0, manually_closed: 0 },
                    stoppage: { active: 0, inactive: 0, manually_closed: 0 }
                };
            }
            // Process alert counts
            for (const alertCount of alertCounts) {
                if (alertCount.shipment_id && alertCount.alert_type && alertCount.alert_status !== null) {
                    const shipmentId = alertCount.shipment_id;
                    const count = alertCount.count;
                    const alertType = String(alertCount.alert_type).toLowerCase().replace(/\s+/g, '_');
                    // Initialize alert type if it doesn't exist
                    if (!alertCountsMap[shipmentId][alertType]) {
                        // Check if this alert type can be manually closed
                        const manuallyClosableTypes = ['overspeeding', 'continuous_driving', 'route_deviation', 'stoppage'];
                        if (manuallyClosableTypes.includes(alertType)) {
                            alertCountsMap[shipmentId][alertType] = { active: 0, inactive: 0, manually_closed: 0 };
                        }
                        else {
                            alertCountsMap[shipmentId][alertType] = { active: 0, inactive: 0 };
                        }
                    }
                    // Update counts based on status
                    switch (alertCount.alert_status) {
                        case 1: // Active
                            alertCountsMap[shipmentId][alertType].active = count;
                            break;
                        case 0: // Inactive
                            alertCountsMap[shipmentId][alertType].inactive = count;
                            break;
                        case 2: // Manually closed (only for specific alert types)
                            const manuallyClosableTypes = ['overspeeding', 'continuous_driving', 'route_deviation', 'stoppage'];
                            if (manuallyClosableTypes.includes(alertType) && 'manually_closed' in alertCountsMap[shipmentId][alertType]) {
                                alertCountsMap[shipmentId][alertType].manually_closed = count;
                            }
                            break;
                    }
                }
            }
            // Continue with the rest of the existing logic...
            // 6. Get all equipment for these shipments
            const equipmentRows = yield db
                .select()
                .from(schema_1.equipment)
                .where((0, drizzle_orm_1.inArray)(schema_1.equipment.shipment_id, shipmentIds));
            const equipmentMap = new Map(equipmentRows.map(e => [e.shipment_id, e]));
            // 7. Get all stops for these shipments
            const stopsRows = yield db
                .select()
                .from(schema_1.stop)
                .where((0, drizzle_orm_1.inArray)(schema_1.stop.shipment_id, shipmentIds));
            const stopsMap = {};
            for (const stopRow of stopsRows) {
                if (stopRow.shipment_id !== null && stopRow.shipment_id !== undefined) {
                    if (!stopsMap[stopRow.shipment_id])
                        stopsMap[stopRow.shipment_id] = [];
                    stopsMap[stopRow.shipment_id].push(stopRow);
                }
            }
            // 8. Get all customer LR details for these stops
            const stopIds = stopsRows.map(s => s.id);
            const customerLRRows = yield db
                .select()
                .from(schema_1.customer_lr_detail)
                .where((0, drizzle_orm_1.inArray)(schema_1.customer_lr_detail.stop_id, stopIds));
            const customerLRMap = {};
            for (const lr of customerLRRows) {
                if (lr.stop_id !== null && lr.stop_id !== undefined) {
                    if (!customerLRMap[lr.stop_id])
                        customerLRMap[lr.stop_id] = [];
                    customerLRMap[lr.stop_id].push(lr);
                }
            }
            // 9. Get all customers for these LR details
            const customerIds = customerLRRows.map(lr => lr.customer_id);
            const customersRows = yield db
                .select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.inArray)(schema_1.customers.id, customerIds));
            const customersMap = new Map(customersRows.map(c => [c.id, c]));
            // 10. Get GPS details for these shipments
            const gpsDetailsRows = yield db
                .select()
                .from(schema_1.gps_details)
                .where((0, drizzle_orm_1.inArray)(schema_1.gps_details.shipment_id, shipmentIds));
            const gpsDetailsMap = new Map(gpsDetailsRows.map(g => [g.shipment_id, g]));
            // 11. Get latest GPS ping for each vehicle
            const gpsRows = yield db
                .select()
                .from(schema_1.gps_schema)
                .where((0, drizzle_orm_1.inArray)(schema_1.gps_schema.trailerNumber, vehicleNumbers));
            const gpsMap = new Map();
            for (const row of gpsRows) {
                if (!row.trailerNumber)
                    continue;
                const prev = gpsMap.get(row.trailerNumber);
                if (!prev || (row.timestamp && prev.timestamp < row.timestamp)) {
                    gpsMap.set(row.trailerNumber, row);
                }
            }
            // 12. Build trips response (rest of the existing logic remains the same)
            const customerda = yield fetchallusercustomers(userId);
            const daCustomerNames = new Set(customerda.map(c => c.customer_name));
            const trips = yield Promise.all(shipments.map((s) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const equip = equipmentMap.get(s.id);
                const stops = (stopsMap[s.id] || []).sort((a, b) => { var _a, _b, _c, _d; return ((_b = (_a = a.actual_sequence) !== null && _a !== void 0 ? _a : a.stop_sequence) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = b.actual_sequence) !== null && _c !== void 0 ? _c : b.stop_sequence) !== null && _d !== void 0 ? _d : 0); });
                // Filter: Only include trips where at least one stop's customer_name is in daCustomerNames
                const hasUserCustomer = stops.some(stop => {
                    const lrArr = customerLRMap[stop.id] || [];
                    return lrArr.some(lr => {
                        const customer = customersMap.get(lr.customer_id);
                        return customer && daCustomerNames.has(customer.customer_name);
                    });
                });
                if (!hasUserCustomer)
                    return null;
                // Get vehicle groups for this trip's vehicle
                const vehicleNumber = (equip === null || equip === void 0 ? void 0 : equip.equipment_id) || "";
                const vehicleGroupIds = vehicleGroupMap.get(vehicleNumber) || [];
                const vehicleGroups = vehicleGroupIds.map(groupId => ({
                    group_id: groupId,
                    group_name: groupNamesMap.get(groupId) || ""
                }));
                // Build route points for total distance
                const routePoints = [];
                if (s.start_latitude != null && s.start_longitude != null) {
                    routePoints.push({ lat: Number(s.start_latitude), lng: Number(s.start_longitude) });
                }
                for (const stop of stops) {
                    if (stop.latitude != null && stop.longitude != null) {
                        routePoints.push({ lat: Number(stop.latitude), lng: Number(stop.longitude) });
                    }
                }
                if (s.end_latitude != null && s.end_longitude != null) {
                    routePoints.push({ lat: Number(s.end_latitude), lng: Number(s.end_longitude) });
                }
                // Total Distance
                let total_distance = 0;
                for (let i = 1; i < routePoints.length; i++) {
                    total_distance += (0, geofunc_1.haversine)(routePoints[i - 1].lat, routePoints[i - 1].lng, routePoints[i].lat, routePoints[i].lng);
                }
                total_distance = total_distance / 1000;
                // Covered Distance
                const coveredPoints = [];
                if (s.start_latitude != null && s.start_longitude != null) {
                    coveredPoints.push({ lat: Number(s.start_latitude), lng: Number(s.start_longitude) });
                }
                const visitedStops = stops.filter(st => st.entry_time);
                for (const stop of visitedStops) {
                    if (stop.latitude != null && stop.longitude != null) {
                        coveredPoints.push({ lat: Number(stop.latitude), lng: Number(stop.longitude) });
                    }
                }
                const currentGps = gpsMap.get((_a = equip === null || equip === void 0 ? void 0 : equip.equipment_id) !== null && _a !== void 0 ? _a : "");
                if (currentGps && currentGps.latitude != null && currentGps.longitude != null) {
                    coveredPoints.push({ lat: Number(currentGps.latitude), lng: Number(currentGps.longitude) });
                }
                let covered_distance = 0;
                for (let i = 1; i < coveredPoints.length; i++) {
                    covered_distance += (0, geofunc_1.haversine)(coveredPoints[i - 1].lat, coveredPoints[i - 1].lng, coveredPoints[i].lat, coveredPoints[i].lng);
                }
                covered_distance = covered_distance / 1000;
                // GPS details
                const gpsDetailsRow = gpsDetailsMap.get(s.id);
                const gpsDetails = {
                    gps_vendor: (_b = gpsDetailsRow === null || gpsDetailsRow === void 0 ? void 0 : gpsDetailsRow.gps_vendor) !== null && _b !== void 0 ? _b : "",
                    gps_frequency: (gpsDetailsRow === null || gpsDetailsRow === void 0 ? void 0 : gpsDetailsRow.gps_frequency) != null ? String(gpsDetailsRow.gps_frequency) : ""
                };
                // Per-stop info
                const planned_stops = yield Promise.all(stops.map((stop) => __awaiter(this, void 0, void 0, function* () {
                    const lrArr = customerLRMap[stop.id] || [];
                    const lr = lrArr[0];
                    const customer = lr ? customersMap.get(lr.customer_id) : null;
                    let pickup_location = "";
                    if (stop.latitude && stop.longitude) {
                        try {
                            pickup_location = yield (0, geofunc_1.reverseGeocode)(Number(stop.latitude), Number(stop.longitude));
                        }
                        catch (_a) {
                            pickup_location = "";
                        }
                    }
                    let loading_unloading_time = "1";
                    const [geofence] = yield db.select().from(schema_1.geofence_table).where((0, drizzle_orm_1.eq)(schema_1.geofence_table.location_id, stop.location_id)).limit(1);
                    if (geofence && geofence.time)
                        loading_unloading_time = geofence.time;
                    let status = "Pending";
                    if (stop.exit_time)
                        status = "Complete";
                    else if (stop.entry_time)
                        status = "In Progress";
                    let detention_time = "";
                    if (stop.entry_time && stop.exit_time) {
                        const entry = new Date(stop.entry_time).getTime();
                        const exit = new Date(stop.exit_time).getTime();
                        const stoppage = stop.detention_time ? Number(stop.detention_time) : 0;
                        let detentionMs = exit - entry - stoppage;
                        if (detentionMs < 0)
                            detentionMs = 0;
                        const hours = Math.floor(detentionMs / (1000 * 60 * 60));
                        const minutes = Math.floor((detentionMs % (1000 * 60 * 60)) / (1000 * 60));
                        detention_time = `${hours}h ${minutes}m`;
                    }
                    return {
                        planned_stop: stop.stop_sequence,
                        location_id: stop.location_id,
                        location_name: (customer === null || customer === void 0 ? void 0 : customer.customer_location) || "",
                        pickup_location,
                        stop_type: stop.stop_type === "P" ? "Pickup" : "Delivery",
                        lr_number: (lr === null || lr === void 0 ? void 0 : lr.lr_number) || "",
                        customer_name: (customer === null || customer === void 0 ? void 0 : customer.customer_name) || "",
                        status,
                        loading_unloading_time,
                        entry_time: stop.entry_time || "",
                        exit_time: stop.exit_time || "",
                        actual_sequence: stop.actual_sequence || 0,
                        ceta: stop.ceta || "",
                        geta: stop.geta || "",
                        detention_time
                    };
                })));
                const entityInfo = entityMap.get((equip === null || equip === void 0 ? void 0 : equip.equipment_id) || "");
                let current_location_address = "";
                let current_location_coordinates = null;
                let last_gps_ping = "";
                let vehicle_status = "No Data";
                const latestGps = gpsMap.get((_c = equip === null || equip === void 0 ? void 0 : equip.equipment_id) !== null && _c !== void 0 ? _c : "");
                if (latestGps && latestGps.latitude != null && latestGps.longitude != null) {
                    current_location_coordinates = [Number(latestGps.latitude), Number(latestGps.longitude)];
                    try {
                        current_location_address = yield (0, geofunc_1.reverseGeocode)(Number(latestGps.latitude), Number(latestGps.longitude));
                    }
                    catch (_d) {
                        current_location_address = "";
                    }
                    last_gps_ping = latestGps.timestamp ? new Date(latestGps.timestamp).toISOString() : "";
                    if (latestGps.timestamp) {
                        const now = Date.now();
                        const pingTime = new Date(latestGps.timestamp).getTime();
                        const diffHours = (now - pingTime) / (1000 * 60 * 60);
                        if (diffHours <= 3) {
                            vehicle_status = "Active";
                        }
                        else {
                            vehicle_status = "No Update";
                        }
                    }
                }
                return {
                    id: s.shipment_id,
                    route_Name: s.route_name,
                    Domain_Name: s.domain_name,
                    Start_Time: s.created_at ? (0, geofunc_1.formatDate)(new Date(s.created_at).toISOString()) : "",
                    End_Time: s.end_time || "",
                    driverName: (equip === null || equip === void 0 ? void 0 : equip.driver_name) || "",
                    driverMobile: (equip === null || equip === void 0 ? void 0 : equip.driver_mobile_no) || "",
                    serviceProviderAlias: (equip === null || equip === void 0 ? void 0 : equip.service_provider_alias_value) || "",
                    Vehicle_number: (equip === null || equip === void 0 ? void 0 : equip.equipment_id) || "",
                    vehicle_type: (entityInfo === null || entityInfo === void 0 ? void 0 : entityInfo.vehicle_type) || "",
                    vehicle_groups: vehicleGroups,
                    cuurent_location_address: current_location_address,
                    current_location_coordindates: current_location_coordinates,
                    last_gps_ping,
                    shipment_source: "logifriet",
                    gps_vendor: gpsDetails.gps_vendor || "",
                    gps_frequency: gpsDetails.gps_frequency || "",
                    total_distance: total_distance.toFixed(2),
                    total_covered_distance: covered_distance.toFixed(2),
                    status: s.status,
                    origin: s.start_location,
                    destination: s.end_location,
                    origin_coordinates: [
                        s.start_latitude ? Number(s.start_latitude) : 0,
                        s.start_longitude ? Number(s.start_longitude) : 0
                    ],
                    destination_coordinates: [
                        s.end_latitude ? Number(s.end_latitude) : 0,
                        s.end_longitude ? Number(s.end_longitude) : 0
                    ],
                    ceta: "",
                    geta: "",
                    alert_counts_by_type: alertCountsMap[s.id] || {
                        overspeeding: { active: 0, inactive: 0, manually_closed: 0 },
                        continuous_driving: { active: 0, inactive: 0, manually_closed: 0 },
                        route_deviation: { active: 0, inactive: 0, manually_closed: 0 },
                        stoppage: { active: 0, inactive: 0, manually_closed: 0 }
                    },
                    Vehicle_status: vehicle_status,
                    status_duration: (equip === null || equip === void 0 ? void 0 : equip.status_duration) || "",
                    total_detention_time: s.total_detention_time || "",
                    total_drive_time: s.total_drive_time || "",
                    total_stoppage_time: s.total_stoppage_time || "",
                    planned_stops
                };
            })));
            return trips.filter(Boolean);
        }
        catch (error) {
            console.error('❌ Error fetching trips:', error);
            throw new Error('Unable to fetch trip data');
        }
    });
}
function insertTripFromXML() {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 1; i < 201; i++) {
            const data = yield (0, xmlfunc_1.readTripXMLData)(`${i}.xml`);
            // console.log(data.TransmissionDetails.Shipment.Stops);
            const res = yield insertData(data);
        }
        // const data = await readTripXMLData("1.xml");
        // const res= await insertData(data);
        // console.log(res);
        return { message: "Data inserted successfully" };
    });
}
//working
function insertData(data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const dt = yield db.select().from(schema_1.shipment).where((0, drizzle_orm_1.eq)(schema_1.shipment.shipment_id, data.TransmissionDetails.Shipment.Shipment_Id)).limit(1);
        if (dt.length > 0) {
            // console.log("Shipment already exists with ID:", data.TransmissionDetails.Shipment.Shipment_Id);
            return { message: "Shipment already exists" };
        }
        const transmissionHeader = data.TransmissionHeader;
        const TransmissionId = yield db.insert(schema_1.transmission_header).values({
            username: transmissionHeader.UserName,
            password: transmissionHeader.Password,
            token: transmissionHeader.Token || ''
        }).$returningId();
        //fetch the longitude and latitude of the current vehicle from gps_schema latest
        const gpsSchema = yield db.select()
            .from(schema_1.gps_schema)
            .where((0, drizzle_orm_1.eq)(schema_1.gps_schema.trailerNumber, data.TransmissionDetails.Shipment.Equipment.Equipment_Id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.gps_schema.timestamp))
            .limit(1);
        let current_address = "";
        if (gpsSchema.length > 0 && gpsSchema[0].latitude && gpsSchema[0].longitude) {
            // current_address = await reverseGeocode(Number(gpsSchema[0].latitude), Number(gpsSchema[0].longitude));  
        }
        let last_location = "";
        if (data.TransmissionDetails.Shipment.Stops) {
            const w = data.TransmissionDetails.Shipment.Stops.Stop || [];
            if (w.length > 0) {
                const lastStop = w[w.length - 1];
                if (lastStop.Latitude && lastStop.Longitude) {
                    last_location = yield (0, geofunc_1.reverseGeocode)(Number(lastStop.Latitude), Number(lastStop.Longitude));
                }
            }
        }
        const shipmentData = data.TransmissionDetails.Shipment;
        const shipmentid = yield db.insert(schema_1.shipment).values({
            domain_name: shipmentData.Domain_Name,
            shipment_id: shipmentData.Shipment_Id,
            route_name: shipmentData.RouteName,
            transmission_header_id: Number(TransmissionId[0].id),
            status: 'Active',
            route_id: "",
            route_type: "",
            start_time: "",
            end_time: "",
            current_location: '',
            location_datetime: "",
            current_latitude: 0,
            current_longitude: 0,
            total_detention_time: '',
            total_stoppage_time: '',
            total_drive_time: '',
            start_location: current_address || '',
            end_location: last_location,
            start_latitude: gpsSchema.length > 0 && gpsSchema[0].latitude != null ? parseFloat(String(gpsSchema[0].latitude)) : 0,
            start_longitude: gpsSchema.length > 0 && gpsSchema[0].longitude != null ? parseFloat(String(gpsSchema[0].longitude)) : 0,
            end_latitude: 0,
            end_longitude: 0,
        }).$returningId();
        const equipmentData = shipmentData.Equipment;
        const equipmentid = yield db.insert(schema_1.equipment).values({
            equipment_id: equipmentData.Equipment_Id,
            service_provider_alias_value: equipmentData.ServiceProviderAliasValue,
            driver_name: equipmentData.DriverName,
            driver_mobile_no: equipmentData.DriverMobileNo,
            shipment_id: Number(shipmentid[0].id),
            vehicle_name: "",
            vehicle_status: "",
            status_duration: "",
            driver_details: "",
            created_at: new Date(),
            updated_at: new Date()
        }).$returningId();
        // Insert GPS Details first to check vendor
        const gpsDetails = shipmentData.GPSDetails;
        const gpsDetailsId = yield db.insert(schema_1.gps_details).values({
            gps_type: gpsDetails.GPSType,
            gps_frequency: parseInt(gpsDetails.GPSFrequency, 10),
            gps_unit_id: gpsDetails.GPSUnitID,
            gps_vendor: gpsDetails.GPSVendor,
            shipment_id: Number(shipmentid[0].id),
            created_at: new Date(),
            updated_at: new Date()
        }).$returningId();
        // Only call Intutrack API if GPS vendor is "Intugine" and driver mobile number exists
        if (gpsDetails.GPSVendor === "Intugine" && equipmentData.DriverMobileNo) {
            try {
                yield saveIntutrackDetails(equipmentData.DriverMobileNo);
            }
            catch (error) {
                console.warn('Failed to save Intutrack details:', error);
                // Don't fail the entire trip creation if Intutrack fails
            }
        }
        const eventData = shipmentData.Events.Event;
        const eventid = yield db.insert(schema_1.event).values({
            event_code: eventData.EventCode,
            event_datetime: eventData.EventDateTime,
            shipment_id: Number(shipmentid[0].id),
            event_type: '',
            event_location: '',
            event_latitude: 0,
            event_longitude: 0,
            created_at: new Date(),
            updated_at: new Date()
        }).$returningId();
        const stops = shipmentData.Stops.Stop || [];
        for (const st of stops) {
            // const address = await reverseGeocode(Number(st.Latitude), Number(st.Longitude));
            const address = "";
            yield db.insert(schema_1.geofence_table).values({
                geofence_name: String(st.Location_Id),
                radius: parseInt(st.GeoFenceRadius, 10) || 0,
                latitude: parseFloat(st.Latitude),
                longitude: parseFloat(st.Longitude),
                location_id: st.Location_Id,
                created_at: new Date(),
                updated_at: new Date(),
                stop_type: st.StopType,
                geofence_type: 0,
                status: true,
                address: address || '',
            });
            const stopId = yield db.insert(schema_1.stop).values({
                location_id: st.Location_Id,
                stop_type: st.StopType,
                stop_sequence: parseInt(st.StopSequence, 10),
                latitude: parseFloat(st.Latitude),
                longitude: parseFloat(st.Longitude),
                geo_fence_radius: parseInt(st.GeoFenceRadius, 10) || 0,
                planned_departure_date: st.PlannedDepartureDate || '',
                shipment_id: Number(shipmentid[0].id),
                stop_name: '',
                stop_status: '',
                ceta: '',
                geta: '',
                actual_sequence: 0,
                entry_time: '',
                exit_time: '',
                detention_time: '',
                point_number: 0,
                created_at: new Date(),
                updated_at: new Date()
            }).$returningId();
            const customerLRDetails = ((_a = st.CustomerLRDetails) === null || _a === void 0 ? void 0 : _a.CustomerLRDetail) || [];
            const customerLRDetailsArray = Array.isArray(customerLRDetails) ? customerLRDetails : [customerLRDetails];
            for (const lrDetail of customerLRDetailsArray) {
                console.log("Inserting Customer LR Detail:", lrDetail);
                let customerId;
                const existingCustomer = yield db.select()
                    .from(schema_1.customers)
                    .where((0, drizzle_orm_1.eq)(schema_1.customers.customer_id, lrDetail.Customer_ID))
                    .limit(1);
                if (existingCustomer.length > 0) {
                    customerId = existingCustomer[0].id;
                }
                else {
                    const [newCustomer] = yield db.insert(schema_1.customers).values({
                        customer_id: lrDetail.Customer_ID,
                        customer_name: lrDetail.Customer_Name || '',
                        customer_location: lrDetail.Customer_Location || ''
                    }).$returningId();
                    customerId = newCustomer.id;
                }
                yield db.insert(schema_1.customer_lr_detail).values({
                    lr_number: lrDetail.LrNumber || '',
                    customer_id: customerId,
                    stop_id: Number(stopId[0].id)
                });
            }
        }
        return data;
    });
}
// Helper function to save Intutrack details
function saveIntutrackDetails(phoneNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!phoneNumber)
            return;
        try {
            // Call Intutrack API
            const intutrackResponse = yield fetch(`${process.env.INTUTRACK_API_URL}/consents?tel=${phoneNumber}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${process.env.INTUTRACK_BASE_AUTH}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!intutrackResponse.ok) {
                throw new Error(`Intutrack API failed with status: ${intutrackResponse.status}`);
            }
            const apiData = yield intutrackResponse.json();
            if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
                console.log(`No consent data found for phone: ${phoneNumber}`);
                return;
            }
            const consentData = apiData[0].result;
            // Check if record already exists
            const existingRecord = yield db
                .select()
                .from(schema_1.intutrack_relation)
                .where((0, drizzle_orm_1.eq)(schema_1.intutrack_relation.phone_number, phoneNumber))
                .limit(1);
            if (existingRecord.length > 0) {
                // Update existing record
                yield db
                    .update(schema_1.intutrack_relation)
                    .set({
                    current_consent: consentData.current_consent,
                    consent: consentData.consent,
                    operator: consentData.operator
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.intutrack_relation.phone_number, phoneNumber));
            }
            else {
                // Insert new record
                yield db.insert(schema_1.intutrack_relation).values({
                    phone_number: phoneNumber,
                    current_consent: consentData.current_consent,
                    consent: consentData.consent,
                    operator: consentData.operator
                });
            }
            console.log(`Intutrack details saved for phone: ${phoneNumber}`);
        }
        catch (error) {
            console.error(`Error saving Intutrack details for phone ${phoneNumber}:`, error);
            throw error;
        }
    });
}
//working
function getAllCustomers() {
    return __awaiter(this, arguments, void 0, function* (page = 1, limit = 100) {
        var _a;
        try {
            const customersData = yield db.select()
                .from(schema_1.customers)
                .limit(limit)
                .offset((page - 1) * limit);
            const totalCountResult = yield db.execute(`SELECT COUNT(*) as count FROM customers`);
            const totalCount = totalCountResult;
            return {
                customers: customersData,
                pagination: {
                    total: Number(((_a = totalCount[0]) === null || _a === void 0 ? void 0 : _a.count) || 0),
                    page,
                    limit
                }
            };
        }
        catch (error) {
            console.error('Error fetching customers:', error);
            throw error;
        }
    });
}
function getTripsByCustomerId(customerId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Find the internal customer ID from the customer_id field
            const customerRecord = yield db.select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.eq)(schema_1.customers.customer_id, customerId))
                .limit(1);
            if (!customerRecord.length) {
                return [];
            }
            // Find all LR details for this customer
            const lrDetails = yield db.select({
                stopId: schema_1.customer_lr_detail.stop_id
            })
                .from(schema_1.customer_lr_detail)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.customer_id, customerRecord[0].id));
            if (!lrDetails.length) {
                return [];
            }
            // Get the stop IDs
            const stopIds = lrDetails.map(lr => lr.stopId).filter(Boolean);
            // Find the trips containing these stops
            const stops = yield db.select({
                shipmentId: schema_1.stop.shipment_id
            })
                .from(schema_1.stop)
                .where((0, drizzle_orm_1.inArray)(schema_1.stop.id, stopIds.filter((id) => id !== null && id !== undefined)));
            const shipmentIds = [...new Set(stops.map(s => s.shipmentId).filter(Boolean))];
            if (!shipmentIds.length) {
                return [];
            }
            // Get the trip details
            const validShipmentIds = shipmentIds.filter((id) => id !== null && id !== undefined);
            if (!validShipmentIds.length) {
                return [];
            }
            const trips = yield db.select()
                .from(schema_1.shipment)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.shipment.id, validShipmentIds), (0, drizzle_orm_1.eq)(schema_1.shipment.status, 'Active')));
            return trips;
        }
        catch (error) {
            console.error('Error fetching trips by customer ID:', error);
            throw error;
        }
    });
}
