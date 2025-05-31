import { drizzle } from "drizzle-orm/mysql2";
import express from 'express';
import { geofencegroup, usertag, usertype, vehiclegroup } from "../db/schema";

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

featureRouter.get('/usertag', async (req, res) => {
    try {
        const features = await db.select().from(usertag);
        res.status(200).json(features);
    } catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({ message: 'Failed to fetch features' });
    }
});

featureRouter.get('/vehiclegroup', async (req, res) => {
    try {
        const features = await db.select().from(vehiclegroup);
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


export default featureRouter;