// normal get all alerts , alert by user_id (i.e which geofence group access, vehicle group access , cusotmer group access)
// by default all if some feilds have not selected , if two feilds are selected intersection 

// harr trip pr pop up harr alert ka count total alert active , manul , currect status 

// controleer for toggle status


import { Request, Response } from "express";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, gt, lt, lte, gte, inArray, isNull, not, sql } from "drizzle-orm";
import { 
  alert, 
  alarm, alarm_geofence_group ,
  entity, 
  gps_schema, 
  alarm_alert, 
  alarm_group, 
  group_entity,
  user_group,
  user_geofence_group,
  geofence_group_relation,
  geofence_table,
  stop,
  equipment,
  user_customer_group,
  customer_group_relation,
  customer_lr_detail,
  shipment,
  usersTable,
  alert_shipment_relation
} from "../db/schema";

const db = drizzle(process.env.DATABASE_URL!);

// Utility: Calculate time difference in minutes
function getMinutesDifference(timestamp1: number, timestamp2: number): number {
  return Math.abs(timestamp1 - timestamp2) / 60;
}

// Utility: Calculate distance between two GPS coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // in meters
}

// Check if a point is inside a geofence circle
function isPointInGeofenceCircle(
  pointLat: number, 
  pointLng: number,
  geofenceLat: number,
  geofenceLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(pointLat, pointLng, geofenceLat, geofenceLng);
  return distance <= radiusMeters;
}

export const getAllAlerts = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      vehicleNumber, 
      alarmType, 
      startDate, 
      endDate,
      limit = 50,
      offset = 0
    } = req.query;
    
    const conditions = [];
    
    // Filter by status
    if (status !== undefined) {
      conditions.push(eq(alert.status, parseInt(status as string)));
    }
    
    // Filter by date range
    if (startDate && endDate) {
      conditions.push(
        and(
          gte(alert.created_at, new Date(startDate as string)),
          lte(alert.created_at, new Date(endDate as string))
        )
      );
    }
    
    let alerts;
    let total = 0;
    
    // Join with alarm and entity to get vehicle info
    if (conditions.length > 0) {
      // Get total count
      const countResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(alert)
        .where(and(...conditions));
      
      total = Number(countResult[0].count);
      
      // Get paginated results
      alerts = await db
        .select({
          id: alert.id,
          status: alert.status,
          alarmId: alert.alert_type,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at
        })
        .from(alert)
        .where(and(...conditions))
        .limit(Number(limit))
        .offset(Number(offset));
    } else {
      // Get total count without filters
      const countResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(alert);
      
      total = Number(countResult[0].count);
      
      // Get paginated results without filters
      alerts = await db
        .select({
          id: alert.id,
          status: alert.status,
          alarmId: alert.alert_type,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at
        })
        .from(alert)
        .limit(Number(limit))
        .offset(Number(offset));
    }
    
    // Enhance alerts with additional information
    const enhancedAlerts = await Promise.all(alerts.map(async (alertItem) => {
      // Get alarm details
      let alarmDetails: any[] = [];
      if (alertItem.alarmId !== null && alertItem.alarmId !== undefined) {
        alarmDetails = await db
          .select()
          .from(alarm)
          .where(eq(alarm.id, alertItem.alarmId))
          .limit(1);
      }
      
      // Find related entity/vehicle
      const alertEntity = await db
        .select({
          vehicleId: entity.id,
          vehicleNumber: entity.vehicleNumber
        })
        .from(alarm_alert)
        .innerJoin(alarm_group, eq(alarm_alert.alarm_id, alarm_group.alarm_id))
        .innerJoin(group_entity, eq(alarm_group.vehicle_group_id, group_entity.group_id))
        .innerJoin(entity, eq(group_entity.entity_id, entity.id))
        .where(eq(alarm_alert.alert_id, alertItem.id))
        .limit(1);
      
      return {
        ...alertItem,
        alarmDetails: alarmDetails[0] || null,
        vehicleInfo: alertEntity[0] || null
      };
    }));
    
    return res.status(200).json({
      success: true,
      total,
      count: enhancedAlerts.length,
      data: enhancedAlerts
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch alerts", 
      error 
    });
  }
};

