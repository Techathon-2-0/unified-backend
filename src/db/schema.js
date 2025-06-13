"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geofencegroup = exports.alertShipmentIdx = exports.alert_shipment_relation = exports.equipmentShipmentIdx = exports.equipment = exports.shipmentCreatedAtIdx = exports.shipmentTrackingIdx = exports.shipmentDomainStatusIdx = exports.shipmentStatusIdx = exports.shipment = exports.transmissionHeaderIdx = exports.transmission_header = exports.userCustomerIdx = exports.user_customer_group = exports.userGeofenceIdx = exports.user_geofence_group = exports.userGroupIdx = exports.user_group = exports.usersEmailIdx = exports.usersUsernameIdx = exports.usersTable = exports.gpsCreatedAtIdx = exports.gpsSpeedTrackingIdx = exports.gpsLocationIdx = exports.gpsVendorDeviceIdx = exports.gpsTrailerTimeRangeIdx = exports.gpsTrailerTimestampIdx = exports.gps_schema = exports.groupEntityIdx = exports.group_entity = exports.group = exports.entityCreatedAtIdx = exports.entityTypeStatusIdx = exports.entityStatusIdx = exports.entityVehicleNumberIdx = exports.entity = exports.alarmVehicleGroupIdx = exports.alarm_group = exports.alarmGeofenceGroupIdx = exports.alarm_geofence_group = exports.alarmCustomerGroupIdx = exports.alarm_customer_group = exports.alarmAlertIdx = exports.alarm_alert = exports.alarmCategoryIdx = exports.alarmStatusIdx = exports.alarm = exports.alertCreatedAtIdx = exports.alertStatusTypeIdx = exports.alert = void 0;
exports.user_usertype = exports.usertype = exports.alarm_email = exports.alarm_phoneNumber = exports.intutrack_relation = exports.gpsDetailsShipmentIdx = exports.gps_details = exports.roleReportIdx = exports.role_report = exports.roleTabIdx = exports.role_tabs = exports.userRoleIdx = exports.user_role = exports.report = exports.tabs = exports.role = exports.vahanEntityIdx = exports.vahanRegistrationIdx = exports.vahan = exports.entityVendorIdx = exports.entity_vendor = exports.vendor = exports.customerGroupRelationIdx = exports.customer_group_relation = exports.customerLrDetailIdx = exports.customer_lr_detail = exports.customer_group = exports.customersCustomerIdIdx = exports.customers = exports.eventShipmentTimeIdx = exports.event = exports.stopStatusIdx = exports.stopShipmentIdx = exports.stop = exports.geofenceGroupRelationIdx = exports.geofence_group_relation = exports.polygonGeofenceIdx = exports.polygon_coordinates = exports.geofenceLocationIdIdx = exports.geofenceStatusTypeIdx = exports.geofenceLocationIdx = exports.geofence_table = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
// ========================================
// ALERT AND ALARM SYSTEM TABLES WITH INDEXES
// ========================================
exports.alert = (0, mysql_core_1.mysqlTable)('alert', {
    id: (0, mysql_core_1.int)('id').primaryKey().autoincrement(),
    alert_type: (0, mysql_core_1.int)('alert_type').references(() => exports.alarm.id),
    status: (0, mysql_core_1.int)('status').notNull().default(1), // 0: inactive, 1: active, 2: manually closed
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
// ✅ Define indexes separately
exports.alertStatusTypeIdx = (0, mysql_core_1.index)('idx_alert_status_type').on(exports.alert.status, exports.alert.alert_type, (0, drizzle_orm_1.desc)(exports.alert.updated_at));
exports.alertCreatedAtIdx = (0, mysql_core_1.index)('idx_alert_created_at').on((0, drizzle_orm_1.desc)(exports.alert.created_at));
exports.alarm = (0, mysql_core_1.mysqlTable)('alarm', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    alarm_type_id: (0, mysql_core_1.int)('alarm_type_id').notNull(),
    alarm_category: (0, mysql_core_1.varchar)('alarm_category', { length: 255 }).notNull(),
    alarm_value: (0, mysql_core_1.int)('alarm_value').notNull(),
    rest_duration: (0, mysql_core_1.int)('rest_duration'),
    geofence_status: (0, mysql_core_1.int)('geofence_status'),
    alarm_generation: (0, mysql_core_1.boolean)('alarm_generation').notNull().default(true),
    active_start_time_range: (0, mysql_core_1.varchar)('active_time_range', { length: 255 }).default(''),
    active_end_time_range: (0, mysql_core_1.varchar)('active_end_time_range', { length: 255 }).default(''),
    active_trip: (0, mysql_core_1.boolean)('active_trip').notNull().default(false),
    alarm_status: (0, mysql_core_1.boolean)('alarm_status').notNull().default(true),
    descrption: (0, mysql_core_1.varchar)('description', { length: 255 }),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.alarmStatusIdx = (0, mysql_core_1.index)('idx_alarm_status').on(exports.alarm.alarm_status, exports.alarm.alarm_type_id);
exports.alarmCategoryIdx = (0, mysql_core_1.index)('idx_alarm_category').on(exports.alarm.alarm_category, exports.alarm.alarm_status);
exports.alarm_alert = (0, mysql_core_1.mysqlTable)('alarm_alert', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    alarm_id: (0, mysql_core_1.int)('alarm_id').notNull().references(() => exports.alarm.id),
    alert_id: (0, mysql_core_1.int)('alert_id').notNull().references(() => exports.alert.id),
});
exports.alarmAlertIdx = (0, mysql_core_1.index)('idx_alarm_alert_alarm').on(exports.alarm_alert.alarm_id, exports.alarm_alert.alert_id);
exports.alarm_customer_group = (0, mysql_core_1.mysqlTable)('alarm_customer_group', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    alarm_id: (0, mysql_core_1.int)('alarm_id').notNull().references(() => exports.alarm.id),
    customer_group_id: (0, mysql_core_1.int)('customer_group_id').notNull().references(() => exports.customer_group.id),
});
exports.alarmCustomerGroupIdx = (0, mysql_core_1.index)('idx_alarm_customer_group').on(exports.alarm_customer_group.customer_group_id, exports.alarm_customer_group.alarm_id);
exports.alarm_geofence_group = (0, mysql_core_1.mysqlTable)('alarm_geofence_group', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    alarm_id: (0, mysql_core_1.int)('alarm_id').notNull().references(() => exports.alarm.id),
    geofence_group_id: (0, mysql_core_1.int)('geofence_group_id').notNull().references(() => exports.geofencegroup.id),
});
exports.alarmGeofenceGroupIdx = (0, mysql_core_1.index)('idx_alarm_geofence_group').on(exports.alarm_geofence_group.geofence_group_id, exports.alarm_geofence_group.alarm_id);
exports.alarm_group = (0, mysql_core_1.mysqlTable)('alarm_group', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    alarm_id: (0, mysql_core_1.int)('alarm_id').notNull().references(() => exports.alarm.id),
    vehicle_group_id: (0, mysql_core_1.int)('vehicle_group_id').notNull().references(() => exports.group.id),
});
exports.alarmVehicleGroupIdx = (0, mysql_core_1.index)('idx_alarm_vehicle_group').on(exports.alarm_group.vehicle_group_id, exports.alarm_group.alarm_id);
// ========================================
// ENTITY (VEHICLE) MANAGEMENT WITH CRITICAL INDEXES
// ========================================
exports.entity = (0, mysql_core_1.mysqlTable)('entity', {
    id: (0, mysql_core_1.int)('id').primaryKey().autoincrement(),
    vehicleNumber: (0, mysql_core_1.varchar)('vehicle_number', { length: 255 }).notNull().unique(),
    type: (0, mysql_core_1.varchar)('type', { length: 50 }).notNull(),
    status: (0, mysql_core_1.boolean)('status').notNull().default(true),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.entityVehicleNumberIdx = (0, mysql_core_1.index)('idx_entity_vehicle_number').on(exports.entity.vehicleNumber);
exports.entityStatusIdx = (0, mysql_core_1.index)('idx_entity_status').on(exports.entity.status, exports.entity.vehicleNumber);
exports.entityTypeStatusIdx = (0, mysql_core_1.index)('idx_entity_type_status').on(exports.entity.type, exports.entity.status);
exports.entityCreatedAtIdx = (0, mysql_core_1.index)('idx_entity_created_at').on((0, drizzle_orm_1.desc)(exports.entity.createdAt));
exports.group = (0, mysql_core_1.mysqlTable)('group', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    group_name: (0, mysql_core_1.varchar)('group_name', { length: 255 }).notNull().unique(),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.group_entity = (0, mysql_core_1.mysqlTable)('group_entity', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    group_id: (0, mysql_core_1.int)('group_id').notNull().references(() => exports.group.id),
    entity_id: (0, mysql_core_1.int)('entity_id').notNull().references(() => exports.entity.id),
});
exports.groupEntityIdx = (0, mysql_core_1.index)('idx_group_entity_group').on(exports.group_entity.group_id, exports.group_entity.entity_id);
// ========================================
// GPS SCHEMA WITH MOST CRITICAL INDEXES
// ========================================
exports.gps_schema = (0, mysql_core_1.mysqlTable)('gps_schema', {
    id: (0, mysql_core_1.int)('id').primaryKey().autoincrement(),
    GPSVendor: (0, mysql_core_1.varchar)('GPSVendor', { length: 255 }),
    deviceId: (0, mysql_core_1.varchar)('deviceId', { length: 255 }),
    trailerNumber: (0, mysql_core_1.varchar)('trailerNumber', { length: 255 }).references(() => exports.entity.vehicleNumber),
    timestamp: (0, mysql_core_1.int)('timestamp'),
    gpstimestamp: (0, mysql_core_1.int)('gpstimestamp'),
    gprstimestamp: (0, mysql_core_1.int)('gprstimestamp'),
    address: (0, mysql_core_1.varchar)('address', { length: 255 }),
    latitude: (0, mysql_core_1.double)('latitude'),
    longitude: (0, mysql_core_1.double)('longitude'),
    heading: (0, mysql_core_1.int)('heading'),
    speed: (0, mysql_core_1.int)('speed'),
    areaCode: (0, mysql_core_1.varchar)('areaCode', { length: 255 }),
    cellId: (0, mysql_core_1.varchar)('cellId', { length: 255 }),
    mcc: (0, mysql_core_1.varchar)('mcc', { length: 255 }),
    mnc: (0, mysql_core_1.varchar)('mnc', { length: 255 }),
    lac: (0, mysql_core_1.varchar)('lac', { length: 255 }),
    hdop: (0, mysql_core_1.varchar)('hdop', { length: 255 }),
    numberOfSatellites: (0, mysql_core_1.varchar)('numberOfSatellites', { length: 255 }),
    digitalInput2: (0, mysql_core_1.int)('digitalInput2'),
    digitalInput3: (0, mysql_core_1.int)('digitalInput3'),
    analogInput1: (0, mysql_core_1.varchar)('analogInput1', { length: 255 }),
    digitalOutput1: (0, mysql_core_1.varchar)('digitalOutput1', { length: 255 }),
    powerSupplyVoltage: (0, mysql_core_1.varchar)('powerSupplyVoltage', { length: 255 }),
    internalBatteryVoltage: (0, mysql_core_1.varchar)('internalBatteryVoltage', { length: 255 }),
    internalBatteryLevel: (0, mysql_core_1.varchar)('internalBatteryLevel', { length: 255 }),
    power: (0, mysql_core_1.varchar)('power', { length: 255 }),
    gsmlevel: (0, mysql_core_1.varchar)('gsmlevel', { length: 255 }),
    accelerometerX: (0, mysql_core_1.varchar)('accelerometerX', { length: 255 }),
    accelerometerY: (0, mysql_core_1.varchar)('accelerometerY', { length: 255 }),
    accelerometerZ: (0, mysql_core_1.varchar)('accelerometerZ', { length: 255 }),
    maxAccelX: (0, mysql_core_1.varchar)('maxAccelX', { length: 255 }),
    maxAccelY: (0, mysql_core_1.varchar)('maxAccelY', { length: 255 }),
    maxAccelZ: (0, mysql_core_1.varchar)('maxAccelZ', { length: 255 }),
    locationSource: (0, mysql_core_1.varchar)('locationSource', { length: 255 }),
    serviceProvider: (0, mysql_core_1.varchar)('serviceProvider', { length: 255 }),
    gpsSpeed: (0, mysql_core_1.varchar)('gpsSpeed', { length: 255 }),
    dtcCount: (0, mysql_core_1.varchar)('dtcCount', { length: 255 }),
    dtcDistance: (0, mysql_core_1.varchar)('dtcDistance', { length: 255 }),
    unplugged: (0, mysql_core_1.varchar)('unplugged', { length: 255 }),
    gpsOdometer: (0, mysql_core_1.varchar)('gpsOdometer', { length: 255 }),
    tilt: (0, mysql_core_1.varchar)('tilt', { length: 255 }),
    digitalInput1: (0, mysql_core_1.int)('digitalInput1'),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
// ✅ MOST CRITICAL INDEXES for GPS tracking
exports.gpsTrailerTimestampIdx = (0, mysql_core_1.index)('idx_gps_trailer_timestamp').on(exports.gps_schema.trailerNumber, (0, drizzle_orm_1.desc)(exports.gps_schema.gpstimestamp));
exports.gpsTrailerTimeRangeIdx = (0, mysql_core_1.index)('idx_gps_trailer_time_range').on(exports.gps_schema.trailerNumber, (0, drizzle_orm_1.desc)(exports.gps_schema.gpstimestamp), exports.gps_schema.latitude, exports.gps_schema.longitude);
exports.gpsVendorDeviceIdx = (0, mysql_core_1.index)('idx_gps_vendor_device').on(exports.gps_schema.GPSVendor, exports.gps_schema.deviceId);
exports.gpsLocationIdx = (0, mysql_core_1.index)('idx_gps_location').on(exports.gps_schema.latitude, exports.gps_schema.longitude, (0, drizzle_orm_1.desc)(exports.gps_schema.gpstimestamp));
exports.gpsSpeedTrackingIdx = (0, mysql_core_1.index)('idx_gps_tracking_status').on(exports.gps_schema.trailerNumber, (0, drizzle_orm_1.desc)(exports.gps_schema.gpstimestamp), exports.gps_schema.speed);
exports.gpsCreatedAtIdx = (0, mysql_core_1.index)('idx_gps_created_at').on((0, drizzle_orm_1.desc)(exports.gps_schema.created_at));
// ========================================
// USER MANAGEMENT WITH ACCESS CONTROL INDEXES
// ========================================
exports.usersTable = (0, mysql_core_1.mysqlTable)('users_table', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull(),
    phone: (0, mysql_core_1.varchar)('phone', { length: 15 }).notNull(),
    username: (0, mysql_core_1.varchar)('username', { length: 255 }).notNull().unique(),
    email: (0, mysql_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    password: (0, mysql_core_1.varchar)('password', { length: 255 }).notNull(),
    active: (0, mysql_core_1.boolean)('active').notNull().default(false),
    tag: (0, mysql_core_1.varchar)('usertag', { length: 255 }).default(''),
});
exports.usersUsernameIdx = (0, mysql_core_1.index)('idx_users_username').on(exports.usersTable.username, exports.usersTable.active);
exports.usersEmailIdx = (0, mysql_core_1.index)('idx_users_email').on(exports.usersTable.email, exports.usersTable.active);
exports.user_group = (0, mysql_core_1.mysqlTable)('user_group', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    user_id: (0, mysql_core_1.int)('user_id').references(() => exports.usersTable.id),
    vehicle_group_id: (0, mysql_core_1.int)('vehicle_group_id').references(() => exports.group.id),
});
exports.userGroupIdx = (0, mysql_core_1.index)('idx_user_group_user_id').on(exports.user_group.user_id, exports.user_group.vehicle_group_id);
exports.user_geofence_group = (0, mysql_core_1.mysqlTable)('user_geofence_group', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    user_id: (0, mysql_core_1.int)('user_id').references(() => exports.usersTable.id),
    geofence_group_id: (0, mysql_core_1.int)('geofence_group_id').references(() => exports.geofencegroup.id),
});
exports.userGeofenceIdx = (0, mysql_core_1.index)('idx_user_geofence_group').on(exports.user_geofence_group.user_id, exports.user_geofence_group.geofence_group_id);
exports.user_customer_group = (0, mysql_core_1.mysqlTable)('user_customer_group', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    user_id: (0, mysql_core_1.int)('user_id').references(() => exports.usersTable.id),
    customer_group_id: (0, mysql_core_1.int)('customer_group_id').references(() => exports.customer_group.id)
});
exports.userCustomerIdx = (0, mysql_core_1.index)('idx_user_customer_group').on(exports.user_customer_group.user_id, exports.user_customer_group.customer_group_id);
// ========================================
// SHIPMENT AND EQUIPMENT WITH TRACKING INDEXES
// ========================================
exports.transmission_header = (0, mysql_core_1.mysqlTable)('transmission_header', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    username: (0, mysql_core_1.varchar)('username', { length: 255 }).notNull(),
    password: (0, mysql_core_1.varchar)('password', { length: 255 }).notNull(),
    token: (0, mysql_core_1.varchar)('token', { length: 255 }).$default(() => ''),
});
exports.transmissionHeaderIdx = (0, mysql_core_1.index)('idx_transmission_header').on(exports.transmission_header.username, exports.transmission_header.token);
exports.shipment = (0, mysql_core_1.mysqlTable)('shipment', {
    id: (0, mysql_core_1.int)('id').primaryKey().autoincrement(),
    domain_name: (0, mysql_core_1.varchar)('domain_name', { length: 255 }),
    shipment_id: (0, mysql_core_1.varchar)('shipment_id', { length: 255 }).notNull().unique(),
    route_name: (0, mysql_core_1.varchar)('route_name', { length: 255 }),
    transmission_header_id: (0, mysql_core_1.int)('transmission_header_id').references(() => exports.transmission_header.id),
    status: (0, mysql_core_1.varchar)('status', { length: 255 }),
    route_id: (0, mysql_core_1.varchar)('route_id', { length: 255 }),
    route_type: (0, mysql_core_1.varchar)('route_type', { length: 255 }),
    start_time: (0, mysql_core_1.varchar)('start_time', { length: 255 }),
    end_time: (0, mysql_core_1.varchar)('end_time', { length: 255 }),
    current_location: (0, mysql_core_1.varchar)('current_location', { length: 255 }),
    location_datetime: (0, mysql_core_1.varchar)('location_datetime', { length: 255 }),
    current_latitude: (0, mysql_core_1.double)('current_latitude'),
    current_longitude: (0, mysql_core_1.double)('current_longitude'),
    total_detention_time: (0, mysql_core_1.varchar)('total_detention_time', { length: 255 }),
    total_stoppage_time: (0, mysql_core_1.varchar)('total_stoppage_time', { length: 255 }),
    total_drive_time: (0, mysql_core_1.varchar)('total_drive_time', { length: 255 }),
    start_location: (0, mysql_core_1.varchar)('start_location', { length: 255 }),
    end_location: (0, mysql_core_1.varchar)('end_location', { length: 255 }),
    start_latitude: (0, mysql_core_1.double)('start_latitude'),
    start_longitude: (0, mysql_core_1.double)('start_longitude'),
    end_latitude: (0, mysql_core_1.double)('end_latitude'),
    end_longitude: (0, mysql_core_1.double)('end_longitude'),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.shipmentStatusIdx = (0, mysql_core_1.index)('idx_shipment_status').on(exports.shipment.status, exports.shipment.shipment_id);
exports.shipmentDomainStatusIdx = (0, mysql_core_1.index)('idx_shipment_domain_status').on(exports.shipment.domain_name, exports.shipment.status);
exports.shipmentTrackingIdx = (0, mysql_core_1.index)('idx_shipment_tracking').on(exports.shipment.status, exports.shipment.domain_name, (0, drizzle_orm_1.desc)(exports.shipment.created_at));
exports.shipmentCreatedAtIdx = (0, mysql_core_1.index)('idx_shipment_created_at').on((0, drizzle_orm_1.desc)(exports.shipment.created_at));
exports.equipment = (0, mysql_core_1.mysqlTable)('equipment', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    equipment_id: (0, mysql_core_1.varchar)('equipment_id', { length: 255 }),
    service_provider_alias_value: (0, mysql_core_1.varchar)('service_provider_alias_value', { length: 255 }),
    driver_name: (0, mysql_core_1.varchar)('driver_name', { length: 255 }),
    driver_mobile_no: (0, mysql_core_1.varchar)('driver_mobile_no', { length: 255 }),
    shipment_id: (0, mysql_core_1.int)('shipment_id').references(() => exports.shipment.id),
    vehicle_name: (0, mysql_core_1.varchar)('vehicle_name', { length: 255 }),
    vehicle_status: (0, mysql_core_1.varchar)('vehicle_status', { length: 255 }),
    status_duration: (0, mysql_core_1.varchar)('status_duration', { length: 255 }),
    driver_details: (0, mysql_core_1.varchar)('driver_details', { length: 255 }),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.equipmentShipmentIdx = (0, mysql_core_1.index)('idx_equipment_shipment_id').on(exports.equipment.shipment_id, exports.equipment.equipment_id);
exports.alert_shipment_relation = (0, mysql_core_1.mysqlTable)('alert_shipment_relation', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    shipment_id: (0, mysql_core_1.int)('shipment_id').references(() => exports.shipment.id),
    alert_id: (0, mysql_core_1.int)('alert_id').references(() => exports.alert.id),
    alert_method: (0, mysql_core_1.int)('alert_meathod').notNull().default(1),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.alertShipmentIdx = (0, mysql_core_1.index)('idx_alert_shipment').on(exports.alert_shipment_relation.shipment_id, exports.alert_shipment_relation.alert_id);
// ========================================
// GEOFENCING SYSTEM WITH SPATIAL INDEXES
// ========================================
exports.geofencegroup = (0, mysql_core_1.mysqlTable)('geofence_group', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    geo_group: (0, mysql_core_1.varchar)('geo_group', { length: 255 }).notNull().unique(),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.geofence_table = (0, mysql_core_1.mysqlTable)('geofence_table', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    geofence_name: (0, mysql_core_1.varchar)('geofence_name', { length: 255 }).notNull(),
    latitude: (0, mysql_core_1.double)('latitude').notNull(),
    longitude: (0, mysql_core_1.double)('longitude').notNull(),
    location_id: (0, mysql_core_1.varchar)('location_id', { length: 255 }).notNull(),
    tag: (0, mysql_core_1.varchar)('tag', { length: 255 }).notNull().default('tms_api'),
    stop_type: (0, mysql_core_1.varchar)('stop_type', { length: 255 }).notNull().default(''),
    geofence_type: (0, mysql_core_1.int)('geofence_type').notNull().default(0),
    radius: (0, mysql_core_1.int)('radius').default(0),
    status: (0, mysql_core_1.boolean)('status').notNull().default(true),
    address: (0, mysql_core_1.varchar)('address', { length: 255 }).notNull().default(''),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
    time: (0, mysql_core_1.varchar)('time', { length: 255 }).default('1'),
});
exports.geofenceLocationIdx = (0, mysql_core_1.index)('idx_geofence_location').on(exports.geofence_table.latitude, exports.geofence_table.longitude, exports.geofence_table.radius);
exports.geofenceStatusTypeIdx = (0, mysql_core_1.index)('idx_geofence_status_type').on(exports.geofence_table.status, exports.geofence_table.geofence_type);
exports.geofenceLocationIdIdx = (0, mysql_core_1.index)('idx_geofence_location_id').on(exports.geofence_table.location_id);
exports.polygon_coordinates = (0, mysql_core_1.mysqlTable)('polygon_coordinates', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    geofence_id: (0, mysql_core_1.int)('geofence_id').notNull().references(() => exports.geofence_table.id),
    latitude: (0, mysql_core_1.double)('latitude').notNull(),
    longitude: (0, mysql_core_1.double)('longitude').notNull(),
    corner_points: (0, mysql_core_1.int)('corner_points').notNull().default(0),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow()
});
exports.polygonGeofenceIdx = (0, mysql_core_1.index)('idx_polygon_geofence').on(exports.polygon_coordinates.geofence_id, exports.polygon_coordinates.corner_points);
exports.geofence_group_relation = (0, mysql_core_1.mysqlTable)('geofence_group_relation', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    geofence_id: (0, mysql_core_1.int)('geofence_id').notNull().references(() => exports.geofence_table.id),
    group_id: (0, mysql_core_1.int)('group_id').notNull().references(() => exports.geofencegroup.id),
});
exports.geofenceGroupRelationIdx = (0, mysql_core_1.index)('idx_geofence_group_relation').on(exports.geofence_group_relation.group_id, exports.geofence_group_relation.geofence_id);
// ========================================
// REMAINING ESSENTIAL TABLES
// ========================================
exports.stop = (0, mysql_core_1.mysqlTable)('stop', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    location_id: (0, mysql_core_1.varchar)('location_id', { length: 255 }),
    stop_type: (0, mysql_core_1.varchar)('stop_type', { length: 255 }),
    stop_sequence: (0, mysql_core_1.int)('stop_sequence'),
    latitude: (0, mysql_core_1.double)('latitude'),
    longitude: (0, mysql_core_1.double)('longitude'),
    geo_fence_radius: (0, mysql_core_1.int)('geo_fence_radius'),
    planned_departure_date: (0, mysql_core_1.varchar)('planned_departure_date', { length: 255 }),
    shipment_id: (0, mysql_core_1.int)('shipment_id').references(() => exports.shipment.id),
    stop_name: (0, mysql_core_1.varchar)('stop_name', { length: 255 }),
    stop_status: (0, mysql_core_1.varchar)('stop_status', { length: 255 }),
    ceta: (0, mysql_core_1.varchar)('eta', { length: 255 }),
    geta: (0, mysql_core_1.varchar)('geta', { length: 255 }),
    actual_sequence: (0, mysql_core_1.int)('actual_sequence'),
    entry_time: (0, mysql_core_1.varchar)('entry_time', { length: 255 }),
    exit_time: (0, mysql_core_1.varchar)('exit_time', { length: 255 }),
    detention_time: (0, mysql_core_1.varchar)('detention_time', { length: 255 }),
    point_number: (0, mysql_core_1.int)('point_number'),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.stopShipmentIdx = (0, mysql_core_1.index)('idx_stop_shipment').on(exports.stop.shipment_id, exports.stop.stop_sequence);
exports.stopStatusIdx = (0, mysql_core_1.index)('idx_stop_status').on(exports.stop.stop_status, exports.stop.shipment_id);
exports.event = (0, mysql_core_1.mysqlTable)('event', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    event_code: (0, mysql_core_1.varchar)('event_code', { length: 255 }),
    event_datetime: (0, mysql_core_1.varchar)('event_datetime', { length: 255 }),
    shipment_id: (0, mysql_core_1.int)('shipment_id').references(() => exports.shipment.id),
    event_type: (0, mysql_core_1.varchar)('event_type', { length: 255 }),
    event_location: (0, mysql_core_1.varchar)('event_location', { length: 255 }),
    event_latitude: (0, mysql_core_1.double)('event_latitude'),
    event_longitude: (0, mysql_core_1.double)('event_longitude'),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.eventShipmentTimeIdx = (0, mysql_core_1.index)('idx_event_shipment_time').on(exports.event.shipment_id, exports.event.event_datetime);
exports.customers = (0, mysql_core_1.mysqlTable)('customers', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    customer_id: (0, mysql_core_1.varchar)('customer_id', { length: 255 }).notNull().unique(),
    customer_name: (0, mysql_core_1.varchar)('customer_name', { length: 255 }).notNull(),
    customer_location: (0, mysql_core_1.varchar)('customer_location', { length: 255 }),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.customersCustomerIdIdx = (0, mysql_core_1.index)('idx_customers_customer_id').on(exports.customers.customer_id);
exports.customer_group = (0, mysql_core_1.mysqlTable)('customer_group', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    group_name: (0, mysql_core_1.varchar)('group_name', { length: 255 }).notNull().unique(),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.customer_lr_detail = (0, mysql_core_1.mysqlTable)('customer_lr_detail', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    lr_number: (0, mysql_core_1.varchar)('lr_number', { length: 255 }),
    customer_id: (0, mysql_core_1.int)('customer_id').notNull().references(() => exports.customers.id),
    stop_id: (0, mysql_core_1.int)('stop_id').references(() => exports.stop.id)
});
exports.customerLrDetailIdx = (0, mysql_core_1.index)('idx_customer_lr_detail').on(exports.customer_lr_detail.customer_id, exports.customer_lr_detail.stop_id);
exports.customer_group_relation = (0, mysql_core_1.mysqlTable)('customer_group_relation', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    customer_id: (0, mysql_core_1.int)('customer_id').notNull().references(() => exports.customers.id),
    group_id: (0, mysql_core_1.int)('group_id').notNull().references(() => exports.customer_group.id),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.customerGroupRelationIdx = (0, mysql_core_1.index)('idx_customer_group_relation').on(exports.customer_group_relation.group_id, exports.customer_group_relation.customer_id);
// ========================================
// ADDITIONAL TABLES
// ========================================
exports.vendor = (0, mysql_core_1.mysqlTable)('vendor', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull().unique(),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
    status: (0, mysql_core_1.boolean)('status').notNull().default(true),
});
exports.entity_vendor = (0, mysql_core_1.mysqlTable)('entity_vendor', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    entity_id: (0, mysql_core_1.int)('entity_id').notNull().references(() => exports.entity.id),
    vendor_id: (0, mysql_core_1.int)('vendor_id').notNull().references(() => exports.vendor.id),
});
exports.entityVendorIdx = (0, mysql_core_1.index)('idx_entity_vendor').on(exports.entity_vendor.entity_id, exports.entity_vendor.vendor_id);
exports.vahan = (0, mysql_core_1.mysqlTable)('vahan', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    status_message: (0, mysql_core_1.varchar)('status_message', { length: 255 }),
    rc_regn_no: (0, mysql_core_1.varchar)('rc_regn_no', { length: 255 }).notNull().unique(),
    rc_regn_dt: (0, mysql_core_1.varchar)('rc_regn_dt', { length: 255 }),
    rc_regn_upto: (0, mysql_core_1.varchar)('rc_regn_upto', { length: 255 }),
    rc_purchase_dt: (0, mysql_core_1.varchar)('rc_purchase_dt', { length: 255 }),
    rc_owner_name: (0, mysql_core_1.varchar)('rc_owner_name', { length: 255 }),
    rc_present_address: (0, mysql_core_1.varchar)('rc_present_address', { length: 512 }),
    rc_vch_catg_desc: (0, mysql_core_1.varchar)('rc_vch_catg_desc', { length: 255 }),
    rc_insurance_comp: (0, mysql_core_1.varchar)('rc_insurance_comp', { length: 255 }),
    rc_insurance_policy_no: (0, mysql_core_1.varchar)('rc_insurance_policy_no', { length: 255 }),
    rc_insurance_upto: (0, mysql_core_1.varchar)('rc_insurance_upto', { length: 255 }),
    rc_permit_no: (0, mysql_core_1.varchar)('rc_permit_no', { length: 255 }),
    rc_permit_type: (0, mysql_core_1.varchar)('rc_permit_type', { length: 255 }),
    rc_permit_valid_upto: (0, mysql_core_1.varchar)('rc_permit_valid_upto', { length: 255 }),
    rc_vh_class_desc: (0, mysql_core_1.varchar)('rc_vh_class_desc', { length: 255 }),
    rc_maker_model: (0, mysql_core_1.varchar)('rc_maker_model', { length: 255 }),
    rc_maker_desc: (0, mysql_core_1.varchar)('rc_maker_desc', { length: 255 }),
    rc_color: (0, mysql_core_1.varchar)('rc_color', { length: 100 }),
    rc_chasi_no: (0, mysql_core_1.varchar)('rc_chasi_no', { length: 255 }),
    rc_eng_no: (0, mysql_core_1.varchar)('rc_eng_no', { length: 255 }),
    rc_fuel_desc: (0, mysql_core_1.varchar)('rc_fuel_desc', { length: 100 }),
    rc_norms_desc: (0, mysql_core_1.varchar)('rc_norms_desc', { length: 255 }),
    rc_fit_upto: (0, mysql_core_1.varchar)('rc_fit_upto', { length: 255 }),
    rc_tax_upto: (0, mysql_core_1.varchar)('rc_tax_upto', { length: 255 }),
    rc_pucc_upto: (0, mysql_core_1.varchar)('rc_pucc_upto', { length: 255 }),
    entity_id: (0, mysql_core_1.int)('entity_id').references(() => exports.entity.id, { onDelete: 'cascade' }),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.vahanRegistrationIdx = (0, mysql_core_1.index)('idx_vahan_registration').on(exports.vahan.rc_regn_no, exports.vahan.entity_id);
exports.vahanEntityIdx = (0, mysql_core_1.index)('idx_vahan_entity').on(exports.vahan.entity_id);
exports.role = (0, mysql_core_1.mysqlTable)('role', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    role_name: (0, mysql_core_1.varchar)('role_name', { length: 255 }).notNull(),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.tabs = (0, mysql_core_1.mysqlTable)('tabs', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    tab_name: (0, mysql_core_1.varchar)('tab_name', { length: 255 }).notNull(),
});
exports.report = (0, mysql_core_1.mysqlTable)('report', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    report_name: (0, mysql_core_1.varchar)('report_name', { length: 255 }).notNull(),
});
exports.user_role = (0, mysql_core_1.mysqlTable)('user_role', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    user_id: (0, mysql_core_1.int)('user_id').references(() => exports.usersTable.id),
    role_id: (0, mysql_core_1.int)('role_id').references(() => exports.role.id),
});
exports.userRoleIdx = (0, mysql_core_1.index)('idx_user_role').on(exports.user_role.user_id, exports.user_role.role_id);
exports.role_tabs = (0, mysql_core_1.mysqlTable)('role_tabs', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    role_id: (0, mysql_core_1.int)('role_id').references(() => exports.role.id),
    tab_id: (0, mysql_core_1.int)('tab_id').references(() => exports.tabs.id),
    status: (0, mysql_core_1.boolean)('status').notNull().default(false),
});
exports.roleTabIdx = (0, mysql_core_1.index)('idx_role_tabs').on(exports.role_tabs.role_id, exports.role_tabs.tab_id);
exports.role_report = (0, mysql_core_1.mysqlTable)('role_report', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    role_id: (0, mysql_core_1.int)('role_id').references(() => exports.role.id),
    report_id: (0, mysql_core_1.int)('report_id').references(() => exports.report.id),
});
exports.roleReportIdx = (0, mysql_core_1.index)('idx_role_report').on(exports.role_report.role_id, exports.role_report.report_id);
exports.gps_details = (0, mysql_core_1.mysqlTable)('gps_details', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    gps_type: (0, mysql_core_1.varchar)('gps_type', { length: 255 }),
    gps_frequency: (0, mysql_core_1.int)('gps_frequency'),
    gps_unit_id: (0, mysql_core_1.varchar)('gps_unit_id', { length: 255 }),
    gps_vendor: (0, mysql_core_1.varchar)('gps_vendor', { length: 255 }),
    shipment_id: (0, mysql_core_1.int)('shipment_id').references(() => exports.shipment.id),
    created_at: (0, mysql_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow(),
});
exports.gpsDetailsShipmentIdx = (0, mysql_core_1.index)('idx_gps_details_shipment').on(exports.gps_details.shipment_id);
// ========================================
// REMAINING TABLES (Less Critical)
// ========================================
exports.intutrack_relation = (0, mysql_core_1.mysqlTable)('intutrack_relation', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    phone_number: (0, mysql_core_1.varchar)('phone_number', { length: 15 }).notNull(),
    current_consent: (0, mysql_core_1.varchar)('current_consent', { length: 255 }).notNull(),
    consent: (0, mysql_core_1.varchar)('consent', { length: 255 }).notNull(),
    operator: (0, mysql_core_1.varchar)('operator', { length: 255 }).notNull(),
});
exports.alarm_phoneNumber = (0, mysql_core_1.mysqlTable)('alarm_phoneNumber', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    phone_number: (0, mysql_core_1.varchar)('phone_number', { length: 15 }).notNull(),
    alarm_id: (0, mysql_core_1.int)('alarm_id').notNull().references(() => exports.alarm.id),
});
exports.alarm_email = (0, mysql_core_1.mysqlTable)('email', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    email_address: (0, mysql_core_1.varchar)('email_address', { length: 255 }).notNull(),
    alarm_id: (0, mysql_core_1.int)('alarm_id').notNull().references(() => exports.alarm.id),
});
exports.usertype = (0, mysql_core_1.mysqlTable)('user_type', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    user_type: (0, mysql_core_1.varchar)('user_type', { length: 255 }).notNull().unique(),
});
exports.user_usertype = (0, mysql_core_1.mysqlTable)('user_usertype', {
    id: (0, mysql_core_1.int)().primaryKey().autoincrement(),
    user_id: (0, mysql_core_1.int)('user_id').references(() => exports.usersTable.id),
    user_type_id: (0, mysql_core_1.int)('user_type_id').references(() => exports.usertype.id),
});
