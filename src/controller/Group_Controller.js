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
exports.createGroup = createGroup;
exports.getAllGroups = getAllGroups;
exports.getGroupById = getGroupById;
exports.searchGroups = searchGroups;
exports.deleteGroup = deleteGroup;
exports.updateGroup = updateGroup;
exports.getGroupsByUserId = getGroupsByUserId;
const mysql2_1 = require("drizzle-orm/mysql2");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
//wkring
function createGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { group_name, entityIds } = req.body;
            // Validate required fields
            if (!group_name || !entityIds || !Array.isArray(entityIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields. group_name and entityIds array are required'
                });
            }
            // Check if group name already exists
            const existingGroup = yield db.select()
                .from(schema_1.group)
                .where((0, drizzle_orm_1.eq)(schema_1.group.group_name, group_name))
                .limit(1);
            if (existingGroup.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Group name already exists'
                });
            }
            // Check if entities exist
            const existingEntities = yield db.select()
                .from(schema_1.entity)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.entity.id, entityIds))); // Only active entities
            if (existingEntities.length !== entityIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more entity IDs do not exist or are inactive'
                });
            }
            // Create group
            const [insertedGroup] = yield db.insert(schema_1.group).values({
                group_name
            }).$returningId();
            // Create entity relationships
            for (const entityId of entityIds) {
                yield db.insert(schema_1.group_entity).values({
                    group_id: insertedGroup.id,
                    entity_id: entityId
                });
            }
            // Get entities in the group for response
            const groupEntities = yield db.select({
                id: schema_1.entity.id,
                vehicleNumber: schema_1.entity.vehicleNumber,
                type: schema_1.entity.type,
                status: schema_1.entity.status
            })
                .from(schema_1.group_entity)
                .innerJoin(schema_1.entity, (0, drizzle_orm_1.eq)(schema_1.group_entity.entity_id, schema_1.entity.id))
                .where((0, drizzle_orm_1.eq)(schema_1.group_entity.group_id, insertedGroup.id));
            // Return the group with its entities
            res.status(201).json({
                success: true,
                message: 'Group created successfully',
                data: Object.assign(Object.assign({}, insertedGroup), { entities: groupEntities })
            });
        }
        catch (error) {
            console.error('Error creating group:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function getAllGroups(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const groups = yield db.select().from(schema_1.group);
            // For each group, get its entities
            const groupsWithEntities = yield Promise.all(groups.map((grp) => __awaiter(this, void 0, void 0, function* () {
                const entityRelations = yield db
                    .select({
                    id: schema_1.entity.id,
                    vehicleNumber: schema_1.entity.vehicleNumber,
                    type: schema_1.entity.type,
                    status: schema_1.entity.status
                })
                    .from(schema_1.group_entity)
                    .innerJoin(schema_1.entity, (0, drizzle_orm_1.eq)(schema_1.group_entity.entity_id, schema_1.entity.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.group_entity.group_id, grp.id));
                return Object.assign(Object.assign({}, grp), { entities: entityRelations });
            })));
            res.status(200).json({
                success: true,
                data: groupsWithEntities
            });
        }
        catch (error) {
            console.error('Error fetching groups:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch groups',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function getGroupById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Get group
            const groupResult = yield db.select()
                .from(schema_1.group)
                .where((0, drizzle_orm_1.eq)(schema_1.group.id, parseInt(id)))
                .limit(1);
            if (groupResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Group not found'
                });
            }
            // Get entities for this group
            const entityRelations = yield db
                .select({
                id: schema_1.entity.id,
                vehicleNumber: schema_1.entity.vehicleNumber,
                type: schema_1.entity.type,
                status: schema_1.entity.status
            })
                .from(schema_1.group_entity)
                .innerJoin(schema_1.entity, (0, drizzle_orm_1.eq)(schema_1.group_entity.entity_id, schema_1.entity.id))
                .where((0, drizzle_orm_1.eq)(schema_1.group_entity.group_id, parseInt(id)));
            res.status(200).json({
                success: true,
                data: Object.assign(Object.assign({}, groupResult[0]), { entities: entityRelations })
            });
        }
        catch (error) {
            console.error('Error fetching group:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch group',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function searchGroups(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const searchQuery = req.query.query;
            if (!searchQuery) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }
            // Search for groups matching either group name (case-insensitive) or ID
            const groups = yield db.select()
                .from(schema_1.group)
                .where((0, drizzle_orm_1.sql) `LOWER(${schema_1.group.group_name}) LIKE LOWER(${`%${searchQuery}%`})
                    OR CAST(${schema_1.group.id} AS CHAR) = ${searchQuery}`);
            // If no groups found, return empty array
            if (groups.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: []
                });
            }
            // For each group, get its entities
            const groupsWithEntities = yield Promise.all(groups.map((grp) => __awaiter(this, void 0, void 0, function* () {
                const entityRelations = yield db
                    .select({
                    id: schema_1.entity.id,
                    vehicleNumber: schema_1.entity.vehicleNumber,
                    type: schema_1.entity.type,
                    status: schema_1.entity.status
                })
                    .from(schema_1.group_entity)
                    .innerJoin(schema_1.entity, (0, drizzle_orm_1.eq)(schema_1.group_entity.entity_id, schema_1.entity.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.group_entity.group_id, grp.id));
                return Object.assign(Object.assign({}, grp), { entities: entityRelations });
            })));
            res.status(200).json({
                success: true,
                data: groupsWithEntities
            });
        }
        catch (error) {
            console.error('Error searching groups:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search groups',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function deleteGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Check if group exists
            const groupExists = yield db.select({ id: schema_1.group.id })
                .from(schema_1.group)
                .where((0, drizzle_orm_1.eq)(schema_1.group.id, parseInt(id)))
                .limit(1);
            if (groupExists.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Group not found'
                });
            }
            // First delete all entity relationships
            yield db.delete(schema_1.group_entity)
                .where((0, drizzle_orm_1.eq)(schema_1.group_entity.group_id, parseInt(id)));
            // Then delete the group
            yield db.delete(schema_1.group)
                .where((0, drizzle_orm_1.eq)(schema_1.group.id, parseInt(id)));
            res.status(200).json({
                success: true,
                message: 'Group deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting group:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete group',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function updateGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { group_name, entityIds } = req.body;
            // Check if group exists
            const groupExists = yield db.select()
                .from(schema_1.group)
                .where((0, drizzle_orm_1.eq)(schema_1.group.id, parseInt(id)))
                .limit(1);
            if (groupExists.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Group not found'
                });
            }
            // Check if new group name is already taken by another group
            if (group_name) {
                const existingGroup = yield db.select()
                    .from(schema_1.group)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.group.group_name, group_name), (0, drizzle_orm_1.sql) `${schema_1.group.id} != ${parseInt(id)}`))
                    .limit(1);
                if (existingGroup.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Group name already exists'
                    });
                }
                // Update group name
                yield db.update(schema_1.group)
                    .set({ group_name })
                    .where((0, drizzle_orm_1.eq)(schema_1.group.id, parseInt(id)));
            }
            // Update entity relationships if provided
            if (entityIds && Array.isArray(entityIds)) {
                // Check if entities exist
                const existingEntities = yield db.select()
                    .from(schema_1.entity)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.entity.id, entityIds)));
                if (existingEntities.length !== entityIds.length) {
                    return res.status(400).json({
                        success: false,
                        message: 'One or more entity IDs do not exist or are inactive'
                    });
                }
                // Delete existing entity relationships
                yield db.delete(schema_1.group_entity)
                    .where((0, drizzle_orm_1.eq)(schema_1.group_entity.group_id, parseInt(id)));
                // Add new entity relationships
                for (const entityId of entityIds) {
                    yield db.insert(schema_1.group_entity).values({
                        group_id: parseInt(id),
                        entity_id: entityId
                    });
                }
                const indianTime = new Date();
                indianTime.setHours(indianTime.getHours() + 5);
                indianTime.setMinutes(indianTime.getMinutes() + 30);
                yield db.update(schema_1.group)
                    .set({ updated_at: indianTime })
                    .where((0, drizzle_orm_1.eq)(schema_1.group.id, parseInt(id)));
            }
            // Get updated group with entities
            const updatedGroup = yield db.select()
                .from(schema_1.group)
                .where((0, drizzle_orm_1.eq)(schema_1.group.id, parseInt(id)))
                .limit(1);
            const entityRelations = yield db
                .select({
                id: schema_1.entity.id,
                vehicleNumber: schema_1.entity.vehicleNumber,
                type: schema_1.entity.type,
                status: schema_1.entity.status
            })
                .from(schema_1.group_entity)
                .innerJoin(schema_1.entity, (0, drizzle_orm_1.eq)(schema_1.group_entity.entity_id, schema_1.entity.id))
                .where((0, drizzle_orm_1.eq)(schema_1.group_entity.group_id, parseInt(id)));
            res.status(200).json({
                success: true,
                message: 'Group updated successfully',
                data: Object.assign(Object.assign({}, updatedGroup[0]), { entities: entityRelations })
            });
        }
        catch (error) {
            console.error('Error updating group:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update group',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
function getGroupsByUserId(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Find all group IDs for this user
        const userGroups = yield db
            .select({ groupId: schema_1.user_group.vehicle_group_id })
            .from(schema_1.user_group)
            .where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, Number(userId)));
        const groupIds = userGroups.map(g => g.groupId).filter((id) => id !== null && id !== undefined);
        // 2. Fetch all groups with those IDs
        if (!groupIds.length)
            return [];
        const groups = yield db
            .select()
            .from(schema_1.group)
            .where((0, drizzle_orm_1.inArray)(schema_1.group.id, groupIds));
        return groups;
    });
}
