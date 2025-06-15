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
exports.validateUserSession = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mysql2_1 = require("drizzle-orm/mysql2");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
const validateUserSession = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get the token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No need to set invalidatedSession if there's no token
            return next();
        }
        const token = authHeader.split(' ')[1];
        try {
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // Check if user still exists
            const user = yield db.select()
                .from(schema_1.usersTable)
                .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, decoded.id))
                .limit(1);
            if (user.length === 0) {
                // User doesn't exist - invalidate the session
                req.invalidatedSession = true;
                req.deletedUserId = decoded.id;
            }
        }
        catch (jwtError) {
            // JWT verification failed
            req.invalidatedSession = true;
        }
        next();
    }
    catch (error) {
        // Let the request proceed, but mark the session as invalid
        req.invalidatedSession = true;
        next();
    }
});
exports.validateUserSession = validateUserSession;
