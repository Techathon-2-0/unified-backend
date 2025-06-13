-- Active: 1724313535826@@127.0.0.1@3306
-- ========================================
-- CRITICAL GPS TRACKING INDEXES
-- ========================================

-- Most critical index for live GPS tracking
-- This covers the most frequent query: getting latest GPS data by vehicle
-- Composite index: trailerNumber + gpstimestamp (DESC) for optimal sorting
CREATE INDEX idx_gps_trailer_timestamp ON gps_schema(trailerNumber, gpstimestamp DESC);
-- Covers queries like: SELECT * FROM gps_schema WHERE trailerNumber = 'MH12AB1234' ORDER BY gpstimestamp DESC LIMIT 1

-- GPS range queries for reports and historical data
-- Used when fetching GPS data for specific time ranges
CREATE INDEX idx_gps_trailer_time_range ON gps_schema(trailerNumber, gpstimestamp DESC, latitude, longitude);
-- Covers queries like: SELECT lat, lng FROM gps_schema WHERE trailerNumber = 'X' AND gpstimestamp BETWEEN start AND end

-- GPS vendor and device lookup optimization
CREATE INDEX idx_gps_vendor_device ON gps_schema(GPSVendor, deviceId);
-- For vendor-specific queries and device management

-- ========================================
-- ENTITY (VEHICLE) MANAGEMENT INDEXES
-- ========================================

-- Primary vehicle lookup index (already exists as UNIQUE, but explicit for clarity)
CREATE INDEX idx_entity_vehicle_number ON entity(vehicle_number);
-- For vehicle existence checks and lookups

-- Entity status filtering
CREATE INDEX idx_entity_status ON entity(status, vehicle_number);
-- For filtering active/inactive vehicles: WHERE status = true

-- Entity type filtering
CREATE INDEX idx_entity_type_status ON entity(type, status);
-- For filtering by vehicle type: WHERE type = 'Truck' AND status = true

-- ========================================
-- SHIPMENT AND EQUIPMENT INDEXES
-- ========================================

-- Equipment lookup by shipment (very frequent in live tracking)
CREATE INDEX idx_equipment_shipment_id ON equipment(shipment_id, equipment_id);
-- For joining equipment with shipments

-- Shipment status filtering
CREATE INDEX idx_shipment_status ON shipment(status, shipment_id);
-- For filtering shipments by status: WHERE status = 'intransit'

-- Shipment domain filtering
CREATE INDEX idx_shipment_domain_status ON shipment(domain_name, status);
-- For domain-specific shipment queries

-- ========================================
-- USER AND GROUP MANAGEMENT INDEXES
-- ========================================

-- User group relationships (critical for access control)
CREATE INDEX idx_user_group_user_id ON user_group(user_id, vehicle_group_id);
-- For getUserGroups queries

-- Group entity relationships
CREATE INDEX idx_group_entity_group ON group_entity(group_id, entity_id);
-- For getEntitiesByGroup queries

-- User authentication lookup
CREATE INDEX idx_users_username ON users_table(username, active);
-- For login queries: WHERE username = 'x' AND active = true

-- User email lookup
CREATE INDEX idx_users_email ON users_table(email, active);
-- For email-based operations

-- ========================================
-- GEOFENCING INDEXES
-- ========================================

-- Geofence group relationships
CREATE INDEX idx_geofence_group_relation ON geofence_group_relation(group_id, geofence_id);
-- For getGeofencesByGroup queries

-- User geofence group access
CREATE INDEX idx_user_geofence_group ON user_geofence_group(user_id, geofence_group_id);
-- For user-specific geofence access control

-- Geofence location lookup
CREATE INDEX idx_geofence_location ON geofence_table(latitude, longitude, radius);
-- For spatial proximity queries (geofence entry/exit detection)

-- Geofence status filtering
CREATE INDEX idx_geofence_status_type ON geofence_table(status, geofence_type);
-- For filtering active geofences by type

-- Polygon coordinates by geofence
CREATE INDEX idx_polygon_geofence ON polygon_coordinates(geofence_id, corner_points);
-- For fetching polygon coordinates in correct order

