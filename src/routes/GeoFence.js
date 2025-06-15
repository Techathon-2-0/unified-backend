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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Geofence_Controller_1 = require("../controller/Geofence_Controller");
const GeofenceGroup_Controller_1 = require("../controller/GeofenceGroup_Controller");
const GeoFenceRouter = express_1.default.Router();
// Create GeoFence 
GeoFenceRouter.post('/geofence', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Geofence_Controller_1.createGeoFence)(req, res);
        res.status(201).json({
            success: true,
            message: 'GeoFence created successfully',
            data
        });
    }
    catch (error) {
        console.error('Error creating geofence:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create geofence',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Get All GeoFences
GeoFenceRouter.get('/geofence/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.query.query) {
            const data = yield (0, Geofence_Controller_1.searchGeoFences)(req, res);
            res.json({
                success: true,
                message: 'GeoFences found',
                data
            });
        }
        else {
            const data = yield (0, Geofence_Controller_1.getAllGeoFences)(req, res);
            res.json({
                success: true,
                message: 'GeoFences fetched successfully',
                data
            });
        }
    }
    catch (error) {
        console.error('Error fetching geofences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch geofences',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Get GeoFence by ID
GeoFenceRouter.get('/geofence/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Geofence_Controller_1.getGeoFenceById)(req, res);
        res.json({
            success: true,
            message: 'GeoFence fetched successfully',
            data
        });
    }
    catch (error) {
        console.error('Error fetching geofence:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch geofence',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Update GeoFence
GeoFenceRouter.put('/geofence/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Geofence_Controller_1.updateGeoFence)(req, res);
        res.json({
            success: true,
            message: 'GeoFence updated successfully',
            data
        });
    }
    catch (error) {
        console.error('Error updating geofence:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update geofence',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Delete GeoFence
GeoFenceRouter.delete('/geofence/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Geofence_Controller_1.deleteGeoFence)(req, res);
        res.json({
            success: true,
            message: 'GeoFence deleted successfully',
            data
        });
    }
    catch (error) {
        console.error('Error deleting geofence:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete geofence',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
GeoFenceRouter.get('/geofence/user/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Geofence_Controller_1.getGeoFencesByUserId)(req, res);
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching geofences by user ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch geofences by user ID',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Insert GeoFence from Trip
// GeoFenceRouter.post('/geofence/trip', async (req, res) => {
//     try {
//         const data = await insertGeoFenceFromTrip(req, res);
//         res.status(201).json({ 
//             success: true,
//             message: 'GeoFence created from trip successfully', 
//             data 
//         });
//     } catch (error) {
//         console.error('Error creating geofence from trip:', error);
//         res.status(500).json({ 
//             success: false,
//             message: 'Failed to create geofence from trip',
//             error: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
// });
GeoFenceRouter.post('/geofence-group', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, GeofenceGroup_Controller_1.createGeoFenceGroup)(req, res);
        res.status(201).json({
            success: true,
            message: 'GeoFence group created successfully',
            data
        });
    }
    catch (error) {
        console.error('Error creating geofence group:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create geofence group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Get All GeoFence Groups with Search
GeoFenceRouter.get('/geofence-group', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.query.query) {
            const data = yield (0, GeofenceGroup_Controller_1.searchGeoFenceGroups)(req, res);
            res.json({
                success: true,
                message: 'GeoFence groups found',
                data
            });
        }
        else {
            const data = yield (0, GeofenceGroup_Controller_1.getAllGeoFenceGroups)(req, res);
            res.json({
                success: true,
                message: 'GeoFence groups fetched successfully',
                data
            });
        }
    }
    catch (error) {
        console.error('Error fetching geofence groups:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch geofence groups',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Get GeoFence Group by ID
GeoFenceRouter.get('/geofence-group/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, GeofenceGroup_Controller_1.getGeoFenceGroupById)(req, res);
        res.json({
            success: true,
            message: 'GeoFence group fetched successfully',
            data
        });
    }
    catch (error) {
        console.error('Error fetching geofence group:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch geofence group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Update GeoFence Group
GeoFenceRouter.put('/geofence-group/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, GeofenceGroup_Controller_1.updateGeoFenceGroup)(req, res);
        res.json({
            success: true,
            message: 'GeoFence group updated successfully',
            data
        });
    }
    catch (error) {
        console.error('Error updating geofence group:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update geofence group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Delete GeoFence Group
GeoFenceRouter.delete('/geofence-group/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, GeofenceGroup_Controller_1.deleteGeoFenceGroup)(req, res);
        res.json({
            success: true,
            message: 'GeoFence group deleted successfully',
            data
        });
    }
    catch (error) {
        console.error('Error deleting geofence group:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete geofence group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
exports.default = GeoFenceRouter;
