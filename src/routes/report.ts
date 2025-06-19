import express from 'express';
import { handleDashboardReport , handleAllPositionsReport } from '../controller/report_controller';
const reportRouter = express.Router();

reportRouter.post('/report/dashboard', handleDashboardReport);
reportRouter.post('/report/all-positions', handleAllPositionsReport);

export default reportRouter;