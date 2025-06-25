import express from 'express';

const alertRouter = express.Router();
import { getAllAlerts, getAlertsByUserAccess,getGeofenceAlertsByVehicle, toggleAlertStatus , getAlertsByShipment } from '../controller/alert_Controller';


alertRouter.get('/alerts', async (req, res) => {
    try {
        await getAllAlerts(req, res);
        // res.status(200).json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

alertRouter.get('/alerts/user/:userId', async (req, res) => { 
    try {
        // console.log('Fetching user alerts with access control');
        await getAlertsByUserAccess(req, res);
        // console.log('User Alerts:', userAlerts);
        // res.status(200).json(userAlerts);
    } catch (error) {
        console.error('Error fetching user alerts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Toggle alert status  
alertRouter.put('/alerts/:id', async (req, res) => {
    try {
        // const alertId = req.params.id;
        await toggleAlertStatus(req, res);
        // res.status(200).json(updatedAlert);
    } catch (error) {
        console.error('Error toggling alert status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

alertRouter.get('/alerts/shipment/:shipmentId', async (req, res) => {
    try {
        // const shipmentId = req.params.shipmentId;
        await getAlertsByShipment(req, res);
        // res.status(200).json(alerts);
    }
    catch (error) {
        console.error('Error fetching alerts by shipment ID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
);

alertRouter.get('/alerts/geofenece/:geofenceId/vehicle/:vehicleNumber', async (req, res) => {
    try {
        // const { geofenceId, vehicleNumber } = req.params;
        // Assuming you have a function to get alerts by geofence and vehicle
        await getGeofenceAlertsByVehicle(req , res);
        // res.status(200).json(alerts);
    } catch (error) {
        console.error('Error fetching alerts by geofence and vehicle:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default alertRouter;