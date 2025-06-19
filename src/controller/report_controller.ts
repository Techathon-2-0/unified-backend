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
    // Get all vehicles from specified groups
    const vehicleGroupQuery = db
      .select({
        vehicleId: entity.id,
        vehicleNumber: entity.vehicleNumber,
        vehicleStatus: entity.status,
        groupId: group.id,
        groupName: group.group_name
      })
      .from(entity)
      .innerJoin(group_entity, eq(entity.id, group_entity.entity_id))
      .innerJoin(group, eq(group_entity.group_id, group.id))
      .where(inArray(group.id, vehicleGroups));

    const vehicles = await vehicleGroupQuery;

    // Get latest GPS data for each vehicle
    const dashboardData = await Promise.all(
      vehicles.map(async (vehicle) => {
        // Get latest GPS record for this vehicle
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
            status: 'inactive',
            gpsPingCount: 0,
            power: 'Unknown',
            battery: 'Unknown',
            ignitionStatus: 'OFF' as const,
            groupName: vehicle.groupName
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

        // Determine vehicle status based on trip status filter
        const ignitionStatus = getIgnitionStatus(
          gpsData.digitalInput1 ?? undefined,
          gpsData.digitalInput2 ?? undefined,
          gpsData.digitalInput3 ?? undefined
        );

        const isActive = ignitionStatus === 'ON' && (gpsData.speed || 0) > 0;
        const vehicleStatus = isActive ? 'active' : 'inactive';

        // Filter based on trip status
        if (tripStatus !== 'all' && vehicleStatus !== tripStatus) {
          return null;
        }
        let todayPingCount = 0;

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
        const endOfDay = startOfDay + 86400;

        const gpsToday = await db.select()
          .from(gps_schema)
          .where(
            and(
              eq(gps_schema.trailerNumber, vehicle.vehicleNumber),
              gte(gps_schema.gpstimestamp, startOfDay),
              lt(gps_schema.gpstimestamp, endOfDay)
            )
          )
          .orderBy(asc(gps_schema.gpstimestamp));

        todayPingCount = gpsToday.length;


        return {
          vehicleNumber: vehicle.vehicleNumber,
          location,
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          lastVendor: vendorData[0]?.vendorName || gpsData.GPSVendor || 'Unknown',
          gpsTime: gpsData.gpstimestamp != null ? formatDate(new Date(gpsData.gpstimestamp * 1000).toISOString()) : null,
          gprsTime: gpsData.gprstimestamp != null ? formatDate(new Date(gpsData.gprstimestamp * 1000).toISOString()) : null,
          speed: gpsData.speed || 0,
          status: vehicleStatus,
          gpsPingCount: todayPingCount,
          power: gpsData.powerSupplyVoltage || 'Unknown',
          battery: gpsData.internalBatteryLevel || 'Unknown',
          ignitionStatus,
          groupName: vehicle.groupName
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

// All Positions Report
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

    // Get all vehicles from specified groups
    let vehicleQuery = db
      .select({
        vehicleId: entity.id,
        vehicleNumber: entity.vehicleNumber,
        groupId: group.id,
        groupName: group.group_name
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
          groupId: group.id,
          groupName: group.group_name
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

    const vehicles = await vehicleQuery;

    // Get all GPS positions for each vehicle in the date range
    const allPositionsData = await Promise.all(
      vehicles.map(async (vehicle) => {
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

        const vehicleVendor = vendorData[0]?.vendorName || 'Unknown';
        // let todayPingCount = 0;

        // const now = new Date();
        // const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
        // const endOfDay = startOfDay + 86400;

        // const gpsToday = await db.select()
        //   .from(gps_schema)
        //   .where(
        //     and(
        //       eq(gps_schema.trailerNumber, vehicle.vehicleNumber),
        //       gte(gps_schema.gpstimestamp, startOfDay),
        //       lt(gps_schema.gpstimestamp, endOfDay)
        //     )
        //   )
        //   .orderBy(asc(gps_schema.gpstimestamp));

        // todayPingCount = gpsToday.length;

        // Process each GPS record
        const processedRecords = await Promise.all(
          gpsRecords.map(async (gpsData) => {
            // Get location from reverse geocoding
            const address = gpsData.latitude && gpsData.longitude
              ? await reverseGeocode(gpsData.latitude, gpsData.longitude)
              : gpsData.address || 'Unknown Location';

            return {
              vehicleNumber: vehicle.vehicleNumber,
              groupName: vehicle.groupName,
              vendor: vehicleVendor,
              deviceId: gpsData.deviceId,
              timestamp: gpsData.timestamp,
              gpsTime: gpsData.gpstimestamp != null ? formatDate(new Date(gpsData.gpstimestamp * 1000).toISOString()) : null,
              gprsTime: gpsData.gprstimestamp != null ? formatDate(new Date(gpsData.gprstimestamp * 1000).toISOString()) : null,
              //gpsPingCount: todayPingCount,
              power: gpsData.powerSupplyVoltage || 'Unknown',
              battery: gpsData.internalBatteryLevel || 'Unknown',
              ignitionStatus: getIgnitionStatus(
                gpsData.digitalInput1 ?? undefined,
                gpsData.digitalInput2 ?? undefined,
                gpsData.digitalInput3 ?? undefined
              ),
              latitude: gpsData.latitude,
              longitude: gpsData.longitude,
              speed: gpsData.speed || 0,
              address,
              heading: gpsData.heading || 0,
              createdAt: gpsData.created_at
            };
          })
        );

        return processedRecords;
      })
    );

    // Flatten the array of arrays
    return allPositionsData.flat();

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

    const report = await getDashboardReport(vehicleGroups, tripStatus);

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
