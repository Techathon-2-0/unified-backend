import { Request, Response } from 'express';
import { geofencegroup, geofence_group_relation, geofence_table, user_geofence_group } from '../db/schema';
import { eq, like, and, or, inArray, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(process.env.DATABASE_URL!);

// Create GeoFence Group
export async function createGeoFenceGroup(req: Request, res: Response) {
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
        const existingGroup = await db.select()
            .from(geofencegroup)
            .where(eq(geofencegroup.geo_group, geo_group))
            .limit(1);
            
        if (existingGroup.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Group name already exists' 
            });
        }
        
        // Check if geofences exist
        const existingGeoFences = await db.select()
            .from(geofence_table)
            .where(
                inArray(geofence_table.id, geofenceIds)
            );
            
        if (existingGeoFences.length !== geofenceIds.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'One or more geofence IDs do not exist' 
            });
        }
        
        // Create group
        const [insertedGroup] = await db.insert(geofencegroup).values({
            geo_group
        }).$returningId();
        
        // Create geofence relationships
        for (const geofenceId of geofenceIds) {
            await db.insert(geofence_group_relation).values({
                geofence_id: geofenceId,
                group_id: insertedGroup.id
            });
        }
        
        // Get geofences in the group for response
        const geofenceRelations = await db
            .select({
                id: geofence_table.id,
                geofence_name: geofence_table.geofence_name,
                latitude: geofence_table.latitude,
                longitude: geofence_table.longitude,
                geofence_type: geofence_table.geofence_type,
                radius: geofence_table.radius,
                status: geofence_table.status,
                address: geofence_table.address, // <-- Add this line
                time:geofence_table.time|| 1
            })
            .from(geofence_group_relation)
            .innerJoin(geofence_table, eq(geofence_group_relation.geofence_id, geofence_table.id))
            .where(eq(geofence_group_relation.group_id, insertedGroup.id));
        
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
        
    } catch (error) {
        console.error('Error creating geofence group:', error);
        throw error;
    }
}

// Get All GeoFence Groups
export async function getAllGeoFenceGroups(req: Request, res: Response) {
    try {
        const groups = await db.select()
            .from(geofencegroup);
        
        // Get geofences for each group
        const groupsWithGeoFences = await Promise.all(
            groups.map(async (group) => {
                const geofences = await db
                    .select({
                        id: geofence_table.id,
                        geofence_name: geofence_table.geofence_name,
                        latitude: geofence_table.latitude,
                        longitude: geofence_table.longitude,
                        geofence_type: geofence_table.geofence_type,
                        radius: geofence_table.radius,
                        status: geofence_table.status,
                        address: geofence_table.address, // <-- Add this line
                        time:geofence_table.time|| 1
                    })
                    .from(geofence_group_relation)
                    .innerJoin(geofence_table, eq(geofence_group_relation.geofence_id, geofence_table.id))
                    .where(eq(geofence_group_relation.group_id, group.id));
                
                return {
                    ...group,
                    geofences
                };
            })
        );
        
        return groupsWithGeoFences;
    } catch (error) {
        console.error('Error fetching geofence groups:', error);
        throw error;
    }
}

// Get GeoFence Group by ID
export async function getGeoFenceGroupById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        const group = await db.select()
            .from(geofencegroup)
            .where(eq(geofencegroup.id, parseInt(id)))
            .limit(1);
        
        if (group.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'GeoFence group not found' 
            });
        }
        
        const geofences = await db
            .select({
                id: geofence_table.id,
                geofence_name: geofence_table.geofence_name,
                latitude: geofence_table.latitude,
                longitude: geofence_table.longitude,
                geofence_type: geofence_table.geofence_type,
                radius: geofence_table.radius,
                status: geofence_table.status,
                address: geofence_table.address,
                time:geofence_table.time|| "1"
            })
            .from(geofence_group_relation)
            .innerJoin(geofence_table, eq(geofence_group_relation.geofence_id, geofence_table.id))
            .where(eq(geofence_group_relation.group_id, parseInt(id)));
        
        return {
            ...group[0],
            geofences
        };
    } catch (error) {
        console.error('Error fetching geofence group:', error);
        throw error;
    }
}

