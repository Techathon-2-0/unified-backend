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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserController_1 = require("../controller/UserController");
const sessionValidator_1 = require("../middleware/sessionValidator");
const userRouter = express_1.default.Router();
//working 
userRouter.get('/user', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { searchTerm } = req.query;
    try {
        let data;
        if (searchTerm) {
            data = yield (0, UserController_1.getUserbyUsername)(searchTerm.toString()); // Pass only searchTerm
            res.status(200).json({ message: "Search results", data });
        }
        else {
            console.log("Fetching all users...");
            data = yield (0, UserController_1.getAllUsers)(); // No need for req, res
            res.status(200).json({ message: 'All users fetched successfully', data });
        }
    }
    catch (error) {
        console.error("Error in GET /users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}));
//working
userRouter.get('/user/id/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield (0, UserController_1.getUserById)(req, res);
    if (data) {
        res.send({ message: 'User fetched successfully', data });
    }
    else {
        res.status(404).send({ message: 'User not found' });
    }
}));
//woarkgin
userRouter.post('/user', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //create user   
    const data = yield (0, UserController_1.createUser)(req, res);
    res.send({ message: 'User created successfully', data });
}));
userRouter.put('/user/updatepass', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, UserController_1.changepassword)(req, res);
}));
//working
userRouter.put('/user/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //update user
    const data = yield (0, UserController_1.updateUser)(req, res);
    if (data) {
        res.send({ message: 'User updated successfully', data });
    }
    else {
        res.status(404).send({ message: 'User not found' });
    }
}));
//working
userRouter.delete('/user/:id', sessionValidator_1.validateUserSession, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // First check if the session is invalidated (using type assertion)
    if (req.invalidatedSession) {
        // Set cookies with immediate expiry to clear them
        res.cookie('authToken', '', { expires: new Date(0) });
        res.cookie('userData', '', { expires: new Date(0) });
        res.status(401).send({
            message: 'Session invalidated',
            logout: true,
            clearCookies: true
        });
        return;
    }
    // Delete user
    const data = yield (0, UserController_1.deleteUser)(req, res);
    if (data) {
        // Check if the deleted user is the current authenticated user
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                // If the deleted user is the current user, indicate client should log out
                if (decoded.id === parseInt(req.params.id)) {
                    // Set cookies with immediate expiry to clear them
                    res.cookie('authToken', '', { expires: new Date(0) });
                    res.cookie('userData', '', { expires: new Date(0) });
                    res.send({
                        message: 'User deleted successfully',
                        logout: true,
                        clearCookies: true
                    });
                    return;
                }
            }
            catch (error) {
                console.error("Error verifying token:", error);
            }
        }
        res.send({ message: 'User deleted successfully' });
    }
    else {
        res.status(404).send({ message: 'User not found' });
    }
}));
//working
userRouter.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //login user
    const data = yield (0, UserController_1.loginUser)(req, res);
    if (data) {
        if (data == 10) {
            res.status(409).send({ message: 'User is Inactive' });
        }
        else {
            res.send({ message: 'User logged in successfully', data });
        }
    }
    else {
        res.status(401).send({ message: 'Invalid credentials' });
    }
}));
// Add this endpoint to check user session validity
userRouter.get('/user/validate', sessionValidator_1.validateUserSession, (req, res) => {
    if (req.invalidatedSession) {
        res.status(401).send({
            message: 'Invalid session',
            logout: true,
            clearCookies: true
        });
        return;
    }
    res.status(200).send({ valid: true });
});
exports.default = userRouter;
