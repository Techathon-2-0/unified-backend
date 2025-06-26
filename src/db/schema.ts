import { mysqlTable, varchar, int, timestamp, double, boolean, index } from 'drizzle-orm/mysql-core';
import { desc } from 'drizzle-orm';
import { create } from 'domain';

// ========================================
// ALERT AND ALARM SYSTEM TABLES WITH INDEXES
// ========================================

export const alert = mysqlTable('alert', {
  id: int('id').primaryKey().autoincrement(),
  alert_type: int('alert_type').references(() => alarm.id),
  status: int('status').notNull().default(1), // 0: inactive, 1: active, 2: manually closed
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
  latitude: double('latitude').notNull(),
  longitude: double('longitude').notNull(),
});

export const alert_entity_relation = mysqlTable('alert_entity_relation', {
  id: int().primaryKey().autoincrement(),
  alert_id: int('alert_id').notNull().references(() => alert.id),
  entity_id: int('entity_id').notNull().references(() => entity.id),
});

// ✅ Define indexes separately
export const alertStatusTypeIdx = index('idx_alert_status_type').on(
  alert.status,
  alert.alert_type,
  desc(alert.updated_at)
);

export const alertCreatedAtIdx = index('idx_alert_created_at').on(
  desc(alert.created_at)
);

