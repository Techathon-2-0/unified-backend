import { mysqlTable, varchar, int, timestamp, double,boolean} from 'drizzle-orm/mysql-core';

export const geofence_table = mysqlTable('geofence_table', {
  id: int().primaryKey().autoincrement(),
  geofence_name: varchar('geofence_name', { length: 255 }).notNull(),
  latitude: double('latitude').notNull(),
  longitude: double('longitude').notNull(),
  location_id: varchar('location_id', { length: 255 }).notNull(), // for center of geofence
  tag: varchar('tag', { length: 255 }).notNull().default('tms_api'), // eg a , b , c
  stop_type: varchar('stop_type', { length: 255 }).notNull().default(''),
  geofence_type: int('geofence_type').notNull().default(0), //0 for cicrle , 1 for pointer 2 for polygon,
  radius: int('radius').default(0),
  status: boolean('status').notNull().default(true), // 1 for active, 0 for inactive
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const polygon_coordinates = mysqlTable('polygon_coordinates', {
  id: int().primaryKey().autoincrement(), // Adding primary key
  geofence_id: int('geofence_id').notNull().references(() => geofence_table.id),
  latitude: double('latitude').notNull(),
  longitude: double('longitude').notNull(),
  corner_points: int('corner_points').notNull().default(0), // Number of corner points in the polygon
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const geofencegroup = mysqlTable('geofence_group', {
  id: int().primaryKey().autoincrement(),
  geo_group: varchar('geo_group', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const geofence_group_relation = mysqlTable('geofence_group_relation', {
  id: int().primaryKey().autoincrement(),
  geofence_id: int('geofence_id').notNull().references(() => geofence_table.id),
  group_id: int('group_id').notNull().references(() => geofencegroup.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// geofence trip waale se aata h , i.e sto , we want to soter geofence , tms_api krke store krna h 

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

export const entity = mysqlTable('entity', {
  id: int().primaryKey().autoincrement(), // Changed to autoincrement
  vehicleNumber: varchar('vehicle_number', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // e.g., Car, Truck, Excavator
  status: boolean('status').notNull().default(true),  // 1 for active , 0 for inactive
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const entity_vendor = mysqlTable('entity_vendor', {
  id: int().primaryKey().autoincrement(),
  entity_id: int('entity_id').notNull().references(() => entity.id),
  vendor_id: int('vendor_id').notNull().references(() => vendor.id),
});

export const vendor = mysqlTable('vendor', {
  id: int().primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
  status: boolean('status').notNull().default(true), // 1 for active, 0 for inactive
});

export const usertype= mysqlTable('user_type', {
  id: int().primaryKey().autoincrement(),
  user_type: varchar('user_type', { length: 255 }).notNull().unique(),
});

// export const usertag = mysqlTable('user_tag', {
//   id: int().primaryKey().autoincrement(),
//   user_tag: varchar('tag', { length: 255 }).notNull().unique(),
// });

export const vehiclegroup = mysqlTable('vehicle_group', {
  id: int().primaryKey().autoincrement(),
  vehicle_group: varchar('vehicle_group', { length: 255 }).notNull().unique(),
});


export const role = mysqlTable('role', {
  id: int().primaryKey().autoincrement(),
  role_name: varchar('role_name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const tabs= mysqlTable('tabs', {
  id: int().primaryKey().autoincrement(),
  tab_name: varchar('tab_name', { length: 255 }).notNull(),
});
export const report= mysqlTable('report', {
  id: int().primaryKey().autoincrement(),
  report_name: varchar('report_name', { length: 255 }).notNull(),
});

export const role_tabs = mysqlTable('role_tabs', {
  id: int().primaryKey().autoincrement(),
  role_id: int('role_id').references(() => role.id), // Foreign key reference to role table
  tab_id: int('tab_id').references(() => tabs.id), // Foreign key reference to tabs table 
  status: boolean('status').notNull().default(false), // 1 for edit , 0 for view
});

export const role_report = mysqlTable('role_report', {
  id: int().primaryKey().autoincrement(),
  role_id: int('role_id').references(() => role.id), // Foreign key reference to role table
  report_id: int('report_id').references(() => report.id), // Foreign key reference to report table
});

export const usersTable = mysqlTable('users_table', {
  id: int().primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 15 }).notNull(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  active: boolean('active').notNull().default(false), // 1 for active, 0 for inactive
  tag: varchar('usertag', { length: 255 }).default(''),
});

export const user_group=mysqlTable('user_group', {
  id: int().primaryKey().autoincrement(),
  user_id: int('user_id').references(() => usersTable.id), // Foreign key reference to users_table
  vehicle_group_id: int('vehicle_group_id').references(() => group.id), // Foreign key reference to vehicle_group table
});

export const user_role = mysqlTable('user_role', {
  id: int().primaryKey().autoincrement(),
  user_id: int('user_id').references(() => usersTable.id), // Foreign key reference to users_table
  role_id: int('role_id').references(() => role.id), // Foreign key reference to role table
});

export const user_geofence_group = mysqlTable('user_geofence_group', {
  id: int().primaryKey().autoincrement(),
  user_id: int('user_id').references(() => usersTable.id), // Foreign key reference to users_table
  geofence_group_id: int('geofence_group_id').references(() => geofencegroup.id), // Foreign key reference to geofence_group table
});


export const user_usertype = mysqlTable('user_usertype', {
  id: int().primaryKey().autoincrement(),
  user_id: int('user_id').references(() => usersTable.id), // Foreign key reference to users_table
  user_type_id: int('user_type_id').references(() => usertype.id), // Foreign key reference to user_type table
});

// export const user_usertag = mysqlTable('user_usertag', {
//   id: int().primaryKey().autoincrement(),
//   user_id: int('user_id').references(() => usersTable.id), // Foreign key reference to users_table
//   user_tag_id: int('user_tag_id').references(() => usertag.id), // Foreign key reference to user_tag table
// });

export const transmission_header = mysqlTable('transmission_header', {
  id: int().primaryKey().autoincrement(),
  username: varchar('username', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).$default(() => ''),
});

export const shipment = mysqlTable('shipment', {
  id: int().primaryKey().autoincrement(),
  domain_name: varchar('domain_name', { length: 255 }),
  shipment_id: varchar('shipment_id', { length: 255 }),
  route_name: varchar('route_name', { length: 255 }),
  transmission_header_id: int('transmission_header_id').references(() => transmission_header.id),

  status: varchar('status', { length: 255 }),
  route_id: varchar('route_id', { length: 255 }),
  route_type: varchar('route_type', { length: 255 }),
  start_time: varchar('start_time', { length:255 }),
  end_time: varchar('end_time', { length: 255 }),
  current_location: varchar('current_location', { length: 255 }),
  location_datetime: varchar('location_datetime', { length: 255 }),
  current_latitude: double('current_latitude'),
  current_longitude: double('current_longitude'),
  total_detention_time: varchar('total_detention_time', { length:255 }),
  total_stoppage_time: varchar('total_stoppage_time', { length:255 }),
  total_drive_time: varchar('total_drive_time', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

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
export const stop = mysqlTable('stop', {
  id: int().primaryKey().autoincrement(),
  location_id: varchar('location_id' , {length: 255 }),
  stop_type: varchar('stop_type', { length: 255 }),
  stop_sequence: int('stop_sequence'),
  latitude: double('latitude'), // changed from int to double
  longitude: double('longitude'), // changed from int to double
  geo_fence_radius: int('geo_fence_radius'),
  planned_departure_date: varchar('planned_departure_date', { length: 255 }),
  shipment_id: int('shipment_id').references(() => shipment.id),
  stop_name: varchar('stop_name', { length: 255 }),
  stop_status: varchar('stop_status', { length: 255 }),
  eta: varchar('eta', { length: 255 }),
  actual_sequence: int('actual_sequence'),
  entry_time: varchar('entry_time', { length: 255 }),
  exit_time: varchar('exit_time', { length: 255 }),
  detention_time: varchar('detention_time', { length: 255 }),
  point_number: int('point_number'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const customer_lr_detail = mysqlTable('customer_lr_detail', {
  id: int().primaryKey().autoincrement(),
  lr_number: varchar('lr_number', { length: 255 }),
  customer_id: varchar('customer_id', { length: 255 }),
  customer_name: varchar('customer_name', { length: 255 }),
  customer_location: varchar('customer_location', { length: 255 }),
  stop_id: int('stop_id').references(() => stop.id)
});

export const customer_group = mysqlTable('customer_group', {
  id: int().primaryKey().autoincrement(),
  group_name: varchar('group_name', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const customer_group_relation = mysqlTable('customer_group_relation', {
  id: int().primaryKey().autoincrement(),
  customer_id: int('customer_id').notNull().references(() => customer_lr_detail.id),
  group_id: int('group_id').notNull().references(() => customer_group.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

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

export const gps_schema= mysqlTable('gps_schema', {
  id: int().primaryKey().autoincrement(),
  equipmentId: int('equipmentId').references(() => equipment.id),
  GPSVendor: varchar('GPSVendor', { length: 255 }),
  deviceId: varchar('deviceId', { length: 255 }),
  trailerNumber: varchar('trailerNumber', { length: 255 }),
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

export const user_customer_group=mysqlTable('user_customer_group',{
  id: int().primaryKey().autoincrement(),
  user_id:int('user_id').references(()=>usersTable.id),
  customer_group_id:int('customer_group_id').references(()=>customer_group.id)
})

