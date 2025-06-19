import { shipment, equipment, stop, gps_schema, customer_lr_detail, customers , entity } from '../db/schema';
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { reverseGeocode } from '../utilities/geofunc';

const db = drizzle(process.env.DATABASE_URL!);

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Helper function to format time duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export interface TrailMetrics {
  totalTime: number;
  totalTimeFormatted: string;
  avgSpeed: number;
  totalDistance: number;
}

export interface VehicleTrailPoint {
  id: number;
  timestamp: number;
  time: string;
  address: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  gpstimestamp: number;
  gprstime: string;
}

export interface VehicleTrailResponse {
  vehicleNumber: string;
  vehicleId: string;
  totalPoints: number;
  dateRange: {
    startTime: string;
    endTime: string;
  };
  metrics: TrailMetrics;
  trailPoints: VehicleTrailPoint[];
}

export async function getVehicleTrail(
  vehicleNumber: string,
  startTime: string,
  endTime: string
): Promise<VehicleTrailResponse | null> {
  try {
    // Convert date strings to timestamps
    const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

    // Get vehicle entity
    const vehicle = await db.select()
      .from(entity)
      .where(eq(entity.vehicleNumber, vehicleNumber))
      .limit(1);

    if (vehicle.length === 0) {
      return null;
    }

    // Get GPS data for the specified time range
    const gpsData = await db.select()
      .from(gps_schema)
      .where(
        and(
          eq(gps_schema.trailerNumber, vehicleNumber),
          gte(gps_schema.gpstimestamp, startTimestamp),
          lte(gps_schema.gpstimestamp, endTimestamp)
        )
      )
      .orderBy(gps_schema.gpstimestamp);

    // Process trail points with address geocoding
    const trailPoints: VehicleTrailPoint[] = await Promise.all(
      gpsData.map(async (gps) => {
        let address = "";
        if (gps.latitude && gps.longitude) {
          try {
            address = await reverseGeocode(Number(gps.latitude), Number(gps.longitude));
          } catch (error) {
            console.warn(`Failed to geocode coordinates for ${gps.latitude}, ${gps.longitude}`);
            address = `${gps.latitude}, ${gps.longitude}`;
          }
        }

        return {
          id: gps.id!,
          timestamp: gps.gpstimestamp || 0,
          time: gps.gpstimestamp ? new Date(gps.gpstimestamp * 1000).toISOString() : "",
          address,
          latitude: Number(gps.latitude) || 0,
          longitude: Number(gps.longitude) || 0,
          speed: gps.speed || 0,
          heading: gps.heading || 0,
          gpstimestamp: gps.gpstimestamp || 0,
          gprstime: gps.gprstimestamp ? new Date(gps.gprstimestamp * 1000).toISOString() : "",
        };
      })
    );

    // Calculate metrics
    let totalDistance = 0;
    let totalTime = 0;
    let avgSpeed = 0;

    if (trailPoints.length > 0) {
      // Calculate total time (difference between first and last GPS points)
      totalTime = trailPoints[trailPoints.length - 1].timestamp - trailPoints[0].timestamp;

      // Calculate total distance (sum of distances between consecutive points)
      for (let i = 1; i < trailPoints.length; i++) {
        const prevPoint = trailPoints[i - 1];
        const currPoint = trailPoints[i];
        if (prevPoint.latitude && prevPoint.longitude && currPoint.latitude && currPoint.longitude) {
          totalDistance += calculateDistance(
            prevPoint.latitude,
            prevPoint.longitude,
            currPoint.latitude,
            currPoint.longitude
          );
        }
      }

      // Calculate average speed (total distance / total time in hours)
      avgSpeed = totalTime > 0 ? (totalDistance / (totalTime / 3600)) : 0;
    }

    const metrics: TrailMetrics = {
      totalTime,
      totalTimeFormatted: formatDuration(totalTime),
      avgSpeed: Math.round(avgSpeed * 100) / 100, // Round to 2 decimal places
      totalDistance: Math.round(totalDistance * 100) / 100 // Round to 2 decimal places
    };

    return {
      vehicleNumber,
      vehicleId: vehicle[0].id?.toString() || "",
      totalPoints: trailPoints.length,
      dateRange: {
        startTime,
        endTime,
      },
      metrics,
      trailPoints,
    };
  } catch (error) {
    console.error('Error fetching vehicle trail:', error);
    return null;
  }
}

export interface TripStop {
  id: number;
  locationId: string;
  stopName: string;
  stopType: string;
  latitude: number;
  longitude: number;
  address: string;
  plannedSequence: number;
  actualSequence: number;
  entryTime: string | null;
  exitTime: string | null;
  geoFenceRadius: number;
  status: string;
  customerName?: string;
  lrNumber?: string;
}

export interface TripTrailPoint {
  id: number;
  timestamp: number;
  time: string;
  address: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  gpstimestamp: number;
}

export interface TripTrailResponse {
  shipmentId: string;
  routeName: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  status: string;
  startLocation: string;
  endLocation: string;
  totalDistance: string;
  stops: TripStop[];
  trailPoints: TripTrailPoint[];
  metrics: TrailMetrics;
  dateRange: {
    startTime: string;
    endTime: string;
  };
}