export const getAlertsByUserAccess = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    console.log("Fetching alerts for user ID:", userId);
    
    // Get vehicle groups the user has access to
    const userVehicleGroups = await db
      .select({
        groupId: user_group.vehicle_group_id
      })
      .from(user_group)
      .where(eq(user_group.user_id, parseInt(userId)));
    
    const vehicleGroupIds = userVehicleGroups.map(g => g.groupId);
    
    // Get geofence groups the user has access to
    const userGeofenceGroups = await db
      .select({
        groupId: user_geofence_group.geofence_group_id
      })
      .from(user_geofence_group)
      .where(eq(user_geofence_group.user_id, parseInt(userId)));
    
    const geofenceGroupIds = userGeofenceGroups.map(g => g.groupId);
    
    // Get customer groups the user has access to
    const userCustomerGroups = await db
      .select({
        groupId: user_customer_group.customer_group_id
      })
      .from(user_customer_group)
      .where(eq(user_customer_group.user_id, parseInt(userId)));
    
    const customerGroupIds = userCustomerGroups.map(g => g.groupId);
    
    // Find all entities (vehicles) related to user's vehicle groups
    const userEntities = await db
      .select({
        entityId: group_entity.entity_id,
        vehicleNumber: entity.vehicleNumber
      })
      .from(group_entity)
      .innerJoin(entity, eq(group_entity.entity_id, entity.id))
      .where(inArray(group_entity.group_id, vehicleGroupIds.filter((id): id is number => id !== null)));

    const entityIds = userEntities.map(e => e.entityId);
    // Map entityId to vehicleNumber for quick lookup
    const entityIdToVehicleNumber: Record<number, string> = {};
    userEntities.forEach(e => {
      entityIdToVehicleNumber[e.entityId] = e.vehicleNumber;
    });

    // Find alerts related to these entities
    const userAlerts = await db
      .selectDistinct({
        alertId: alert.id,
        status: alert.status,
        alarmId: alert.alert_type,
        createdAt: alert.created_at,
        severity_type: alarm.alarm_category,
        vehicleNumber: entity.vehicleNumber // <-- Use vehicleNumber directly
      })
      .from(alert)
      .innerJoin(alarm_alert, eq(alert.id, alarm_alert.alert_id))
      .innerJoin(alarm_group, eq(alarm_alert.alarm_id, alarm_group.alarm_id))
      .innerJoin(group_entity, eq(alarm_group.vehicle_group_id, group_entity.group_id))
      .innerJoin(entity, eq(group_entity.entity_id, entity.id))
      .innerJoin(alarm, eq(alert.alert_type, alarm.id))
      .where(inArray(group_entity.entity_id, entityIds))
      .orderBy(sql`${alert.created_at} DESC`).limit(20);

    // No need to map entityId to vehicleNumber anymore
    // Attach vehicleNumber to each alert (already present)
    const userAlertsWithVehicle = userAlerts.map(alertItem => ({
      ...alertItem
    }));

    return res.status(200).json({
      success: true,
      count: userAlertsWithVehicle.length,
      data: userAlertsWithVehicle
    });
  } catch (error) {
    console.error("Error fetching user alerts:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch user alerts", 
      error 
    });
  }
};

