import { Request, Response } from 'express';

import { user_geofence_group, geofence_group_relation, geofence_table, polygon_coordinates } from '../db/schema';
import { eq, like, and, or, inArray, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
const db = drizzle(process.env.DATABASE_URL!);

// CREATE
export async function createGeoFence(req: Request, res: Response) {
    try {
        const { 
            geofence_name, 
            latitude, 
            longitude, 
            location_id, 
            tag, 
            stop_type, 
            geofence_type, 
            radius,
            polygon_points,
            status,
            address,
            time
        } = req.body;
        
        // Validate required fields
        if (!geofence_name || !location_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields. geofence_name and location_id are required' 
            });
        }
        
        // Validate geofence type specific requirements
        if (geofence_type === 0 && (!radius || radius <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'Radius is required and must be positive for circle geofence type'
            });
        }
        
        if (geofence_type === 2 && (!polygon_points || !Array.isArray(polygon_points) || polygon_points.length < 3)) {
            return res.status(400).json({
                success: false,
                message: 'Polygon geofence requires at least 3 coordinate points'
            });
        }

        const existingGeofence = await db
            .select()
            .from(geofence_table)
            .where(
                and(
                eq(geofence_table.location_id, location_id),
                eq(geofence_table.stop_type, stop_type)
                )
            )
            .limit(1);

        if (existingGeofence.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A geofence with the same location_id and stop_type already exists'
            });
        }
        // Create geofence
        const [insertedId] = await db.insert(geofence_table).values({
            geofence_name,
            latitude,
            longitude,
            location_id,
            tag: tag || 'tms_api',
            stop_type: stop_type || '',
            geofence_type: geofence_type || 0,
            radius: geofence_type === 0 ? radius : 0,
            status: status !== undefined ? status : true,
            address: address || "",
            time :time || "1"
        }).$returningId();
        
        // For polygon type, add the coordinate points
        if (geofence_type === 2 && polygon_points && Array.isArray(polygon_points)) {
            for (let i = 0; i < polygon_points.length; i++) {
                const point = polygon_points[i];
                await db.insert(polygon_coordinates).values({
                    geofence_id: insertedId.id,
                    latitude: point.latitude,
                    longitude: point.longitude,
                    corner_points: i + 1 // Start from 1 for the corner points
                });
            }
        }
        
        // Get newly created geofence with polygon points if applicable
        const newGeoFence = await db.select()
            .from(geofence_table)
            .where(eq(geofence_table.id, insertedId.id))
            .limit(1);
            
        let response = { ...newGeoFence[0] };
        
        // If polygon type, fetch the coordinate points
        if (geofence_type === 2) {
            const polygonPoints = await db.select()
                .from(polygon_coordinates)
                .where(eq(polygon_coordinates.geofence_id, insertedId.id))
                .orderBy(polygon_coordinates.corner_points);
                
            response = {
                ...response,
                polygon_points: polygonPoints
            } as any;
        }
        
        return res.status(201).json({
    success: true,
    message: 'Geofence created successfully',
    data: response
});
        
    } catch (error) {
        console.error('Error creating geofence:', error);
        throw error;
    }
}

// wokring
export async function getAllGeoFences(req: Request, res: Response) {
    try {
        const geofences = await db.select()
            .from(geofence_table);
            
        // Fetch polygon points for polygon type geofences
        const result = await Promise.all(geofences.map(async (geo) => {
            if (geo.geofence_type === 2) {
                const polygonPoints = await db.select()
                    .from(polygon_coordinates)
                    .where(eq(polygon_coordinates.geofence_id, geo.id))
                    .orderBy(polygon_coordinates.corner_points);
                    
                return {
                    ...geo,
                    polygon_points: polygonPoints
                } as any;
            }
            return geo;
        }));
        
        return result;
//         return res.status(201).json({
//     success: true,
//     // message: 'Geofence created successfully',
//     // data: response
// });
    } catch (error) {
        console.error('Error fetching geofences:', error);
        throw error;
    }
}

// wokring
export async function getGeoFenceById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        const geofence = await db.select()
            .from(geofence_table)
            .where(eq(geofence_table.id, parseInt(id)))
            .limit(1);
        
        if (geofence.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'GeoFence not found' 
            });
        }
        
        let response = { ...geofence[0] };
        
        // If polygon type, fetch the coordinate points
        if (geofence[0].geofence_type === 2) {
            const polygonPoints = await db.select()
                .from(polygon_coordinates)
                .where(eq(polygon_coordinates.geofence_id, parseInt(id)))
                .orderBy(polygon_coordinates.corner_points);
                
            response = {
                ...response,
                polygon_points: polygonPoints
            } as typeof response & { polygon_points: typeof polygonPoints };
        }
        
        // return response;
        return res.status(201).json({
    success: true,
    // message: 'Geofence created successfully',
    data: response
});
    } catch (error) {
        console.error('Error fetching geofence:', error);
        throw error;
    }
}

