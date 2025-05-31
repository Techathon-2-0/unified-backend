import express from 'express'
import 'dotenv/config';
import TRIPRouter from './src/routes/Trip';
import testingRouter from './src/routes/testing';
import liveRouter from './src/routes/live';
// import cors from 'cors';
import userRouter from './src/routes/User';
import cors from 'cors';
import RoleRouter from './src/routes/role';
import EntityRoute from './src/routes/entity';
import vendorRouter from './src/routes/Vendor';
import GroupRouter from './src/routes/Group';
import featureRouter from './src/routes/Feature';
const app = express()
const port = 3000

app.use(cors());

app.use(express.json());
app.use(testingRouter);
app.use(liveRouter);
app.use(TRIPRouter);
app.use(userRouter);
app.use(RoleRouter);
app.use(EntityRoute);
app.use(vendorRouter);
app.use(GroupRouter);
app.use(featureRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
