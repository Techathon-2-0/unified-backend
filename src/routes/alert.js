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
const alertRouter = express_1.default.Router();
const alert_Controller_1 = require("../controller/alert_Controller");
alertRouter.get('/alerts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const alerts = yield (0, alert_Controller_1.getAllAlerts)(req, res);
        res.status(200).json(alerts);
    }
    catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
alertRouter.get('/alerts/userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userAlerts = yield (0, alert_Controller_1.getAlertsByUserAccess)(req, res);
        res.status(200).json(userAlerts);
    }
    catch (error) {
        console.error('Error fetching user alerts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
// Toggle alert status  
alertRouter.put('/alerts/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const alertId = req.params.id;
        const updatedAlert = yield (0, alert_Controller_1.toggleAlertStatus)(req, res);
        res.status(200).json(updatedAlert);
    }
    catch (error) {
        console.error('Error toggling alert status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
alertRouter.get('alerts/shipment/:shipmentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shipmentId = req.params.shipmentId;
        const alerts = yield (0, alert_Controller_1.getAlertsByShipment)(req, res);
        res.status(200).json(alerts);
    }
    catch (error) {
        console.error('Error fetching alerts by shipment ID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
alertRouter.get('/alerts/geofenece/:geofenceId/vehicle/:vehicleNumber', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { geofenceId, vehicleNumber } = req.params;
        // Assuming you have a function to get alerts by geofence and vehicle
        const alerts = yield (0, alert_Controller_1.getGeofenceAlertsByVehicle)(req, res);
        res.status(200).json(alerts);
    }
    catch (error) {
        console.error('Error fetching alerts by geofence and vehicle:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
exports.default = alertRouter;
