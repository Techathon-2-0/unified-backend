import { drizzle } from "drizzle-orm/mysql2";
import express, { Request, Response } from 'express';
import { geofencegroup, usertype, group as vehicleGroup } from "../db/schema";
import { insertGpsData } from "../controller/Gpsfetcher";
const db=drizzle(process.env.DATABASE_URL!);

const featureRouter = express.Router();

featureRouter.get('/usertype', async (req, res) => {
    try {
        const features = await db.select().from(usertype);
        res.status(200).json(features);
    } catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({ message: 'Failed to fetch features' });
    }
});

featureRouter.get('/vehiclegroup', async (req, res) => {
    try {
        const features = await db.select().from(vehicleGroup);
        res.status(200).json(features);
    } catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({ message: 'Failed to fetch features' });
    }
});

featureRouter.get('/geofencegroup', async (req, res) => {
    try {
        const features = await db.select().from(geofencegroup);
        res.status(200).json(features);
    } catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({ message: 'Failed to fetch features' });
    }
});

featureRouter.post('/insertgps', async (req, res) => {

    try {
        const gpsData = req.body; // Assuming the GPS data is sent in the request body
        // console.log(gpsData.data);
        // if (!gpsData) {
        //     return res.status(400).json({ message: 'No GPS data provided' });
        // }
        // console.log('Received GPS data:', gpsData);
        // const rawdata = JSON.stringify(gpsData.messages);
        console.log('Received GPS data:', gpsData);
        const result = await insertGpsData(gpsData);
        res.status(201).json({ message: 'GPS data inserted successfully',gpsData});
    } catch (error) {
        console.error('Error inserting GPS data:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ message: 'Failed to insert GPS data', error: errorMessage });
    } 
});

featureRouter.post('/insertgpsinthexml', async (req, res) => {

    try {
        const gpsData = req.body; // Assuming the GPS data is sent in the request body
        // console.log(gpsData.data);
        // if (!gpsData) {
        //     return res.status(400).json({ message: 'No GPS data provided' });
        // }
        // console.log('Received GPS data:', gpsData);
        // const rawdata = JSON.stringify(gpsData.messages);
        const result = await insertGpsData(gpsData.data.GPSData);
        res.status(201).json({ message: 'GPS data inserted successfully',gpsData});
    } catch (error) {
        console.error('Error inserting GPS data:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ message: 'Failed to insert GPS data', error: errorMessage });
    } 
});

export default featureRouter;