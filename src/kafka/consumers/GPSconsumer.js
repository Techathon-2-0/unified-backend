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
exports.GPSConsumer = GPSConsumer;
// consumer.js
const kafkajs_1 = require("kafkajs");
const mysql2_1 = require("drizzle-orm/mysql2");
require("dotenv/config");
const Gpsfetcher_1 = require("../../controller/Gpsfetcher"); // adjust path if needed
const alertProcessor_1 = require("../../Alerts_types/alertProcessor"); // Import alert processor
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
const kafka = new kafkajs_1.Kafka({
    clientId: 'api-consumer',
    brokers: ([process.env.KAFKA_BROKERS || ""])
});
const consumer = kafka.consumer({ groupId: 'api-group' });
const topic = process.env.KAFKA_TOPIC;
function GPSConsumer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield consumer.connect();
        yield consumer.subscribe({ topic, fromBeginning: true });
        yield consumer.run({
            eachMessage: (_a) => __awaiter(this, [_a], void 0, function* ({ message }) {
                var _b;
                try {
                    if (((_b = message.value) === null || _b === void 0 ? void 0 : _b.toString()) === " ") {
                        console.log('No data received from API');
                        return;
                    }
                    // Parse GPS data
                    const data = JSON.parse(message.value.toString());
                    // Insert GPS data first
                    yield (0, Gpsfetcher_1.insertGpsData)(data);
                    // After successful GPS data insertion, process all alerts
                    console.log('📡 GPS data inserted, now processing alerts...');
                    yield (0, alertProcessor_1.processAllAlerts)();
                }
                catch (err) {
                    console.error('❌ JSON parse error or DB error:', err);
                    // Even if alert processing fails, we don't want to stop GPS processing
                }
            }),
        });
    });
}