export const toggleAlertStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // This is the alert ID
    const { status, shipmentId } = req.body;
    
    if (![0, 1, 2].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be 0 (inactive), 1 (active), or 2 (manually closed)"
      });
    }
    
    // Check if alert exists
    const existingAlert = await db
      .select({
        id: alert.id,
        status: alert.status,
        alert_type: alert.alert_type
      })
      .from(alert)
      .where(eq(alert.id, parseInt(id)))
      .limit(1);
    
    if (existingAlert.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }
    
    const currentAlert = existingAlert[0];
    
    // If trying to manually close (status = 2), check additional conditions
    if (status === 2) {
      // Check if current status is active (1)
      if (currentAlert.status !== 1) {
        return res.status(400).json({
          success: false,
          message: "Only active alerts can be manually closed"
        });
      }
      
      // Check if alert type is allowed for manual closure
      if (currentAlert.alert_type) {
        const alarmDetails = await db
          .select({
            alarm_type_id: alarm.alarm_type_id
          })
          .from(alarm)
          .where(eq(alarm.id, currentAlert.alert_type))
          .limit(1);
        
        if (alarmDetails.length > 0) {
          const alarmTypeId = alarmDetails[0].alarm_type_id;
          
          // Define allowed alarm types for manual closure
          // 1 = Overspeeding, 2 = Continuous driving, 3 = Route deviation, 4 = Stoppage
          const allowedAlarmTypes = [1, 2, 3, 4];
          
          if (!allowedAlarmTypes.includes(alarmTypeId)) {
            return res.status(400).json({
              success: false,
              message: "This alert type cannot be manually closed. Only Overspeeding, Continuous driving, Route deviation, and Stoppage alerts can be manually closed."
            });
          }
        }
      }
      
      // If shipmentId is provided, verify the alert belongs to that shipment
      if (shipmentId) {
        const alertShipmentRelation = await db
          .select()
          .from(alert_shipment_relation)
          .where(
            and(
              eq(alert_shipment_relation.alert_id, parseInt(id)),
              eq(alert_shipment_relation.shipment_id, shipmentId)
            )
          )
          .limit(1);
        
        if (alertShipmentRelation.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Alert does not belong to the specified shipment"
          });
        }
      }
    }
    
    // Update alert status
    await db
      .update(alert)
      .set({
        status: status,
        updated_at: new Date()
      })
      .where(eq(alert.id, parseInt(id)));
    
    // If shipmentId is provided, also update the alert_shipment_relation
    if (shipmentId && status === 2) {
      await db
        .update(alert_shipment_relation)
        .set({
          alert_method: 2, // Set to manually closed
          updated_at: new Date()
        })
        .where(
          and(
            eq(alert_shipment_relation.alert_id, parseInt(id)),
            eq(alert_shipment_relation.shipment_id, shipmentId)
          )
        );
    }
    
    return res.status(200).json({
      success: true,
      message: `Alert status updated successfully to ${status === 0 ? 'inactive' : status === 1 ? 'active' : 'manually closed'}`
    });
  } catch (error) {
    console.error("Error updating alert status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update alert status",
      error
    });
  }
};

// shipment id de or terko uske against saare alert miljaaege , count bhi dena hain , manuallly closed ke ske frontend pr 

// Get alert counts for a specific trip
export const getAlertCountsByTrip = async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;
    
    // Get all alerts for this shipment
    const alertCounts = await db
      .select({
        total: sql`COUNT(*)`,
        active: sql`SUM(CASE WHEN ${alert.status} = 1 THEN 1 ELSE 0 END)`,
        inactive: sql`SUM(CASE WHEN ${alert.status} = 0 THEN 1 ELSE 0 END)`,
        manuallyClosed: sql`SUM(CASE WHEN ${alert.status} = 2 THEN 1 ELSE 0 END)`
      })
      .from(alert)
      .innerJoin(alert_shipment_relation, eq(alert.id, alert_shipment_relation.alert_id))
      .where(eq(alert_shipment_relation.shipment_id, shipmentId));
    
    return res.status(200).json({
      success: true,
      data: alertCounts[0]
    });
  } catch (error) {
    console.error("Error fetching alert counts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch alert counts",
      error
    });
  }
};

