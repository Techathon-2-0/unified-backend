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
const VendorController_1 = require("../controller/VendorController");
const vendorRouter = express_1.default.Router();
//wroking
vendorRouter.post('/vendor', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, VendorController_1.createVendor)(req, res);
        res.send({ message: 'Vendor created successfully', data });
    }
    catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//working
vendorRouter.get('/vendor/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, VendorController_1.searchVendors)(req, res);
    }
    catch (error) {
        console.error('Error searching vendors:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//working
vendorRouter.get('/vendor', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Implement logic to fetch all vendors
        const data = yield (0, VendorController_1.getAllVendors)(req, res);
        res.send({ message: 'Vendors fetched successfully', data: [] }); // Placeholder for actual data
    }
    catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//working
vendorRouter.get('/vendor/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, VendorController_1.getVendorById)(req, res);
        res.send({ message: `Vendor with ID ${req.params.id} fetched successfully`, data });
    }
    catch (error) {
        console.error('Error fetching vendor by ID:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//working
vendorRouter.put('/vendor/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedVendor = yield (0, VendorController_1.updateVendor)(req, res);
        res.send({ message: `Vendor with ID ${id} updated successfully` });
    }
    catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//working
vendorRouter.delete('/vendor/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield (0, VendorController_1.deleteVendor)(req, res);
        res.send({ message: `Vendor with ID ${id} deleted successfully` });
    }
    catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
exports.default = vendorRouter;