export const alarm = mysqlTable('alarm', {
  id: int().primaryKey().autoincrement(),
  alarm_type_id: int('alarm_type_id').notNull(),
  alarm_category: varchar('alarm_category', { length: 255 }).notNull(),
  alarm_value: int('alarm_value').notNull(),
  rest_duration: int('rest_duration'),
  geofence_status: int('geofence_status'),
  alarm_generation: boolean('alarm_generation').notNull().default(true),
  active_start_time_range: varchar('active_time_range', { length: 255 }).default(''),
  active_end_time_range: varchar('active_end_time_range', { length: 255 }).default(''),
  active_trip: boolean('active_trip').notNull().default(false),
  alarm_status: boolean('alarm_status').notNull().default(true),
  descrption: varchar('description', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const alarmStatusIdx = index('idx_alarm_status').on(alarm.alarm_status, alarm.alarm_type_id);
export const alarmCategoryIdx = index('idx_alarm_category').on(alarm.alarm_category, alarm.alarm_status);

export const alarm_alert = mysqlTable('alarm_alert', {
  id: int().primaryKey().autoincrement(),
  alarm_id: int('alarm_id').notNull().references(() => alarm.id),
  alert_id: int('alert_id').notNull().references(() => alert.id),
});

export const alarmAlertIdx = index('idx_alarm_alert_alarm').on(alarm_alert.alarm_id, alarm_alert.alert_id);

export const alarm_customer_group = mysqlTable('alarm_customer_group', {
  id: int().primaryKey().autoincrement(),
  alarm_id: int('alarm_id').notNull().references(() => alarm.id),
  customer_group_id: int('customer_group_id').notNull().references(() => customer_group.id),
});

export const alarmCustomerGroupIdx = index('idx_alarm_customer_group').on(
  alarm_customer_group.customer_group_id, 
  alarm_customer_group.alarm_id
);

export const alarm_geofence_group = mysqlTable('alarm_geofence_group', {
  id: int().primaryKey().autoincrement(),
  alarm_id: int('alarm_id').notNull().references(() => alarm.id),
  geofence_group_id: int('geofence_group_id').notNull().references(() => geofencegroup.id),
});

export const alarmGeofenceGroupIdx = index('idx_alarm_geofence_group').on(
  alarm_geofence_group.geofence_group_id, 
  alarm_geofence_group.alarm_id
);

export const alarm_group = mysqlTable('alarm_group', {
  id: int().primaryKey().autoincrement(),
  alarm_id: int('alarm_id').notNull().references(() => alarm.id),
  vehicle_group_id: int('vehicle_group_id').notNull().references(() => group.id),
});

export const alarmVehicleGroupIdx = index('idx_alarm_vehicle_group').on(
  alarm_group.vehicle_group_id, 
  alarm_group.alarm_id
);

// ========================================
// ENTITY (VEHICLE) MANAGEMENT WITH CRITICAL INDEXES
// ========================================

export const entity = mysqlTable('entity', {
  id: int('id').primaryKey().autoincrement(),
  vehicleNumber: varchar('vehicle_number', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(),
  status: boolean('status').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const entityVehicleNumberIdx = index('idx_entity_vehicle_number').on(entity.vehicleNumber);
export const entityStatusIdx = index('idx_entity_status').on(entity.status, entity.vehicleNumber);
export const entityTypeStatusIdx = index('idx_entity_type_status').on(entity.type, entity.status);
export const entityCreatedAtIdx = index('idx_entity_created_at').on(desc(entity.createdAt));

export const group = mysqlTable('group', {
  id: int().primaryKey().autoincrement(),
  group_name: varchar('group_name', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const group_entity = mysqlTable('group_entity', {
  id: int().primaryKey().autoincrement(),
  group_id: int('group_id').notNull().references(() => group.id),
  entity_id: int('entity_id').notNull().references(() => entity.id),
});

export const groupEntityIdx = index('idx_group_entity_group').on(group_entity.group_id, group_entity.entity_id);

// ========================================
// GPS SCHEMA WITH MOST CRITICAL INDEXES
// ========================================

export const gps_schema = mysqlTable('gps_schema', {
  id: int('id').primaryKey().autoincrement(),
  GPSVendor: varchar('GPSVendor', { length: 255 }),
  deviceId: varchar('deviceId', { length: 255 }),
  trailerNumber: varchar('trailerNumber', { length: 255 }).references(() => entity.vehicleNumber),
  timestamp: int('timestamp'),
  gpstimestamp: int('gpstimestamp'),
  gprstimestamp: int('gprstimestamp'),
  address: varchar('address', { length: 255 }),
  latitude: double('latitude'),
  longitude: double('longitude'),
  heading: int('heading'),
  speed: int('speed'),
  areaCode: varchar('areaCode', { length: 255 }),
  cellId: varchar('cellId', { length: 255 }),
  mcc: varchar('mcc', { length: 255 }),
  mnc: varchar('mnc', { length: 255 }),
  lac: varchar('lac', { length: 255 }),
  hdop: varchar('hdop', { length: 255 }),
  numberOfSatellites: varchar('numberOfSatellites', { length: 255 }),
  digitalInput2: int('digitalInput2'),
  digitalInput3: int('digitalInput3'),
  analogInput1: varchar('analogInput1', { length: 255 }),
  digitalOutput1: varchar('digitalOutput1', { length: 255 }),
  powerSupplyVoltage: varchar('powerSupplyVoltage', { length: 255 }),
  internalBatteryVoltage: varchar('internalBatteryVoltage', { length: 255 }),
  internalBatteryLevel: varchar('internalBatteryLevel', { length: 255 }),
  power: varchar('power', { length: 255 }),
  gsmlevel: varchar('gsmlevel', { length: 255 }),
  accelerometerX: varchar('accelerometerX', { length: 255 }),
  accelerometerY: varchar('accelerometerY', { length: 255 }),
  accelerometerZ: varchar('accelerometerZ', { length: 255 }),
  maxAccelX: varchar('maxAccelX', { length: 255 }),
  maxAccelY: varchar('maxAccelY', { length: 255 }),
  maxAccelZ: varchar('maxAccelZ', { length: 255 }),
  locationSource: varchar('locationSource', { length: 255 }),
  serviceProvider: varchar('serviceProvider', { length: 255 }),
  gpsSpeed: varchar('gpsSpeed', { length: 255 }),
  dtcCount: varchar('dtcCount', { length: 255 }),
  dtcDistance: varchar('dtcDistance', { length: 255 }),
  unplugged: varchar('unplugged', { length: 255 }),
  gpsOdometer: varchar('gpsOdometer', { length: 255 }),
  tilt: varchar('tilt', { length: 255 }),
  digitalInput1: int('digitalInput1'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ✅ MOST CRITICAL INDEXES for GPS tracking
export const gpsTrailerTimestampIdx = index('idx_gps_trailer_timestamp').on(
  gps_schema.trailerNumber,
  desc(gps_schema.gpstimestamp)
);

export const gpsTrailerTimeRangeIdx = index('idx_gps_trailer_time_range').on(
  gps_schema.trailerNumber,
  desc(gps_schema.gpstimestamp),
  gps_schema.latitude,
  gps_schema.longitude
);

export const gpsVendorDeviceIdx = index('idx_gps_vendor_device').on(
  gps_schema.GPSVendor,
  gps_schema.deviceId
);

export const gpsLocationIdx = index('idx_gps_location').on(
  gps_schema.latitude,
  gps_schema.longitude,
  desc(gps_schema.gpstimestamp)
);

export const gpsSpeedTrackingIdx = index('idx_gps_tracking_status').on(
  gps_schema.trailerNumber,
  desc(gps_schema.gpstimestamp),
  gps_schema.speed
);

export const gpsCreatedAtIdx = index('idx_gps_created_at').on(desc(gps_schema.created_at));

// ========================================
// USER MANAGEMENT WITH ACCESS CONTROL INDEXES
// ========================================

export const usersTable = mysqlTable('users_table', {
  id: int().primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 15 }).notNull(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  active: boolean('active').notNull().default(false),
  tag: varchar('usertag', { length: 255 }).default(''),
});

export const usersUsernameIdx = index('idx_users_username').on(usersTable.username, usersTable.active);
export const usersEmailIdx = index('idx_users_email').on(usersTable.email, usersTable.active);

export const user_group = mysqlTable('user_group', {
  id: int().primaryKey().autoincrement(),
  user_id: int('user_id').references(() => usersTable.id),
  vehicle_group_id: int('vehicle_group_id').references(() => group.id),
});

export const userGroupIdx = index('idx_user_group_user_id').on(user_group.user_id, user_group.vehicle_group_id);

export const user_geofence_group = mysqlTable('user_geofence_group', {
  id: int().primaryKey().autoincrement(),
  user_id: int('user_id').references(() => usersTable.id),
  geofence_group_id: int('geofence_group_id').references(() => geofencegroup.id),
});

export const userGeofenceIdx = index('idx_user_geofence_group').on(
  user_geofence_group.user_id, 
  user_geofence_group.geofence_group_id
);

export const user_customer_group = mysqlTable('user_customer_group', {
  id: int().primaryKey().autoincrement(),
  user_id: int('user_id').references(() => usersTable.id),
  customer_group_id: int('customer_group_id').references(() => customer_group.id)
});

export const userCustomerIdx = index('idx_user_customer_group').on(
  user_customer_group.user_id, 
  user_customer_group.customer_group_id
);

// ========================================
// SHIPMENT AND EQUIPMENT WITH TRACKING INDEXES
// ========================================

export const transmission_header = mysqlTable('transmission_header', {
  id: int().primaryKey().autoincrement(),
  username: varchar('username', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).$default(() => ''),
});

export const transmissionHeaderIdx = index('idx_transmission_header').on(
  transmission_header.username, 
  transmission_header.token
);

export const shipment = mysqlTable('shipment', {
  id: int('id').primaryKey().autoincrement(),
  domain_name: varchar('domain_name', { length: 255 }),
  shipment_id: varchar('shipment_id', { length: 255 }).notNull().unique(),
  route_name: varchar('route_name', { length: 255 }),
  transmission_header_id: int('transmission_header_id').references(() => transmission_header.id),
  status: varchar('status', { length: 255 }),
  route_id: varchar('route_id', { length: 255 }),
  route_type: varchar('route_type', { length: 255 }),
  start_time: varchar('start_time', { length: 255 }),
  end_time: varchar('end_time', { length: 255 }),
  current_location: varchar('current_location', { length: 255 }),
  location_datetime: varchar('location_datetime', { length: 255 }),
  current_latitude: double('current_latitude'),
  current_longitude: double('current_longitude'),
  total_detention_time: varchar('total_detention_time', { length: 255 }),
  total_stoppage_time: varchar('total_stoppage_time', { length: 255 }),
  total_drive_time: varchar('total_drive_time', { length: 255 }),
  start_location: varchar('start_location', { length: 255 }),
  end_location: varchar('end_location', { length: 255 }),
  start_latitude: double('start_latitude'),
  start_longitude: double('start_longitude'),
  end_latitude: double('end_latitude'),
  end_longitude: double('end_longitude'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const shipmentStatusIdx = index('idx_shipment_status').on(shipment.status, shipment.shipment_id);
export const shipmentDomainStatusIdx = index('idx_shipment_domain_status').on(shipment.domain_name, shipment.status);
export const shipmentTrackingIdx = index('idx_shipment_tracking').on(
  shipment.status,
  shipment.domain_name,
  desc(shipment.created_at)
);
export const shipmentCreatedAtIdx = index('idx_shipment_created_at').on(desc(shipment.created_at));

export const equipment = mysqlTable('equipment', {
  id: int().primaryKey().autoincrement(),
  equipment_id: varchar('equipment_id', { length: 255 }),
  service_provider_alias_value: varchar('service_provider_alias_value', { length: 255 }),
  driver_name: varchar('driver_name', { length: 255 }),
  driver_mobile_no: varchar('driver_mobile_no', { length: 255 }),
  shipment_id: int('shipment_id').references(() => shipment.id),
  vehicle_name: varchar('vehicle_name', { length: 255 }),
  vehicle_status: varchar('vehicle_status', { length: 255 }),
  status_duration: varchar('status_duration', { length: 255 }),
  driver_details: varchar('driver_details', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const equipmentShipmentIdx = index('idx_equipment_shipment_id').on(
  equipment.shipment_id, 
  equipment.equipment_id
);

export const alert_shipment_relation = mysqlTable('alert_shipment_relation', {
  id: int().primaryKey().autoincrement(),
  shipment_id: varchar('shipment_id', { length: 255 }).notNull().references(() => shipment.shipment_id), 
  alert_id: int('alert_id').references(() => alert.id),
  alert_method: int('alert_meathod').notNull().default(1), //  
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const alertShipmentIdx = index('idx_alert_shipment').on(
  alert_shipment_relation.shipment_id, 
  alert_shipment_relation.alert_id
);

// ========================================
// GEOFENCING SYSTEM WITH SPATIAL INDEXES
// ========================================

export const geofencegroup = mysqlTable('geofence_group', {
  id: int().primaryKey().autoincrement(),
  geo_group: varchar('geo_group', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const geofence_table = mysqlTable('geofence_table', {
  id: int().primaryKey().autoincrement(),
  geofence_name: varchar('geofence_name', { length: 255 }).notNull(),
  latitude: double('latitude').notNull(),
  longitude: double('longitude').notNull(),
  location_id: varchar('location_id', { length: 255 }).notNull(),
  tag: varchar('tag', { length: 255 }).notNull().default('tms_api'),
  stop_type: varchar('stop_type', { length: 255 }).notNull().default(''),
  geofence_type: int('geofence_type').notNull().default(0),
  radius: int('radius').default(0),
  status: boolean('status').notNull().default(true),
  address: varchar('address', { length: 255 }).notNull().default(''),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
  time: varchar('time', { length: 255 }).default('1'),
});

export const geofenceLocationIdx = index('idx_geofence_location').on(
  geofence_table.latitude, 
  geofence_table.longitude, 
  geofence_table.radius
);
export const geofenceStatusTypeIdx = index('idx_geofence_status_type').on(
  geofence_table.status, 
  geofence_table.geofence_type
);
export const geofenceLocationIdIdx = index('idx_geofence_location_id').on(geofence_table.location_id);

export const polygon_coordinates = mysqlTable('polygon_coordinates', {
  id: int().primaryKey().autoincrement(),
  geofence_id: int('geofence_id').notNull().references(() => geofence_table.id),
  latitude: double('latitude').notNull(),
  longitude: double('longitude').notNull(),
  corner_points: int('corner_points').notNull().default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const polygonGeofenceIdx = index('idx_polygon_geofence').on(
  polygon_coordinates.geofence_id, 
  polygon_coordinates.corner_points
);

export const geofence_group_relation = mysqlTable('geofence_group_relation', {
  id: int().primaryKey().autoincrement(),
  geofence_id: int('geofence_id').notNull().references(() => geofence_table.id),
  group_id: int('group_id').notNull().references(() => geofencegroup.id),
});

export const geofenceGroupRelationIdx = index('idx_geofence_group_relation').on(
  geofence_group_relation.group_id, 
  geofence_group_relation.geofence_id
);

// ========================================
// REMAINING ESSENTIAL TABLES
// ========================================

export const stop = mysqlTable('stop', {
  id: int().primaryKey().autoincrement(),
  location_id: varchar('location_id', { length: 255 }),
  stop_type: varchar('stop_type', { length: 255 }),
  stop_sequence: int('stop_sequence'),
  latitude: double('latitude'),
  longitude: double('longitude'),
  geo_fence_radius: int('geo_fence_radius'),
  planned_departure_date: varchar('planned_departure_date', { length: 255 }),
  shipment_id: int('shipment_id').references(() => shipment.id),
  stop_name: varchar('stop_name', { length: 255 }),
  stop_status: varchar('stop_status', { length: 255 }),
  ceta: varchar('eta', { length: 255 }),
  geta: varchar('geta', { length: 255 }),
  actual_sequence: int('actual_sequence'),
  entry_time: varchar('entry_time', { length: 255 }),
  exit_time: varchar('exit_time', { length: 255 }),
  detention_time: varchar('detention_time', { length: 255 }),
  point_number: int('point_number'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const stopShipmentIdx = index('idx_stop_shipment').on(stop.shipment_id, stop.stop_sequence);
export const stopStatusIdx = index('idx_stop_status').on(stop.stop_status, stop.shipment_id);

export const event = mysqlTable('event', {
  id: int().primaryKey().autoincrement(),
  event_code: varchar('event_code', { length: 255 }),
  event_datetime: varchar('event_datetime', { length: 255 }),
  shipment_id: int('shipment_id').references(() => shipment.id),
  event_type: varchar('event_type', { length: 255 }),
  event_location: varchar('event_location', { length: 255 }),
  event_latitude: double('event_latitude'),
  event_longitude: double('event_longitude'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const eventShipmentTimeIdx = index('idx_event_shipment_time').on(event.shipment_id, event.event_datetime);

export const customers = mysqlTable('customers', {
  id: int().primaryKey().autoincrement(),
  customer_id: varchar('customer_id', { length: 255 }).notNull().unique(),
  customer_name: varchar('customer_name', { length: 255 }).notNull(),
  customer_location: varchar('customer_location', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const customersCustomerIdIdx = index('idx_customers_customer_id').on(customers.customer_id);

export const customer_group = mysqlTable('customer_group', {
  id: int().primaryKey().autoincrement(),
  group_name: varchar('group_name', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const customer_lr_detail = mysqlTable('customer_lr_detail', {
  id: int().primaryKey().autoincrement(),
  lr_number: varchar('lr_number', { length: 255 }),
  customer_id: int('customer_id').notNull().references(() => customers.id),
  stop_id: int('stop_id').references(() => stop.id)
});

export const customerLrDetailIdx = index('idx_customer_lr_detail').on(
  customer_lr_detail.customer_id, 
  customer_lr_detail.stop_id
);

export const customer_group_relation = mysqlTable('customer_group_relation', {
  id: int().primaryKey().autoincrement(),
  customer_id: int('customer_id').notNull().references(() => customers.id),
  group_id: int('group_id').notNull().references(() => customer_group.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const customerGroupRelationIdx = index('idx_customer_group_relation').on(
  customer_group_relation.group_id, 
  customer_group_relation.customer_id
);

// ========================================
// ADDITIONAL TABLES
// ========================================

export const vendor = mysqlTable('vendor', {
  id: int().primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
  status: boolean('status').notNull().default(true),
});

export const entity_vendor = mysqlTable('entity_vendor', {
  id: int().primaryKey().autoincrement(),
  entity_id: int('entity_id').notNull().references(() => entity.id),
  vendor_id: int('vendor_id').notNull().references(() => vendor.id),
});

export const entityVendorIdx = index('idx_entity_vendor').on(entity_vendor.entity_id, entity_vendor.vendor_id);

export const vahan = mysqlTable('vahan', {
  id: int().primaryKey().autoincrement(),
  status_message: varchar('status_message', { length: 255 }),
  rc_regn_no: varchar('rc_regn_no', { length: 255 }).notNull().unique(),
  rc_regn_dt: varchar('rc_regn_dt', { length: 255 }),
  rc_regn_upto: varchar('rc_regn_upto', { length: 255 }),
  rc_purchase_dt: varchar('rc_purchase_dt', { length: 255 }),
  rc_owner_name: varchar('rc_owner_name', { length: 255 }),
  rc_present_address: varchar('rc_present_address', { length: 512 }),
  rc_vch_catg_desc: varchar('rc_vch_catg_desc', { length: 255 }),
  rc_insurance_comp: varchar('rc_insurance_comp', { length: 255 }),
  rc_insurance_policy_no: varchar('rc_insurance_policy_no', { length: 255 }),
  rc_insurance_upto: varchar('rc_insurance_upto', { length: 255 }),
  rc_permit_no: varchar('rc_permit_no', { length: 255 }),
  rc_permit_type: varchar('rc_permit_type', { length: 255 }),
  rc_permit_valid_upto: varchar('rc_permit_valid_upto', { length: 255 }),
  rc_vh_class_desc: varchar('rc_vh_class_desc', { length: 255 }),
  rc_maker_model: varchar('rc_maker_model', { length: 255 }),
  rc_maker_desc: varchar('rc_maker_desc', { length: 255 }),
  rc_color: varchar('rc_color', { length: 100 }),
  rc_chasi_no: varchar('rc_chasi_no', { length: 255 }),
  rc_eng_no: varchar('rc_eng_no', { length: 255 }),
  rc_fuel_desc: varchar('rc_fuel_desc', { length: 100 }),
  rc_norms_desc: varchar('rc_norms_desc', { length: 255 }),
  rc_fit_upto: varchar('rc_fit_upto', { length: 255 }),
  rc_tax_upto: varchar('rc_tax_upto', { length: 255 }),
  rc_pucc_upto: varchar('rc_pucc_upto', { length: 255 }),
  entity_id: int('entity_id').references(() => entity.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const vahanRegistrationIdx = index('idx_vahan_registration').on(vahan.rc_regn_no, vahan.entity_id);
export const vahanEntityIdx = index('idx_vahan_entity').on(vahan.entity_id);

export const role = mysqlTable('role', {
  id: int().primaryKey().autoincrement(),
  role_name: varchar('role_name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const tabs = mysqlTable('tabs', {
  id: int().primaryKey().autoincrement(),
  tab_name: varchar('tab_name', { length: 255 }).notNull(),
});

export const report = mysqlTable('report', {
  id: int().primaryKey().autoincrement(),
  report_name: varchar('report_name', { length: 255 }).notNull(),
});

export const user_role = mysqlTable('user_role', {
  id: int().primaryKey().autoincrement(),
  user_id: int('user_id').references(() => usersTable.id),
  role_id: int('role_id').references(() => role.id),
});

export const userRoleIdx = index('idx_user_role').on(user_role.user_id, user_role.role_id);

export const role_tabs = mysqlTable('role_tabs', {
  id: int().primaryKey().autoincrement(),
  role_id: int('role_id').references(() => role.id),
  tab_id: int('tab_id').references(() => tabs.id),
  status: boolean('status').notNull().default(false),
});

export const roleTabIdx = index('idx_role_tabs').on(role_tabs.role_id, role_tabs.tab_id);

export const role_report = mysqlTable('role_report', {
  id: int().primaryKey().autoincrement(),
  role_id: int('role_id').references(() => role.id),
  report_id: int('report_id').references(() => report.id),
});

export const roleReportIdx = index('idx_role_report').on(role_report.role_id, role_report.report_id);

export const gps_details = mysqlTable('gps_details', {
  id: int().primaryKey().autoincrement(),
  gps_type: varchar('gps_type', { length: 255 }),
  gps_frequency: int('gps_frequency'),
  gps_unit_id: varchar('gps_unit_id', { length: 255 }),
  gps_vendor: varchar('gps_vendor', { length: 255 }),
  shipment_id: int('shipment_id').references(() => shipment.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const gpsDetailsShipmentIdx = index('idx_gps_details_shipment').on(gps_details.shipment_id);

// ========================================
// REMAINING TABLES (Less Critical)
// ========================================

export const intutrack_relation = mysqlTable('intutrack_relation', {
  id: int().primaryKey().autoincrement(),
  phone_number: varchar('phone_number', { length: 15 }).notNull(),
  current_consent: varchar('current_consent', { length: 255 }).default('Pending'),
  consent: varchar('consent', { length: 255 }).notNull(),
  operator: varchar('operator', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const alarm_phoneNumber = mysqlTable('alarm_phoneNumber', {
  id: int().primaryKey().autoincrement(),
  phone_number: varchar('phone_number', { length: 15 }).notNull(),
  alarm_id: int('alarm_id').notNull().references(() => alarm.id),
});

export const alarm_email = mysqlTable('email', {
  id: int().primaryKey().autoincrement(),
  email_address: varchar('email_address', { length: 255 }).notNull(),
  alarm_id: int('alarm_id').notNull().references(() => alarm.id),
});

export const usertype = mysqlTable('user_type', {
  id: int().primaryKey().autoincrement(),
  user_type: varchar('user_type', { length: 255 }).notNull().unique(),
});

export const user_usertype = mysqlTable('user_usertype', {
  id: int().primaryKey().autoincrement(),
  user_id: int('user_id').references(() => usersTable.id),
  user_type_id: int('user_type_id').references(() => usertype.id),
});