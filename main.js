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
require("dotenv/config");
const Trip_1 = __importDefault(require("./src/routes/Trip"));
const testing_1 = __importDefault(require("./src/routes/testing"));
const live_1 = __importDefault(require("./src/routes/live"));
const User_1 = __importDefault(require("./src/routes/User"));
const cors_1 = __importDefault(require("cors"));
const role_1 = __importDefault(require("./src/routes/role"));
const entity_1 = __importDefault(require("./src/routes/entity"));
const Vendor_1 = __importDefault(require("./src/routes/Vendor"));
const Group_1 = __importDefault(require("./src/routes/Group"));
const Feature_1 = __importDefault(require("./src/routes/Feature"));
const customer_1 = __importDefault(require("./src/routes/customer"));
const GeoFence_1 = __importDefault(require("./src/routes/GeoFence"));
const GPSconsumer_1 = require("./src/kafka/consumers/GPSconsumer");
const GPSproducer_1 = require("./src/kafka/producers/GPSproducer");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const vahn_1 = __importDefault(require("./src/routes/vahn"));
const alarm_1 = __importDefault(require("./src/routes/alarm"));
const intutrack_1 = __importDefault(require("./src/routes/intutrack"));
const alert_1 = __importDefault(require("./src/routes/alert"));
// import { configDotenv } from 'dotenv';
const dotenv_1 = __importDefault(require("dotenv"));
const trail_1 = __importDefault(require("./src/routes/trail"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT;
app.use((0, cors_1.default)());
const allowedOrigins = [
    'http://localhost:3005', // Local dev
    'https://unifiedgps.mlldev.com',
];
const corsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(testing_1.default);
app.use(live_1.default);
app.use(Trip_1.default);
app.use(User_1.default);
app.use(role_1.default);
app.use(entity_1.default);
app.use(Vendor_1.default);
app.use(Group_1.default);
app.use(Feature_1.default);
app.use(customer_1.default);
app.use(GeoFence_1.default);
app.use(vahn_1.default);
app.use(alarm_1.default);
app.use(intutrack_1.default);
app.use(alert_1.default);
app.use(trail_1.default);
app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Example app listening on port ${port}`);
    try {
        console.log("Server started successfully");
        yield (0, GPSconsumer_1.GPSConsumer)();
        yield (0, GPSproducer_1.GPSProducer)();
    }
    catch (error) {
        console.error("Error starting server:", error);
    }
}));
