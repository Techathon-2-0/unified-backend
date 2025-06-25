import { eq, and, gte, lte, desc, sql, inArray, lt, asc } from 'drizzle-orm';
import {
  gps_schema,
  entity,
  group,
  group_entity,
  user_group,
  vendor,
  entity_vendor
} from '../db/schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { reverseGeocode } from '../utilities/geofunc'
import { formatDate } from '../utilities/geofunc';

const db = drizzle(process.env.DATABASE_URL!);

function getIgnitionStatus(digitalInput1?: number, digitalInput2?: number, digitalInput3?: number): 'ON' | 'OFF' {
  // Adjust this logic based on your GPS device configuration
  // Usually ignition status is in digitalInput1 or digitalInput2
  if (digitalInput1 === 1 || digitalInput2 === 1 || digitalInput3 === 1) {
    return 'ON';
  }
  return 'OFF';
}

export async function getDashboardReport(
  vehicleGroups: number[],
  tripStatus: 'active' | 'inactive' | 'all'
) {
  try {
    // Get all vehicles from specified groups (remove vehicleStatus and groupName from select)
    const vehicleGroupQuery = db
      .select({
        vehicleId: entity.id,
        vehicleNumber: entity.vehicleNumber,
        groupId: group.id
      })
      .from(entity)
      .innerJoin(group_entity, eq(entity.id, group_entity.entity_id))
      .innerJoin(group, eq(group_entity.group_id, group.id))
      .where(inArray(group.id, vehicleGroups));

    const vehiclesRaw = await vehicleGroupQuery;

    // Deduplicate vehicles by vehicleNumber
    const seenVehicleNumbers = new Set<string>();
    const vehicles = vehiclesRaw.filter(v => {
      if (seenVehicleNumbers.has(v.vehicleNumber)) return false;
      seenVehicleNumbers.add(v.vehicleNumber);
      return true;
    });

    // Get latest GPS data for each vehicle
    const dashboardData = await Promise.all(
      vehicles.map(async (vehicle) => {
        // Get latest GPS record for this vehicle

        let tripStatusValue: string = '';
        try {
          // Find equipment for this vehicle
          const [equip] = await db.select().from(require('../db/schema').equipment)
            .where(eq(require('../db/schema').equipment.equipment_id, vehicle.vehicleNumber)).limit(1);
          if (equip && equip.shipment_id) {
            // Find shipment/trip for this equipment
            const [trip] = await db.select().from(require('../db/schema').shipment)
              .where(eq(require('../db/schema').shipment.id, equip.shipment_id)).limit(1);
            tripStatusValue = trip?.status ?? '';
          }
        } catch (e) {
          tripStatusValue = '';
        }

        // Trip status filter (use tripStatusValue, not status)
        if (tripStatus === 'active') {
          const activeTripStatuses = ['at_stop_delivery', 'at_stop_pickup', 'in_transit'];
          if (!activeTripStatuses.includes(tripStatusValue)) {
            return null;
          }
        } else if (tripStatus === 'inactive') {
          const activeTripStatuses = ['at_stop_delivery', 'at_stop_pickup', 'in_transit'];
          if (activeTripStatuses.includes(tripStatusValue)) {
            return null;
          }
        }

        console.log(`Processing vehicle: ${vehicle.vehicleNumber}, Trip Status: ${tripStatusValue}`);



        const latestGps = await db
          .select()
          .from(gps_schema)
          .where(eq(gps_schema.trailerNumber, vehicle.vehicleNumber))
          .orderBy(desc(gps_schema.gpstimestamp))
          .limit(1);


          

        if (latestGps.length === 0) {
          return {
            vehicleNumber: vehicle.vehicleNumber,
            location: 'No GPS data',
            latitude: null,
            longitude: null,
            lastVendor: 'Unknown',
            gpsTime: null,
            gprsTime: null,
            speed: 0,
            status: 'No Data', // Use same as live.ts
            trip_status: tripStatusValue,
            gpsPingCount: 0,
            power: 'Unknown',
            battery: 'Unknown',
            ignitionStatus: 'OFF' as const
          };
        }

        const gpsData = latestGps[0];

        // Get vendor information
        const vendorData = await db
          .select({ vendorName: vendor.name })
          .from(vendor)
          .innerJoin(entity_vendor, eq(vendor.id, entity_vendor.vendor_id))
          .where(eq(entity_vendor.entity_id, vehicle.vehicleId))
          .limit(1);

        // Get location from reverse geocoding
        const location = gpsData.latitude && gpsData.longitude
          ? await reverseGeocode(gpsData.latitude, gpsData.longitude)
          : gpsData.address || 'Unknown Location';

        // Status logic same as live.ts
        let status = 'No Data';
        if (gpsData.gpstimestamp) {
          const lastPingTime = Number(gpsData.gpstimestamp) * 1000;
          const diffHours = (Date.now() - lastPingTime) / (1000 * 60 * 60);
          if (diffHours <= 3) {
            status = 'Active';
          } else {
            status = 'No Update';
          }
        }

        // Get equipment and shipment (trip) details for trip status
        // Try to get trip_status from equipment/shipment like in live.ts
        
        // For 'all', include everything

        let todayPingCount = 0;
        const now = Math.floor(Date.now() / 1000);
        const startOfDay = new Date(now * 1000);
        startOfDay.setHours(0, 0, 0, 0);
        const startOfDayTimestamp = Math.floor(startOfDay.getTime() / 1000);
        const endOfDayTimestamp = startOfDayTimestamp + 86400;

        const gpsToday = await db.select()
          .from(gps_schema)
          .where(
            and(
              eq(gps_schema.trailerNumber, vehicle.vehicleNumber),
              gte(gps_schema.gpstimestamp, startOfDayTimestamp),
              lt(gps_schema.gpstimestamp, endOfDayTimestamp)
            )
          )
          .orderBy(asc(gps_schema.gpstimestamp));

        todayPingCount = gpsToday.length;

        // Vendor logic: prefer GPSVendor, then DB, then 'Unknown Vendor'
        let lastVendor = (gpsData.GPSVendor && gpsData.GPSVendor.trim() !== '')
          ? gpsData.GPSVendor
          : (vendorData[0]?.vendorName && vendorData[0]?.vendorName.trim() !== ''
            ? vendorData[0]?.vendorName
            : 'Unknown Vendor');

        return {
          vehicleNumber: vehicle.vehicleNumber,
          location,
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          lastVendor,
          gpsTime: gpsData.gpstimestamp != null ? formatDate(new Date(gpsData.gpstimestamp * 1000).toISOString()) : null,
          gprsTime: gpsData.gprstimestamp != null ? formatDate(new Date(gpsData.gprstimestamp * 1000).toISOString()) : null,
          speed: gpsData.speed || 0,
          status, // vehicle status
          trip_status: tripStatusValue, // add trip_status for frontend filtering
          gpsPingCount: todayPingCount,
          power: gpsData.powerSupplyVoltage || 'Unknown',
          battery: gpsData.internalBatteryLevel || 'Unknown',
          ignitionStatus: gpsData.digitalInput1 === 1 ? 'ON' : 'OFF'
        };
      })
    );

    // Filter out null values
    return dashboardData.filter(Boolean);

  } catch (error) {
    console.error('Error in getDashboardReport:', error);
    throw error;
  }
}

