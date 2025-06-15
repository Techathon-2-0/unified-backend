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
exports.createGeoFence = createGeoFence;
exports.getAllGeoFences = getAllGeoFences;
exports.getGeoFenceById = getGeoFenceById;
exports.updateGeoFence = updateGeoFence;
exports.deleteGeoFence = deleteGeoFence;
exports.searchGeoFences = searchGeoFences;
exports.getGeoFencesByUserId = getGeoFencesByUserId;
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const mysql2_1 = require("drizzle-orm/mysql2");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
// CREATE
function createGeoFence(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { geofence_name, latitude, longitude, location_id, tag, stop_type, geofence_type, radius, polygon_points, status, address, time } = req.body;
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
            // Create geofence
            const [insertedId] = yield db.insert(schema_1.geofence_table).values({
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
                time: time || "1"
            }).$returningId();
            // For polygon type, add the coordinate points
            if (geofence_type === 2 && polygon_points && Array.isArray(polygon_points)) {
                for (let i = 0; i < polygon_points.length; i++) {
                    const point = polygon_points[i];
                    yield db.insert(schema_1.polygon_coordinates).values({
                        geofence_id: insertedId.id,
                        latitude: point.latitude,
                        longitude: point.longitude,
                        corner_points: i + 1 // Start from 1 for the corner points
                    });
                }
            }
            // Get newly created geofence with polygon points if applicable
            const newGeoFence = yield db.select()
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, insertedId.id))
                .limit(1);
            let response = Object.assign({}, newGeoFence[0]);
            // If polygon type, fetch the coordinate points
            if (geofence_type === 2) {
                const polygonPoints = yield db.select()
                    .from(schema_1.polygon_coordinates)
                    .where((0, drizzle_orm_1.eq)(schema_1.polygon_coordinates.geofence_id, insertedId.id))
                    .orderBy(schema_1.polygon_coordinates.corner_points);
                response = Object.assign(Object.assign({}, response), { polygon_points: polygonPoints });
            }
            return response;
        }
        catch (error) {
            console.error('Error creating geofence:', error);
            throw error;
        }
    });
}
// wokring
function getAllGeoFences(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const geofences = yield db.select()
                .from(schema_1.geofence_table);
            // Fetch polygon points for polygon type geofences
            const result = yield Promise.all(geofences.map((geo) => __awaiter(this, void 0, void 0, function* () {
                if (geo.geofence_type === 2) {
                    const polygonPoints = yield db.select()
                        .from(schema_1.polygon_coordinates)
                        .where((0, drizzle_orm_1.eq)(schema_1.polygon_coordinates.geofence_id, geo.id))
                        .orderBy(schema_1.polygon_coordinates.corner_points);
                    return Object.assign(Object.assign({}, geo), { polygon_points: polygonPoints });
                }
                return geo;
            })));
            return result;
        }
        catch (error) {
            console.error('Error fetching geofences:', error);
            throw error;
        }
    });
}
// wokring
function getGeoFenceById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const geofence = yield db.select()
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, parseInt(id)))
                .limit(1);
            if (geofence.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'GeoFence not found'
                });
            }
            let response = Object.assign({}, geofence[0]);
            // If polygon type, fetch the coordinate points
            if (geofence[0].geofence_type === 2) {
                const polygonPoints = yield db.select()
                    .from(schema_1.polygon_coordinates)
                    .where((0, drizzle_orm_1.eq)(schema_1.polygon_coordinates.geofence_id, parseInt(id)))
                    .orderBy(schema_1.polygon_coordinates.corner_points);
                response = Object.assign(Object.assign({}, response), { polygon_points: polygonPoints });
            }
            return response;
        }
        catch (error) {
            console.error('Error fetching geofence:', error);
            throw error;
        }
    });
}
// wokring
function updateGeoFence(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { geofence_name, latitude, longitude, location_id, tag, stop_type, geofence_type, radius, polygon_points, status, address, time } = req.body;
            // Check if geofence exists
            const existingGeoFence = yield db.select()
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, parseInt(id)))
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
            const updateData = {};
            if (geofence_name !== undefined)
                updateData.geofence_name = geofence_name;
            if (latitude !== undefined)
                updateData.latitude = latitude;
            if (longitude !== undefined)
                updateData.longitude = longitude;
            if (location_id !== undefined)
                updateData.location_id = location_id;
            if (tag !== undefined)
                updateData.tag = tag;
            if (stop_type !== undefined)
                updateData.stop_type = stop_type;
            if (geofence_type !== undefined)
                updateData.geofence_type = geofence_type;
            if (radius !== undefined && geofence_type === 0)
                updateData.radius = radius;
            if (status !== undefined)
                updateData.status = status;
            if (address !== undefined)
                updateData.address = address; // <-- Update address
            if (time !== undefined)
                updateData.time = time; // <-- Update time
            // Set Indian time for updated_at
            const indianTime = new Date();
            indianTime.setHours(indianTime.getHours() + 5);
            indianTime.setMinutes(indianTime.getMinutes() + 30);
            updateData.updated_at = indianTime;
            // Update geofence
            yield db.update(schema_1.geofence_table)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, parseInt(id)));
            // For polygon type, update the coordinate points
            if (geofence_type == 0) {
                yield db.delete(schema_1.polygon_coordinates)
                    .where((0, drizzle_orm_1.eq)(schema_1.polygon_coordinates.geofence_id, parseInt(id)));
            }
            if (geofence_type === 2 && polygon_points && Array.isArray(polygon_points)) {
                // Delete existing polygon points
                yield db.delete(schema_1.polygon_coordinates)
                    .where((0, drizzle_orm_1.eq)(schema_1.polygon_coordinates.geofence_id, parseInt(id)));
                // Add new polygon points
                for (let i = 0; i < polygon_points.length; i++) {
                    const point = polygon_points[i];
                    yield db.insert(schema_1.polygon_coordinates).values({
                        geofence_id: parseInt(id),
                        latitude: point.latitude,
                        longitude: point.longitude,
                        corner_points: i + 1 // Start from 1 for the corner points
                    });
                }
            }
            // Get updated geofence with polygon points if applicable
            const updatedGeoFence = yield db.select()
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, parseInt(id)))
                .limit(1);
            let response = Object.assign({}, updatedGeoFence[0]);
            // If polygon type, fetch the coordinate points
            if (updatedGeoFence[0].geofence_type === 2) {
                const polygonPoints = yield db.select()
                    .from(schema_1.polygon_coordinates)
                    .where((0, drizzle_orm_1.eq)(schema_1.polygon_coordinates.geofence_id, parseInt(id)))
                    .orderBy(schema_1.polygon_coordinates.corner_points);
                response = Object.assign(Object.assign({}, response), { polygon_points: polygonPoints });
            }
            return response;
        }
        catch (error) {
            console.error('Error updating geofence:', error);
            throw error;
        }
    });
}
// working
function deleteGeoFence(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Check if geofence exists
            const existingGeoFence = yield db.select()
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, parseInt(id)))
                .limit(1);
            if (existingGeoFence.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'GeoFence not found'
                });
            }
            // Delete polygon points if it's a polygon type
            if (existingGeoFence[0].geofence_type === 2) {
                yield db.delete(schema_1.polygon_coordinates)
                    .where((0, drizzle_orm_1.eq)(schema_1.polygon_coordinates.geofence_id, parseInt(id)));
            }
            // Delete from geofence_group_relation
            yield db.delete(schema_1.geofence_group_relation)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_group_relation.geofence_id, parseInt(id)));
            // Delete geofence
            yield db.delete(schema_1.geofence_table)
                .where((0, drizzle_orm_1.eq)(schema_1.geofence_table.id, parseInt(id)));
            return { id: parseInt(id) };
        }
        catch (error) {
            console.error('Error deleting geofence:', error);
            throw error;
        }
    });
}
// wokring
function searchGeoFences(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { query } = req.query;
            if (!query) {
                return yield getAllGeoFences(req, res);
            }
            const searchQuery = `%${query}%`;
            const geofences = yield db.select()
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.geofence_table.geofence_name, searchQuery), (0, drizzle_orm_1.like)(schema_1.geofence_table.location_id, searchQuery), (0, drizzle_orm_1.like)(schema_1.geofence_table.tag, searchQuery), (0, drizzle_orm_1.like)(schema_1.geofence_table.stop_type, searchQuery)));
            // Fetch polygon points for polygon type geofences
            const result = yield Promise.all(geofences.map((geo) => __awaiter(this, void 0, void 0, function* () {
                if (geo.geofence_type === 2) {
                    const polygonPoints = yield db.select()
                        .from(schema_1.polygon_coordinates)
                        .where((0, drizzle_orm_1.eq)(schema_1.polygon_coordinates.geofence_id, geo.id))
                        .orderBy(schema_1.polygon_coordinates.corner_points);
                    return Object.assign(Object.assign({}, geo), { polygon_points: polygonPoints });
                }
                return geo;
            })));
            return result;
        }
        catch (error) {
            console.error('Error searching geofences:', error);
            throw error;
        }
    });
}
// wokring
function getGeoFencesByUserId(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            // 1. Get geofence group ids for the user
            const userGroups = yield db.select({ geofence_group_id: schema_1.user_geofence_group.geofence_group_id })
                .from(schema_1.user_geofence_group)
                .where((0, drizzle_orm_1.eq)(schema_1.user_geofence_group.user_id, parseInt(userId)));
            const groupIds = userGroups.map(g => g.geofence_group_id);
            if (groupIds.length === 0)
                return [];
            // 2. Get geofence ids from those groups
            const groupRelations = yield db.select({ geofence_id: schema_1.geofence_group_relation.geofence_id })
                .from(schema_1.geofence_group_relation)
                .where((0, drizzle_orm_1.inArray)(schema_1.geofence_group_relation.group_id, groupIds.filter((id) => id !== null)));
            const geofenceIds = groupRelations.map(r => r.geofence_id);
            if (geofenceIds.length === 0)
                return [];
            // 3. Get geofence details
            const geofences = yield db.select()
                .from(schema_1.geofence_table)
                .where((0, drizzle_orm_1.inArray)(schema_1.geofence_table.id, geofenceIds));
            // 4. Attach polygon points if needed
            const result = yield Promise.all(geofences.map((geo) => __awaiter(this, void 0, void 0, function* () {
                if (geo.geofence_type === 2) {
                    const polygonPoints = yield db.select()
                        .from(schema_1.polygon_coordinates)
                        .where((0, drizzle_orm_1.eq)(schema_1.polygon_coordinates.geofence_id, geo.id))
                        .orderBy(schema_1.polygon_coordinates.corner_points);
                    return Object.assign(Object.assign({}, geo), { polygon_points: polygonPoints });
                }
                return geo;
            })));
            return result;
        }
        catch (error) {
            console.error('Error fetching geofences by user id:', error);
            throw error;
        }
    });
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
