import express, { Request, Response } from 'express';

import { TripGpsStatusReportController } from '../controller/TripGpsStatusReport_Controller';
import { handleDashboardReport , handleAllPositionsReport } from '../controller/report_controller';
import { getTripsByCustomerGroups } from '../controller/TripController';

const reportRouter = express.Router();



reportRouter.post('/report/dashboard', handleDashboardReport);
reportRouter.post('/report/all-positions', handleAllPositionsReport);

const tripGpsStatusReportController = new TripGpsStatusReportController();
// Bind the method to preserve 'this'
reportRouter.post('/report/trip-gps-status', tripGpsStatusReportController.getTripGpsStatusReport.bind(tripGpsStatusReportController));


reportRouter.post('/report/trip-summary', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract from body instead of query
    const { 
      customer_group_ids, 
      start_date, 
      end_date, 
      trip_status = 'all' 
    } = req.body;

    // Validate required parameters
    if (!customer_group_ids) {
      res.status(400).json({
        success: false,
        message: 'Customer group IDs are required'
      });
      return;
    }

    if (!start_date || !end_date) {
      res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
      return;
    }

    // Parse customer group IDs
    let customerGroupIds: number[];
    try {
      if (Array.isArray(customer_group_ids)) {
        customerGroupIds = customer_group_ids.map(id => parseInt(String(id)));
      } else if (typeof customer_group_ids === 'string') {
        customerGroupIds = customer_group_ids.split(',').map(id => parseInt(id.trim()));
      } else {
        throw new Error('Invalid customer_group_ids format');
      }
      // Validate all IDs are valid numbers
      if (customerGroupIds.some(id => isNaN(id))) {
        throw new Error('All customer group IDs must be valid numbers');
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Invalid customer group IDs format. Provide array of numbers or comma-separated string.'
      });
      return;
    }

    // Parse and validate dates (accept ISO strings with time)
    let startDate: Date;
    let endDate: Date;
    try {
      // Parse directly as UTC (assume input is ISO 8601 or with 'Z')
      startDate = new Date(String(start_date));
      endDate = new Date(String(end_date));

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }

      if (startDate > endDate) {
        throw new Error('Start date must be before end date');
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO format (e.g., 2025-06-01T00:00:00Z).'
      });
      return;
    }

    // Validate trip status
    const validStatuses = ['active', 'inactive', 'all'];
    if (!validStatuses.includes(String(trip_status))) {
      res.status(400).json({
        success: false,
        message: 'Invalid trip status. Must be one of: active, inactive, all'
      });
      return;
    }

    // Call the function
    let trips = await getTripsByCustomerGroups(
      customerGroupIds,
      startDate,
      endDate,
      trip_status as 'active' | 'inactive' | 'all'
    );

    // Filter trips whose start time is within the start and end date range (inclusive)
    trips = trips.filter((trip: any) => {
      if (!trip.start_time) return false;
      const tripStart = new Date(trip.start_time);
      return tripStart >= startDate && tripStart <= endDate;
    });

    res.status(200).json({
      success: true,
      message: 'Trips fetched successfully',
      data: {
        trips,
        total_count: trips.length,
        filters: {
          customer_group_ids: customerGroupIds,
          start_date,
          end_date,
          trip_status
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in customer groups trips route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching trips',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


export default reportRouter;

/**
 * Example request body for POST /report/trip-summary:
 * {
 *   "customer_group_ids": [1, 2, 3],
 *   "start_date": "2025-06-01T00:00:00Z",
 *   "end_date": "2025-06-30T23:59:59Z",
 *   "trip_status": "active" // or "inactive" or "all"
 * }
 *
 * Example response:
 * {
 *   "success": true,
 *   "message": "Trips fetched successfully",
 *   "data": {
 *     "trips": [ ... ],
 *     "total_count": 10,
 *     "filters": {
 *       "customer_group_ids": [1,2,3],
 *       "start_date": "2025-06-01T00:00:00Z",
 *       "end_date": "2025-06-30T23:59:59Z",
 *       "trip_status": "active"
 *     }
 *   }
 * }
 */