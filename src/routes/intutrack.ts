import express from 'express';
import { refreshConsentStatus , getConsentStatus } from '../controller/intutrack_Controller';
import { int } from 'drizzle-orm/singlestore-core';
import { saveIntutrackDetails } from '../controller/TripController';

const intutrackRouter = express.Router();

// Route to refresh consent status
intutrackRouter.get('/intutrack/refresh', async (req, res) => {
  try {
    const result = await refreshConsentStatus(req , res);
    res.status(200).json({
      success: true,
      message: 'Consent status refreshed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error refreshing consent status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

intutrackRouter.get('/intutrack/db', async (req, res) => {
    try {
      const result = await getConsentStatus(req, res);
      res.status(200).json({
        success: true,
        message: 'Consent status fetched successfully',
        data: result
      });
    } catch (error) {
      console.error('Error fetching consent status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
    }
);

export default intutrackRouter;
