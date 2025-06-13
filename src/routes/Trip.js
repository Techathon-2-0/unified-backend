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
const TripController_1 = require("../controller/TripController");
const TRIPRouter = express_1.default.Router();
// Original routes
TRIPRouter.get('/trip/v1/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = Number(req.params.id);
        // Extract query parameters
        const { status, startDate, endDate, page = '1', limit = '100' } = req.query;
        // Parse dates if provided
        let parsedStartDate;
        let parsedEndDate;
        if (startDate && typeof startDate === 'string') {
            parsedStartDate = new Date(startDate);
        }
        if (endDate && typeof endDate === 'string') {
            parsedEndDate = new Date(endDate);
        }
        const data = yield (0, TripController_1.getAllTrips)(userId, Number(page), Number(limit), status, parsedStartDate, parsedEndDate);
        console.log(`Fetched ${data.length} trips for user ${userId}`);
        res.send({
            message: 'Trips fetched successfully',
            data,
            filters: {
                status: status || 'active',
                startDate: (parsedStartDate === null || parsedStartDate === void 0 ? void 0 : parsedStartDate.toISOString()) || 'last 7 days',
                endDate: (parsedEndDate === null || parsedEndDate === void 0 ? void 0 : parsedEndDate.toISOString()) || 'today'
            }
        });
    }
    catch (err) {
        console.error('Trip fetch error:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
TRIPRouter.get('/trip/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const trip = yield (0, TripController_1.getTripById)(req.params.id);
        if (!trip) {
            res.status(404).send({ error: 'Trip not found' });
            return;
        }
        res.json(trip);
    }
    catch (err) {
        console.error('Error fetching trip:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
TRIPRouter.post('/trip', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tripData = req.body;
        const newTrip = yield (0, TripController_1.insertData)(tripData);
        res.status(201).json(newTrip);
    }
    catch (err) {
        console.error('Error creating trip:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
// TRIPRouter.get('/user/trips/:userId', async (req, res) => {
//     const userId = Number(req.params.userId);
//     try {
//         const trips = await getTripsByUserCustomer(userId);
//         res.json(trips);
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to fetch trips' });
//     }
// });
TRIPRouter.post('/inserttrip', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, TripController_1.insertTripFromXML)();
        res.status(201).json({ message: "done" });
    }
    catch (err) {
        console.error('Error inserting trip from XML:', err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
exports.default = TRIPRouter;
