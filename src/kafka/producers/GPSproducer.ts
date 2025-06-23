// producer.js
import { Kafka } from 'kafkajs';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

import 'dotenv/config'; 
const kafka = new Kafka({
  clientId: 'api-producer',
  brokers: ([process.env.KAFKA_BROKERS!||""])
});
const producer = kafka.producer();
const topic = process.env.KAFKA_TOPIC || 'api-data-topic';
const apiUrl = process.env.API_URL!;

async function fetchAndSend() {
  if (!apiUrl) {
    throw new Error('API_URL environment variable is not defined');
  }
  try {
    const response = await axios.get(apiUrl);
    const data = response.data;
    // console.log(data);
    // If the API returns an array, send each item as a separate m essage 
    if(!data){
      console.log('No data received from API');
      return;
    }
     await producer.send({
        topic,
        messages: [{ value: JSON.stringify(data) || "No Data" }],
      });

    console.log(`✅ Sent data at ${new Date().toISOString()}`);
  } catch (err: any) {
    console.error('❌ Error fetching or sending:', err.message || err);
  }
}

export async function GPSProducer() {
  await producer.connect();
  console.log('🟢 Kafka producer connected');

  // Send data every 1 second
  setInterval(fetchAndSend, 20000);
}
