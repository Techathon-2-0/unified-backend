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
const alarm_Controller_1 = require("../controller/alarm_Controller");
const alarmRouter = express_1.default.Router();
// Alarm Routes
alarmRouter.get('/alarm', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const alarms = yield (0, alarm_Controller_1.getAllAlarms)(req, res);
        res.status(200).json(alarms);
    }
    catch (error) {
        console.error('Error fetching alarms:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
alarmRouter.get('/alarm/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const alarm = yield (0, alarm_Controller_1.getAlarmById)(req, res);
        if (alarm) {
            res.status(200).json(alarm);
        }
        else {
            res.status(404).json({ message: 'Alarm not found' });
        }
    }
    catch (error) {
        console.error('Error fetching alarm:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
alarmRouter.post('/alarm', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newAlarm = yield (0, alarm_Controller_1.createAlarm)(req, res);
        res.status(201).json(newAlarm);
    }
    catch (error) {
        console.error('Error creating alarm:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
alarmRouter.put('/alarm/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedAlarm = yield (0, alarm_Controller_1.updateAlarm)(req, res);
        if (updatedAlarm) {
            res.status(200).json(updatedAlarm);
        }
        else {
            res.status(404).json({ message: 'Alarm not found' });
        }
    }
    catch (error) {
        console.error('Error updating alarm:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
alarmRouter.delete('/alarm/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedAlarm = yield (0, alarm_Controller_1.deleteAlarm)(req, res);
        if (deletedAlarm) {
            res.status(200).json({ message: 'Alarm deleted successfully' });
        }
        else {
            res.status(404).json({ message: 'Alarm not found' });
        }
    }
    catch (error) {
        console.error('Error deleting alarm:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
exports.default = alarmRouter;
