// // frontend se milega custoemr group , vaha se milega custoemr name , customer name aate h stop me , ek trip me multiple trip hote h ek trip me multiple stops hote h , agr koi bhi customer name h jo uss trip ke kissi bhi stopp me h , so we need to return that trip , iske saath we will be getting date range we need to return only those trip ehcih lie in that date reange , we will aslo be gettinng trip_status (active(active me pickup, delivery , intransit) , inactive ya all) , 
// we  need to return so ther will be common info andd info which is diff
// {
//     common info : [shipment id , trip start time , trip end time , vehicle number , origin and destination trip ke , service provider , gps vendor jo dispatch xml me aata h , if intugine then (consent status , last updated time , operator) , trip status ]
// }

// {
    // differnt info : stop wise (planned sequence , actual sequence , stop type , lr number , custoemr name , entry time, exit time , no. of gps ping(2 consecutive stop ke beeche me jitne ping aae for first its like origin se lekr first tk ) , jo isme last ping aaya h apritcualer stop me uska vendor kon tah , isme fasttag ke koi ping aaye h (need to return yes/no) , )
// }


import { Request, Response } from 'express';
import { 
  shipment, 
  stop, 
  equipment, 
  customers, 
  customer_group, 
  customer_group_relation, 
  customer_lr_detail,
  gps_schema,
  intutrack_relation,
  gps_details
} from '../db/schema';
import { eq, and, between, inArray, sql, desc, asc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(process.env.DATABASE_URL!);

interface TripGpsStatusRequest {
  customer_group_ids: number[];
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
  trip_status: 'active' | 'inactive' | 'all';
}

interface CommonTripInfo {
  shipment_id: string;
  trip_start_time: string;
  trip_end_time: string;
  vehicle_number: string;
  origin: string;
  destination: string;
  service_provider: string;
  gps_vendor: string;
  consent_status?: string;
  last_updated_time?: string;
  operator?: string;
  trip_status: string;
}

interface StopInfo {
  planned_sequence: number;
  actual_sequence: number;
  stop_type: string;
  lr_number: string;
  customer_name: string;
  entry_time: string;
  exit_time: string;
  gps_ping_count: number;
  last_ping_vendor: string;
  has_fasttag_ping: boolean;
}

interface TripGpsStatusResponse {
  common_info: CommonTripInfo;
  stops_info: StopInfo[];
}

export class TripGpsStatusReportController {
  
  /**
   * Get Trip GPS Status Report
   */
  public async getTripGpsStatusReport(req: Request, res: Response): Promise<void> {
    try {
      const { customer_group_ids, start_date, end_date, trip_status }: TripGpsStatusRequest = req.body;

      // Validate required fields
      if (!customer_group_ids || !Array.isArray(customer_group_ids) || customer_group_ids.length === 0) {
        res.status(400).json({ error: 'customer_group_ids is required and must be a non-empty array' });
        return;
      }

      if (!start_date || !end_date) {
        res.status(400).json({ error: 'start_date and end_date are required' });
        return;
      }

      if (!trip_status || !['active', 'inactive', 'all'].includes(trip_status)) {
        res.status(400).json({ error: 'trip_status must be one of: active, inactive, all' });
        return;
      }

      // Get customer IDs from customer groups
      const customerIds = await db
        .select({ customer_id: customer_group_relation.customer_id })
        .from(customer_group_relation)
        .where(inArray(customer_group_relation.group_id, customer_group_ids));

      if (customerIds.length === 0) {
        res.status(200).json({ trips: [] });
        return;
      }

      const customerIdList = customerIds.map(c => c.customer_id);

      // Get shipments that have stops with these customers
      const shipmentQuery = db
        .select({
          shipment_id: shipment.id,
          shipment_external_id: shipment.shipment_id,
          status: shipment.status,
          start_time: shipment.start_time,
          end_time: shipment.end_time,
          start_location: shipment.start_location,
          end_location: shipment.end_location,
          route_name: shipment.route_name
        })
        .from(shipment)
        .innerJoin(stop, eq(stop.shipment_id, shipment.id))
        .innerJoin(customer_lr_detail, eq(customer_lr_detail.stop_id, stop.id))
        .where(
          and(
            inArray(customer_lr_detail.customer_id, customerIdList),
            // Use shipment.start_time (with time) for filtering
            between(
              shipment.start_time,
              start_date,
              end_date
            ),
            trip_status !== 'all'
              ? (
                  trip_status === 'active'
                    ? sql`${shipment.status} IN ('at_stop_delivery', 'at_stop_pickup', 'in_transit')`
                    : sql`${shipment.status} NOT IN ('at_stop_delivery', 'at_stop_pickup', 'in_transit')`
                )
              : undefined
          )
        )
        .groupBy(shipment.id);

      const shipments = await shipmentQuery;

      if (shipments.length === 0) {
        res.status(200).json({ trips: [] });
        return;
      }

      // Process each shipment to get complete trip information
      const tripReports: TripGpsStatusResponse[] = [];

      for (const ship of shipments) {
        const commonInfo = await this.getCommonTripInfo(ship);
        const stopsInfo = await this.getStopsInfo(ship.shipment_id);
        
        tripReports.push({
          common_info: commonInfo,
          stops_info: stopsInfo
        });
      }

      res.status(200).json({
        success: true,
        trips: tripReports,
        total_trips: tripReports.length
      });

    } catch (error) {
      console.error('Error in getTripGpsStatusReport:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get common trip information
   */
  private async getCommonTripInfo(shipmentData: any): Promise<CommonTripInfo> {
    // Get equipment/vehicle information
    const equipmentInfo = await db
      .select({
        equipment_id: equipment.equipment_id,
        vehicle_name: equipment.vehicle_name,
        service_provider_alias_value: equipment.service_provider_alias_value
      })
      .from(equipment)
      .where(eq(equipment.shipment_id, shipmentData.shipment_id))
      .limit(1);

    // Get GPS vendor from gps_details
    const gpsVendorInfo = await db
      .select({
        gps_vendor: gps_details.gps_vendor
      })
      .from(gps_details)
      .where(eq(gps_details.shipment_id, shipmentData.shipment_id))
      .limit(1);

    // Get Intutrack consent information if GPS vendor is intutrack
    let consentInfo = null;
    if (gpsVendorInfo.length > 0 && gpsVendorInfo[0].gps_vendor?.toLowerCase().includes('intutrack')) {
      // Get driver phone from equipment to check consent
      const driverInfo = await db
        .select({
          driver_mobile_no: equipment.driver_mobile_no
        })
        .from(equipment)
        .where(eq(equipment.shipment_id, shipmentData.shipment_id))
        .limit(1);

      if (driverInfo.length > 0 && driverInfo[0].driver_mobile_no) {
        const consent = await db
          .select({
            current_consent: intutrack_relation.current_consent,
            updated_at: intutrack_relation.updated_at,
            operator: intutrack_relation.operator
          })
          .from(intutrack_relation)
          .where(eq(intutrack_relation.phone_number, driverInfo[0].driver_mobile_no))
          .orderBy(desc(intutrack_relation.updated_at))
          .limit(1);

        if (consent.length > 0) {
          consentInfo = consent[0];
        }
      }
    }

    const commonInfo: CommonTripInfo = {
      shipment_id: shipmentData.shipment_external_id,
      trip_start_time: shipmentData.start_time || '',
      trip_end_time: shipmentData.end_time || '',
      // Use equipment_id as vehicle_number
      vehicle_number: equipmentInfo.length > 0 ? equipmentInfo[0].equipment_id || '' : '',
      origin: shipmentData.start_location || '',
      destination: shipmentData.end_location || '',
      service_provider: equipmentInfo.length > 0 ? equipmentInfo[0].service_provider_alias_value || '' : '',
      gps_vendor: gpsVendorInfo.length > 0 ? gpsVendorInfo[0].gps_vendor || '' : '',
      trip_status: shipmentData.status || ''
    };

    // Add consent information if available
    if (consentInfo) {
      commonInfo.consent_status = consentInfo.current_consent ?? undefined;
      commonInfo.last_updated_time = consentInfo.updated_at?.toISOString() || '';
      commonInfo.operator = consentInfo.operator;
    }

    return commonInfo;
  }

  /**
   * Get stops information with GPS ping counts
   */
  private async getStopsInfo(shipmentId: number): Promise<StopInfo[]> {
    // Get all stops for the shipment
    const stops = await db
      .select({
        stop_id: stop.id,
        planned_sequence: stop.stop_sequence,
        actual_sequence: stop.actual_sequence,
        stop_type: stop.stop_type,
        entry_time: stop.entry_time,
        exit_time: stop.exit_time,
        latitude: stop.latitude,
        longitude: stop.longitude
      })
      .from(stop)
      .where(eq(stop.shipment_id, shipmentId))
      .orderBy(asc(stop.stop_sequence));

    if (stops.length === 0) {
      return [];
    }

    // Get vehicle number for GPS tracking
    const vehicleInfo = await db
      .select({
        equipment_id: equipment.equipment_id
      })
      .from(equipment)
      .where(eq(equipment.shipment_id, shipmentId))
      .limit(1);

    // Use equipment_id as vehicle number
    const vehicleNumber = vehicleInfo.length > 0 && vehicleInfo[0].equipment_id ? vehicleInfo[0].equipment_id : '';

    const stopsInfo: StopInfo[] = [];

    for (let i = 0; i < stops.length; i++) {
      const currentStop = stops[i];
      
      // Get customer and LR information
      const customerLrInfo = await db
        .select({
          lr_number: customer_lr_detail.lr_number,
          customer_name: customers.customer_name
        })
        .from(customer_lr_detail)
        .innerJoin(customers, eq(customers.id, customer_lr_detail.customer_id))
        .where(eq(customer_lr_detail.stop_id, currentStop.stop_id))
        .limit(1);

      // Calculate GPS ping count between consecutive stops
      let startTime: string;
      let endTime: string;

      if (i === 0) {
        // For first stop, get pings from trip start to first stop entry
        const shipmentInfo = await db
          .select({ start_time: shipment.start_time })
          .from(shipment)
          .where(eq(shipment.id, shipmentId))
          .limit(1);
        
        startTime = shipmentInfo.length > 0 ? shipmentInfo[0].start_time || '' : '';
        endTime = currentStop.entry_time || '';
      } else {
        // For subsequent stops, get pings from previous stop exit to current stop entry
        startTime = stops[i - 1].exit_time || '';
        endTime = currentStop.entry_time || '';
      }

      const { pingCount, lastPingVendor, hasFasttagPing } = await this.getGpsPingInfo(
        vehicleNumber,
        startTime,
        endTime
      );

      const stopInfo: StopInfo = {
        planned_sequence: currentStop.planned_sequence || 0,
        actual_sequence: currentStop.actual_sequence || 0,
        stop_type: currentStop.stop_type || '',
        lr_number: customerLrInfo.length > 0 ? customerLrInfo[0].lr_number || '' : '',
        customer_name: customerLrInfo.length > 0 ? customerLrInfo[0].customer_name || '' : '',
        entry_time: currentStop.entry_time || '',
        exit_time: currentStop.exit_time || '',
        gps_ping_count: pingCount,
        last_ping_vendor: lastPingVendor,
        has_fasttag_ping: hasFasttagPing
      };

      stopsInfo.push(stopInfo);
    }

    return stopsInfo;
  }

  /**
   * Get GPS ping information between time range
   */
  private async getGpsPingInfo(vehicleNumber: string, startTime: string, endTime: string): Promise<{
    pingCount: number;
    lastPingVendor: string;
    hasFasttagPing: boolean;
  }> {
    if (!vehicleNumber || !startTime || !endTime) {
      return { pingCount: 0, lastPingVendor: '', hasFasttagPing: false };
    }

    try {
      // Convert time strings to timestamps for comparison
      const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

      // Get GPS pings in the time range
      const gpsPings = await db
        .select({
          GPSVendor: gps_schema.GPSVendor,
          gpstimestamp: gps_schema.gpstimestamp
        })
        .from(gps_schema)
        .where(
          and(
            eq(gps_schema.trailerNumber, vehicleNumber),
            sql`${gps_schema.gpstimestamp} >= ${startTimestamp}`,
            sql`${gps_schema.gpstimestamp} <= ${endTimestamp}`
          )
        )
        .orderBy(desc(gps_schema.gpstimestamp));

      const pingCount = gpsPings.length;
      const lastPingVendor = gpsPings.length > 0 ? gpsPings[0].GPSVendor || '' : '';
      
      // Check for Fasttag pings (assuming Fasttag vendor contains 'fasttag' in name)
      const hasFasttagPing = gpsPings.some(ping => 
        ping.GPSVendor?.toLowerCase().includes('fasttag') || 
        ping.GPSVendor?.toLowerCase().includes('fastag')
      );

      return { pingCount, lastPingVendor, hasFasttagPing };

    } catch (error) {
      console.error('Error getting GPS ping info:', error);
      return { pingCount: 0, lastPingVendor: '', hasFasttagPing: false };
    }
  }

  /**
   * Get trip status condition based on trip_status parameter
   */
  private getTripStatusCondition(tripStatus: 'active' | 'inactive') {
    // This method is now unused, but you may keep or remove it as needed.
    if (tripStatus === 'active') {
      // Active includes: pickup, delivery, intransit
      return sql`${shipment.status} IN ('pickup', 'delivery', 'intransit', 'active')`;
    } else {
      // Inactive includes: completed, cancelled, etc.
      return sql`${shipment.status} NOT IN ('pickup', 'delivery', 'intransit', 'active')`;
    }
  }
}

// Export controller instance
export const tripGpsStatusReportController = new TripGpsStatusReportController();
