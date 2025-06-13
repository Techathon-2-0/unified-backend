import express from 'express'
import 'dotenv/config';
import TRIPRouter from './src/routes/Trip';
import testingRouter from './src/routes/testing';
import liveRouter from './src/routes/live';
import userRouter from './src/routes/User';
import cors from 'cors';
import RoleRouter from './src/routes/role';
import EntityRoute from './src/routes/entity';
import vendorRouter from './src/routes/Vendor';
import GroupRouter from './src/routes/Group';
import featureRouter from './src/routes/Feature';
import customerRouter from './src/routes/customer';
import GeoFenceRouter from './src/routes/GeoFence';
import { GPSConsumer } from './src/kafka/consumers/GPSconsumer';
import { GPSProducer } from './src/kafka/producers/GPSproducer';
import cookieParser from 'cookie-parser';
import Vahnrouter from './src/routes/vahn';
import alarmRouter from './src/routes/alarm';
import intutrackRouter from './src/routes/intutrack';
import alertRouter from './src/routes/alert';

const app = express()
const port = process.env.PORT!;

app.use(cors());

app.use(express.json());
app.use(cookieParser());
app.use(testingRouter);
app.use(liveRouter);
app.use(TRIPRouter);
app.use(userRouter);
app.use(RoleRouter);
app.use(EntityRoute);
app.use(vendorRouter);
app.use(GroupRouter);
app.use(featureRouter);
app.use(customerRouter);
app.use(GeoFenceRouter);
app.use(Vahnrouter)
app.use(alarmRouter);
app.use(intutrackRouter)
app.use(alertRouter);

app.listen(port,async () => {
  console.log(`Example app listening on port ${port}`)
  try {
    console.log("Server started successfully");
    await GPSConsumer();
    await GPSProducer();
  }
  catch (error) {
    console.error("Error starting server:", error);
  }
})
