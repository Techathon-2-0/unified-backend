import express from "express";
import { 
    createGeoFence, 
    getAllGeoFences, 
    getGeoFenceById, 
    updateGeoFence, 
    deleteGeoFence, 
    searchGeoFences,getGeoFencesByUserId
    // insertGeoFenceFromTrip
  } from "../controller/Geofence_Controller"
  import { 
      createGeoFenceGroup, 
      getAllGeoFenceGroups, 
      getGeoFenceGroupById, 
      updateGeoFenceGroup, 
      deleteGeoFenceGroup,
      searchGeoFenceGroups
  } from "../controller/GeofenceGroup_Controller";
    
  const GeoFenceRouter = express.Router();

  
  // Create GeoFence 
  GeoFenceRouter.post('/geofence', async (req, res) => {
    try {
      const data = await createGeoFence(req, res);
        res.status(201).json({ 
            success: true,
            message: 'GeoFence created successfully', 
            data 
        });
    } catch (error) {
        console.error('Error creating geofence:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create geofence',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get All GeoFences
GeoFenceRouter.get('/geofence/all', async (req, res) => {
    try {
        if (req.query.query) {
            const data = await searchGeoFences(req, res);
            res.json({ 
                success: true,
                message: 'GeoFences found', 
                data 
            });
        } else {
            const data = await getAllGeoFences(req, res);
            res.json({ 
                success: true,
                message: 'GeoFences fetched successfully', 
                data 
            });
        }
    } catch (error) {
        console.error('Error fetching geofences:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch geofences',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get GeoFence by ID
GeoFenceRouter.get('/geofence/:id', async (req, res) => {
    try {
        const data = await getGeoFenceById(req, res);
        res.json({ 
            success: true,
            message: 'GeoFence fetched successfully', 
            data 
        });
    } catch (error) {
        console.error('Error fetching geofence:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch geofence',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update GeoFence
GeoFenceRouter.put('/geofence/:id', async (req, res) => {
    try {
        const data = await updateGeoFence(req, res);
        res.json({ 
            success: true,
            message: 'GeoFence updated successfully', 
            data 
        });
    } catch (error) {
        console.error('Error updating geofence:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update geofence',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete GeoFence
GeoFenceRouter.delete('/geofence/:id', async (req, res) => {
    try {
        const data = await deleteGeoFence(req, res);
        res.json({ 
            success: true,
            message: 'GeoFence deleted successfully', 
            data 
        });
    } catch (error) {
        console.error('Error deleting geofence:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete geofence',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});


GeoFenceRouter.get('/geofence/user/:userId', async (req, res) => {
    try {
        const data = await getGeoFencesByUserId(req , res);
        res.json(data);
    } catch (error) {
        console.error('Error fetching geofences by user ID:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch geofences by user ID',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
);


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




GeoFenceRouter.post('/geofence-group', async (req, res) => {
    try {
        const data = await createGeoFenceGroup(req, res);
        res.status(201).json({ 
            success: true,
            message: 'GeoFence group created successfully', 
            data 
        });
    } catch (error) {
        console.error('Error creating geofence group:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create geofence group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get All GeoFence Groups with Search
GeoFenceRouter.get('/geofence-group', async (req, res) => {
    try {
        if (req.query.query) {
            const data = await searchGeoFenceGroups(req, res);
            res.json({ 
                success: true,
                message: 'GeoFence groups found', 
                data 
            });
        } else {
            const data = await getAllGeoFenceGroups(req, res);
            res.json({ 
                success: true,
                message: 'GeoFence groups fetched successfully', 
                data 
            });
        }
    } catch (error) {
        console.error('Error fetching geofence groups:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch geofence groups',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get GeoFence Group by ID
GeoFenceRouter.get('/geofence-group/:id', async (req, res) => {
    try {
        const data = await getGeoFenceGroupById(req, res);
        res.json({ 
            success: true,
            message: 'GeoFence group fetched successfully', 
            data 
        });
    } catch (error) {
        console.error('Error fetching geofence group:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch geofence group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update GeoFence Group
GeoFenceRouter.put('/geofence-group/:id', async (req, res) => {
    try {
        const data = await updateGeoFenceGroup(req, res);
        res.json({ 
            success: true,
            message: 'GeoFence group updated successfully', 
            data 
        });
    } catch (error) {
        console.error('Error updating geofence group:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update geofence group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete GeoFence Group
GeoFenceRouter.delete('/geofence-group/:id', async (req, res) => {
    try {
        const data = await deleteGeoFenceGroup(req, res);
        res.json({ 
            success: true,
            message: 'GeoFence group deleted successfully', 
            data 
        });
    } catch (error) {
        console.error('Error deleting geofence group:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete geofence group',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default GeoFenceRouter;