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
const intutrack_Controller_1 = require("../controller/intutrack_Controller");
const intutrackRouter = express_1.default.Router();
// Route to refresh consent status
intutrackRouter.get('/intutrack/refresh', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, intutrack_Controller_1.refreshConsentStatus)(req, res);
        res.status(200).json({
            success: true,
            message: 'Consent status refreshed successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Error refreshing consent status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}));
intutrackRouter.get('/intutrack/db', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, intutrack_Controller_1.getConsentStatus)(req, res);
        res.status(200).json({
            success: true,
            message: 'Consent status fetched successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Error fetching consent status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}));
exports.default = intutrackRouter;