export const getAlertsByShipment = async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;
    const { status } = req.query; // Optional filter by status
    
    // Validate shipmentId
    if (!shipmentId || shipmentId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Shipment ID is required"
      });
    }
    
    // Use shipmentId as string, don't parse to int since it can contain letters
    let conditions = [eq(alert_shipment_relation.shipment_id, shipmentId)];
    
    // Add status filter if provided
    if (status !== undefined) {
      conditions.push(eq(alert.status, parseInt(status as string)));
    }
    
    // Get alerts with their alarm details
    const alertsData = await db
      .select({
        alert_id: alert.id,
        alert_status: alert.status,
        alert_created_at: alert.created_at,
        alert_updated_at: alert.updated_at,
        alarm_id: alarm.id,
        alarm_type_id: alarm.alarm_type_id,
        alarm_category: alarm.alarm_category,
        alarm_description: alarm.descrption,
        shipment_id: alert_shipment_relation.shipment_id,
        alert_method: alert_shipment_relation.alert_method
      })
      .from(alert_shipment_relation)
      .innerJoin(alert, eq(alert_shipment_relation.alert_id, alert.id))
      .leftJoin(alarm, eq(alert.alert_type, alarm.id))
      .where(and(...conditions))
      .orderBy(alert.created_at);
    
    // Group alerts by type and add manual closure capability info
    const enhancedAlerts = alertsData.map(alertItem => {
      const alarmTypeId = alertItem.alarm_type_id;
      const canManuallyClose = alarmTypeId && [1, 2, 3, 4].includes(alarmTypeId) && alertItem.alert_status === 1;
      
      let alertTypeName = "Unknown";
      // *****************
      switch (alarmTypeId) {
        case 1: alertTypeName = "Stoppage"; break;
        case 2: alertTypeName = "Overspeeding"; break;
        case 3: alertTypeName = "Continuous Driving"; break;
        case 4: alertTypeName = "No GPS Feed"; break;
        case 5: alertTypeName = "Reached Stop"; break;
        case 6: alertTypeName = "Geofence"; break;
        case 7: alertTypeName = "Route Deviation"; break;
        default: alertTypeName = alertItem.alarm_description || "Unknown";
      }
      // *************
      
      return {
        alert_id: alertItem.alert_id,
        alert_type_name: alertTypeName,
        alert_category: alertItem.alarm_category,
        alert_description: alertItem.alarm_description,
        status: alertItem.alert_status,
        status_text: alertItem.alert_status === 0 ? 'Inactive' : 
                    alertItem.alert_status === 1 ? 'Active' : 'Manually Closed',
        can_manually_close: canManuallyClose,
        created_at: alertItem.alert_created_at,
        updated_at: alertItem.alert_updated_at
      };
    });
    
    return res.status(200).json({
      success: true,
      shipment_id: shipmentId, // Return as string
      total_alerts: enhancedAlerts.length,
      active_alerts: enhancedAlerts.filter(a => a.status === 1).length,
      manually_closed_alerts: enhancedAlerts.filter(a => a.status === 2).length,
      alerts: enhancedAlerts
    });
  } catch (error) {
    console.error("Error fetching shipment alerts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shipment alerts",
      error
    });
  }
};
// alert by geofence id and vehicle number  return me time when geofence alert was created and status of geofence alert , alert id , only return alerts i.e are created in less that 24 hours 
export const getGeofenceAlertsByVehicle = async (req: Request, res: Response) => {
  try {
    const { geofenceId, vehicleNumber } = req.params;
    
    if (!geofenceId || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: "Geofence ID and vehicle number are required"
      });
    }
    
    // Calculate 24 hours ago timestamp
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    // Find the vehicle entity
    const vehicleEntity = await db
      .select({
        id: entity.id,
        vehicleNumber: entity.vehicleNumber
      })
      .from(entity)
      .where(eq(entity.vehicleNumber, vehicleNumber))
      .limit(1);
    
    if (vehicleEntity.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }
    
    // Verify geofence exists
    const geofenceExists = await db
      .select({
        id: geofence_table.id,
        geofence_name: geofence_table.geofence_name
      })
      .from(geofence_table)
      .where(eq(geofence_table.id, parseInt(geofenceId)))
      .limit(1);
    
    if (geofenceExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Geofence not found"
      });
    }
    
    // Get geofence alerts for the specific vehicle within last 24 hours
    const geofenceAlerts = await db
      .select({
        alert_id: alert.id,
        alert_status: alert.status,
        alert_created_at: alert.created_at,
        alert_updated_at: alert.updated_at,
        alarm_id: alarm.id,
        alarm_type_id: alarm.alarm_type_id,
        alarm_category: alarm.alarm_category,
        alarm_description: alarm.descrption,
        geofence_status: alarm.geofence_status,
        geofence_name: geofence_table.geofence_name,
        vehicle_number: entity.vehicleNumber
      })
      .from(alert)
      .innerJoin(alarm, eq(alert.alert_type, alarm.id))
      .innerJoin(alarm_geofence_group, eq(alarm.id, alarm_geofence_group.alarm_id))
      .innerJoin(geofence_group_relation, eq(alarm_geofence_group.geofence_group_id, geofence_group_relation.group_id))
      .innerJoin(geofence_table, eq(geofence_group_relation.geofence_id, geofence_table.id))
      .innerJoin(alarm_group, eq(alarm.id, alarm_group.alarm_id))
      .innerJoin(group_entity, eq(alarm_group.vehicle_group_id, group_entity.group_id))
      .innerJoin(entity, eq(group_entity.entity_id, entity.id))
      .where(
        and(
          eq(geofence_table.id, parseInt(geofenceId)),
          eq(entity.vehicleNumber, vehicleNumber),
          gte(alert.created_at, twentyFourHoursAgo),
          // Filter for geofence-related alarms (assuming geofence alarms have geofence_status field)
          not(isNull(alarm.geofence_status))
        )
      )
      .orderBy(alert.created_at);
    
    // Format the response with additional details
    const formattedAlerts = geofenceAlerts.map(alertItem => {
      let geofenceStatusText = "Unknown";
      switch (alertItem.geofence_status) {
        case 0: geofenceStatusText = "Entry"; break;
        case 1: geofenceStatusText = "Exit"; break;
        case 2: geofenceStatusText = "Entry/Exit"; break;
      }
      
      let alertStatusText = "Unknown";
      switch (alertItem.alert_status) {
        case 0: alertStatusText = "Inactive"; break;
        case 1: alertStatusText = "Active"; break;
        case 2: alertStatusText = "Manually Closed"; break;
      }
      
      return {
        alert_id: alertItem.alert_id,
        alert_status: alertItem.alert_status,
        alert_status_text: alertStatusText,
        geofence_event_type: geofenceStatusText,
        geofence_name: alertItem.geofence_name,
        vehicle_number: alertItem.vehicle_number,
        alarm_category: alertItem.alarm_category,
        alarm_description: alertItem.alarm_description,
        created_at: alertItem.alert_created_at,
        updated_at: alertItem.alert_updated_at,
        alarm_created_at: alertItem.alert_created_at,
      };
    });
    
    return res.status(200).json({
      success: true,
      geofence_id: parseInt(geofenceId),
      geofence_name: geofenceExists[0].geofence_name,
      vehicle_number: vehicleNumber,
      total_alerts: formattedAlerts.length,
      time_filter: "Last 24 hours",
      alerts: formattedAlerts
    });
    
  } catch (error) {
    console.error("Error fetching geofence alerts by vehicle:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch geofence alerts",
      error
    });
  }
};

export default {
  getAllAlerts,
  getAlertsByUserAccess,
  toggleAlertStatus,
  getAlertCountsByTrip,
  getAlertsByShipment,
  getGeofenceAlertsByVehicle,
};