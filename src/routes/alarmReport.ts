import express, { Request, Response, NextFunction } from 'express';
import { getAlarmReport } from '../controller/alarm_report_Controller';
import { alarm } from '../db/schema';

const alarmReportRouter = express.Router();

// alarmReportRouter.post('/alarm-report', (req: Request, res: Response, next: NextFunction) => {
// 	getAlarmReport(req, res).catch(next);
// });

alarmReportRouter.post('/alarm-report', async (req: Request, res: Response) => {
    try {
        const alarmReport = await getAlarmReport(req, res);
        res.json(alarmReport);
        } catch (error) {
        console.error('Error generating alarm report:', error);
        res.status(500).json({ error: 'Failed to generate alarm report' });
    }
});

export default alarmReportRouter;