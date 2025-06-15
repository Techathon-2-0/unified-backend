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
const vahn_Controller_1 = require("../controller/vahn_Controller");
const Vahnrouter = express_1.default.Router();
Vahnrouter.post('/vahn', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, vahn_Controller_1.getVahanData)(req, res);
        res.status(200).json({ message: 'Vahan data fetched successfully', data });
    }
    catch (error) {
        console.error('Error fetching Vahan data:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch Vahan data' });
    }
}));
Vahnrouter.get('/vahn/:vehicleNumber', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const vehicleNumber = req.params.vehicleNumber;
        const data = yield (0, vahn_Controller_1.getVahanFromDb)(req, res);
        res.status(200).json({ message: 'Vahan data fetched successfully', data });
    }
    catch (error) {
        console.error('Error fetching Vahan data from database:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch Vahan data from database' });
    }
}));
exports.default = Vahnrouter;