// Update GeoFence Group
export async function updateGeoFenceGroup(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { geo_group, geofenceIds } = req.body;
        
        // Check if group exists
        const existingGroup = await db.select()
            .from(geofencegroup)
            .where(eq(geofencegroup.id, parseInt(id)))
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
            const nameExists = await db.select()
                .from(geofencegroup)
                .where(
                    and(
                        eq(geofencegroup.geo_group, geo_group),
                        ne(geofencegroup.id, parseInt(id))
                    )
                )
                .limit(1);
                
            if (nameExists.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Group name already exists' 
                });
            }
            
            await db.update(geofencegroup)
                .set({ geo_group })
                .where(eq(geofencegroup.id, parseInt(id)));
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
            const existingGeoFences = await db.select()
                .from(geofence_table)
                .where(
                    inArray(geofence_table.id, geofenceIds)
                );
                
            if (existingGeoFences.length !== geofenceIds.length) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'One or more geofence IDs do not exist' 
                });
            }
            
            // Delete existing geofence relationships
            await db.delete(geofence_group_relation)
                .where(eq(geofence_group_relation.group_id, parseInt(id)));
            
            // Add new geofence relationships
            for (const geofenceId of geofenceIds) {
                await db.insert(geofence_group_relation).values({
                    geofence_id: geofenceId,
                    group_id: parseInt(id)
                });
            }
        }
        
        // Force updated_at to refresh with Indian time
        const indianTime = new Date();
        indianTime.setHours(indianTime.getHours() + 5);
        indianTime.setMinutes(indianTime.getMinutes() + 30);
        
        await db.update(geofencegroup)
            .set({ updated_at: indianTime })
            .where(eq(geofencegroup.id, parseInt(id)));
        
        // Get updated group with geofences
        const updatedGroup = await db.select()
            .from(geofencegroup)
            .where(eq(geofencegroup.id, parseInt(id)))
            .limit(1);
            
        const geofenceRelations = await db
            .select({
                id: geofence_table.id,
                geofence_name: geofence_table.geofence_name,
                latitude: geofence_table.latitude,
                longitude: geofence_table.longitude,
                geofence_type: geofence_table.geofence_type,
                radius: geofence_table.radius,
                status: geofence_table.status,
                address: geofence_table.address,
                time:geofence_table.time // <-- Add this line
            })
            .from(geofence_group_relation)
            .innerJoin(geofence_table, eq(geofence_group_relation.geofence_id, geofence_table.id))
            .where(eq(geofence_group_relation.group_id, parseInt(id)));
        
        return {
            ...updatedGroup[0],
            geofences: geofenceRelations
        };
    } catch (error) {
        console.error('Error updating geofence group:', error);
        throw error;
    }
}

// Delete GeoFence Group
export async function deleteGeoFenceGroup(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        // Check if group exists
        const existingGroup = await db.select()
            .from(geofencegroup)
            .where(eq(geofencegroup.id, parseInt(id)))
            .limit(1);
        
        if (existingGroup.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'GeoFence group not found' 
            });
        }
        
        // Delete geofence group relations first
        await db.delete(geofence_group_relation)
            .where(eq(geofence_group_relation.group_id, parseInt(id)));
        
        // Delete user_geofence_group relations if they exist
        await db.delete(user_geofence_group)
            .where(eq(user_geofence_group.geofence_group_id, parseInt(id)));
        
        // Delete geofence group
        await db.delete(geofencegroup)
            .where(eq(geofencegroup.id, parseInt(id)));
        
        return { id: parseInt(id) };
    } catch (error) {
        console.error('Error deleting geofence group:', error);
        throw error;
    }
}

// Search GeoFence Groups
export async function searchGeoFenceGroups(req: Request, res: Response) {
    try {
        const { query } = req.query;
        
        if (!query) {
            return await getAllGeoFenceGroups(req, res);
        }
        
        const searchQuery = `%${query}%`;
        
        // Get groups that match the search query
        const groups = await db.select()
            .from(geofencegroup)
            .where(
                like(geofencegroup.geo_group, searchQuery)
            );
        
        // Get geofences for each matching group
        const groupsWithGeoFences = await Promise.all(
            groups.map(async (group) => {
                const geofences = await db
                    .select({
                        id: geofence_table.id,
                        geofence_name: geofence_table.geofence_name,
                        latitude: geofence_table.latitude,
                        longitude: geofence_table.longitude,
                        geofence_type: geofence_table.geofence_type,
                        radius: geofence_table.radius,
                        status: geofence_table.status,
                        address: geofence_table.address,
                        time:geofence_table.time|| 1
                    })
                    .from(geofence_group_relation)
                    .innerJoin(geofence_table, eq(geofence_group_relation.geofence_id, geofence_table.id))
                    .where(eq(geofence_group_relation.group_id, group.id));
                
                return {
                    ...group,
                    geofences
                };
            })
        );
        
        return groupsWithGeoFences;
    } catch (error) {
        console.error('Error searching geofence groups:', error);
        throw error;
    }
}