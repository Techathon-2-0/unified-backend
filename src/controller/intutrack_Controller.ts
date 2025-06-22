import { Request, Response } from 'express';
import { intutrack_relation, shipment, equipment } from '../db/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(process.env.DATABASE_URL!);

export const getIndianTime = () => {
  const now = new Date();
  const indianTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Add 5 hours 30 minutes
  return indianTime;
};

export const refreshConsentStatus = async (req: Request, res: Response) => {
  try {
    const shipmentId = req.query.shipment_id as string;

    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        message: 'Shipment ID is required'
      });
    }

    // Get driver mobile number from shipment
    const shipmentData = await db
      .select({
        driver_mobile_no: equipment.driver_mobile_no,
        shipment_id: shipment.id
      })
      .from(shipment)
      .leftJoin(equipment, eq(equipment.shipment_id, shipment.id))
      .where(eq(shipment.shipment_id, shipmentId))
      .limit(1);

    if (!shipmentData.length || !shipmentData[0].driver_mobile_no) {
      return res.status(404).json({
        success: false,
        message: 'Driver mobile number not found for this shipment'
      });
    }

    const driverMobile = shipmentData[0].driver_mobile_no;

    // Call Intutrack API
    const intutrackResponse = await fetch(
      `${process.env.INTUTRACK_API_URL}/consents?tel=${driverMobile}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${process.env.INTUTRACK_BASE_AUTH}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!intutrackResponse.ok) {
      return res.status(intutrackResponse.status).json({
        success: false,
        message: 'Failed to fetch consent status from Intutrack API'
      });
    }

    const apiData = await intutrackResponse.json();

    if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No consent data found'
      });
    }

    const consentData = apiData[0].result;

    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(intutrack_relation)
      .where(eq(intutrack_relation.phone_number, driverMobile))
      .limit(1);

    if (existingRecord.length > 0) {
      // Update existing record
      await db
        .update(intutrack_relation)
        .set({
          current_consent: consentData.current_consent || 'N',
          consent: consentData.consent || 'N',
          operator: consentData.operator || '',
          updated_at: getIndianTime() // update timestamp
        })
        .where(eq(intutrack_relation.phone_number, driverMobile));
    } else {
      // Insert new record
      await db.insert(intutrack_relation).values({
        phone_number: driverMobile,
        current_consent: consentData.current_consent,
        consent: consentData.consent,
        operator: consentData.operator
      });
    }

    // Fetch the latest record to get updated_at
    const latestRecord = await db
      .select()
      .from(intutrack_relation)
      .where(eq(intutrack_relation.phone_number, driverMobile))
      .limit(1);

    const latest = latestRecord[0];

    // Return response to frontend with updated_at
    return res.status(200).json({
      success: true,
      data: {
        phone_number: consentData.number,
        current_consent: consentData.current_consent,
        consent: consentData.consent,
        operator: consentData.operator,
        consent_suggestion: consentData.consent_suggestion,
        message: consentData.message,
        updated_at: latest?.updated_at // <-- return updated_at (last consent hit)
      }
    });

  } catch (error) {
    console.error('Error in refreshConsentStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getConsentStatus = async (req: Request, res: Response) => {
  try {
    const shipmentId = req.query.shipment_id as string;

    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        message: 'Shipment ID is required'
      });
    }

    // Get driver mobile number from shipment
    const shipmentData = await db
      .select({
        driver_mobile_no: equipment.driver_mobile_no
      })
      .from(shipment)
      .leftJoin(equipment, eq(equipment.shipment_id, shipment.id))
      .where(eq(shipment.shipment_id, shipmentId))
      .limit(1);

    if (!shipmentData.length || !shipmentData[0].driver_mobile_no) {
      return res.status(404).json({
        success: false,
        message: 'Driver mobile number not found for this shipment'
      });
    }

    const driverMobile = shipmentData[0].driver_mobile_no;

    // Fetch from database
    const consentData = await db
      .select()
      .from(intutrack_relation)
      .where(eq(intutrack_relation.phone_number, driverMobile))
      .limit(1);

    if (!consentData.length) {
      return res.status(404).json({
        success: false,
        message: 'No consent data found. Please refresh to fetch latest data.'
      });
    }

    // Return response to frontend with updated_at
    return res.status(200).json({
      success: true,
      data: {
        ...consentData[0],
        updated_at: consentData[0].updated_at // <-- return updated_at
      }
    });

  } catch (error) {
    console.error('Error in getConsentStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};