// All Positions Report - Remove groupName from return
export async function getAllPositionsReport(
  vehicleGroups: number[],
  startDate: string, // ISO string format
  endDate: string,   // ISO string format
  vehicleNumber?: string // Optional specific vehicle filter
) {
  try {
    // Convert dates to timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    // Get all vehicles from specified groups (remove groupName from select)
    let vehicleQuery = db
      .select({
        vehicleId: entity.id,
        vehicleNumber: entity.vehicleNumber,
        groupId: group.id
      })
      .from(entity)
      .innerJoin(group_entity, eq(entity.id, group_entity.entity_id))
      .innerJoin(group, eq(group_entity.group_id, group.id))
      .where(inArray(group.id, vehicleGroups));

    // Add specific vehicle filter if provided
    if (vehicleNumber) {
      vehicleQuery = db
        .select({
          vehicleId: entity.id,
          vehicleNumber: entity.vehicleNumber,
          groupId: group.id
        })
        .from(entity)
        .innerJoin(group_entity, eq(entity.id, group_entity.entity_id))
        .innerJoin(group, eq(group_entity.group_id, group.id))
        .where(
          and(
            inArray(group.id, vehicleGroups),
            eq(entity.vehicleNumber, vehicleNumber)
          )
        );
    }

    const vehiclesRaw = await vehicleQuery;

    // Deduplicate vehicles by vehicleNumber
    const seenVehicleNumbers = new Set<string>();
    const vehicles = vehiclesRaw.filter(v => {
      if (seenVehicleNumbers.has(v.vehicleNumber)) return false;
      seenVehicleNumbers.add(v.vehicleNumber);
      return true;
    });

    // Grouped result: { vehicleNumber, trailPoints: [...] }
    const groupedPositions: any[] = [];

    for (const vehicle of vehicles) {
      // Get all GPS records for this vehicle in the date range
      const gpsRecords = await db
        .select()
        .from(gps_schema)
        .where(
          and(
            eq(gps_schema.trailerNumber, vehicle.vehicleNumber),
            gte(gps_schema.gpstimestamp, startTimestamp),
            lte(gps_schema.gpstimestamp, endTimestamp)
          )
        )
        .orderBy(desc(gps_schema.gpstimestamp));

      // Get vendor information for this vehicle
      const vendorData = await db
        .select({ vendorName: vendor.name })
        .from(vendor)
        .innerJoin(entity_vendor, eq(vendor.id, entity_vendor.vendor_id))
        .where(eq(entity_vendor.entity_id, vehicle.vehicleId))
        .limit(1);

      // Process each GPS record and add to trailPoints array
      const trailPoints = [];
      for (const gpsData of gpsRecords) {
        // Get location from reverse geocoding
        const address = gpsData.latitude && gpsData.longitude
          ? await reverseGeocode(gpsData.latitude, gpsData.longitude)
          : gpsData.address || 'Unknown Location';

        // Vendor logic: prefer GPSVendor, then DB, then 'Unknown Vendor'
        const vendorName = (gpsData.GPSVendor && gpsData.GPSVendor.trim() !== '')
          ? gpsData.GPSVendor
          : (vendorData[0]?.vendorName && vendorData[0]?.vendorName.trim() !== ''
            ? vendorData[0]?.vendorName
            : 'Unknown Vendor');

        trailPoints.push({
          vendor: vendorName,
          deviceId: gpsData.deviceId,
          timestamp: gpsData.timestamp,
          gpsTime: gpsData.gpstimestamp != null ? formatDate(new Date(gpsData.gpstimestamp * 1000).toISOString()) : null,
          gprsTime: gpsData.gprstimestamp != null ? formatDate(new Date(gpsData.gprstimestamp * 1000).toISOString()) : null,
          power: gpsData.powerSupplyVoltage || 'Unknown',
          battery: gpsData.internalBatteryLevel || 'Unknown',
          ignitionStatus: gpsData.digitalInput1 === 1 ? 'ON' : 'OFF',
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          speed: gpsData.speed || 0,
          address,
          heading: gpsData.heading || 0,
          createdAt: gpsData.created_at
        });
      }

      groupedPositions.push({
        vehicleNumber: vehicle.vehicleNumber,
        trailPoints
      });
    }

    return groupedPositions;

  } catch (error) {
    console.error('Error in getAllPositionsReport:', error);
    throw error;
  }
}

