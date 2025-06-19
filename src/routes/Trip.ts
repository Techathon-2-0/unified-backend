import express, { Request, Response } from "express";
import { parseStringPromise } from "xml2js";

import { getAllTrips, getTripById, insertData, insertTripFromXML,getTripEnd } from "../controller/TripController";
import { readTripXMLData } from "../utilities/xmlfunc";
const TRIPRouter = express.Router();
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { configDotenv } from "dotenv";
// Original routes

TRIPRouter.get('/trip/v1/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        
        // Extract query parameters
        const { 
            status, 
            startDate, 
            endDate, 
            page = '1', 
            limit = '100' 
        } = req.query;

        // Parse dates if provided
        let parsedStartDate: Date | undefined;
        let parsedEndDate: Date | undefined;

        if (startDate && typeof startDate === 'string') {
            parsedStartDate = new Date(startDate);
        }
        
        if (endDate && typeof endDate === 'string') {
            parsedEndDate = new Date(endDate);
        }

        const data = await getAllTrips(
            userId, 
            Number(page), 
            Number(limit), 
            status as string | undefined,
            parsedStartDate,
            parsedEndDate
        );
        
        console.log(`Fetched ${data.length} trips for user ${userId}`);
        res.send({ 
            message: 'Trips fetched successfully', 
            data,
            filters: {
                status: status || 'active',
                startDate: parsedStartDate?.toISOString() || 'last 7 days',
                endDate: parsedEndDate?.toISOString() || 'today'
            }
        });
    } catch (err) {
        console.error('Trip fetch error:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


TRIPRouter.get('/trip/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const trip = await getTripById(req.params.id);
        if (!trip) {
            res.status(404).send({ error: 'Trip not found' });
            return;
        }
        res.json(trip);
    } catch (err) {
        console.error('Error fetching trip:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

TRIPRouter.post('/trip', async (req: Request, res: Response): Promise<void> => {
    try {
        const xmlData = req.body; // Assuming XML data is sent in the request body as 'xml'
        // console.log('Received trip data:', tripData);
        // const data=await readTripXMLData("1.xml");
        console.log(xmlData);

        // console.log('Parsed trip data:', data);
        const newTrip = await insertData(req.body.Transmission);
        // console.log('New trip created:', newTrip);
        res.status(201).json(newTrip);
        // res.status(200).json({ message: 'Trip data received successfully', xmlData });
    } catch (err) {
        console.error('Error creating trip:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

// TRIPRouter.get('/user/trips/:userId', async (req, res) => {
//     const userId = Number(req.params.userId);
//     try {
//         const trips = await getTripsByUserCustomer(userId);
//         res.json(trips);
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to fetch trips' });
//     }
// });

TRIPRouter.post('/inserttrip', async (req: Request, res: Response): Promise<void> => {
    try {

        await insertTripFromXML();
        res.status(201).json({message:"done"});
    } catch (err) {
        console.error('Error inserting trip from XML:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

TRIPRouter.post('/trip/delivery', async (req: Request, res: Response): Promise<void> => {
    try {
        const trip = req.body;
        // console.log(trip);
        const data = await getTripEnd(trip);
        res.status(200).json(data);
        // res.status(200).json({ message: 'Trip delivery data received successfully' });
    } catch (err) {
        console.error('Error fetching trip end data:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}
);


export default TRIPRouter;