// wokring
export async function updateGeoFence(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { 
            geofence_name, 
            latitude, 
            longitude, 
            location_id, 
            tag, 
            stop_type, 
            geofence_type, 
            radius,
            polygon_points,
            status,
            address,
            time
        } = req.body;
        
        // Check if geofence exists
        const existingGeoFence = await db.select()
            .from(geofence_table)
            .where(eq(geofence_table.id, parseInt(id)))
            .limit(1);
        
        if (existingGeoFence.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'GeoFence not found' 
            });
        }
        
        // Validate geofence type specific requirements
        if (geofence_type === 0 && (!radius || radius <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'Radius is required and must be positive for circle geofence type'
            });
        }
        
        if (geofence_type === 2 && (!polygon_points || !Array.isArray(polygon_points) || polygon_points.length < 3)) {
            return res.status(400).json({
                success: false,
                message: 'Polygon geofence requires at least 3 coordinate points'
            });
        }
        
        // Create update data object
        const updateData: any = {};
        if (geofence_name !== undefined) updateData.geofence_name = geofence_name;
        if (latitude !== undefined) updateData.latitude = latitude;
        if (longitude !== undefined) updateData.longitude = longitude;
        if (location_id !== undefined) updateData.location_id = location_id;
        if (tag !== undefined) updateData.tag = tag;
        if (stop_type !== undefined) updateData.stop_type = stop_type;
        if (geofence_type !== undefined) updateData.geofence_type = geofence_type;
        if (radius !== undefined && geofence_type === 0) updateData.radius = radius;
        if (status !== undefined) updateData.status = status;
        if (address !== undefined) updateData.address = address; // <-- Update address
        if(time !== undefined) updateData.time = time; // <-- Update time
        // Set Indian time for updated_at
        const indianTime = new Date();
        indianTime.setHours(indianTime.getHours() + 5);
        indianTime.setMinutes(indianTime.getMinutes() + 30);
        updateData.updated_at = indianTime;
        
        // Update geofence
        await db.update(geofence_table)
            .set(updateData)
            .where(eq(geofence_table.id, parseInt(id)));
        
        // For polygon type, update the coordinate points
        if(geofence_type==0){
            await db.delete(polygon_coordinates)
                .where(eq(polygon_coordinates.geofence_id, parseInt(id)));
        }
        if (geofence_type === 2 && polygon_points && Array.isArray(polygon_points)) {
            // Delete existing polygon points
            await db.delete(polygon_coordinates)
                .where(eq(polygon_coordinates.geofence_id, parseInt(id)));
            
            // Add new polygon points
            for (let i = 0; i < polygon_points.length; i++) {
                const point = polygon_points[i];
                await db.insert(polygon_coordinates).values({
                    geofence_id: parseInt(id),
                    latitude: point.latitude,
                    longitude: point.longitude,
                    corner_points: i + 1 // Start from 1 for the corner points
                });
            }
        }
        
        // Get updated geofence with polygon points if applicable
        const updatedGeoFence = await db.select()
            .from(geofence_table)
            .where(eq(geofence_table.id, parseInt(id)))
            .limit(1);
            
        let response = { ...updatedGeoFence[0] };
        
        // If polygon type, fetch the coordinate points
        if (updatedGeoFence[0].geofence_type === 2) {
            const polygonPoints = await db.select()
                .from(polygon_coordinates)
                .where(eq(polygon_coordinates.geofence_id, parseInt(id)))
                .orderBy(polygon_coordinates.corner_points);
                
            response = {
                ...response,
                polygon_points: polygonPoints
            } as typeof response & { polygon_points: typeof polygonPoints };
        }
        
        // return response;
        return res.status(201).json({
    success: true,
    // message: 'Geofence created successfully',
    data: response
});
    } catch (error) {
        console.error('Error updating geofence:', error);
        throw error;
    }
}

// working
export async function deleteGeoFence(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        // Check if geofence exists
        const existingGeoFence = await db.select()
            .from(geofence_table)
            .where(eq(geofence_table.id, parseInt(id)))
            .limit(1);
        
        if (existingGeoFence.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'GeoFence not found' 
            });
        }
        
        // Delete polygon points if it's a polygon type
        if (existingGeoFence[0].geofence_type === 2) {
            await db.delete(polygon_coordinates)
                .where(eq(polygon_coordinates.geofence_id, parseInt(id)));
        }
        
        // Delete from geofence_group_relation
        await db.delete(geofence_group_relation)
            .where(eq(geofence_group_relation.geofence_id, parseInt(id)));
        
        // Delete geofence
        await db.delete(geofence_table)
            .where(eq(geofence_table.id, parseInt(id)));
        
        return { id: parseInt(id) };
    } catch (error) {
        console.error('Error deleting geofence:', error);
        throw error;
    }
}

