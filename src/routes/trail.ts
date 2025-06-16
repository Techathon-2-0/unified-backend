import { Router, Request, Response, NextFunction } from 'express';
import { getVehicleTrail,getTripTrail } from '../controller/TrailController';
// import { getTripTrail } from '../controller/TripController';
const TrailRouter: Router = Router();

// Middleware to validate startTime and endTime
function validateTimeRange(req: Request, res: Response, next: NextFunction) {
  const { startTime, endTime } = req.query;

  if (!startTime || !endTime) {
    res.status(400).json({
      success: false,
      message: 'Start time and end time are required',
    });
    return;
  }

  next();
}

// Vehicle Trail Route
TrailRouter.get(
  '/trail/vehicle/:vehicleNumber',
  validateTimeRange,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleNumber } = req.params;
      const { startTime, endTime }  = req.query;
    //   console.log(vehicleNumber);
    // const startTime ="2023-10-01T00:00:00Z"; // Example start time
    // const endTime = "2025-10-31T23:59:59Z"; // Example end time
      const trailData = await getVehicleTrail(
        vehicleNumber,
        startTime as string,
        endTime as string
      );

      if (!trailData) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found',
        });
        return;
      }

      res.json({
        success: true,
        data: trailData,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Trip Trail Route
TrailRouter.get(
  '/trail/trip/:shipmentId',
  (req: Request, res: Response, next: NextFunction) => {
    (async () => {
      try {
        const { shipmentId } = req.params;
        if (!shipmentId) {
          return res.status(400).json({ error: 'shipmentId is required' });
        }

        const data = await getTripTrail(shipmentId);
        res.json(data);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal server error' });
      }
    })();
  }
);

export default TrailRouter;