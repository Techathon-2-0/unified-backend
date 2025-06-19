import express from "express";
import { readMultipleXMLData, readSingleXMLData, readTripXMLData } from "../utilities/xmlfunc";
import { getAllTrips, getTripById,insertTripFromXML } from "../controller/TripController";
import { insertGpsData} from "../controller/Gpsfetcher";
import { insertdumpdata } from "../controller/Dump";
//import { insertGpsDataFromXML } from "../controller/Gpsfetcher";

const testingRouter= express.Router();
testingRouter.post('/testing', async (req, res) => {

    // const data = await insertdumpdata();
    // const data = await 
    const data = await insertTripFromXML();
    // res.send({ message:""});
    // const data = await insertGpsDataFromXML();
    res.send({ message: data });
});

export default testingRouter; 