// wokring
export async function searchGeoFences(req: Request, res: Response) {
    try {
        const { query } = req.query;
        
        if (!query) {
            return await getAllGeoFences(req, res);
        }
        
        const searchQuery = `%${query}%`;
        
        const geofences = await db.select()
            .from(geofence_table)
            .where(
                or(
                    like(geofence_table.geofence_name, searchQuery),
                    like(geofence_table.location_id, searchQuery),
                    like(geofence_table.tag, searchQuery),
                    like(geofence_table.stop_type, searchQuery)
                )
            );
            
        // Fetch polygon points for polygon type geofences
        const result = await Promise.all(geofences.map(async (geo) => {
            if (geo.geofence_type === 2) {
                const polygonPoints = await db.select()
                    .from(polygon_coordinates)
                    .where(eq(polygon_coordinates.geofence_id, geo.id))
                    .orderBy(polygon_coordinates.corner_points);
                    
                return {
                    ...geo,
                    polygon_points: polygonPoints
                } as typeof geo & { polygon_points: typeof polygonPoints };
            }
            // return geo;
            return res.status(201).json({
    success: true,
    // message: 'Geofence created successfully',
    // data: response
});
        }));
        
        return result;
    } catch (error) {
        console.error('Error searching geofences:', error);
        throw error;
    }
}

// wokring
export async function getGeoFencesByUserId(req: Request, res: Response) {
    try {
        const { userId } = req.params;

        // 1. Get geofence group ids for the user
        const userGroups = await db.select({ geofence_group_id: user_geofence_group.geofence_group_id })
            .from(user_geofence_group)
            .where(eq(user_geofence_group.user_id, parseInt(userId)));

        const groupIds = userGroups.map(g => g.geofence_group_id);
        if (groupIds.length === 0) return [];

        // 2. Get geofence ids from those groups
        const groupRelations = await db.select({ geofence_id: geofence_group_relation.geofence_id })
            .from(geofence_group_relation)
            .where(inArray(geofence_group_relation.group_id, groupIds.filter((id): id is number => id !== null)));

        const geofenceIds = groupRelations.map(r => r.geofence_id);
        if (geofenceIds.length === 0) return [];

        // 3. Get geofence details
        const geofences = await db.select()
            .from(geofence_table)
            .where(and(
                inArray(geofence_table.id, geofenceIds)
                , ne(geofence_table.status, false) // Exclude inactive geofences
            ));

        // 4. Attach polygon points if needed
        const result = await Promise.all(geofences.map(async (geo) => {
            if (geo.geofence_type === 2) {
                const polygonPoints = await db.select()
                    .from(polygon_coordinates)
                    .where(eq(polygon_coordinates.geofence_id, geo.id))
                    .orderBy(polygon_coordinates.corner_points);
                return { ...geo, polygon_points: polygonPoints };
            }
            return geo;
        }));

        return result;
    //     return res.status(201).json({
    //         success: true,
    //     // message: 'Geofence created successfully',
    //     // data: response
    // });
    } catch (error) {
        console.error('Error fetching geofences by user id:', error);
        throw error;
    }
}

// for now dont know about this function 

// export async function insertGeoFenceFromTrip(req: Request, res: Response) {
//     try {
//         const { 
//             geofence_name, 
//             latitude, 
//             longitude, 
//             location_id, 
//             radius,
//             stop_type 
//         } = req.body;
        
//         // Validate required fields
//         if (!geofence_name || !location_id || !latitude || !longitude) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: 'Missing required fields. geofence_name, location_id, latitude, and longitude are required' 
//             });
//         }
        
//         // Create geofence (always circle type for trip-based geofences)
//         const [insertedId] = await db.insert(geofence_table).values({
//             geofence_name,
//             latitude,
//             longitude,
//             location_id,
//             tag: 'tms_api',
//             stop_type: stop_type || '',
//             geofence_type: 0, // Circle type
//             radius: radius || 500, // Default radius if not provided
//             status: true
//         }).$returningId();
        
//         // Get newly created geofence
//         const newGeoFence = await db.select()
//             .from(geofence_table)
//             .where(eq(geofence_table.id, insertedId.id))
//             .limit(1);
            
//         return newGeoFence[0];
        
//     } catch (error) {
//         console.error('Error creating geofence from trip:', error);
//         throw error;
//     }
// }


// export async function
