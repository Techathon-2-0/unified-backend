CREATE TABLE `customer_group` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_group_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_group_group_name_unique` UNIQUE(`group_name`)
);
--> statement-breakpoint
CREATE TABLE `customer_group_relation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`group_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_group_relation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_lr_detail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lr_number` varchar(255),
	`customer_id` varchar(255),
	`customer_name` varchar(255),
	`customer_location` varchar(255),
	`stop_id` int,
	CONSTRAINT `customer_lr_detail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicle_number` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`status` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entity_vendor` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	CONSTRAINT `entity_vendor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` varchar(255),
	`service_provider_alias_value` varchar(255),
	`driver_name` varchar(255),
	`driver_mobile_no` varchar(255),
	`shipment_id` int,
	`vehicle_name` varchar(255),
	`vehicle_status` varchar(255),
	`status_duration` varchar(255),
	`driver_details` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_code` varchar(255),
	`event_datetime` varchar(255),
	`shipment_id` int,
	`event_type` varchar(255),
	`event_location` varchar(255),
	`event_latitude` double,
	`event_longitude` double,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geofence_group_relation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`geofence_id` int NOT NULL,
	`group_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geofence_group_relation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geofence_table` (
	`id` int AUTO_INCREMENT NOT NULL,
	`geofence_name` varchar(255) NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`location_id` varchar(255) NOT NULL,
	`tag` varchar(255) NOT NULL DEFAULT 'tms_api',
	`stop_type` varchar(255) NOT NULL DEFAULT '',
	`geofence_type` int NOT NULL DEFAULT 0,
	`radius` int DEFAULT 0,
	`status` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geofence_table_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geofence_group` (
	`id` int AUTO_INCREMENT NOT NULL,
	`geo_group` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geofence_group_id` PRIMARY KEY(`id`),
	CONSTRAINT `geofence_group_geo_group_unique` UNIQUE(`geo_group`)
);
--> statement-breakpoint
CREATE TABLE `gps_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gps_type` varchar(255),
	`gps_frequency` int,
	`gps_unit_id` varchar(255),
	`gps_vendor` varchar(255),
	`shipment_id` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gps_details_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gps_schema` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int,
	`GPSVendor` varchar(255),
	`deviceId` varchar(255),
	`trailerNumber` varchar(255),
	`timestamp` int,
	`gpstimestamp` int,
	`gprstimestamp` int,
	`address` varchar(255),
	`latitude` double,
	`longitude` double,
	`heading` int,
	`speed` int,
	`areaCode` varchar(255),
	`cellId` varchar(255),
	`mcc` varchar(255),
	`mnc` varchar(255),
	`lac` varchar(255),
	`hdop` varchar(255),
	`numberOfSatellites` varchar(255),
	`digitalInput2` int,
	`digitalInput3` int,
	`analogInput1` varchar(255),
	`digitalOutput1` varchar(255),
	`powerSupplyVoltage` varchar(255),
	`internalBatteryVoltage` varchar(255),
	`internalBatteryLevel` varchar(255),
	`power` varchar(255),
	`gsmlevel` varchar(255),
	`accelerometerX` varchar(255),
	`accelerometerY` varchar(255),
	`accelerometerZ` varchar(255),
	`maxAccelX` varchar(255),
	`maxAccelY` varchar(255),
	`maxAccelZ` varchar(255),
	`locationSource` varchar(255),
	`serviceProvider` varchar(255),
	`gpsSpeed` varchar(255),
	`dtcCount` varchar(255),
	`dtcDistance` varchar(255),
	`unplugged` varchar(255),
	`gpsOdometer` varchar(255),
	`tilt` varchar(255),
	`digitalInput1` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gps_schema_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_group_name_unique` UNIQUE(`group_name`)
);
--> statement-breakpoint
CREATE TABLE `group_entity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`entity_id` int NOT NULL,
	CONSTRAINT `group_entity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `polygon_coordinates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`geofence_id` int NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`corner_points` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `polygon_coordinates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_name` varchar(255) NOT NULL,
	CONSTRAINT `report_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `role_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_report` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` int,
	`report_id` int,
	CONSTRAINT `role_report_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_tabs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` int,
	`tab_id` int,
	`status` boolean NOT NULL DEFAULT false,
	CONSTRAINT `role_tabs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain_name` varchar(255),
	`shipment_id` varchar(255),
	`route_name` varchar(255),
	`transmission_header_id` int,
	`status` varchar(255),
	`route_id` varchar(255),
	`route_type` varchar(255),
	`start_time` varchar(255),
	`end_time` varchar(255),
	`current_location` varchar(255),
	`location_datetime` varchar(255),
	`current_latitude` double,
	`current_longitude` double,
	`total_detention_time` varchar(255),
	`total_stoppage_time` varchar(255),
	`total_drive_time` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stop` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` varchar(255),
	`stop_type` varchar(255),
	`stop_sequence` int,
	`latitude` double,
	`longitude` double,
	`geo_fence_radius` int,
	`planned_departure_date` varchar(255),
	`shipment_id` int,
	`stop_name` varchar(255),
	`stop_status` varchar(255),
	`eta` varchar(255),
	`actual_sequence` int,
	`entry_time` varchar(255),
	`exit_time` varchar(255),
	`detention_time` varchar(255),
	`point_number` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stop_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tabs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tab_name` varchar(255) NOT NULL,
	CONSTRAINT `tabs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transmission_header` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`token` varchar(255),
	CONSTRAINT `transmission_header_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_customer_group` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`customer_group_id` int,
	CONSTRAINT `user_customer_group_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_geofence_group` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`geofence_group_id` int,
	CONSTRAINT `user_geofence_group_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_group` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`vehicle_group_id` int,
	CONSTRAINT `user_group_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_role` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`role_id` int,
	CONSTRAINT `user_role_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_usertype` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`user_type_id` int,
	CONSTRAINT `user_usertype_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(15) NOT NULL,
	`username` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`active` boolean NOT NULL DEFAULT false,
	`usertag` varchar(255) NOT NULL DEFAULT '',
	CONSTRAINT `users_table_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_table_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_table_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `user_type` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_type` varchar(255) NOT NULL,
	CONSTRAINT `user_type_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_type_user_type_unique` UNIQUE(`user_type`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_group` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicle_group` varchar(255) NOT NULL,
	CONSTRAINT `vehicle_group_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicle_group_vehicle_group_unique` UNIQUE(`vehicle_group`)
);
--> statement-breakpoint
CREATE TABLE `vendor` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`status` boolean NOT NULL DEFAULT true,
	CONSTRAINT `vendor_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `customer_group_relation` ADD CONSTRAINT `customer_group_relation_customer_id_customer_lr_detail_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer_lr_detail`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_group_relation` ADD CONSTRAINT `customer_group_relation_group_id_customer_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `customer_group`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_lr_detail` ADD CONSTRAINT `customer_lr_detail_stop_id_stop_id_fk` FOREIGN KEY (`stop_id`) REFERENCES `stop`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entity_vendor` ADD CONSTRAINT `entity_vendor_entity_id_entity_id_fk` FOREIGN KEY (`entity_id`) REFERENCES `entity`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entity_vendor` ADD CONSTRAINT `entity_vendor_vendor_id_vendor_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_shipment_id_shipment_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event` ADD CONSTRAINT `event_shipment_id_shipment_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `geofence_group_relation` ADD CONSTRAINT `geofence_group_relation_geofence_id_geofence_table_id_fk` FOREIGN KEY (`geofence_id`) REFERENCES `geofence_table`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `geofence_group_relation` ADD CONSTRAINT `geofence_group_relation_group_id_geofence_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `geofence_group`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gps_details` ADD CONSTRAINT `gps_details_shipment_id_shipment_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gps_schema` ADD CONSTRAINT `gps_schema_equipmentId_equipment_id_fk` FOREIGN KEY (`equipmentId`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_entity` ADD CONSTRAINT `group_entity_group_id_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `group`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_entity` ADD CONSTRAINT `group_entity_entity_id_entity_id_fk` FOREIGN KEY (`entity_id`) REFERENCES `entity`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `polygon_coordinates` ADD CONSTRAINT `polygon_coordinates_geofence_id_geofence_table_id_fk` FOREIGN KEY (`geofence_id`) REFERENCES `geofence_table`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_report` ADD CONSTRAINT `role_report_role_id_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_report` ADD CONSTRAINT `role_report_report_id_report_id_fk` FOREIGN KEY (`report_id`) REFERENCES `report`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_tabs` ADD CONSTRAINT `role_tabs_role_id_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_tabs` ADD CONSTRAINT `role_tabs_tab_id_tabs_id_fk` FOREIGN KEY (`tab_id`) REFERENCES `tabs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipment` ADD CONSTRAINT `shipment_transmission_header_id_transmission_header_id_fk` FOREIGN KEY (`transmission_header_id`) REFERENCES `transmission_header`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stop` ADD CONSTRAINT `stop_shipment_id_shipment_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_customer_group` ADD CONSTRAINT `user_customer_group_user_id_users_table_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_customer_group` ADD CONSTRAINT `user_customer_group_customer_group_id_customer_group_id_fk` FOREIGN KEY (`customer_group_id`) REFERENCES `customer_group`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_geofence_group` ADD CONSTRAINT `user_geofence_group_user_id_users_table_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_geofence_group` ADD CONSTRAINT `user_geofence_group_geofence_group_id_geofence_group_id_fk` FOREIGN KEY (`geofence_group_id`) REFERENCES `geofence_group`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_group` ADD CONSTRAINT `user_group_user_id_users_table_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_group` ADD CONSTRAINT `user_group_vehicle_group_id_group_id_fk` FOREIGN KEY (`vehicle_group_id`) REFERENCES `group`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_user_id_users_table_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_role_id_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_usertype` ADD CONSTRAINT `user_usertype_user_id_users_table_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_usertype` ADD CONSTRAINT `user_usertype_user_type_id_user_type_id_fk` FOREIGN KEY (`user_type_id`) REFERENCES `user_type`(`id`) ON DELETE no action ON UPDATE no action;