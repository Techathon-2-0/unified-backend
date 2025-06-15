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
exports.createGeoFenceGroup = createGeoFenceGroup;
exports.getAllGeoFenceGroups = getAllGeoFenceGroups;
exports.getGeoFenceGroupById = getGeoFenceGroupById;
exports.updateGeoFenceGroup = updateGeoFenceGroup;
exports.deleteGeoFenceGroup = deleteGeoFenceGroup;
exports.searchGeoFenceGroups = searchGeoFenceGroups;
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const mysql2_1 = require("drizzle-orm/mysql2");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
// Create GeoFence Group
function createGeoFenceGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { geo_group, geofenceIds } = req.body;
            // Validate required fields
            if (!geo_group) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required field: geo_group'
                });
            }
            if (!geofenceIds || !Array.isArray(geofenceIds) || geofenceIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'geofenceIds must be a non-empty array'
                });
            }
            // Check if group name already exists
            const existingGroup = yield db.select()
                .from(schema_1.geofencegroup)
                .where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.geo_group, geo_group))
                .limit(1);
            if (existingGroup.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Group name already exists'
                });
            }
            // Check if geofences exist
            const existingGeoFences = yield db.select()
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.inArray)(schema_1.geofence_table.id, geofenceIds));
            if (existingGeoFences.length !== geofenceIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more geofence IDs do not exist'
                });
            }
            // Create group
            const [insertedGroup] = yield db.insert(schema_1.geofencegroup).values({
                geo_group
            }).$returningId();
            // Create geofence relationships
            for (const geofenceId of geofenceIds) {
                yield db.insert(schema_1.geofence_group_relation).values({
                    geofence_id: geofenceId,
                    group_id: insertedGroup.id
                });
            }
            // Get geofences in the group for response
            const geofenceRelations = yield db
                .select({
                id: schema_1.geofence_table.id,
                geofence_name: schema_1.geofence_table.geofence_name,
                latitude: schema_1.geofence_table.latitude,
                longitude: schema_1.geofence_table.longitude,
                geofence_type: schema_1.geofence_table.geofence_type,
                radius: schema_1.geofence_table.radius,
                status: schema_1.geofence_table.status,
                address: schema_1.geofence_table.address, // <-- Add this line
                time: schema_1.geofence_table.time || 1
            })
                .from(schema_1.geofence_group_relation)
                .innerJoin(schema_1.geofence_table, (0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.geofence_id, schema_1.geofence_table.id))
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.group_id, insertedGroup.id));
            const indianTime = new Date();
            indianTime.setHours(indianTime.getHours() + 5);
            indianTime.setMinutes(indianTime.getMinutes() + 30);
            return {
                id: insertedGroup,
                geo_group,
                created_at: indianTime,
                updated_at: indianTime,
                geofences: geofenceRelations
            };
        }
        catch (error) {
            console.error('Error creating geofence group:', error);
            throw error;
        }
    });
}
// Get All GeoFence Groups
function getAllGeoFenceGroups(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const groups = yield db.select()
                .from(schema_1.geofencegroup);
            // Get geofences for each group
            const groupsWithGeoFences = yield Promise.all(groups.map((group) => __awaiter(this, void 0, void 0, function* () {
                const geofences = yield db
                    .select({
                    id: schema_1.geofence_table.id,
                    geofence_name: schema_1.geofence_table.geofence_name,
                    latitude: schema_1.geofence_table.latitude,
                    longitude: schema_1.geofence_table.longitude,
                    geofence_type: schema_1.geofence_table.geofence_type,
                    radius: schema_1.geofence_table.radius,
                    status: schema_1.geofence_table.status,
                    address: schema_1.geofence_table.address, // <-- Add this line
                    time: schema_1.geofence_table.time || 1
                })
                    .from(schema_1.geofence_group_relation)
                    .innerJoin(schema_1.geofence_table, (0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.geofence_id, schema_1.geofence_table.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.group_id, group.id));
                return Object.assign(Object.assign({}, group), { geofences });
            })));
            return groupsWithGeoFences;
        }
        catch (error) {
            console.error('Error fetching geofence groups:', error);
            throw error;
        }
    });
}
// Get GeoFence Group by ID
function getGeoFenceGroupById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const group = yield db.select()
                .from(schema_1.geofencegroup)
                .where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, parseInt(id)))
                .limit(1);
            if (group.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'GeoFence group not found'
                });
            }
            const geofences = yield db
                .select({
                id: schema_1.geofence_table.id,
                geofence_name: schema_1.geofence_table.geofence_name,
                latitude: schema_1.geofence_table.latitude,
                longitude: schema_1.geofence_table.longitude,
                geofence_type: schema_1.geofence_table.geofence_type,
                radius: schema_1.geofence_table.radius,
                status: schema_1.geofence_table.status,
                address: schema_1.geofence_table.address,
                time: schema_1.geofence_table.time || "1"
            })
                .from(schema_1.geofence_group_relation)
                .innerJoin(schema_1.geofence_table, (0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.geofence_id, schema_1.geofence_table.id))
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.group_id, parseInt(id)));
            return Object.assign(Object.assign({}, group[0]), { geofences });
        }
        catch (error) {
            console.error('Error fetching geofence group:', error);
            throw error;
        }
    });
}
// Update GeoFence Group
function updateGeoFenceGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { geo_group, geofenceIds } = req.body;
            // Check if group exists
            const existingGroup = yield db.select()
                .from(schema_1.geofencegroup)
                .where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, parseInt(id)))
                .limit(1);
            if (existingGroup.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'GeoFence group not found'
                });
            }
            // Update group name if provided
            if (geo_group) {
                // Check if the new name already exists (excluding current group)
                const nameExists = yield db.select()
                    .from(schema_1.geofencegroup)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.geofencegroup.geo_group, geo_group), (0, drizzle_orm_1.ne)(schema_1.geofencegroup.id, parseInt(id))))
                    .limit(1);
                if (nameExists.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Group name already exists'
                    });
                }
                yield db.update(schema_1.geofencegroup)
                    .set({ geo_group })
                    .where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, parseInt(id)));
            }
            // Update geofence relationships if provided
            if (geofenceIds && Array.isArray(geofenceIds)) {
                if (geofenceIds.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'geofenceIds array cannot be empty'
                    });
                }
                // Check if geofences exist
                const existingGeoFences = yield db.select()
                    .from(schema_1.geofence_table)
                    .where((0, drizzle_orm_1.inArray)(schema_1.geofence_table.id, geofenceIds));
                if (existingGeoFences.length !== geofenceIds.length) {
                    return res.status(400).json({
                        success: false,
                        message: 'One or more geofence IDs do not exist'
                    });
                }
                // Delete existing geofence relationships
                yield db.delete(schema_1.geofence_group_relation)
                    .where((0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.group_id, parseInt(id)));
                // Add new geofence relationships
                for (const geofenceId of geofenceIds) {
                    yield db.insert(schema_1.geofence_group_relation).values({
                        geofence_id: geofenceId,
                        group_id: parseInt(id)
                    });
                }
            }
            // Force updated_at to refresh with Indian time
            const indianTime = new Date();
            indianTime.setHours(indianTime.getHours() + 5);
            indianTime.setMinutes(indianTime.getMinutes() + 30);
            yield db.update(schema_1.geofencegroup)
                .set({ updated_at: indianTime })
                .where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, parseInt(id)));
            // Get updated group with geofences
            const updatedGroup = yield db.select()
                .from(schema_1.geofencegroup)
                .where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, parseInt(id)))
                .limit(1);
            const geofenceRelations = yield db
                .select({
                id: schema_1.geofence_table.id,
                geofence_name: schema_1.geofence_table.geofence_name,
                latitude: schema_1.geofence_table.latitude,
                longitude: schema_1.geofence_table.longitude,
                geofence_type: schema_1.geofence_table.geofence_type,
                radius: schema_1.geofence_table.radius,
                status: schema_1.geofence_table.status,
                address: schema_1.geofence_table.address,
                time: schema_1.geofence_table.time // <-- Add this line
            })
                .from(schema_1.geofence_group_relation)
                .innerJoin(schema_1.geofence_table, (0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.geofence_id, schema_1.geofence_table.id))
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.group_id, parseInt(id)));
            return Object.assign(Object.assign({}, updatedGroup[0]), { geofences: geofenceRelations });
        }
        catch (error) {
            console.error('Error updating geofence group:', error);
            throw error;
        }
    });
}
// Delete GeoFence Group
function deleteGeoFenceGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Check if group exists
            const existingGroup = yield db.select()
                .from(schema_1.geofencegroup)
                .where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, parseInt(id)))
                .limit(1);
            if (existingGroup.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'GeoFence group not found'
                });
            }
            // Delete geofence group relations first
            yield db.delete(schema_1.geofence_group_relation)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.group_id, parseInt(id)));
            // Delete user_geofence_group relations if they exist
            yield db.delete(schema_1.user_geofence_group)
                .where((0, drizzle_orm_1.eq)(schema_1.user_geofence_group.geofence_group_id, parseInt(id)));
            // Delete geofence group
            yield db.delete(schema_1.geofencegroup)
                .where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, parseInt(id)));
            return { id: parseInt(id) };
        }
        catch (error) {
            console.error('Error deleting geofence group:', error);
            throw error;
        }
    });
}
// Search GeoFence Groups
function searchGeoFenceGroups(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { query } = req.query;
            if (!query) {
                return yield getAllGeoFenceGroups(req, res);
            }
            const searchQuery = `%${query}%`;
            // Get groups that match the search query
            const groups = yield db.select()
                .from(schema_1.geofencegroup)
                .where((0, drizzle_orm_1.like)(schema_1.geofencegroup.geo_group, searchQuery));
            // Get geofences for each matching group
            const groupsWithGeoFences = yield Promise.all(groups.map((group) => __awaiter(this, void 0, void 0, function* () {
                const geofences = yield db
                    .select({
                    id: schema_1.geofence_table.id,
                    geofence_name: schema_1.geofence_table.geofence_name,
                    latitude: schema_1.geofence_table.latitude,
                    longitude: schema_1.geofence_table.longitude,
                    geofence_type: schema_1.geofence_table.geofence_type,
                    radius: schema_1.geofence_table.radius,
                    status: schema_1.geofence_table.status,
                    address: schema_1.geofence_table.address,
                    time: schema_1.geofence_table.time || 1
                })
                    .from(schema_1.geofence_group_relation)
                    .innerJoin(schema_1.geofence_table, (0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.geofence_id, schema_1.geofence_table.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.group_id, group.id));
                return Object.assign(Object.assign({}, group), { geofences });
            })));
            return groupsWithGeoFences;
        }
        catch (error) {
            console.error('Error searching geofence groups:', error);
            throw error;
        }
    });
}
