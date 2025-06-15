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
const mysql2_1 = require("drizzle-orm/mysql2");
const express_1 = __importDefault(require("express"));
const schema_1 = require("../db/schema");
const Gpsfetcher_1 = require("../controller/Gpsfetcher");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
const featureRouter = express_1.default.Router();
featureRouter.get('/usertype', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const features = yield db.select().from(schema_1.usertype);
        res.status(200).json(features);
    }
    catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({ message: 'Failed to fetch features' });
    }
}));
featureRouter.get('/vehiclegroup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const features = yield db.select().from(schema_1.group);
        res.status(200).json(features);
    }
    catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({ message: 'Failed to fetch features' });
    }
}));
featureRouter.get('/geofencegroup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const features = yield db.select().from(schema_1.geofencegroup);
        res.status(200).json(features);
    }
    catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({ message: 'Failed to fetch features' });
    }
}));
featureRouter.post('/insertgps', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gpsData = req.body; // Assuming the GPS data is sent in the request body
        // console.log(gpsData);
        // if (!gpsData) {
        //     return res.status(400).json({ message: 'No GPS data provided' });
        // }
        const rawdata = JSON.stringify(gpsData.messages);
        const result = yield (0, Gpsfetcher_1.insertGpsData)(gpsData.messages);
        res.status(201).json({ message: 'GPS data inserted successfully', data: result });
    }
    catch (error) {
        console.error('Error inserting GPS data:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ message: 'Failed to insert GPS data', error: errorMessage });
    }
}));
exports.default = featureRouter;
