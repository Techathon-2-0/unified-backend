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
const RoleController_1 = require("../controller/RoleController");
const RoleRouter = express_1.default.Router();
// GET all roles
RoleRouter.get('/roles', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roles = yield (0, RoleController_1.getAllRoles)();
        res.status(200).json({ message: 'Roles fetched successfully', roles: roles });
    }
    catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Failed to fetch roles' });
    }
}));
// GET role by ID
RoleRouter.get('/role/:id', RoleController_1.getRoleById);
// POST create new role
RoleRouter.post('/role', RoleController_1.createRole);
// PUT update existing role
RoleRouter.put('/role', RoleController_1.updateRole);
RoleRouter.delete('/role/:id', RoleController_1.deleteRole);
exports.default = RoleRouter;
