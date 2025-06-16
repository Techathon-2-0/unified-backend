// crud for alarm management

import { Request, Response } from "express";

import {
  alarm, 
  alarm_phoneNumber, 
  alarm_email, 
  alarm_group,
  alarm_geofence_group,
  alarm_customer_group
} from "../db/schema";
import { eq, and, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

const db = drizzle(process.env.DATABASE_URL!);

// Get all alarms
export const getAllAlarms = async (req: Request, res: Response) => {
  try {
    const alarms = await db.select().from(alarm);
    return res.status(200).json({ success: true, data: alarms });
  } catch (error) {
    console.error("Error fetching alarms:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch alarms", error });
  }
};

// Get alarm by ID
export const getAlarmById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alarmData = await db.select().from(alarm).where(eq(alarm.id, parseInt(id)));
    
    if (alarmData.length === 0) {
      return res.status(404).json({ success: false, message: "Alarm not found" });
    }

    // Get related phone numbers
    const phoneNumbers = await db.select().from(alarm_phoneNumber).where(eq(alarm_phoneNumber.alarm_id, parseInt(id)));
    
    // Get related emails
    const emails = await db.select().from(alarm_email).where(eq(alarm_email.alarm_id, parseInt(id)));
    
    // Get related vehicle groups
    const vehicleGroups = await db.select().from(alarm_group).where(eq(alarm_group.alarm_id, parseInt(id)));
    
    // Get related geofence groups
    const geofenceGroups = await db.select().from(alarm_geofence_group)
      .where(eq(alarm_geofence_group.alarm_id, parseInt(id)));
    
    // Get related customer groups
    const customerGroups = await db.select().from(alarm_customer_group)
      .where(eq(alarm_customer_group.alarm_id, parseInt(id)));
    
    return res.status(200).json({ 
      success: true, 
      data: {
        ...alarmData[0],
        phoneNumbers,
        emails,
        vehicleGroups,
        geofenceGroups,
        customerGroups
      }
    });
  } catch (error) {
    console.error("Error fetching alarm:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch alarm", error });
  }
};

// Create new alarm
export const createAlarm = async (req: Request, res: Response) => {
  try {
    const {
      alarm_type_id,
      alarm_category,
      alarm_value,
      alarm_status,
      rest_duration,
      geofence_status,
      alarm_generation,
      active_start_time_range,
      active_end_time_range,
      active_trip,
      descrption,
      phoneNumbers,
      emails,
      vehicleGroups,
      geofenceGroups,
      customerGroups
    } = req.body;

    // Validate required fields

    if (!alarm_type_id || !alarm_category) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: alarm_type_id and alarm_category are required" 
      });
    }

    // Insert alarm
    const result = await db.insert(alarm).values({
      alarm_type_id,
      alarm_category,
      alarm_value,
      alarm_status, 
      rest_duration,
      geofence_status,
      alarm_generation,
      active_start_time_range,
      active_end_time_range,
      active_trip,
      descrption
    }).$returningId();

    const newAlarmId = result[0].id;

    // Insert related phone numbers if provided
    if (phoneNumbers && Array.isArray(phoneNumbers)) {
      for (const phoneNumber of phoneNumbers) {
        await db.insert(alarm_phoneNumber).values({
          phone_number: phoneNumber,
          alarm_id: newAlarmId
        });
      }
    }

    // Insert related emails if provided
    if (emails && Array.isArray(emails)) {
      for (const email of emails) {
        await db.insert(alarm_email).values({
          email_address: email,
          alarm_id: newAlarmId
        });
      }
    }

    // Insert related vehicle groups if provided
    if (vehicleGroups && Array.isArray(vehicleGroups)) {
      for (const groupId of vehicleGroups) {
        await db.insert(alarm_group).values({
          alarm_id: newAlarmId,
          vehicle_group_id: groupId
        });
      }
    }

    // Insert related geofence groups if provided
    if (geofenceGroups && Array.isArray(geofenceGroups)) {
      for (const groupId of geofenceGroups) {
        await db.insert(alarm_geofence_group).values({
          alarm_id: newAlarmId,
          geofence_group_id: groupId
        });
      }
    }

    // Insert related customer groups if provided
    if (customerGroups && Array.isArray(customerGroups)) {
      for (const groupId of customerGroups) {
        await db.insert(alarm_customer_group).values({
          alarm_id: newAlarmId,
          customer_group_id: groupId
        });
      }
    }

    return res.status(201).json({ 
      success: true, 
      message: "Alarm created successfully", 
      data: { id: newAlarmId } 
    });
  } catch (error) {
    console.error("Error creating alarm:", error);
    return res.status(500).json({ success: false, message: "Failed to create alarm", error });
  }
};

