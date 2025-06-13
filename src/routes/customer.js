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
const Customer_Controller_1 = require("../controller/Customer_Controller");
const customerRouter = express_1.default.Router();
// Customer Routes
customerRouter.post('/customer', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.createCustomer)(req, res);
        res.send({ message: 'Customer created successfully', data });
    }
    catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//workign
customerRouter.get('/customer', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.query.query) {
            const data = yield (0, Customer_Controller_1.searchCustomers)(req, res);
            res.send({ message: 'Customers found', data });
        }
        else {
            const data = yield (0, Customer_Controller_1.getAllCustomers)(req, res);
            res.send({ message: 'Customers fetched successfully', data });
        }
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//working
customerRouter.get('/customer/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.getCustomerById)(req, res);
        res.send({ message: 'Customer fetched successfully', data });
    }
    catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//working
customerRouter.put('/customer/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.updateCustomerById)(req, res);
        res.send({ message: 'Customer updated successfully', data });
    }
    catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//wokring
customerRouter.delete('/customer/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.deleteCustomer)(req, res);
        res.send({ message: 'Customer deleted successfully', data });
    }
    catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//working
customerRouter.post('/customer-group', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.createCustomerGroup)(req, res);
        res.send({ message: 'Customer group created successfully', data });
    }
    catch (error) {
        console.error('Error creating customer group:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//working
customerRouter.get('/customer-group', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.query.query) {
            const data = yield (0, Customer_Controller_1.searchCustomerGroups)(req, res);
            res.send({
                success: true,
                message: 'Customer groups found',
                data
            });
        }
        else {
            const data = yield (0, Customer_Controller_1.getAllCustomerGroups)(req, res);
            res.send({
                success: true,
                message: 'Customer groups fetched successfully',
                data
            });
        }
    }
    catch (error) {
        console.error('Error fetching customer groups:', error);
        res.status(500).send({
            success: false,
            message: 'Failed to fetch customer groups',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
//wokring
customerRouter.get('/customer-group/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.getCustomerGroupById)(req, res);
        res.send({ message: 'Customer group fetched successfully', data });
    }
    catch (error) {
        console.error('Error fetching customer group:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//wokring
customerRouter.put('/customer-group/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.updateCustomerGroup)(req, res);
        res.send({ message: 'Customer group updated successfully', data });
    }
    catch (error) {
        console.error('Error updating customer group:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//.working
customerRouter.delete('/customer-group/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.deleteCustomerGroup)(req, res);
        res.send({ message: 'Customer group deleted successfully', data });
    }
    catch (error) {
        console.error('Error deleting customer group:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
exports.default = customerRouter;
//working
customerRouter.get('/customer-name-by-user/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.getCustomerNamesByUserAccess)(req, res);
        res.send({ message: 'Customer group fetched successfully', data });
    }
    catch (error) {
        console.error('Error fetching customer group by user:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
//wokring
customerRouter.get('/customer-group-by-user/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Customer_Controller_1.getCustomerGroupsByUserId)(req, res);
        res.send({ message: 'Customer groups fetched successfully', data });
    }
    catch (error) {
        console.error('Error fetching customer groups by user:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}));
// jin cusotmer grp ka access k unn sb customer k name 
// customer grp by user id 
