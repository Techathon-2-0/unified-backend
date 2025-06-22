import express, { Request, Response } from 'express';

import { TripGpsStatusReportController } from '../controller/TripGpsStatusReport_Controller';
import { handleDashboardReport , handleAllPositionsReport } from '../controller/report_controller';
import { getTripsByCustomerGroups } from '../controller/TripController';

const reportRouter = express.Router();



reportRouter.post('/report/dashboard', handleDashboardReport);
reportRouter.post('/report/all-positions', handleAllPositionsReport);

const tripGpsStatusReportController = new TripGpsStatusReportController();
reportRouter.post('/report/trip-gps-status', tripGpsStatusReportController.getTripGpsStatusReport);


reportRouter.get('/report/trip-summary', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract query parameters
    const { 
      customer_group_ids, 
      start_date, 
      end_date, 
      trip_status = 'all' 
    } = req.query;

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
      if (typeof customer_group_ids === 'string') {
        customerGroupIds = customer_group_ids.split(',').map(id => parseInt(id.trim()));
      } else if (Array.isArray(customer_group_ids)) {
        customerGroupIds = customer_group_ids.map(id => parseInt(String(id)));
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
        message: 'Invalid customer group IDs format. Provide comma-separated numbers or array of numbers.'
      });
      return;
    }

    // Parse and validate dates
    let startDate: Date;
    let endDate: Date;
    try {
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
        message: 'Invalid date format. Use YYYY-MM-DD format.'
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
    const trips = await getTripsByCustomerGroups(
      customerGroupIds,
      startDate,
      endDate,
      trip_status as 'active' | 'inactive' | 'all'
    );

    res.status(200).json({
      success: true,
      message: 'Trips fetched successfully',
      data: {
        trips,
        total_count: trips.length,
        filters: {
          customer_group_ids: customerGroupIds,
          start_date: start_date,
          end_date: end_date,
          trip_status: trip_status
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