// API Route handlers
export async function handleDashboardReport(req: any, res: any) {
  try {
    const { vehicleGroups, tripStatus = 'all' } = req.body;

    if (!vehicleGroups || !Array.isArray(vehicleGroups)) {
      return res.status(400).json({
        error: 'vehicleGroups array is required'
      });
    }

    let report = await getDashboardReport(vehicleGroups, tripStatus);

    // Apply trip status filter here as well (defensive, in case frontend sends all and wants to filter here)
    if (tripStatus === 'active') {
      const activeStatuses = ['at_stop_delivery', 'at_stop_pickup', 'in_transit'];
      report = report.filter((v: any) => activeStatuses.includes(v.trip_status));
    } else if (tripStatus === 'inactive') {
      const activeStatuses = ['at_stop_delivery', 'at_stop_pickup', 'in_transit'];
      report = report.filter((v: any) => !activeStatuses.includes(v.trip_status));
    }
    // For 'all', do not filter

    res.json({
      success: true,
      data: report,
      totalVehicles: report.length
    });

  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({
      error: 'Failed to generate dashboard report'
    });
  }
}

export async function handleAllPositionsReport(req: any, res: any) {
  try {
    const { vehicleGroups, startDate, endDate, vehicleNumber } = req.body;

    if (!vehicleGroups || !Array.isArray(vehicleGroups)) {
      return res.status(400).json({
        error: 'vehicleGroups array is required'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required'
      });
    }

    const report = await getAllPositionsReport(
      vehicleGroups,
      startDate,
      endDate,
      vehicleNumber
    );

    res.json({
      success: true,
      data: report,
      totalRecords: report.length
    });

  } catch (error) {
    console.error('All positions report error:', error);
    res.status(500).json({
      error: 'Failed to generate all positions report'
    });
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// dashboard report me vehicle status daalna ,