-- ========================================
-- ALERT AND ALARM SYSTEM INDEXES
-- ========================================

-- Alert status and type filtering (for alert dashboard)
CREATE INDEX idx_alert_status_type ON alert(status, alert_type, updated_at DESC);
-- For filtering active alerts and ordering by recent

-- Alarm alert relationships
CREATE INDEX idx_alarm_alert_alarm ON alarm_alert(alarm_id, alert_id);
-- For alarm-to-alert mappings

-- Alert shipment relationships
CREATE INDEX idx_alert_shipment ON alert_shipment_relation(shipment_id, alert_id);
-- For shipment-specific alerts

-- Alarm customer group relationships
CREATE INDEX idx_alarm_customer_group ON alarm_customer_group(customer_group_id, alarm_id);
-- For customer-specific alarm filtering

-- ========================================
-- CUSTOMER MANAGEMENT INDEXES
-- ========================================

-- Customer group relationships
CREATE INDEX idx_customer_group_relation ON customer_group_relation(group_id, customer_id);
-- For customer grouping queries

-- User customer group access
CREATE INDEX idx_user_customer_group ON user_customer_group(user_id, customer_group_id);
-- For user-specific customer access control

-- Customer LR detail relationships
CREATE INDEX idx_customer_lr_detail ON customer_lr_detail(customer_id, stop_id);
-- For customer logistics queries

-- ========================================
-- STOPS AND EVENTS INDEXES
-- ========================================

-- Stop by shipment (for trip timeline)
CREATE INDEX idx_stop_shipment ON stop(shipment_id, stop_sequence);
-- For ordered stop retrieval: ORDER BY stop_sequence

-- Event by shipment and time
CREATE INDEX idx_event_shipment_time ON event(shipment_id, event_datetime);
-- For shipment event timeline

-- Stop status filtering
CREATE INDEX idx_stop_status ON stop(stop_status, shipment_id);
-- For filtering stops by status

-- ========================================
-- VENDOR AND VAHAN INDEXES
-- ========================================

-- Entity vendor relationships
CREATE INDEX idx_entity_vendor ON entity_vendor(entity_id, vendor_id);
-- For vendor-specific vehicle queries

-- Vahan registration lookup
CREATE INDEX idx_vahan_registration ON vahan(rc_regn_no, entity_id);
-- For vehicle registration queries

-- Vahan by entity
CREATE INDEX idx_vahan_entity ON vahan(entity_id);
-- For vehicle document lookup



-- ========================================
-- MISSING CRITICAL INDEXES FOR CONTROLLERS
-- ========================================

-- Used heavily in TripController.ts for trip filtering
CREATE INDEX idx_shipment_status_domain_created ON shipment(status, domain_name, created_at DESC);

-- For Gpsfetcher.ts - equipment to shipment lookups (VERY CRITICAL)
CREATE INDEX idx_equipment_equipment_id ON equipment(equipment_id, shipment_id);

-- For alert dashboard queries in alert_Controller.ts
CREATE INDEX idx_alert_updated_at ON alert(updated_at DESC, status);

-- For user search functionality in UserController.ts
CREATE INDEX idx_users_search ON users_table(active, name, username, email);

-- For Customer_Controller.ts customer searches
CREATE INDEX idx_customers_search ON customers(customer_name, customer_id, customer_location);

-- For geofence proximity checks in Geofence_Controller.ts
CREATE INDEX idx_geofence_proximity ON geofence_table(latitude, longitude, status, geofence_type);

-- For stop entry/exit tracking in Gpsfetcher.ts (CRITICAL for geofencing)
CREATE INDEX idx_stop_geofence_tracking ON stop(shipment_id, latitude, longitude, geo_fence_radius);

-- For vendor status checks across multiple controllers
CREATE INDEX idx_vendor_status_name ON vendor(status, name);

-- For alarm filtering by status and type
CREATE INDEX idx_alarm_status_category ON alarm(alarm_status, alarm_category, alarm_type_id);