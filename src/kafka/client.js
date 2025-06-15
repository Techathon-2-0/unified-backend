const { Kafka } = require("kafkajs");
import dotenv from "dotenv";
dotenv.config();
exports.kafka = new Kafka({
  clientId: "my-app",
  brokers: process.env.KAFKA_BROKERS,
});