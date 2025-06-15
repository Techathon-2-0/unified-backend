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
const entityController_1 = require("../controller/entityController");
const Entityrouter = express_1.default.Router();
//working
Entityrouter.post('/entity', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Remove res.send from controller, only send here
        const data = yield (0, entityController_1.createEntity)(req, res);
        if (!res.headersSent) {
            res.send({ message: 'entity created successfully', data });
        }
    }
    catch (error) {
        console.error('Error creating entity:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
}));
//working
Entityrouter.get('/entity', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, entityController_1.getAllEntities)(req, res);
        if (!res.headersSent) {
            res.send({ message: 'entity fetched successfully', data });
        }
    }
    catch (error) {
        console.error('Error fetching entity:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
}));
// Add the search route before the /:id route to prevent conflicts
// IMPORTANT: This needs to be before the '/:id' route!
// WORKING
Entityrouter.get('/entity/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, entityController_1.searchEntities)(req, res);
        if (!res.headersSent) {
            res.send({ message: 'Entities searched successfully', data });
        }
    }
    catch (error) {
        console.error('Error searching entities:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
}));
//working
Entityrouter.get('/entity/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const entityId = req.params.id;
        const data = yield (0, entityController_1.getEntityById)(req, res);
        if (!res.headersSent) {
            if (data) {
                res.send({ message: 'entity fetched successfully', data });
            }
            else {
                res.status(404).send({ message: 'entity not found' });
            }
        }
    }
    catch (error) {
        console.error('Error fetching entity by ID:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
}));
//working
Entityrouter.delete('/entity/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, entityController_1.deleteEntity)(req, res);
        if (!res.headersSent) {
            if (data) {
                res.send({ message: 'entity deleted successfully', data });
            }
            else {
                res.status(404).send({ message: 'entity not found' });
            }
        }
    }
    catch (error) {
        console.error('Error deleting entity:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
}));
//working
Entityrouter.put('/entity/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, entityController_1.updateEntity)(req, res);
        if (!res.headersSent) {
            if (data) {
                res.send({ message: 'entity updated successfully', data });
            }
            else {
                res.status(404).send({ message: 'entity not found' });
            }
        }
    }
    catch (error) {
        console.error('Error updating entity:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
}));
//working
Entityrouter.get('/vendors', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, entityController_1.getAllActiveVendors)(req, res);
        if (!res.headersSent) {
            res.send({ message: 'Vendors fetched successfully', data });
        }
    }
    catch (error) {
        console.error('Error fetching vendors:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
}));
exports.default = Entityrouter;
