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
exports.GPSProducer = GPSProducer;
// producer.js
const kafkajs_1 = require("kafkajs");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
require("dotenv/config");
const kafka = new kafkajs_1.Kafka({
    clientId: 'api-producer',
    brokers: ([process.env.KAFKA_BROKERS || ""])
});
const producer = kafka.producer();
const topic = process.env.KAFKA_TOPIC || 'api-data-topic';
const apiUrl = process.env.API_URL;
function fetchAndSend() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!apiUrl) {
            throw new Error('API_URL environment variable is not defined');
        }
        try {
            const response = yield axios_1.default.get(apiUrl);
            const data = response.data.messages;
            // console.log(data);
            // If the API returns an array, send each item as a separate m essage 
            if (!data) {
                console.log('No data received from API');
                return;
            }
            yield producer.send({
                topic,
                messages: [{ value: JSON.stringify(data) || "No Data" }],
            });
            console.log(`✅ Sent data at ${new Date().toISOString()}`);
        }
        catch (err) {
            console.error('❌ Error fetching or sending:', err.message || err);
        }
    });
}
function GPSProducer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield producer.connect();
        console.log('🟢 Kafka producer connected');
        // Send data every 1 second
        setInterval(fetchAndSend, 20000);
    });
}