// Update alarm by ID
export const updateAlarm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      alarm_type_id,
      alarm_category,
      alarm_value,
      alarm_status,
      rest_duration,
      geofence_status,
      alarm_generation,
      active_start_time_range,
      active_end_time_range,
      active_trip,
      descrption,
      phoneNumbers,
      emails,
      vehicleGroups,
      geofenceGroups,
      customerGroups
    } = req.body;

    // Check if alarm exists
    const existingAlarm = await db.select().from(alarm).where(eq(alarm.id, parseInt(id)));
    if (existingAlarm.length === 0) {
      return res.status(404).json({ success: false, message: "Alarm not found" });
    }

    // Get current Indian time
    const getIndianTime = () => {
      const now = new Date();
      const indianTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Add 5 hours 30 minutes
      return indianTime;
    };

    // Update alarm
    await db.update(alarm)
      .set({
        alarm_type_id,
        alarm_category,
        alarm_value,
        alarm_status,
        rest_duration,
        geofence_status,
        alarm_generation,
        active_start_time_range,
        active_end_time_range,
        active_trip,
        descrption,
        updated_at: getIndianTime()
      })
      .where(eq(alarm.id, parseInt(id)));

    // Update phone numbers if provided
    if (phoneNumbers && Array.isArray(phoneNumbers)) {
      // Remove existing phone numbers
      await db.delete(alarm_phoneNumber).where(eq(alarm_phoneNumber.alarm_id, parseInt(id)));
      
      // Add new phone numbers
      for (const phoneNumber of phoneNumbers) {
        await db.insert(alarm_phoneNumber).values({
          phone_number: phoneNumber,
          alarm_id: parseInt(id)
        });
      }
      
      // Update main alarm's updated_at since related data changed
      await db.update(alarm)
        .set({ updated_at: getIndianTime() })
        .where(eq(alarm.id, parseInt(id)));
    }

    // Update emails if provided
    if (emails && Array.isArray(emails)) {
      // Remove existing emails
      await db.delete(alarm_email).where(eq(alarm_email.alarm_id, parseInt(id)));
      
      // Add new emails
      for (const email of emails) {
        await db.insert(alarm_email).values({
          email_address: email,
          alarm_id: parseInt(id)
        });
      }
      
      // Update main alarm's updated_at since related data changed
      await db.update(alarm)
        .set({ updated_at: getIndianTime() })
        .where(eq(alarm.id, parseInt(id)));
    }

    // Update vehicle groups if provided
    if (vehicleGroups && Array.isArray(vehicleGroups)) {
      // Remove existing vehicle groups
      await db.delete(alarm_group).where(eq(alarm_group.alarm_id, parseInt(id)));
      
      // Add new vehicle groups
      for (const groupId of vehicleGroups) {
        await db.insert(alarm_group).values({
          alarm_id: parseInt(id),
          vehicle_group_id: groupId
        });
      }
      
      // Update main alarm's updated_at since related data changed
      await db.update(alarm)
        .set({ updated_at: getIndianTime() })
        .where(eq(alarm.id, parseInt(id)));
    }

    // Update geofence groups if provided
    if (geofenceGroups && Array.isArray(geofenceGroups)) {
      // Remove existing geofence groups
      await db.delete(alarm_geofence_group)
        .where(eq(alarm_geofence_group.alarm_id, parseInt(id)));
      
      // Add new geofence groups
      for (const groupId of geofenceGroups) {
        await db.insert(alarm_geofence_group).values({
          alarm_id: parseInt(id),
          geofence_group_id: groupId
        });
      }
      
      // Update main alarm's updated_at since related data changed
      await db.update(alarm)
        .set({ updated_at: getIndianTime() })
        .where(eq(alarm.id, parseInt(id)));
    }

    // Update customer groups if provided
    if (customerGroups && Array.isArray(customerGroups)) {
      // Remove existing customer groups
      await db.delete(alarm_customer_group)
        .where(eq(alarm_customer_group.alarm_id, parseInt(id)));
      
      // Add new customer groups
      for (const groupId of customerGroups) {
        await db.insert(alarm_customer_group).values({
          alarm_id: parseInt(id),
          customer_group_id: groupId
        });
      }
      
      // Update main alarm's updated_at since related data changed
      await db.update(alarm)
        .set({ updated_at: getIndianTime() })
        .where(eq(alarm.id, parseInt(id)));
    }

    return res.status(200).json({ 
      success: true, 
      message: "Alarm updated successfully" 
    });
  } catch (error) {
    console.error("Error updating alarm:", error);
    return res.status(500).json({ success: false, message: "Failed to update alarm", error });
  }
};

// Delete alarm by ID
export const deleteAlarm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if alarm exists
    const existingAlarm = await db.select().from(alarm).where(eq(alarm.id, parseInt(id)));
    if (existingAlarm.length === 0) {
      return res.status(404).json({ success: false, message: "Alarm not found" });
    }

    // Delete related records first to maintain referential integrity
    await db.delete(alarm_phoneNumber).where(eq(alarm_phoneNumber.alarm_id, parseInt(id)));
    await db.delete(alarm_email).where(eq(alarm_email.alarm_id, parseInt(id)));
    await db.delete(alarm_group).where(eq(alarm_group.alarm_id, parseInt(id)));
    await db.delete(alarm_geofence_group).where(eq(alarm_geofence_group.alarm_id, parseInt(id)));
    await db.delete(alarm_customer_group).where(eq(alarm_customer_group.alarm_id, parseInt(id)));

    // Delete the alarm
    await db.delete(alarm).where(eq(alarm.id, parseInt(id)));

    return res.status(200).json({ 
      success: true, 
      message: "Alarm and related data deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting alarm:", error);
    return res.status(500).json({ success: false, message: "Failed to delete alarm", error });
  }
};

// Search alarms by criteria
export const searchAlarms = async (req: Request, res: Response) => {
  try {
    const { alarm_category, alarm_type_id, active_trip } = req.query;
    
    const conditions = [];
    
    if (alarm_category) {
      conditions.push(eq(alarm.alarm_category, alarm_category as string));
    }
    
    if (alarm_type_id) {
      conditions.push(eq(alarm.alarm_type_id, parseInt(alarm_type_id as string)));
    }
    
    if (active_trip !== undefined) {
      conditions.push(eq(alarm.active_trip, active_trip === 'true'));
    }
    
    let alarms;
    if (conditions.length > 0) {
      alarms = await db.select().from(alarm).where(and(...conditions));
    } else {
      alarms = await db.select().from(alarm);
    }
    
    return res.status(200).json({
      success: true,
      count: alarms.length,
      data: alarms
    });


} catch (error) {
    console.error("Error searching alarms:", error);
    return res.status(500).json({ success: false, message: "Failed to search alarms", error });
  }
};