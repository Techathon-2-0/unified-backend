import { Request, Response } from 'express';
import { 
  alert, 
  alarm, 
  entity, 
  vendor,
  entity_vendor,
  gps_schema,
  shipment,
  equipment,
  stop,
  customer_lr_detail,
  customers,
  customer_group_relation,
  customer_group,
  alarm_group,
  alarm_customer_group,
  alert_shipment_relation,
  group_entity,
  group,
  alert_entity_relation,
  alarm_alert
} from '../db/schema';
import { eq, and, between, inArray, desc, sql, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(process.env.DATABASE_URL!);

interface AlarmReportRequest {
  startDate: string;
  endDate: string;
  alarmTypes: number[]; // array of alarm IDs
  vehicleGroups?: number[]; // array of vehicle group IDs
  customerGroups?: number[]; // array of customer group IDs
}

export const getAlarmReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, alarmTypes, vehicleGroups, customerGroups }: AlarmReportRequest = req.body;

    // Validate required fields
    if (!startDate || !endDate || !alarmTypes || alarmTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'startDate, endDate, and alarmTypes are required'
      });
    }

    // Build condition arrays for filtering
    let alertConditions: any[] = [
      between(alert.created_at, new Date(startDate), new Date(endDate)),
      inArray(alarm.id, alarmTypes)
    ];

    // Get alert IDs based on vehicle groups if provided
    let vehicleFilteredAlertIds: number[] = [];
    if (vehicleGroups && vehicleGroups.length > 0) {
      const vehicleGroupEntities = await db
        .select({ entityId: group_entity.entity_id })
        .from(group_entity)
        .where(inArray(group_entity.group_id, vehicleGroups));
      
      const entityIds = vehicleGroupEntities.map(ve => ve.entityId);
      
      if (entityIds.length > 0) {
        const vehicleAlerts = await db
          .select({ alertId: alert_entity_relation.alert_id })
          .from(alert_entity_relation)
          .where(inArray(alert_entity_relation.entity_id, entityIds));
        
        vehicleFilteredAlertIds = vehicleAlerts.map(va => va.alertId);
      }
    }

    // Get alert IDs based on customer groups if provided
    let customerFilteredAlertIds: number[] = [];
    if (customerGroups && customerGroups.length > 0) {
      // Get alarms from customer groups
      const customerGroupAlarms = await db
        .select({ alarmId: alarm_customer_group.alarm_id })
        .from(alarm_customer_group)
        .where(inArray(alarm_customer_group.customer_group_id, customerGroups));
      
      const alarmIds = customerGroupAlarms.map(cga => cga.alarmId);
      
      if (alarmIds.length > 0) {
        // Get alerts from those alarms
        const customerAlerts = await db
          .select({ alertId: alarm_alert.alert_id })
          .from(alarm_alert)
          .where(inArray(alarm_alert.alarm_id, alarmIds));
        
        customerFilteredAlertIds = customerAlerts.map(ca => ca.alertId);
      }
    }

    // Apply filtering conditions
    if (vehicleGroups && vehicleGroups.length > 0) {
      if (vehicleFilteredAlertIds.length > 0) {
        alertConditions.push(inArray(alert.id, vehicleFilteredAlertIds));
      } else {
        // No alerts found for these vehicle groups
        return res.status(200).json({
          success: true,
          data: [],
          total: 0
        });
      }
    }

    if (customerGroups && customerGroups.length > 0) {
      if (customerFilteredAlertIds.length > 0) {
        alertConditions.push(inArray(alert.id, customerFilteredAlertIds));
      } else {
        // No alerts found for these customer groups
        return res.status(200).json({
          success: true,
          data: [],
          total: 0
        });
      }
    }

    // Main query to get alerts with alarm details
    const alerts = await db
      .select({
        alertId: alert.id,
        alertStatus: alert.status,
        alertCreatedAt: alert.created_at,
        alertUpdatedAt: alert.updated_at,
        alertLatitude: alert.latitude,
        alertLongitude: alert.longitude,
        alarmId: alarm.id,
        alarmName: alarm.alarm_category,
        alarmDescription: sql<string>`COALESCE(${alarm.descrption}, '')`,
        alarmValue: alarm.alarm_value,
        restDuration: alarm.rest_duration,
        severityType: alarm.alarm_category, // Using alarm_category as severity type
      })
      .from(alert)
      .innerJoin(alarm, eq(alert.alert_type, alarm.id))
      .where(and(...alertConditions))
      .orderBy(desc(alert.created_at));

    // Enrich alerts with additional information
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alertItem) => {
        // Get vehicle information from alert_entity_relation
        const vehicleInfo = await db
          .select({
            vehicleNumber: entity.vehicleNumber,
            entityId: entity.id
          })
          .from(alert_entity_relation)
          .innerJoin(entity, eq(alert_entity_relation.entity_id, entity.id))
          .where(eq(alert_entity_relation.alert_id, alertItem.alertId))
          .limit(1);

        // Get vendor information if vehicle exists
        let vendorName = '';
        if (vehicleInfo.length > 0) {
          const vendorInfo = await db
            .select({
              vendorName: vendor.name
            })
            .from(entity_vendor)
            .innerJoin(vendor, eq(entity_vendor.vendor_id, vendor.id))
            .where(eq(entity_vendor.entity_id, vehicleInfo[0].entityId))
            .limit(1);
          
          vendorName = vendorInfo[0]?.vendorName || '';
        }

        // Get GPS coordinates for end time (when alert was closed/inactive)
        let endLatitude = null;
        let endLongitude = null;
        
        if (vehicleInfo.length > 0 && alertItem.alertUpdatedAt) {
          // Get GPS data closest to the alert end time
          const endGpsData = await db
            .select({
              latitude: gps_schema.latitude,
              longitude: gps_schema.longitude
            })
            .from(gps_schema)
            .where(
              and(
                eq(gps_schema.trailerNumber, vehicleInfo[0].vehicleNumber),
                sql`ABS(UNIX_TIMESTAMP(${gps_schema.created_at}) - UNIX_TIMESTAMP(${alertItem.alertUpdatedAt})) <= 300` // Within 5 minutes
              )
            )
            .orderBy(sql`ABS(UNIX_TIMESTAMP(${gps_schema.created_at}) - UNIX_TIMESTAMP(${alertItem.alertUpdatedAt}))`)
            .limit(1);
          
          if (endGpsData.length > 0) {
            endLatitude = endGpsData[0].latitude;
            endLongitude = endGpsData[0].longitude;
          }
        }

        // Get shipment information if alert is on trip
        const shipmentRelation = await db
          .select({
            shipmentId: shipment.shipment_id,
            equipmentDriverName: equipment.driver_name,
            equipmentDriverMobile: equipment.driver_mobile_no,
            equipmentServiceProvider: equipment.service_provider_alias_value,
            shipmentDbId: shipment.id
          })
          .from(alert_shipment_relation)
          .innerJoin(shipment, eq(alert_shipment_relation.shipment_id, shipment.id))
          .leftJoin(equipment, eq(equipment.shipment_id, shipment.id))
          .where(eq(alert_shipment_relation.alert_id, alertItem.alertId))
          .limit(1);

        // Get customer names from stops if on trip
        let customerNames: string[] = [];
        if (shipmentRelation.length > 0) {
          const stopCustomers = await db
            .select({
              customerName: customers.customer_name
            })
            .from(stop)
            .innerJoin(customer_lr_detail, eq(customer_lr_detail.stop_id, stop.id))
            .innerJoin(customers, eq(customer_lr_detail.customer_id, customers.id))
            .where(eq(stop.shipment_id, shipmentRelation[0].shipmentDbId));
          
          customerNames = stopCustomers.map(sc => sc.customerName);
        }

        // Calculate duration
        const startTime = alertItem.alertCreatedAt ? new Date(alertItem.alertCreatedAt) : null;
        const endTime = alertItem.alertUpdatedAt ? new Date(alertItem.alertUpdatedAt) : null;
        const duration = (startTime && endTime) ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : null;

        return {
          vehicleNumber: vehicleInfo[0]?.vehicleNumber || '',
          vendorName: vendorName,
          createdAt: alertItem.alertCreatedAt,
          startLatitude: alertItem.alertLatitude,
          startLongitude: alertItem.alertLongitude,
          endTime: alertItem.alertUpdatedAt,
          endLatitude: endLatitude,
          endLongitude: endLongitude,
          alertName: alertItem.alarmName,
          description: alertItem.alarmDescription,
          duration: duration,
          severityType: alertItem.severityType,
          alarmValue: alertItem.alarmValue,
          restDuration: alertItem.restDuration,
          shipmentId: shipmentRelation[0]?.shipmentId || null,
          driverName: shipmentRelation[0]?.equipmentDriverName || null,
          driverMobileNumber: shipmentRelation[0]?.equipmentDriverMobile || null,
          serviceProviderAliasValue: shipmentRelation[0]?.equipmentServiceProvider || null,
          customerNames: customerNames,
          emailSentStatus: 'sent' // hardcoded as requested
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: enrichedAlerts,
      total: enrichedAlerts.length
    });

  } catch (error) {
    console.error('Error in getAlarmReport:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};