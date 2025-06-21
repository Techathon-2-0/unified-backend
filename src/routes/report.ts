import express from 'express';
import { handleDashboardReport , handleAllPositionsReport } from '../controller/report_controller';
const reportRouter = express.Router();



reportRouter.post('/report/dashboard', handleDashboardReport);
reportRouter.post('/report/all-positions', handleAllPositionsReport);


import { TripGpsStatusReportController } from '../controller/TripGpsStatusReport_Controller';
const tripGpsStatusReportController = new TripGpsStatusReportController();
reportRouter.post('/report/trip-gps-status', tripGpsStatusReportController.getTripGpsStatusReport);


export default reportRouter;