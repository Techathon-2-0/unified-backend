import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { Kafka } from 'kafkajs';
import { insertGpsDataNew } from '../../controller/Gpsfetcher'; 

interface GPSMessage {
  deviceId: string;
  trailerNumber: string;
  timestamp: number;
  gpstimestamp: number;
  gprstimestamp: number;
  longitude: number;
  latitude: number;
  heading: number;
  speed: number;
  areaCode: string;
  cellId: string;
  mcc: string;
  mnc: string;
  lac: string;
  hdop: number;
  numberOfSatellites: string;
  digitalInput1: number;
  digitalInput2: number;
  digitalInput3: number;
  analogInput1: number;
  digitalOutput1: number;
  powerSupplyVoltage: number;
  internalBatteryVoltage: number;
  internalBatteryLevel: string;
  power: number;
  gsmlevel: number;
  accelerometerX: number;
  accelerometerY: number;
  accelerometerZ: number;
  maxAccelX: number;
  maxAccelY: number;
  maxAccelZ: number;
  locationSource: number;
  serviceProvider: string;
  gpsSpeed: number;
  unplugged: number;
  gpsOdometer: number;
  tilt: number;
  receiveAt: number;
  GPSVendor: string;
  [key: string]: any; // in case extra fields come
}

const kafka = new Kafka({
  clientId: 'api-producer',
  brokers: ([process.env.KAFKA_BROKERS!||""])
});
const producer = kafka.producer();
const kafkaTopic = process.env.KAFKA_TOPIC || 'api-data-topic';

export async function startListener(): Promise<void> {
  try {
    console.log("Connecting to RabbitMQ...");
    const connection = await amqp.connect("amqp://guest:guest@10.70.80.22:5672");
    console.log("Connected!");

    const channel: Channel = await connection.createChannel();
    const queue = "orderQueue";

    // Ensure queue exists
    await channel.assertQueue(queue, { durable: true });

    // Prefetch 50 messages at a time
    channel.prefetch(50);

    console.log("Listening to queue:", queue);

    channel.consume(queue, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const data: GPSMessage = JSON.parse(msg.content.toString());
        console.log("Received GPS message:", JSON.stringify(data, null, 2));
        // Simulate processing
        await processMessage(data);
        // ✔ Acknowledge after success
        channel.ack(msg);
      } catch (err) {
        console.error("Error processing message:", err);

        // Requeue failed messages or send to DLQ
        // channel.nack(msg, false, true); // requeue
        channel.nack(msg, false, false); // discard
      }
    });
  } catch (err) {
    console.error("RabbitMQ Listener Error:", err);
  }
}

// Simulated processing function (replace with your DB/API logic)
async function processMessage(data: GPSMessage): Promise<void> {
  try {
    await insertGpsDataNew(data);
    // Push message to Kafka
   /* await producer.send({
      topic: kafkaTopic,
      messages: [
        { value: JSON.stringify(data) },
      ],
    });
    // console.log(`Pushed trailer ${data.trailerNumber} to Kafka topic ${kafkaTopic}`);*/
  } catch (err) {
    console.error('Error sending to Kafka:', err);
  }
}

