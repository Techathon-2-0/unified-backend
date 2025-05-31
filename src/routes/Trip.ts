import express, { Request, Response } from "express";

import { getAllTrips, getTripById, insertData, insertTripFromXML,} from "../controller/TripController";

const TRIPRouter = express.Router();



// Original routes

TRIPRouter.get('/trip/v1', async (req, res) => {
    try {
        const rs = await getAllTrips();
        const data=[];
        for (const trip of rs) {
            const tp={
                //shipment
                id: trip.id,
                status: trip.status,//ok
                routeId: trip.routeId,//ok
                routeName: trip.routeName,//ok
                routeType: trip.routeType,//ok
                startTime: trip.startTime,//ok
                endTime: trip.endTime,//ok
                shipmentId: trip.shipmentId,
                totalDetentionTime: trip.totalDetentionTime,
                totalStoppageTime: trip.totalStoppageTime,
                totalDriveTime: trip.totalDriveTime,
                domainName: trip.domainName,
                coordinates: trip.coordinates,

                //equipment
                equipmentId: trip.equipmentId,
                driverName: trip.driverName,
                driverMobile: trip.driverMobile,
                driverDetails: trip.driverDetails,
                vehicleName: trip.vehicleName,
                vehicleStatus: trip.vehicleStatus,
                statusDuration: trip.statusDuration,

                //event 
                location: trip.location,
                locationDateTime: trip.locationDateTime,
                
                //stop
                stops: trip.stops
            }
            data.push(tp);
        }
        console.log(data);
        res.send({ message: 'GPS data saved successfully', data });
    }
    catch (err) {
        console.error('GPS data error:', err);
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


export default TRIPRouter;