export async function getTripTrail(
  shipmentId: string,
  startTime?: string,
  endTime?: string
): Promise<TripTrailResponse | null> {
  try {
    // Get shipment details
    const shipmentData = await db.select()
      .from(shipment)
      .where(eq(shipment.shipment_id, shipmentId))
      .limit(1);

    if (shipmentData.length === 0) {
      return null;
    }

    const trip = shipmentData[0];

    // Get equipment (vehicle) details
    const equipmentData = await db.select()
      .from(equipment)
      .where(eq(equipment.shipment_id, trip.id!))
      .limit(1);

    if (equipmentData.length === 0) {
      return null;
    }

    const vehicleInfo = equipmentData[0];

    // Get all stops for this shipment
    const stopsData = await db.select()
      .from(stop)
      .where(eq(stop.shipment_id, trip.id!))
      .orderBy(stop.stop_sequence);

    // Process stops with customer details and addresses
    const stops: TripStop[] = await Promise.all(
      stopsData.map(async (stopData) => {
        let address = "";
        if (stopData.latitude && stopData.longitude) {
          try {
            address = await reverseGeocode(Number(stopData.latitude), Number(stopData.longitude));
          } catch (error) {
            address = `${stopData.latitude}, ${stopData.longitude}`;
          }
        }

        // Get customer details for this stop
        const customerDetails = await db.select({
          customerName: customers.customer_name,
          lrNumber: customer_lr_detail.lr_number,
        })
        .from(customer_lr_detail)
        .leftJoin(customers, eq(customer_lr_detail.customer_id, customers.id))
        .where(eq(customer_lr_detail.stop_id, stopData.id!))
        .limit(1);

        const customer = customerDetails[0];

        return {
          id: stopData.id!,
          locationId: stopData.location_id || "",
          stopName: stopData.stop_name || "",
          stopType: stopData.stop_type || "",
          latitude: Number(stopData.latitude) || 0,
          longitude: Number(stopData.longitude) || 0,
          address,
          plannedSequence: stopData.stop_sequence || 0,
          actualSequence: stopData.actual_sequence || 0,
          entryTime: stopData.entry_time,
          exitTime: stopData.exit_time,
          geoFenceRadius: stopData.geo_fence_radius || 100,
          status: stopData.stop_status || "pending",
          customerName: customer?.customerName || "",
          lrNumber: customer?.lrNumber || "",
        };
      })
    );

    // Get GPS trail data for the vehicle
    let gpsWhereCondition;

    if (startTime && endTime) {
      const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);
      gpsWhereCondition = and(
        eq(gps_schema.trailerNumber, vehicleInfo.equipment_id!),
        gte(gps_schema.gpstimestamp, startTimestamp),
        lte(gps_schema.gpstimestamp, endTimestamp)
      );
    } else {
      gpsWhereCondition = eq(gps_schema.trailerNumber, vehicleInfo.equipment_id!);
    }

    const gpsData = await db.select()
      .from(gps_schema)
      .where(gpsWhereCondition)
      .orderBy(gps_schema.gpstimestamp);

    // Process trail points
    const trailPoints: TripTrailPoint[] = await Promise.all(
      gpsData.map(async (gps) => {
        let address = "";
        if (gps.latitude && gps.longitude) {
          try {
            address = await reverseGeocode(Number(gps.latitude), Number(gps.longitude));
          } catch (error) {
            address = `${gps.latitude}, ${gps.longitude}`;
          }
        }

        return {
          id: gps.id!,
          timestamp: gps.gpstimestamp || 0,
          time: gps.gpstimestamp ? new Date(gps.gpstimestamp * 1000).toISOString() : "",
          address,
          latitude: Number(gps.latitude) || 0,
          longitude: Number(gps.longitude) || 0,
          speed: gps.speed || 0,
          heading: gps.heading || 0,
          gpstimestamp: gps.gpstimestamp || 0,
        };
      })
    );

    // Calculate metrics
    let totalDistance = 0;
    let totalTime = 0;
    let avgSpeed = 0;

    if (trailPoints.length > 0) {
      // Calculate total time (difference between first and last GPS points)
      totalTime = trailPoints[trailPoints.length - 1].timestamp - trailPoints[0].timestamp;

      // Calculate total distance (sum of distances between consecutive points)
      for (let i = 1; i < trailPoints.length; i++) {
        const prevPoint = trailPoints[i - 1];
        const currPoint = trailPoints[i];
        if (prevPoint.latitude && prevPoint.longitude && currPoint.latitude && currPoint.longitude) {
          totalDistance += calculateDistance(
            prevPoint.latitude,
            prevPoint.longitude,
            currPoint.latitude,
            currPoint.longitude
          );
        }
      }

      // Calculate average speed (total distance / total time in hours)
      avgSpeed = totalTime > 0 ? (totalDistance / (totalTime / 3600)) : 0;
    }

    const metrics: TrailMetrics = {
      totalTime,
      totalTimeFormatted: formatDuration(totalTime),
      avgSpeed: Math.round(avgSpeed * 100) / 100, // Round to 2 decimal places
      totalDistance: Math.round(totalDistance * 100) / 100 // Round to 2 decimal places
    };

    // Calculate date range
    const dateRange = {
      startTime: startTime || (trailPoints.length > 0 ? trailPoints[0].time : ""),
      endTime: endTime || (trailPoints.length > 0 ? trailPoints[trailPoints.length - 1].time : ""),
    };

    return {
      shipmentId: trip.shipment_id || "",
      routeName: trip.route_name || "",
      vehicleNumber: vehicleInfo.equipment_id || "",
      driverName: vehicleInfo.driver_name || "",
      driverMobile: vehicleInfo.driver_mobile_no || "",
      status: trip.status || "",
      startLocation: trip.start_location || "",
      endLocation: trip.end_location || "",
      totalDistance: metrics.totalDistance.toString(),
      stops,
      trailPoints,
      metrics,
      dateRange,
    };
  } catch (error) {
    console.error('Error fetching trip trail:', error);
    throw error;
  }
}