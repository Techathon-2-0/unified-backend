import { Request, Response } from 'express';
import { drizzle } from "drizzle-orm/mysql2";
import { eq, inArray, sql, and } from 'drizzle-orm';
import { group, group_entity, entity,user_group } from '../db/schema';
const db = drizzle(process.env.DATABASE_URL!);

//wkring
export async function createGroup(req: Request, res: Response) {
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
        const existingGroup = await db.select()
            .from(group)
            .where(eq(group.group_name, group_name))
            .limit(1);
            
        if (existingGroup.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Group name already exists' 
            });
        }
        
        // Check if entities exist
        const existingEntities = await db.select()
            .from(entity)
            .where(and(
                inArray(entity.id, entityIds),
            
            )); // Only active entities
            
        if (existingEntities.length !== entityIds.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'One or more entity IDs do not exist or are inactive' 
            });
        }
        
        // Create group
        const [insertedGroup] = await db.insert(group).values({
            group_name
        }).$returningId();
        
        // Create entity relationships
        for (const entityId of entityIds) {
            await db.insert(group_entity).values({
                group_id: insertedGroup.id,
                entity_id: entityId
            });
        }
        
        // Get entities in the group for response
        const groupEntities = await db.select({
            id: entity.id,
            vehicleNumber: entity.vehicleNumber,
            type: entity.type,
            status: entity.status
        })
        .from(group_entity)
        .innerJoin(entity, eq(group_entity.entity_id, entity.id))
        .where(eq(group_entity.group_id, insertedGroup.id));
        
        // Return the group with its entities
        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: {
                ...insertedGroup,
                entities: groupEntities
            }
        });
        
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
//working
export async function getAllGroups(req: Request, res: Response) {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count for pagination info
        const [{ count }] = await db.select({ count: sql`COUNT(*)` }).from(group);

        // Fetch paginated groups
        const groups = await db
            .select()
            .from(group)
            .limit(limit)
            .offset(offset);

        // For each group, get its entities
        const groupsWithEntities = await Promise.all(
            groups.map(async (grp) => {
                const entityRelations = await db
                    .select({
                        id: entity.id,
                        vehicleNumber: entity.vehicleNumber,
                        type: entity.type,
                        status: entity.status
                    })
                    .from(group_entity)
                    .innerJoin(entity, eq(group_entity.entity_id, entity.id))
                    .where(eq(group_entity.group_id, grp.id)).limit(limit).offset(offset);
                
                return {
                    ...grp,
                    entities: entityRelations
                };
            })
        );
        
        res.status(200).json({
            success: true,
            data: groupsWithEntities,
            pagination: {
                page,
                limit,
                total: Number(count),
                totalPages: Math.ceil(Number(count) / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch groups',
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}
//working
export async function getGroupById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        // Get group
        const groupResult = await db.select()
            .from(group)
            .where(eq(group.id, parseInt(id)))
            .limit(1);
            
        if (groupResult.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Group not found' 
            });
        }
        
        // Get entities for this group
        const entityRelations = await db
            .select({
                id: entity.id,
                vehicleNumber: entity.vehicleNumber,
                type: entity.type,
                status: entity.status
            })
            .from(group_entity)
            .innerJoin(entity, eq(group_entity.entity_id, entity.id))
            .where(eq(group_entity.group_id, parseInt(id)));
        
        res.status(200).json({
            success: true,
            data: {
                ...groupResult[0],
                entities: entityRelations
            }
        });
        
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
//working
export async function searchGroups(req: Request, res: Response) {
    try {
        
        const searchQuery = req.query.query as string;
        
        if (!searchQuery) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        // Search for groups matching either group name (case-insensitive) or ID
        const groups = await db.select()
            .from(group)
            .where(
                sql`LOWER(${group.group_name}) LIKE LOWER(${`%${searchQuery}%`})
                    OR CAST(${group.id} AS CHAR) = ${searchQuery}`
            );
        
        // If no groups found, return empty array
        if (groups.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }
        
        // For each group, get its entities
        const groupsWithEntities = await Promise.all(
            groups.map(async (grp) => {
                const entityRelations = await db
                    .select({
                        id: entity.id,
                        vehicleNumber: entity.vehicleNumber,
                        type: entity.type,
                        status: entity.status
                    })
                    .from(group_entity)
                    .innerJoin(entity, eq(group_entity.entity_id, entity.id))
                    .where(eq(group_entity.group_id, grp.id));
                
                return {
                    ...grp,
                    entities: entityRelations
                };
            })
        );
        
        res.status(200).json({
            success: true,
            data: groupsWithEntities
        });
        
    } catch (error) {
        console.error('Error searching groups:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to search groups',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
//working
export async function deleteGroup(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        // Check if group exists
        const groupExists = await db.select({ id: group.id })
            .from(group)
            .where(eq(group.id, parseInt(id)))
            .limit(1);
            
        if(groupExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Group not found' 
            });
        }
        
        // First delete all entity relationships
        await db.delete(group_entity)
            .where(eq(group_entity.group_id, parseInt(id)));
        
        // Then delete the group
        await db.delete(group)
            .where(eq(group.id, parseInt(id)));
        
        res.status(200).json({
            success: true,
            message: 'Group deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
//working
export async function updateGroup(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { group_name, entityIds } = req.body;
        
        // Check if group exists
        const groupExists = await db.select()
            .from(group)
            .where(eq(group.id, parseInt(id)))
            .limit(1);
            
        if (groupExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Group not found' 
            });
        }
        
        // Check if new group name is already taken by another group
        if (group_name) {
            const existingGroup = await db.select()
                .from(group)
                .where(and(
                    eq(group.group_name, group_name),
                    sql`${group.id} != ${parseInt(id)}`
                ))
                .limit(1);
                
            if (existingGroup.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Group name already exists' 
                });
            }
            
            // Update group name
            await db.update(group)
                .set({ group_name })
                .where(eq(group.id, parseInt(id)));
        }
        
        // Update entity relationships if provided
        if (entityIds && Array.isArray(entityIds)) {
            // Check if entities exist
            const existingEntities = await db.select()
                .from(entity)
                .where(and(
                    inArray(entity.id, entityIds),
                    // eq(entity.status, true)
                ));
                
            if (existingEntities.length !== entityIds.length) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'One or more entity IDs do not exist or are inactive' 
                });
            }
            
            // Delete existing entity relationships
            await db.delete(group_entity)
                .where(eq(group_entity.group_id, parseInt(id)));
            
            // Add new entity relationships
            for (const entityId of entityIds) {
                await db.insert(group_entity).values({
                    group_id: parseInt(id),
                    entity_id: entityId
                });
            }
            const indianTime = new Date();
            indianTime.setHours(indianTime.getHours() + 5);
            indianTime.setMinutes(indianTime.getMinutes() + 30);
            await db.update(group)
            .set({ updated_at: indianTime})
            .where(eq(group.id, parseInt(id)));
        }
        
        // Get updated group with entities
        const updatedGroup = await db.select()
            .from(group)
            .where(eq(group.id, parseInt(id)))
            .limit(1);
            
        const entityRelations = await db
            .select({
                id: entity.id,
                vehicleNumber: entity.vehicleNumber,
                type: entity.type,
                status: entity.status
            })
            .from(group_entity)
            .innerJoin(entity, eq(group_entity.entity_id, entity.id))
            .where(eq(group_entity.group_id, parseInt(id)));
        
        res.status(200).json({
            success: true,
            message: 'Group updated successfully',
            data: {
                ...updatedGroup[0],
                entities: entityRelations
            }
        });
        
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

export async function getGroupsByUserId(userId: number | string) {
    // 1. Find all group IDs for this user
    const userGroups = await db
        .select({ groupId: user_group.vehicle_group_id })
        .from(user_group)
        .where(eq(user_group.user_id, Number(userId)));
    const groupIds = userGroups.map(g => g.groupId).filter((id): id is number => id !== null && id !== undefined);

    // 2. Fetch all groups with those IDs
    if (!groupIds.length) return [];
    const groups = await db
        .select()
        .from(group)
        .where(inArray(group.id, groupIds));
    return groups;
}

