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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = testing;
require("dotenv/config");
const schema_1 = require("../db/schema");
const mysql2_1 = require("drizzle-orm/mysql2");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
function testing() {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield db.select().from(schema_1.usersTable);
        return users;
    });
}
