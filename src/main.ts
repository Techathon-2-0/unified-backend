import express from 'express'
import 'dotenv/config';
import TRIPRouter from './routes/Trip';
import testingRouter from './routes/testing';
import liveRouter from './routes/live';
import userRouter from './routes/User';
import cors from 'cors';
import RoleRouter from './routes/role';
import EntityRoute from './routes/entity';
import vendorRouter from './routes/Vendor';
import GroupRouter from './routes/Group';
import featureRouter from './routes/Feature';
import customerRouter from './routes/customer';
import GeoFenceRouter from './routes/GeoFence';
import { GPSConsumer } from './kafka/consumers/GPSconsumer';
import { GPSProducer } from './kafka/producers/GPSproducer';
import cookieParser from 'cookie-parser';
import Vahnrouter from './routes/vahn';
import alarmRouter from './routes/alarm';
import intutrackRouter from './routes/intutrack';
import alertRouter from './routes/alert';
import TrailRouter from './routes/trail';
import bodyParser from 'body-parser';
import bodyParserXml from 'body-parser-xml';
import reportRouter from './routes/report';
import alarmReportRouter from './routes/alarmReport';
import { authenticateToken } from './middleware/sso';
bodyParserXml(bodyParser);

const app = express()
const port = process.env.PORT!;
app.use(bodyParser.xml({
  limit: '1MB',   // Limit payload size
  xmlParseOptions: {
    explicitArray: false, // Prevents wrapping every value in an array
  }
}));

// app.use(cors());
const allowedOrigins = [
  'http://localhost:5173', // Local dev
  'https://unifiedgps.mlldev.com',
]

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
};

app.use(cors(corsOptions));
// app.options('*', cors(corsOptions));
app.use(cookieParser());

// app.use(cors({
//   origin: "*",
//   credentials: true,
// }));

app.use(express.json());
// app.use(cookieParser());
// Helper to wrap async middleware for error handling
function asyncHandler(fn: any) {
  return function (req: any, res: any, next: any) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}


app.use(asyncHandler(authenticateToken)); // All routes below this line will require a token
// console.log("Server started successfully");
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
app.use(TrailRouter);
app.use(reportRouter);
app.use(alarmReportRouter);


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