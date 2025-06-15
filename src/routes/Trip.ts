import express, { Request, Response } from "express";

import { getAllTrips, getTripById, insertData, insertTripFromXML } from "../controller/TripController";

const TRIPRouter = express.Router();

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
        const tripData = req.body;
        const newTrip = await insertData(tripData);
        res.status(201).json(newTrip);
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

TRIPRouter.get('/delivery', async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await getAllTrips(1, 1, 100, undefined, undefined, undefined);
        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

TRIPRouter.get('/dispatch', async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await getAllTrips(1, 1, 100, undefined, undefined, undefined);
        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

export default TRIPRouter;