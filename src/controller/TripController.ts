import { Trip } from "../types/trip";
import { readTripXMLData } from "../utilities/xmlfunc";
import {
  shipment,
  vendor,
  entity_vendor,
  equipment,
  group,
  group_entity,
  user_group,
  entity,
  event,
  stop,
  customer_lr_detail,
  gps_details,
  transmission_header,
  customers,
  geofence_table,
  user_customer_group,
  customer_group_relation,
  gps_schema,
  alert_shipment_relation,
  alert,
  intutrack_relation,
  usersTable,
  alarm,
} from "../db/schema";

import { ne, eq, inArray, and, gte, lt, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { formatDate, reverseGeocode, haversine } from "../utilities/geofunc";
import bcrypt from "bcryptjs";
import { start } from "repl";

const db = drizzle(process.env.DATABASE_URL!);

async function fetchallusercustomers(userId: number) {
  try {
    // Fetch all customer groups for the user
    const userCustomerGroups = await db
      .select({ customerGroupId: user_customer_group.customer_group_id })
      .from(user_customer_group)
      .where(eq(user_customer_group.user_id, userId));

    const customerGroupIds = userCustomerGroups
      .map((g) => g.customerGroupId)
      .filter((id): id is number => id !== null && id !== undefined);

    if (customerGroupIds.length === 0) {
      return [];
    }

    // Fetch all customers in these groups
    const customerGroupRelations = await db
      .select({ customerId: customer_group_relation.customer_id })
      .from(customer_group_relation)
      .where(inArray(customer_group_relation.group_id, customerGroupIds));

    const customerIds = customerGroupRelations
      .map((r) => r.customerId)
      .filter((id): id is number => id !== null && id !== undefined);

    if (customerIds.length === 0) {
      return [];
    }

    // Fetch all customers for these IDs
    const customersData = await db
      .select()
      .from(customers)
      .where(inArray(customers.id, customerIds));

    return customersData;
  } catch (error) {
    console.error("Error fetching user customers:", error);
    throw error;
  }
}

//working
export async function getTripById(id: string) {
  try {
    // Fetch shipment data from the database
    const shipmentData = await db
      .select()
      .from(shipment)
      .where(eq(shipment.shipment_id, id))
      .limit(1);
    // console.log(shipmentData);
    if (!shipmentData || shipmentData.length === 0) {
      console.log(`No shipment found with ID: ${id}`);
      return null;
    }

    console.log(`Found shipment: ${JSON.stringify(shipmentData[0])}`);

    // Fetch related equipment data
    const equipmentData = await db
      .select()
      .from(equipment)
      .where(eq(equipment.shipment_id, shipmentData[0].id));

    if (!equipmentData || equipmentData.length === 0) {
      console.log(`No equipment found for shipment ID: ${shipmentData[0].id}`);
    }

    // Fetch related event data
    const eventData = await db
      .select()
      .from(event)
      .where(eq(event.shipment_id, shipmentData[0].id));

    // Fetch related stops with customer details
    const stopsData = await db
      .select()
      .from(stop)
      .where(eq(stop.shipment_id, shipmentData[0].id))
      .orderBy(stop.stop_sequence);

    // Fetch customer LR details for each stop
    const stopsWithCustomerDetails = await Promise.all(
      stopsData.map(async (stop) => {
        const customerDetails = await db
          .select({
            lr_number: customer_lr_detail.lr_number,
            customer_id: customers.customer_id,
            customer_name: customers.customer_name,
            customer_location: customers.customer_location,
          })
          .from(customer_lr_detail)
          .leftJoin(customers, eq(customer_lr_detail.customer_id, customers.id))
          .where(eq(customer_lr_detail.stop_id, stop.id));

        return {
          ...stop,
          customerDetails,
        };
      })
    );

    // Map database entities to Trip type
    const tripData: Trip = {
      id: shipmentData[0].shipment_id ?? "",
      status: shipmentData[0].status as any,
      routeId: shipmentData[0].route_id || "",
      routeName: shipmentData[0].route_name || "",
      routeType: shipmentData[0].route_type || "",
      startTime: shipmentData[0].start_time || "",
      endTime: shipmentData[0].end_time || "",
      driverName: equipmentData[0]?.driver_name || "",
      driverMobile: equipmentData[0]?.driver_mobile_no || "",
      driverDetails: equipmentData[0]?.driver_details || "",
      location: shipmentData[0].current_location || "",
      locationDateTime: shipmentData[0].location_datetime || "",
      shipmentId: shipmentData[0].shipment_id ?? "",
      vehicleName: equipmentData[0]?.vehicle_name || "",
      vehicleStatus: equipmentData[0]?.vehicle_status || "No update",
      statusDuration: equipmentData[0]?.status_duration || "0h 0m",
      totalDetentionTime: shipmentData[0].total_detention_time || "0h 0m",
      totalStoppageTime: shipmentData[0].total_stoppage_time || "0h 0m",
      totalDriveTime: shipmentData[0].total_drive_time || "0h 0m",
      domainName: shipmentData[0].domain_name || "",
      equipmentId: equipmentData[0]?.equipment_id || "",
      coordinates: [
        shipmentData[0].current_latitude || 0,
        shipmentData[0].current_longitude || 0,
      ] as [number, number],
      stops: stopsWithCustomerDetails.map((stop, index) => ({
        point: stop.point_number || index + 1,
        name: String(stop.stop_name || stop.location_id || ""),
        status: stop.stop_status || "Pending",
        locationId: String(stop.location_id || ""),
        stopType: stop.stop_type === "P" ? "Pickup" : "Delivery",
        plannedTime: stop.planned_departure_date || "",
        ceta: stop.ceta || "",
        geta: stop.geta || "",
        actualSequence: stop.actual_sequence || stop.stop_sequence || 0,
        entryTime: stop.entry_time || "",
        exitTime: stop.exit_time || "",
        detentionTime: stop.detention_time || "",
        customerDetails: stop.customerDetails || [],
      })),
    };
    return tripData;
  } catch (error) {
    console.error("Error getting trip by ID:", error);
    throw error;
  }
}

//working
export async function getAllTrips(
  userId: number,
  page = 1,
  limit = 100,
  status?: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    // 1. Get user's vehicle group IDs
    const userGroups = await db
      .select({ groupId: user_group.vehicle_group_id })
      .from(user_group)
      .where(eq(user_group.user_id, userId));
    const groupIds = userGroups
      .map((g) => g.groupId)
      .filter((id): id is number => id !== null && id !== undefined);

    // 2. Get entities under these groups (active only)
    const groupEntities = await db
      .select({
        entityId: group_entity.entity_id,
        groupId: group_entity.group_id,
      })
      .from(group_entity)
      .where(inArray(group_entity.group_id, groupIds));
    const entityIds = groupEntities.map((e) => e.entityId).filter(Boolean);

    const entities = await db
      .select({
        id: entity.id,
        vehicleNumber: entity.vehicleNumber,
        vehicle_type: entity.type,
      })
      .from(entity)
      .where(and(inArray(entity.id, entityIds), eq(entity.status, true)));
    const entityMap = new Map(entities.map((e) => [e.vehicleNumber, e]));

    // Create a map of vehicle number to group IDs
    const vehicleGroupMap = new Map<string, number[]>();
    for (const groupEntity of groupEntities) {
      const entityInfo = entities.find((e) => e.id === groupEntity.entityId);
      if (entityInfo) {
        if (!vehicleGroupMap.has(entityInfo.vehicleNumber)) {
          vehicleGroupMap.set(entityInfo.vehicleNumber, []);
        }
        vehicleGroupMap
          .get(entityInfo.vehicleNumber)!
          .push(groupEntity.groupId);
      }
    }

    // Get group names for the group IDs
    const groupsData = await db
      .select({ id: group.id, group_name: group.group_name })
      .from(group)
      .where(inArray(group.id, groupIds));
    const groupNamesMap = new Map(groupsData.map((g) => [g.id, g.group_name]));

    const vehicleNumbers = entities.map((e) => e.vehicleNumber);

    // 3. Determine status filter
    let statusFilter: string[] | null = null; // null means no status filter (show all)

    if (!status || status === "active") {
      // Active means all statuses except inactive
      statusFilter = ["in_transit", "delivery", "pickup", "Active"]; // Note: keeping 'Active' for backward compatibility
    } else if (status === "inactive") {
      statusFilter = ["inactive", "Inactive"];
    } else if (status === "all") {
      // Show all statuses - no filter needed
      statusFilter = null;
    } else {
      // For specific status like 'intransit', 'delivery', 'pickup'
      statusFilter = [status, status.charAt(0).toUpperCase() + status.slice(1)]; // Handle case variations
    }

    // 4. Determine date range
    let filterStartDate: Date;
    let filterEndDate: Date;

    if (startDate && endDate) {
      filterStartDate = startDate;
      filterEndDate = endDate;
    } else {
      // Default: last 7 days
      filterEndDate = new Date();
      filterStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    interface ShipmentIdRow {
      id: number;
    }

    // 5. Query shipments with filters
    let shipmentQuery;
    if (statusFilter !== null) {
      shipmentQuery = db
        .select({ id: shipment.id })
        .from(shipment)
        .leftJoin(equipment, eq(equipment.shipment_id, shipment.id))
        .where(
          and(
            inArray(equipment.equipment_id, vehicleNumbers),
            inArray(shipment.status, statusFilter),
            gte(shipment.created_at, filterStartDate),
            lt(
              shipment.created_at,
              new Date(filterEndDate.getTime() + 24 * 60 * 60 * 1000)
            )
          )
        );
    } else {
      shipmentQuery = db
        .select({ id: shipment.id })
        .from(shipment)
        .leftJoin(equipment, eq(equipment.shipment_id, shipment.id))
        .where(
          and(
            inArray(equipment.equipment_id, vehicleNumbers),
            gte(shipment.created_at, filterStartDate),
            lt(
              shipment.created_at,
              new Date(filterEndDate.getTime() + 24 * 60 * 60 * 1000)
            )
          )
        );
    }

    const shipmentIdRows: ShipmentIdRow[] = await shipmentQuery;
    const shipmentIdsFromVehicles = shipmentIdRows.map((row) => row.id);

    if (shipmentIdsFromVehicles.length === 0) {
      return [];
    }

    // Build the final shipment query
    let finalShipmentQuery;
    if (statusFilter !== null) {
      finalShipmentQuery = db
        .select()
        .from(shipment)
        .where(
          and(
            inArray(shipment.id, shipmentIdsFromVehicles),
            inArray(shipment.status, statusFilter)
          )
        );
    } else {
      finalShipmentQuery = db
        .select()
        .from(shipment)
        .where(inArray(shipment.id, shipmentIdsFromVehicles));
    }

    const shipments = await finalShipmentQuery
      .limit(limit)
      .offset((page - 1) * limit);

    const shipmentIds = shipments.map((s) => s.id); // Get alert counts for these shipments grouped by alert type
    const alertCounts = await db
      .select({
        shipment_id: alert_shipment_relation.shipment_id,
        alarm_type_id: alarm.alarm_type_id, // Get the actual alarm type ID (1-7)
        alert_status: alert.status,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(alert_shipment_relation)
      .leftJoin(alert, eq(alert_shipment_relation.alert_id, alert.id))
      .leftJoin(alarm, eq(alert.alert_type, alarm.id)) // Join with alarm table to get alarm_type_id
      .where(
        inArray(alert_shipment_relation.shipment_id, shipmentIds.map(String))
      )
      .groupBy(
        alert_shipment_relation.shipment_id,
        alarm.alarm_type_id,
        alert.status
      );

    // Define alert type mapping based on alarm_type_id from schema
    const alertTypeMapping: Record<number, string> = {
      1: "stoppage",
      2: "overspeeding",
      3: "continuous_driving",
      4: "no_gps_feed",
      5: "reached_stop",
      6: "geofence",
      7: "route_deviation",
    };

    // Create alert counts map grouped by alert type
    const alertCountsMap: Record<
      string, // Changed from number to string
      {
        stoppage: { active: number; inactive: number; manually_closed: number };
        overspeeding: {
          active: number;
          inactive: number;
          manually_closed: number;
        };
        continuous_driving: {
          active: number;
          inactive: number;
          manually_closed: number;
        };
        no_gps_feed: {
          active: number;
          inactive: number;
          manually_closed: number;
        };
        reached_stop: {
          active: number;
          inactive: number;
          manually_closed: number;
        };
        geofence: { active: number; inactive: number; manually_closed: number };
        route_deviation: {
          active: number;
          inactive: number;
          manually_closed: number;
        };
        [key: string]: {
          active: number;
          inactive: number;
          manually_closed: number;
        };
      }
    > = {};

    // Initialize alert counts for each shipment with all 7 alert types
    for (const shipmentId of shipmentIds) {
      alertCountsMap[shipmentId.toString()] = {
        // Convert to string
        stoppage: { active: 0, inactive: 0, manually_closed: 0 },
        overspeeding: { active: 0, inactive: 0, manually_closed: 0 },
        continuous_driving: { active: 0, inactive: 0, manually_closed: 0 },
        no_gps_feed: { active: 0, inactive: 0, manually_closed: 0 },
        reached_stop: { active: 0, inactive: 0, manually_closed: 0 },
        geofence: { active: 0, inactive: 0, manually_closed: 0 },
        route_deviation: { active: 0, inactive: 0, manually_closed: 0 },
      };
    }

    // Process alert counts
    for (const alertCount of alertCounts) {
      if (
        alertCount.shipment_id &&
        alertCount.alarm_type_id &&
        alertCount.alert_status !== null
      ) {
        const shipmentId = alertCount.shipment_id; // This is now a string
        const count = alertCount.count;

        // Get alert type name from mapping
        const alertType = alertTypeMapping[alertCount.alarm_type_id];

        if (
          alertType &&
          alertCountsMap[shipmentId] &&
          alertCountsMap[shipmentId][alertType]
        ) {
          // Update counts based on status
          switch (alertCount.alert_status) {
            case 1: // Active
              alertCountsMap[shipmentId][alertType].active = count;
              break;
            case 0: // Inactive
              alertCountsMap[shipmentId][alertType].inactive = count;
              break;
            case 2: // Manually closed
              alertCountsMap[shipmentId][alertType].manually_closed = count;
              break;
          }
        }
      }
    }

    const equipmentRows = await db
      .select()
      .from(equipment)
      .where(inArray(equipment.shipment_id, shipmentIds));
    const equipmentMap = new Map(equipmentRows.map((e) => [e.shipment_id, e]));

    // 7. Get all stops for these shipments
    const stopsRows = await db
      .select()
      .from(stop)
      .where(inArray(stop.shipment_id, shipmentIds));
    const stopsMap: Record<number, any[]> = {};
    for (const stopRow of stopsRows) {
      if (stopRow.shipment_id !== null && stopRow.shipment_id !== undefined) {
        if (!stopsMap[stopRow.shipment_id]) stopsMap[stopRow.shipment_id] = [];
        stopsMap[stopRow.shipment_id].push(stopRow);
      }
    }
    const avgSpeedKmh = 40; // You can fetch this dynamically if available

    // 8. Get all customer LR details for these stops
    const stopIds = stopsRows.map((s) => s.id);
    const customerLRRows = await db
      .select()
      .from(customer_lr_detail)
      .where(inArray(customer_lr_detail.stop_id, stopIds));
    const customerLRMap: Record<number, any[]> = {};
    for (const lr of customerLRRows) {
      if (lr.stop_id !== null && lr.stop_id !== undefined) {
        if (!customerLRMap[lr.stop_id]) customerLRMap[lr.stop_id] = [];
        customerLRMap[lr.stop_id].push(lr);
      }
    }

    // 9. Get all customers for these LR details
    const customerIds = customerLRRows.map((lr) => lr.customer_id);
    const customersRows = await db
      .select()
      .from(customers)
      .where(inArray(customers.id, customerIds));
    const customersMap = new Map(customersRows.map((c) => [c.id, c]));

    // 10. Get GPS details for these shipments
    const gpsDetailsRows = await db
      .select()
      .from(gps_details)
      .where(inArray(gps_details.shipment_id, shipmentIds));
    const gpsDetailsMap = new Map(
      gpsDetailsRows.map((g) => [g.shipment_id, g])
    );

    // 11. Get latest GPS ping for each vehicle
    const gpsRows = await db
      .select()
      .from(gps_schema)
      .where(inArray(gps_schema.trailerNumber, vehicleNumbers));

    const gpsMap = new Map<string, any>();
    for (const row of gpsRows) {
      if (!row.trailerNumber) continue;
      const prev = gpsMap.get(row.trailerNumber);
      if (!prev || (row.timestamp && prev.timestamp < row.timestamp)) {
        gpsMap.set(row.trailerNumber, row);
      }
    }

    // 12. Build trips response (rest of the existing logic remains the same)
    const customerda = await fetchallusercustomers(userId);
    const daCustomerNames = new Set(customerda.map((c) => c.customer_name));

    const trips = await Promise.all(
      shipments.map(async (s) => {
        const equip = equipmentMap.get(s.id) as
          | (typeof equipmentRows)[number]
          | undefined;
        const stops = (stopsMap[s.id] || []).sort(
          (a, b) =>
            (a.actual_sequence ?? a.stop_sequence ?? 0) -
            (b.actual_sequence ?? b.stop_sequence ?? 0)
        );

        // Filter: Only include trips where at least one stop's customer_name is in daCustomerNames
        const hasUserCustomer = stops.some((stop) => {
          const lrArr = customerLRMap[stop.id] || [];
          return lrArr.some((lr) => {
            const customer = customersMap.get(lr.customer_id);
            return customer && daCustomerNames.has(customer.customer_name);
          });
        });
        if (!hasUserCustomer) return null;

        // Get vehicle groups for this trip's vehicle
        const vehicleNumber = equip?.equipment_id || "";
        const vehicleGroupIds = vehicleGroupMap.get(vehicleNumber) || [];
        const vehicleGroups = vehicleGroupIds.map((groupId) => ({
          group_id: groupId,
          group_name: groupNamesMap.get(groupId) || "",
        }));

        // Build route points for total distance
        const routePoints: Array<{ lat: number; lng: number }> = [];
        if (s.start_latitude != null && s.start_longitude != null) {
          routePoints.push({
            lat: Number(s.start_latitude),
            lng: Number(s.start_longitude),
          });
        }
        for (const stop of stops) {
          if (stop.latitude != null && stop.longitude != null) {
            routePoints.push({
              lat: Number(stop.latitude),
              lng: Number(stop.longitude),
            });
          }
        }
        if (s.end_latitude != null && s.end_longitude != null) {
          routePoints.push({
            lat: Number(s.end_latitude),
            lng: Number(s.end_longitude),
          });
        }

        // Total Distance
        let total_distance = 0;
        for (let i = 1; i < routePoints.length; i++) {
          total_distance += haversine(
            routePoints[i - 1].lat,
            routePoints[i - 1].lng,
            routePoints[i].lat,
            routePoints[i].lng
          );
        }
        total_distance = total_distance / 1000;

        // Covered Distance
        const coveredPoints: Array<{ lat: number; lng: number }> = [];
        if (s.start_latitude != null && s.start_longitude != null) {
          coveredPoints.push({
            lat: Number(s.start_latitude),
            lng: Number(s.start_longitude),
          });
        }
        const visitedStops = stops.filter((st) => st.entry_time);
        for (const stop of visitedStops) {
          if (stop.latitude != null && stop.longitude != null) {
            coveredPoints.push({
              lat: Number(stop.latitude),
              lng: Number(stop.longitude),
            });
          }
        }
        const currentGps = gpsMap.get(equip?.equipment_id ?? "");
        if (
          currentGps &&
          currentGps.latitude != null &&
          currentGps.longitude != null
        ) {
          coveredPoints.push({
            lat: Number(currentGps.latitude),
            lng: Number(currentGps.longitude),
          });
        }
        let covered_distance = 0;
        for (let i = 1; i < coveredPoints.length; i++) {
          covered_distance += haversine(
            coveredPoints[i - 1].lat,
            coveredPoints[i - 1].lng,
            coveredPoints[i].lat,
            coveredPoints[i].lng
          );
        }
        covered_distance = covered_distance / 1000;

        // GPS details
        const gpsDetailsRow = gpsDetailsMap.get(s.id);
        const gpsDetails = {
          gps_vendor: gpsDetailsRow?.gps_vendor ?? "",
          gps_frequency:
            gpsDetailsRow?.gps_frequency != null
              ? String(gpsDetailsRow.gps_frequency)
              : "",
          gps_type: gpsDetailsRow?.gps_type ?? "",
          gps_unit_id: gpsDetailsRow?.gps_unit_id ?? "",
        };

        const entityInfo = entityMap.get(equip?.equipment_id || "");

        let current_location_address = "";
        let current_location_coordinates: [number, number] | null = null;
        let last_gps_ping = "";
        let vehicle_status = "No Data";
        let last_gps_vendor = "";

        const latestGps = gpsMap.get(equip?.equipment_id ?? "");

        if (s.status === "inactive") {
          // For inactive trips, get the last GPS record before trip ended
          const tripEndTime = s.end_time
            ? new Date(s.end_time).getTime() / 1000
            : Date.now() / 1000;

          // Get all GPS records for this vehicle before trip end time
          const inactiveGpsRecords = gpsRows
            .filter(
              (row) =>
                row.trailerNumber === equip?.equipment_id &&
                row.gpstimestamp !== null &&
                Number(row.gpstimestamp) <= tripEndTime
            )
            .sort((a, b) => Number(b.gpstimestamp) - Number(a.gpstimestamp)); // Sort descending

          if (inactiveGpsRecords.length > 0) {
            const lastGpsBeforeInactive = inactiveGpsRecords[0];
            current_location_coordinates = ["-", "-"] as any; // Show "-" for inactive trips
            current_location_address = "-";
            last_gps_ping = lastGpsBeforeInactive.gpstimestamp
              ? formatDate(
                  new Date(
                    Number(lastGpsBeforeInactive.gpstimestamp) * 1000
                  ).toISOString()
                )
              : "";
            last_gps_vendor = lastGpsBeforeInactive.GPSVendor || "";
          } else {
            // No GPS data found
            current_location_coordinates = ["-", "-"] as any;
            current_location_address = "-";
            last_gps_ping = "";
            last_gps_vendor = "";
          }
        } else {
          if (
            latestGps &&
            latestGps.latitude != null &&
            latestGps.longitude != null
          ) {
            current_location_coordinates = [
              Number(latestGps.latitude),
              Number(latestGps.longitude),
            ];
            try {
              // current_location_address = await reverseGeocode(
              //   Number(latestGps.latitude),
              //   Number(latestGps.longitude)
              // );
            } catch {
              current_location_address = "";
            }
            // last_gps_ping=latestGps.timestamp;
            last_gps_ping = latestGps.gpstimestamp
              ? formatDate(
                  new Date(Number(latestGps.gpstimestamp) * 1000).toISOString()
                )
              : latestGps.timestamp || "";
            last_gps_vendor = latestGps.GPSVendor || "";
          }
        }
        // Fix: Only access latestGps.gpstimestamp if latestGps is defined
        if (latestGps && latestGps.gpstimestamp) {
          const now = Date.now();
          const pingTime = Number(latestGps.gpstimestamp) * 1000;
          const diffHours = (now - pingTime) / (1000 * 60 * 60);
          vehicle_status = diffHours <= 3 ? "Active" : "No Update";
        } else {
          vehicle_status = "No Data";
        }
        // Per-stop info
        const planned_stops = await Promise.all(
          stops.map(async (stop) => {
            const lrArr = customerLRMap[stop.id] || [];
            const lr = lrArr[0];
            const customer = lr ? customersMap.get(lr.customer_id) : null;
            let pickup_location = "";
            if (stop.latitude && stop.longitude) {
              try {
                pickup_location = await reverseGeocode(
                  Number(stop.latitude),
                  Number(stop.longitude)
                );
              } catch {
                pickup_location = "";
              }
            }
            let loading_unloading_time = stop.loading_unloading_time || "1h";
            const [geofence] = await db
              .select()
              .from(geofence_table)
              .where(eq(geofence_table.location_id, stop.location_id))
              .limit(1);
            if (geofence && geofence.time)
              loading_unloading_time = geofence.time;

            let status = "Pending";
            if (stop.exit_time) status = "Complete";
            else if (stop.entry_time) status = "In Progress";

            let detention_time = "";

            if (stop.entry_time && stop.exit_time) {
              const entry = new Date(stop.entry_time).getTime();
              const exit = new Date(stop.exit_time).getTime();
              const stoppage = stop.detention_time
                ? Number(stop.detention_time)
                : 0;
              let detentionMs = exit - entry - stoppage;
              if (detentionMs < 0) detentionMs = 0;
              const hours = Math.floor(detentionMs / (1000 * 60 * 60));
              const minutes = Math.floor(
                (detentionMs % (1000 * 60 * 60)) / (1000 * 60)
              );
              detention_time = `${hours}h ${minutes}m`;
            }
            let gname = "";
            const loadingtime =
              stop.location_id != null
                ? await db
                    .select()
                    .from(geofence_table)
                    .where(eq(geofence_table.location_id, stop.location_id))
                    .limit(1)
                : [];
            for (const stop of stopsRows) {
              if (loadingtime.length > 0) {
                gname = loadingtime[0].geofence_name || "";
              }
              if (stop.entry_time && stop.exit_time) {
                stop.ceta = "0";
                status = "completed";
                const entryTimeMs = new Date(stop.entry_time).getTime();
                const exitTimeMs = new Date(stop.exit_time).getTime();

                stop.detention_time = String(
                  exitTimeMs - entryTimeMs - Number(loadingtime[0]?.time || 1)
                );
              } else {
                // Calculate ceta as ETA from current location to stop (in minutes)
                if (
                  latestGps &&
                  latestGps.longitude &&
                  latestGps.latitude &&
                  stop.latitude &&
                  stop.longitude &&
                  avgSpeedKmh > 0
                ) {
                  const distance = haversine(
                    Number(latestGps.latitude),
                    Number(latestGps.longitude),
                    Number(stop.latitude),
                    Number(stop.longitude)
                  );
                  // console.log("Distance to stop:", distance, "km");
                  const cetaMinutes = Math.round(distance / avgSpeedKmh); // Convert hours to minutes
                  stop.ceta = cetaMinutes.toString();

                  // Calculate expected arrival time
                  const now = Date.now();
                  const expectedArrival = now + cetaMinutes * 60 * 1000;
                  const plannedTime = stop.planned_departure_date
                    ? new Date(stop.planned_departure_date).getTime()
                    : 0;

                  if (plannedTime >= expectedArrival) {
                    status = "on_time";
                  } else {
                    status = "delayed";
                  }
                } else {
                  stop.ceta = "0";
                  status = "on_time";
                }
              }

              // Calculate geta (actual time taken to reach stop, if available)
              // if (stop.geta) {
              //   const getaTime = stop.geta ? new Date(stop.geta).getTime() : 0;
              //   const entryTime = stop.entry_time ? new Date(stop.entry_time).getTime() : 0;
              //   const geta = Math.round((getaTime - entryTime) / 1000 / 60);
              //   stop.geta = geta.toString();
              // } else {
              //   stop.geta = "0";
              // }
            }

            return {
              planned_stop: stop.stop_sequence,
              location_id: stop.location_id,
              location_name: customer?.customer_location || "",
              pickup_location,
              stop_type: stop.stop_type === "P" ? "Pickup" : "Delivery",
              lr_number: lr?.lr_number || "",
              customer_name: customer?.customer_name || "",
              status,
              loading_unloading_time,
              entry_time: stop.entry_time || "",
              exit_time: stop.exit_time || "",
              actual_sequence: stop.actual_sequence || 0,
              ceta: stop.ceta || "",
              geta: "0",
              detention_time,
              geofence_name: gname || "",
            };
          })
        );

        const allGpsRecords = gpsRows
          .filter(
            (row) =>
              row.trailerNumber === equip?.equipment_id &&
              row.timestamp !== null
          )
          .sort(
            (a, b) =>
              new Date(a.timestamp ?? 0).getTime() -
              new Date(b.timestamp ?? 0).getTime()
          )
          .map((row) => ({
            ...row,
            timestamp: row.timestamp as string | number,
          }));

        const totalStoppageMs = calculateTotalStoppageTimeFromGPS(
          allGpsRecords.map((rec) => ({
            latitude: rec.latitude != null ? Number(rec.latitude) : 0,
            longitude: rec.longitude != null ? Number(rec.longitude) : 0,
            timestamp: rec.timestamp,
          }))
        );

        // Calculate total detention time (exit-entry for all stops + total stoppage)
        const totalDetentionMs = calculateTotalDetentionTime(
          stops,
          totalStoppageMs
        );
        const totalDetentionTime = formatMsToHoursMinutes(totalDetentionMs);

        // Calculate status durations
        // console.log("Calculating status durations from GPS records...");

        const statusDurations = calculateStatusDurationsFromGPS(
          allGpsRecords,
          s.start_time ? Math.floor(new Date(s.start_time).getTime() / 1000) : 0
        );

        // Example: Calculate ceta and trip eta for each trip

        const stopsForEta = stops
          .filter((st) => st.latitude && st.longitude)
          .map((st) => ({
            latitude: Number(st.latitude),
            longitude: Number(st.longitude),
          }));

        const tripEta =
          stopsForEta.length >= 2
            ? calculateTripEtaHours(stopsForEta, avgSpeedKmh).toFixed(2) + "h"
            : "";
        const ceta = tripEta;
        // Determine vehicle/trip status
        const currentStop = stops.find((st) => st.entry_time && !st.exit_time);
        const atStop = !!currentStop;
        const stopType = currentStop?.stop_type === "P" ? "pickup" : "delivery";
        const vehicleTripStatus = getVehicleTripStatus(
          s.status ?? "",
          atStop,
          stopType
        );

        // Calculate total drive time (trip completed time - total stoppage time)
        const totalDriveMs = calculateTotalDriveTime(
          s.start_time === null ? undefined : s.start_time,
          s.end_time === null ? undefined : s.end_time,
          totalStoppageMs
        );
        const totalDriveTime = formatMsToHoursMinutes(totalDriveMs);
        const startTime = s.start_time ? new Date(s.start_time).getTime() : 0;
        const endTime = s.end_time
          ? new Date(s.end_time).getTime()
          : Date.now();

        const tt = endTime - startTime;

        return {
          id: s.shipment_id,
          route_Name: s.route_name,
          Domain_Name: s.domain_name,
          Start_Time: s.created_at
            ? formatDate(new Date(s.created_at).toISOString())
            : "",
          End_Time: s.end_time || "",
          total_time: tt ? formatMsToHoursMinutes(Number(tt)) : "0h 0m",
          driverName: equip?.driver_name || "",
          driverMobile: equip?.driver_mobile_no || "",
          serviceProviderAlias: equip?.service_provider_alias_value || "",
          Vehicle_number: equip?.equipment_id || "",
          vehicle_type: entityInfo?.vehicle_type || "",
          vehicle_groups: vehicleGroups,
          cuurent_location_address:
            s.status == "inactive" ? "-" : current_location_address,
          current_location_coordindates:
            s.status == "inactive" ? ["-", "-"] : current_location_coordinates,
          last_gps_ping: last_gps_ping,
          last_gps_vendor: last_gps_vendor || "",
          shipment_source: "logifriet",

          gps_vendor: gpsDetails.gps_vendor || "",
          gps_frequency: gpsDetails.gps_frequency || "",
          gps_type: gpsDetails.gps_type || "",
          gps_unit_id: gpsDetails.gps_unit_id || "",
          total_distance: total_distance.toFixed(2) + "km",
          total_covered_distance: covered_distance.toFixed(2) + "km",
          average_distance:
            typeof tt != "number" || tt === 0
              ? "0km"
              : (Number(covered_distance) / Number(tt)).toFixed(2) + " km",
          status: s.status,
          origin: s.start_location,
          destination: s.end_location,
          origin_coordinates: [
            s.start_latitude ? Number(s.start_latitude) : 0,
            s.start_longitude ? Number(s.start_longitude) : 0,
          ] as [number, number],
          destination_coordinates: [
            s.end_latitude ? Number(s.end_latitude) : 0,
            s.end_longitude ? Number(s.end_longitude) : 0,
          ] as [number, number],
          ceta,
          tripEta,
          vehicleTripStatus,
          alert_counts_by_type: alertCountsMap[s.id] || {
            overspeeding: { active: 0, inactive: 0, manually_closed: 0 },
            continuous_driving: { active: 0, inactive: 0, manually_closed: 0 },
            route_deviation: { active: 0, inactive: 0, manually_closed: 0 },
            stoppage: { active: 0, inactive: 0, manually_closed: 0 },
          },
          Vehicle_status: vehicle_status,
          status_duration: equip?.status_duration || statusDurations || "0h 0m",
          total_detention_time: totalDetentionTime,
          total_drive_time: totalDriveTime,
          total_stoppage_time: formatMsToHoursMinutes(totalStoppageMs),
          planned_stops,
        };
      })
    );

    return trips.filter(Boolean);
  } catch (error) {
    console.error("❌ Error fetching trips:", error);
    throw new Error("Unable to fetch trip data");
  }
}

export async function insertTripFromXML() {
  for (let i = 1; i < 201; i++) {
    const data = await readTripXMLData(`${i}.xml`);
    // console.log(data.TransmissionDetails.Shipment.Stops);
    const res = await insertData(data);
  }

  // const data = await readTripXMLData("1.xml");
  // const res= await insertData(data);
  // console.log(res);
  return { message: "Data inserted successfully" };
}

//working
export async function insertData(data: any) {
  const dt = await db
    .select()
    .from(shipment)
    .where(
      eq(shipment.shipment_id, data.TransmissionDetails.Shipment.Shipment_Id)
    )
    .limit(1);
  if (dt.length > 0) {
    // console.log("Shipment already exists with ID:", data.TransmissionDetails.Shipment.Shipment_Id);
    return { message: "Shipment already exists" };
  }
  //if user is authaticated then only insert the data
  console.log(data);
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, data.TransmissionHeader.UserName))
    .limit(1);
  // console.log("User found:", user);
  if (
    user.length === 0 ||
    data.TransmissionHeader.UserName !== user[0].username
  ) {
    console.log("User not found:", data.TransmissionHeader.UserName);
    return { message: "User not found" };
  }

  const authticated = bcrypt.compareSync(
    data.TransmissionHeader.Password,
    user[0].password
  );

  if (!authticated) {
    return { message: "User not authenticated" };
  }

  const checkvechicleexist = await db
    .select()
    .from(entity)
    .where(
      eq(
        entity.vehicleNumber,
        data.TransmissionDetails.Shipment.Equipment.Equipment_Id
      )
    )
    .limit(1);

  if (checkvechicleexist.length == 0) {
    // Vehicle doesn't exist, create it
    try {
      console.log(
        "Vehicle not found, creating new entity:",
        data.TransmissionDetails.Shipment.Equipment.Equipment_Id
      );

      // Get all active vendors
      const allActiveVendors = await db
        .select()
        .from(vendor)
        .where(eq(vendor.status, true));

      if (allActiveVendors.length === 0) {
        console.warn("No active vendors found, cannot create entity");
        return { message: "No active vendors available to create entity" };
      }

      const vendorIds = allActiveVendors.map((v) => v.id);

      // Create entity with default values
      const [insertedEntity] = await db
        .insert(entity)
        .values({
          vehicleNumber:
            data.TransmissionDetails.Shipment.Equipment.Equipment_Id,
          type: "car", // Default type
          status: true, // Active by default
        })
        .$returningId();

      // Create vendor relationships with all active vendors
      for (const vendorId of vendorIds) {
        await db.insert(entity_vendor).values({
          entity_id: insertedEntity.id,
          vendor_id: vendorId,
        });
      }

      console.log("Entity created successfully with ID:", insertedEntity.id);
    } catch (entityError) {
      console.error("Error creating entity:", entityError);
      return { message: "Failed to create entity for vehicle" };
    }
  }

  const transmissionHeader = data.TransmissionHeader;
  const TransmissionId = await db
    .insert(transmission_header)
    .values({
      username: transmissionHeader.UserName,
      password: transmissionHeader.Password,
      token: transmissionHeader.Token || "",
    })
    .$returningId();

  //fetch the longitude and latitude of the current vehicle from gps_schema latest
  const gpsSchema = await db
    .select()
    .from(gps_schema)
    .where(
      eq(
        gps_schema.trailerNumber,
        data.TransmissionDetails.Shipment.Equipment.Equipment_Id
      )
    )
    .orderBy(desc(gps_schema.timestamp))
    .limit(1);

  let current_address = "";
  if (gpsSchema.length > 0 && gpsSchema[0].latitude && gpsSchema[0].longitude) {
    console.log("Fetching current address from GPS schema:", gpsSchema[0]);
    current_address = await reverseGeocode(
      Number(gpsSchema[0].latitude),
      Number(gpsSchema[0].longitude)
    );
  }

  // let last_location = "";

  // if (data.TransmissionDetails.Shipment.Stops) {
  //   const w = data.TransmissionDetails.Shipment.Stops.Stop || [];
  //   if (w.length > 0) {
  //     const lastStop = w[w.length - 1];
  //     if (lastStop.Latitude && lastStop.Longitude) {
  //       last_location = await reverseGeocode(
  //         Number(lastStop.Latitude),
  //         Number(lastStop.Longitude)
  //       );
  //     }
  //   }
  // }

  // ...existing code continues...
  const shipmentData = data.TransmissionDetails.Shipment;
  const current_time = new Date().toISOString();
  const shipmentid = await db
    .insert(shipment)
    .values({
      domain_name: shipmentData.Domain_Name,
      shipment_id: shipmentData.Shipment_Id,
      route_name: shipmentData.RouteName,
      transmission_header_id: Number(TransmissionId[0].id),
      status: "in_transit",
      route_id: "",
      route_type: "",
      start_time: current_time,
      end_time: "",
      current_location: "",
      location_datetime: "",
      current_latitude: 0,
      current_longitude: 0,
      total_detention_time: "",
      total_stoppage_time: "",
      total_drive_time: "",
      start_location: current_address || "",
      end_location: "",
      start_latitude:
        gpsSchema.length > 0 && gpsSchema[0].latitude != null
          ? parseFloat(String(gpsSchema[0].latitude))
          : 0,
      start_longitude:
        gpsSchema.length > 0 && gpsSchema[0].longitude != null
          ? parseFloat(String(gpsSchema[0].longitude))
          : 0,
      end_latitude: 0,
      end_longitude: 0,
    })
    .$returningId();

  const equipmentData = shipmentData.Equipment;
  const equipmentid = await db
    .insert(equipment)
    .values({
      equipment_id: equipmentData.Equipment_Id,
      service_provider_alias_value: equipmentData.ServiceProviderAliasValue,
      driver_name: equipmentData.DriverName,
      driver_mobile_no: equipmentData.DriverMobileNo,
      shipment_id: Number(shipmentid[0].id),
      vehicle_name: "",
      vehicle_status: "",
      status_duration: "",
      driver_details: "",
      created_at: new Date(),
      updated_at: new Date(),
    })
    .$returningId();

  // Insert GPS Details first to check vendor
  const gpsDetails = shipmentData.GPSDetails;
  const gpsDetailsId = await db
    .insert(gps_details)
    .values({
      gps_type: gpsDetails.GPSType,
      gps_frequency: parseInt(gpsDetails.GPSFrequency, 10),
      gps_unit_id: gpsDetails.GPSUnitID,
      gps_vendor: gpsDetails.GPSVendor,
      shipment_id: Number(shipmentid[0].id),
      created_at: new Date(),
      updated_at: new Date(),
    })
    .$returningId();

  // Only call Intutrack API if GPS vendor is "Intugine" and driver mobile number exists
  if (gpsDetails.GPSVendor === "Intugine" && equipmentData.DriverMobileNo) {
    try {
      await saveIntutrackDetails(equipmentData.DriverMobileNo);
    } catch (error) {
      console.warn("Failed to save Intutrack details:", error);
      // Don't fail the entire trip creation if Intutrack fails
    }
  }

  const eventData = shipmentData.Events.Event;
  const eventid = await db
    .insert(event)
    .values({
      event_code: eventData.EventCode,
      event_datetime: eventData.EventDateTime,
      shipment_id: Number(shipmentid[0].id),
      event_type: "",
      event_location: "",
      event_latitude: 0,
      event_longitude: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .$returningId();

  const stops = shipmentData.Stops.Stop || [];
  for (const st of stops) {
    const address = await reverseGeocode(
      Number(st.Latitude),
      Number(st.Longitude)
    );
    // const address = "";
    //insert only those who are not present
    const existingGeofence = await db
      .select()
      .from(geofence_table)
      .where(
        and(
          eq(geofence_table.location_id, st.Location_Id),
          eq(geofence_table.stop_type, st.StopType)
        )
      )
      .limit(1);

    const getIndianTime = () => {
      const now = new Date();
      const indianTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // Add 5 hours 30 minutes
      return indianTime;
    };

    if (existingGeofence.length === 0) {
      await db.insert(geofence_table).values({
        geofence_name: String(st.Location_Id),
        radius: parseInt(st.GeoFenceRadius, 10) || 0,
        latitude: parseFloat(st.Latitude),
        longitude: parseFloat(st.Longitude),
        location_id: st.Location_Id,
        created_at: getIndianTime(),
        updated_at: getIndianTime(),
        stop_type: st.StopType,
        geofence_type: 0,
        status: true,
        address: address || "",
      });
    }

    const stopId = await db
      .insert(stop)
      .values({
        location_id: st.Location_Id,
        stop_type: st.StopType,
        stop_sequence: parseInt(st.StopSequence, 10),
        latitude: parseFloat(st.Latitude),
        longitude: parseFloat(st.Longitude),
        geo_fence_radius: parseInt(st.GeoFenceRadius, 10) || 0,
        planned_departure_date: st.PlannedDepartureDate || "",
        shipment_id: Number(shipmentid[0].id),
        stop_name: "",
        stop_status: "",
        ceta: "",
        geta: "",
        actual_sequence: 0,
        entry_time: "",
        exit_time: "",
        detention_time: "",
        point_number: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .$returningId();

    const customerLRDetails = st.CustomerLRDetails?.CustomerLRDetail || [];
    const customerLRDetailsArray = Array.isArray(customerLRDetails)
      ? customerLRDetails
      : [customerLRDetails];

    for (const lrDetail of customerLRDetailsArray) {
      // console.log("Inserting Customer LR Detail:", lrDetail);

      let customerId: number;
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.customer_id, lrDetail.Customer_ID))
        .limit(1);

      if (existingCustomer.length > 0) {
        customerId = existingCustomer[0].id;
      } else {
        const [newCustomer] = await db
          .insert(customers)
          .values({
            customer_id: lrDetail.Customer_ID,
            customer_name: lrDetail.Customer_Name || "",
            customer_location: lrDetail.Customer_Location || "",
          })
          .$returningId();

        customerId = newCustomer.id;
      }

      await db.insert(customer_lr_detail).values({
        lr_number: lrDetail.LrNumber || "",
        customer_id: customerId,
        stop_id: Number(stopId[0].id),
      });
    }
  }

  return data;
}

// Helper function to save Intutrack details
export async function saveIntutrackDetails(phoneNumber: string) {
  if (!phoneNumber) return;

  try {
    // Call Intutrack API
    const intutrackResponse = await fetch(
      `${process.env.INTUTRACK_API_URL}/consents?tel=${phoneNumber}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${process.env.INTUTRACK_BASE_AUTH}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!intutrackResponse.ok) {
      throw new Error(
        `Intutrack API failed with status: ${intutrackResponse.status}`
      );
    }

    const apiData = await intutrackResponse.json();

    if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
      console.log(`No consent data found for phone: ${phoneNumber}`);
      return;
    }

    const consentData = apiData[0].result;

    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(intutrack_relation)
      .where(eq(intutrack_relation.phone_number, phoneNumber))
      .limit(1);

    if (existingRecord.length > 0) {
      // Update existing record
      await db
        .update(intutrack_relation)
        .set({
          current_consent: consentData.current_consent,
          consent: consentData.consent,
          operator: consentData.operator,
        })
        .where(eq(intutrack_relation.phone_number, phoneNumber));
    } else {
      // Insert new record
      await db.insert(intutrack_relation).values({
        phone_number: phoneNumber,
        current_consent: consentData.current_consent,
        consent: consentData.consent,
        operator: consentData.operator,
      });
    }

    console.log(`Intutrack details saved for phone: ${phoneNumber}`);
  } catch (error) {
    console.error(
      `Error saving Intutrack details for phone ${phoneNumber}:`,
      error
    );
    throw error;
  }
}

//working
export async function getAllCustomers(page = 1, limit = 100) {
  try {
    const customersData = await db
      .select()
      .from(customers)
      .limit(limit)
      .offset((page - 1) * limit);

    const totalCountResult = await db.execute<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM customers`
    );
    const totalCount = totalCountResult as unknown as { count: number }[];

    return {
      customers: customersData,
      pagination: {
        total: Number(totalCount[0]?.count || 0),
        page,
        limit,
      },
    };
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
}

export async function getTripsByCustomerId(customerId: string) {
  try {
    // Find the internal customer ID from the customer_id field
    const customerRecord = await db
      .select()
      .from(customers)
      .where(eq(customers.customer_id, customerId))
      .limit(1);

    if (!customerRecord.length) {
      return [];
    }

    // Find all LR details for this customer
    const lrDetails = await db
      .select({
        stopId: customer_lr_detail.stop_id,
      })
      .from(customer_lr_detail)
      .where(eq(customer_lr_detail.customer_id, customerRecord[0].id));

    if (!lrDetails.length) {
      return [];
    }

    // Get the stop IDs
    const stopIds = lrDetails.map((lr) => lr.stopId).filter(Boolean);

    // Find the trips containing these stops
    const stops = await db
      .select({
        shipmentId: stop.shipment_id,
      })
      .from(stop)
      .where(
        inArray(
          stop.id,
          stopIds.filter((id): id is number => id !== null && id !== undefined)
        )
      );

    const shipmentIds = [
      ...new Set(stops.map((s) => s.shipmentId).filter(Boolean)),
    ];

    if (!shipmentIds.length) {
      return [];
    }

    // Get the trip details
    const validShipmentIds = shipmentIds.filter(
      (id): id is number => id !== null && id !== undefined
    );
    if (!validShipmentIds.length) {
      return [];
    }
    const trips = await db
      .select()
      .from(shipment)
      .where(
        and(
          inArray(shipment.id, validShipmentIds),
          eq(shipment.status, "Active")
        )
      );

    return trips;
  } catch (error) {
    console.error("Error fetching trips by customer ID:", error);
    throw error;
  }
}

function calculateStatusDurationsFromGPS(
  gpsRecords: Array<{ timestamp: string | number }>,
  tripStartTime: string | number | null = null,
  thresholdHours = 3 * 1000 * 60 * 60 // 3 hours in milliseconds
): string {
  if (!gpsRecords || gpsRecords.length === 0) return "0h";

  console.log(tripStartTime);

  // Sort GPS records by timestamp
  let result = 0;
  gpsRecords.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Sort in descending order
  });
  if (gpsRecords.length === 0) return "0";
  console.log("GPS Records:", gpsRecords[gpsRecords.length - 1].timestamp);

  // console.log("GPS Records:", gpsRecords);
  // console.log("Trip Start Time:", tripStartTime);

  result +=
    Date.now() - Number(gpsRecords[gpsRecords.length - 1].timestamp) * 1000;
  // result+=(Date.now() - 1749479710*1000 )/ (1000 * 60 * 60);
  // 1749479710
  // console.log("Initial Result:", gpsRecords[gpsRecords.length-1].timestamp);

  if (result <= thresholdHours) {
    for (let i = gpsRecords.length - 1; i > 0; i--) {
      // if (Number(gpsRecords[i].timestamp) < Number(tripStartTime)) {
      //   break;
      // }
      const timeA = new Date(gpsRecords[i].timestamp).getTime();
      const timeB = new Date(gpsRecords[i - 1].timestamp).getTime();
      const diff = timeB - timeA; // Difference in hours
      if (diff <= thresholdHours) {
        result += diff;
      } else {
        break;
      }
    }
  } else {
    for (let i = 0; i < gpsRecords.length - 1; i++) {
      const timeA = new Date(gpsRecords[i].timestamp).getTime();
      const timeB = new Date(gpsRecords[i + 1].timestamp).getTime();
      const diff = timeB - timeA; // Difference in hours
      if (diff >= thresholdHours) {
        result += diff;
      } else {
        break;
      }
    }
  }

  console.log("result", result);
  return formatMsToHoursMinutes(Number(result)); // Return total duration in hours
}

function calculateEtaBetweenStops(
  stopA: { latitude: number; longitude: number },
  stopB: { latitude: number; longitude: number },
  gpsPings: Array<{ speed: number }>
): number {
  // 1. Calculate distance between stops (in meters)
  const distanceMeters = haversine(
    stopA.latitude,
    stopA.longitude,
    stopB.latitude,
    stopB.longitude
  );

  // 2. Calculate average speed (in km/h)
  const speeds = gpsPings
    .map((p) => p.speed)
    .filter((s) => typeof s === "number" && s > 0);
  if (speeds.length === 0) return -1; // Cannot calculate ETA

  const avgSpeedKmh = speeds.reduce((a, b) => a + b, 0) / speeds.length;

  // 3. Convert average speed to m/s
  const avgSpeedMs = (avgSpeedKmh * 1000) / 3600;

  // 4. ETA in seconds
  const etaSeconds = distanceMeters / avgSpeedMs;

  return etaSeconds;
}

function calculateEtaHours(
  stopA: { latitude: number; longitude: number },
  stopB: { latitude: number; longitude: number },
  avgSpeedKmh: number
): number {
  if (!avgSpeedKmh || avgSpeedKmh <= 0) return 0;
  const distanceMeters = haversine(
    stopA.latitude,
    stopA.longitude,
    stopB.latitude,
    stopB.longitude
  );
  const distanceKm = distanceMeters / 1000;
  return distanceKm / avgSpeedKmh;
}

function calculateTripEtaHours(stops: any, avgSpeedKmh: number): number {
  //sort temo on the basis of stop_sequence
  stops.sort((a: any, b: any) => a.stop_sequence - b.stop_sequence);
  if (stops.length < 2 || !avgSpeedKmh || avgSpeedKmh <= 0) return 0;
  let totalEtaHours = 0;
  // console.log("Calculating total ETA for stops:", stops);
  for (let i = 0; i < stops.length - 1; i++) {
    const stopA = {
      latitude: stops[i].latitude,
      longitude: stops[i].longitude,
    };
    const stopB = {
      latitude: stops[i + 1].latitude,
      longitude: stops[i + 1].longitude,
    };
    totalEtaHours += haversine(
      Number(stopA.latitude),
      Number(stopA.longitude),
      Number(stopB.latitude),
      Number(stopB.longitude)
    );
  }
  console.log(totalEtaHours);
  return Number(totalEtaHours) / Number(avgSpeedKmh); // Return total ETA in hours
}

function getVehicleTripStatus(
  tripStatus: string,
  atStop: boolean,
  stopType?: string
): "inactive" | "at_stop_delivery" | "at_stop_pickup" | "in_transit" {
  if (tripStatus.toLowerCase() === "inactive") return "inactive";
  if (atStop) {
    if (stopType?.toLowerCase() === "pickup") return "at_stop_pickup";
    if (stopType?.toLowerCase() === "delivery") return "at_stop_delivery";
  }
  return "in_transit";
}

function calculateTotalStoppageTimeFromGPS(
  gpsRecords: Array<{
    latitude: number;
    longitude: number;
    timestamp: string | number;
  }>
): number {
  if (!gpsRecords || gpsRecords.length < 2) return 0;
  let totalStoppageMs = 0;
  for (let i = 1; i < gpsRecords.length; i++) {
    const prev = gpsRecords[i - 1];
    const curr = gpsRecords[i];
    if (prev.latitude === curr.latitude && prev.longitude === curr.longitude) {
      const prevTime = new Date(prev.timestamp).getTime();
      const currTime = new Date(curr.timestamp).getTime();
      if (currTime > prevTime) {
        totalStoppageMs += currTime - prevTime;
      }
    }
  }
  return totalStoppageMs;
}

function parseTimeStringToMs(timeString: string): number {
  const timeRegex = /(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?/;
  const match = timeString.match(timeRegex);

  if (!match) return 0;

  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10);
  const minutes = parseInt(match[3] || "0", 10);

  return (
    days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000 + minutes * 60 * 1000
  );
}

function calculateTotalDetentionTime(
  stops: Array<{
    entry_time?: string | Date;
    exit_time?: string | Date;
    detention_time?: string | number;
  }>,
  totalStoppageMs: number
): number {
  let detentionMs = 0;

  // Check if stops have detention_time field in schema
  const hasDetentionTimeInSchema = stops.some(
    (stop) => stop.detention_time !== undefined && stop.detention_time !== null
  );

  if (hasDetentionTimeInSchema) {
    // Sum detention_time from stops schema
    for (const stop of stops) {
      if (stop.detention_time) {
        // Convert detention_time to milliseconds if it's a string (like "2h 30m")
        if (typeof stop.detention_time === "string") {
          detentionMs += parseTimeStringToMs(stop.detention_time);
        } else if (typeof stop.detention_time === "number") {
          detentionMs += stop.detention_time;
        }
      }
    }
  } else {
    // Fallback to calculating from entry/exit times
    for (const stop of stops) {
      if (stop.entry_time && stop.exit_time) {
        const entry = new Date(stop.entry_time).getTime();
        const exit = new Date(stop.exit_time).getTime();
        if (exit > entry) {
          detentionMs += exit - entry;
        }
      }
    }
  }
  return detentionMs + totalStoppageMs;
}

function calculateTotalDriveTime(
  tripStart: string | Date | undefined,
  tripEnd: string | Date | undefined,
  totalStoppageMs: number
): number {
  if (!tripStart || !tripEnd) return 0;
  const start = new Date(tripStart).getTime();
  const end = new Date(tripEnd).getTime();
  if (end <= start) return 0;
  return Math.max(0, end - start - totalStoppageMs);
}

function formatMsToHoursMinutes(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${minutes}m`;
}

export async function getTripEnd(data: any) {
  try {
    // console.log(`🏁 Processing trip end for trip ID: ${tripId}`);
    // return "";
    const tripId = data.Transmission.TransmissionDetails.Shipment.Shipment_Id;
    const equipment_id =
      data.Transmission.TransmissionDetails.Shipment.Equipment.Equipment_Id;
    // Find the active shipment by trip/shipment ID
    const [activeShipment] = await db
      .select()
      .from(shipment)
      .where(
        and(
          ne(shipment.status, "inactive"),
          eq(shipment.shipment_id, String(tripId))
        )
      )
      .limit(1);

    if (!activeShipment) {
      console.log(`⚠️ No active shipment found for trip ID: ${tripId}`);
      return {
        success: false,
        message: `No active trip found with ID: ${tripId}`,
      };
    }

    // Update shipment status to inactive and set end time
    const endTime = new Date().toISOString();
    const current_gps = await db
      .select()
      .from(gps_schema)
      .where(eq(gps_schema.trailerNumber, equipment_id))
      .orderBy(desc(gps_schema.timestamp))
      .limit(1);
    // console.log(current_gps);
    let current_location_coordinates: [number, number] = [0, 0];
    let address = "";
    if (!current_gps || current_gps.length === 0) {
      console.log(`⚠️ No GPS data found for equipment ID: ${equipment_id}`);
    } else {
      current_location_coordinates = [
        current_gps[0].latitude != null ? current_gps[0].latitude : 0,
        current_gps[0].longitude != null ? current_gps[0].longitude : 0,
      ];
      address = await reverseGeocode(
        Number(current_location_coordinates[0]),
        Number(current_location_coordinates[1])
      );
    }
    await db
      .update(shipment)
      .set({
        status: "inactive",
        end_time: endTime,
        updated_at: new Date(),
        end_location: address || "",
        end_latitude: current_location_coordinates[0],
        end_longitude: current_location_coordinates[1],
      })
      .where(eq(shipment.id, activeShipment.id));

    // Optional: Update all associated equipment status
    await db
      .update(equipment)
      .set({
        updated_at: new Date(),
      })
      .where(eq(equipment.shipment_id, activeShipment.id));

    console.log(`✅ Trip ${tripId} marked as inactive. End time: ${endTime}`);

    return {
      success: true,
      message: `Trip ${tripId} completed successfully`,
      data: {
        tripId: tripId,
        endTime: endTime,
        shipmentId: activeShipment.shipment_id,
      },
    };
  } catch (error) {
    console.error("❌ Error ending trip:", error);
    return {
      success: false,
      message: "Failed to end trip",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getTripsByCustomerGroups(
  customerGroupIds: number[],
  startDate: Date,
  endDate: Date,
  tripStatus: "active" | "inactive" | "all" = "all"
) {
  try {
    // 1. Get all customers from the provided customer groups
    const customerGroupRelations = await db
      .select({ customerId: customer_group_relation.customer_id })
      .from(customer_group_relation)
      .where(inArray(customer_group_relation.group_id, customerGroupIds));

    const customerIds = customerGroupRelations
      .map((r) => r.customerId)
      .filter((id): id is number => id !== null && id !== undefined);

    if (customerIds.length === 0) {
      return [];
    }
    // 2. Get all customer names for filtering
    const customersData = await db
      .select()
      .from(customers)
      .where(inArray(customers.id, customerIds));

    const customerNames = new Set(customersData.map((c) => c.customer_name));

    // 3. Determine status filter
    let statusFilter: string[] | null = null;

    if (tripStatus === "active") {
      statusFilter = ["in_transit", "delivery", "pickup", "Active"];
    } else if (tripStatus === "inactive") {
      statusFilter = ["inactive", "Inactive"];
    } else {
      statusFilter = null; // Show all statuses
    }

    // 4. Get shipments within date range and status filter
    let shipmentQuery;
    if (statusFilter !== null) {
      shipmentQuery = db
        .select()
        .from(shipment)
        .where(
          and(
            gte(shipment.created_at, startDate),
            lt(
              shipment.created_at,
              new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
            ),
            inArray(shipment.status, statusFilter)
          )
        );
    } else {
      shipmentQuery = db
        .select()
        .from(shipment)
        .where(
          and(
            gte(shipment.created_at, startDate),
            lt(
              shipment.created_at,
              new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
            )
          )
        );
    }

    const shipments = await shipmentQuery;
    const shipmentIds = shipments.map((s) => s.id);

    if (shipmentIds.length === 0) {
      return [];
    }

    // 5. Get equipment data
    const equipmentRows = await db
      .select()
      .from(equipment)
      .where(inArray(equipment.shipment_id, shipmentIds));
    const equipmentMap = new Map(equipmentRows.map((e) => [e.shipment_id, e]));

    // 6. Get all stops for these shipments
    const stopsRows = await db
      .select()
      .from(stop)
      .where(inArray(stop.shipment_id, shipmentIds));

    const stopsMap: Record<number, any[]> = {};
    for (const stopRow of stopsRows) {
      if (stopRow.shipment_id !== null && stopRow.shipment_id !== undefined) {
        if (!stopsMap[stopRow.shipment_id]) stopsMap[stopRow.shipment_id] = [];
        stopsMap[stopRow.shipment_id].push(stopRow);
      }
    }

    // 7. Get customer LR details and filter trips by customer names
    const stopIds = stopsRows.map((s) => s.id);
    const customerLRRows = await db
      .select()
      .from(customer_lr_detail)
      .where(inArray(customer_lr_detail.stop_id, stopIds));

    const customerLRMap: Record<number, any[]> = {};
    for (const lr of customerLRRows) {
      if (lr.stop_id !== null && lr.stop_id !== undefined) {
        if (!customerLRMap[lr.stop_id]) customerLRMap[lr.stop_id] = [];
        customerLRMap[lr.stop_id].push(lr);
      }
    }

    const allCustomersRows = await db
      .select()
      .from(customers)
      .where(
        inArray(
          customers.id,
          customerLRRows.map((lr) => lr.customer_id)
        )
      );
    const allCustomersMap = new Map(allCustomersRows.map((c) => [c.id, c]));

    // 8. Filter shipments that have at least one stop with customer in our customer groups
    const validShipments = shipments.filter((shipment) => {
      const stops = stopsMap[shipment.id] || [];
      return stops.some((stop) => {
        const lrArr = customerLRMap[stop.id] || [];
        return lrArr.some((lr) => {
          const customer = allCustomersMap.get(lr.customer_id);
          return customer && customerNames.has(customer.customer_name);
        });
      });
    });

    if (validShipments.length === 0) {
      return [];
    }

    // 9. Get GPS details and latest GPS data
    const validShipmentIds = validShipments.map((s) => s.id);
    const gpsDetailsRows = await db
      .select()
      .from(gps_details)
      .where(inArray(gps_details.shipment_id, validShipmentIds));
    const gpsDetailsMap = new Map(
      gpsDetailsRows.map((g) => [g.shipment_id, g])
    );

    // Get vehicle numbers for GPS lookup
    const vehicleNumbers = validShipments
      .map((s) => equipmentMap.get(s.id)?.equipment_id)
      .filter(Boolean) as string[];

    const gpsRows = await db
      .select()
      .from(gps_schema)
      .where(inArray(gps_schema.trailerNumber, vehicleNumbers));

    const gpsMap = new Map<string, any>();
    for (const row of gpsRows) {
      if (!row.trailerNumber) continue;
      const prev = gpsMap.get(row.trailerNumber);
      if (!prev || (row.timestamp && prev.timestamp < row.timestamp)) {
        gpsMap.set(row.trailerNumber, row);
      }
    }

    // 10. Get Intutrack data for Intugine vendors
    const intutrackRows = await db.select().from(intutrack_relation);
    const intutrackMap = new Map(intutrackRows.map((i) => [i.phone_number, i]));

    // 11. Build response
    const trips = await Promise.all(
      validShipments.map(async (shipment) => {
        const equip = equipmentMap.get(shipment.id);
        const stops = (stopsMap[shipment.id] || []).sort(
          (a, b) =>
            (a.actual_sequence ?? a.stop_sequence ?? 0) -
            (b.actual_sequence ?? b.stop_sequence ?? 0)
        );

        // Get GPS details
        const gpsDetailsRow = gpsDetailsMap.get(shipment.id);
        const latestGps = gpsMap.get(equip?.equipment_id ?? "");

        // Current location and GPS info
        let current_location_address = "";
        let current_location_coordinates: [number, number] | [string, string] =
          [0, 0];
        let last_gps_ping = "";
        let vehicle_status = "No Data";
        let last_gps_vendor = "";
        let gps_time = "";
        let gprs_time = "";

        if (shipment.status === "inactive") {
          // For inactive trips, get the last GPS record before trip ended
          const tripEndTime = shipment.end_time
            ? new Date(shipment.end_time).getTime() / 1000
            : Date.now() / 1000;

          // Get all GPS records for this vehicle before trip end time
          const inactiveGpsRecords = gpsRows
            .filter(
              (row) =>
                row.trailerNumber === equip?.equipment_id &&
                row.gpstimestamp !== null &&
                Number(row.gpstimestamp) <= tripEndTime
            )
            .sort((a, b) => Number(b.gpstimestamp) - Number(a.gpstimestamp)); // Sort descending

          if (inactiveGpsRecords.length > 0) {
            const lastGpsBeforeInactive = inactiveGpsRecords[0];
            current_location_address = "-";
            current_location_coordinates = ["-", "-"];
            last_gps_ping = lastGpsBeforeInactive.gpstimestamp
              ? formatDate(
                  new Date(
                    Number(lastGpsBeforeInactive.gpstimestamp) * 1000
                  ).toISOString()
                )
              : "";
            last_gps_vendor = lastGpsBeforeInactive.GPSVendor || "";
            gps_time = last_gps_ping;
            gprs_time = lastGpsBeforeInactive.gprstimestamp
              ? formatDate(
                  new Date(
                    Number(lastGpsBeforeInactive.gprstimestamp) * 1000
                  ).toISOString()
                )
              : "";
            // vehicle_status = "Inactive";
          } else {
            // No GPS data found
            current_location_address = "-";
            current_location_coordinates = ["-", "-"];
            last_gps_ping = "";
            last_gps_vendor = "";
            gps_time = "";
            gprs_time = "";
          }
        } else {
          // For active trips, use the latest GPS
          if (
            latestGps &&
            latestGps.latitude != null &&
            latestGps.longitude != null
          ) {
            current_location_coordinates = [
              Number(latestGps.latitude),
              Number(latestGps.longitude),
            ];
            try {
              current_location_address = await reverseGeocode(
                Number(latestGps.latitude),
                Number(latestGps.longitude)
              );
            } catch {
              current_location_address = "";
            }

            last_gps_ping = latestGps.gpstimestamp
              ? formatDate(
                  new Date(Number(latestGps.gpstimestamp) * 1000).toISOString()
                )
              : "";
            last_gps_vendor = latestGps.GPSVendor || "";
            gps_time = last_gps_ping;
            gprs_time = latestGps.gprstimestamp
              ? formatDate(
                  new Date(Number(latestGps.gprstimestamp) * 1000).toISOString()
                )
              : "";
          }
        }
        if (latestGps && latestGps.gpstimestamp) {
          const now = Date.now();
          const pingTime = Number(latestGps.gpstimestamp) * 1000;
          const diffHours = (now - pingTime) / (1000 * 60 * 60);
          vehicle_status = diffHours <= 3 ? "Active" : "No Update";
        } else {
          vehicle_status = "No Data";
        }
        // Calculate distances
        const routePoints: Array<{ lat: number; lng: number }> = [];
        if (
          shipment.start_latitude != null &&
          shipment.start_longitude != null
        ) {
          routePoints.push({
            lat: Number(shipment.start_latitude),
            lng: Number(shipment.start_longitude),
          });
        }
        for (const stop of stops) {
          if (stop.latitude != null && stop.longitude != null) {
            routePoints.push({
              lat: Number(stop.latitude),
              lng: Number(stop.longitude),
            });
          }
        }
        if (shipment.end_latitude != null && shipment.end_longitude != null) {
          routePoints.push({
            lat: Number(shipment.end_latitude),
            lng: Number(shipment.end_longitude),
          });
        }

        let total_distance = 0;
        for (let i = 1; i < routePoints.length; i++) {
          total_distance += haversine(
            routePoints[i - 1].lat,
            routePoints[i - 1].lng,
            routePoints[i].lat,
            routePoints[i].lng
          );
        }
        total_distance = total_distance / 1000;

        // Covered Distance
        const coveredPoints: Array<{ lat: number; lng: number }> = [];
        if (
          shipment.start_latitude != null &&
          shipment.start_longitude != null
        ) {
          coveredPoints.push({
            lat: Number(shipment.start_latitude),
            lng: Number(shipment.start_longitude),
          });
        }
        const visitedStops = stops.filter((st) => st.entry_time);
        for (const stop of visitedStops) {
          if (stop.latitude != null && stop.longitude != null) {
            coveredPoints.push({
              lat: Number(stop.latitude),
              lng: Number(stop.longitude),
            });
          }
        }
        if (
          latestGps &&
          latestGps.latitude != null &&
          latestGps.longitude != null &&
          shipment.status !== "inactive"
        ) {
          coveredPoints.push({
            lat: Number(latestGps.latitude),
            lng: Number(latestGps.longitude),
          });
        }
        let covered_distance = 0;
        for (let i = 1; i < coveredPoints.length; i++) {
          covered_distance += haversine(
            coveredPoints[i - 1].lat,
            coveredPoints[i - 1].lng,
            coveredPoints[i].lat,
            coveredPoints[i].lng
          );
        }
        covered_distance = covered_distance / 1000;

        // Calculate time metrics - Fixed total time calculation
        const tripStartTime = shipment.start_time
          ? new Date(shipment.start_time).getTime()
          : 0;
        const tripEndTime = shipment.end_time
          ? new Date(shipment.end_time).getTime()
          : Date.now();
        const totalTripTime = tripEndTime - tripStartTime;
        console.log("Total Trip Time:", tripEndTime, tripStartTime);

        // Get all GPS records for stoppage calculation
        const allGpsRecords = gpsRows
          .filter(
            (row) =>
              row.trailerNumber === equip?.equipment_id &&
              row.timestamp !== null
          )
          .sort(
            (a, b) =>
              new Date(a.timestamp ?? 0).getTime() -
              new Date(b.timestamp ?? 0).getTime()
          )
          .map((row) => ({
            ...row,
            timestamp: row.timestamp as string | number,
          }));

        const totalStoppageMs = calculateTotalStoppageTimeFromGPS(
          allGpsRecords.map((rec) => ({
            latitude: rec.latitude != null ? Number(rec.latitude) : 0,
            longitude: rec.longitude != null ? Number(rec.longitude) : 0,
            timestamp: rec.timestamp,
          }))
        );
        const totalDetentionMs = calculateTotalDetentionTime(
          stops,
          totalStoppageMs
        );
        const totalDriveMs = calculateTotalDriveTime(
          shipment.start_time === null ? undefined : shipment.start_time,
          shipment.end_time === null ? undefined : shipment.end_time,
          totalStoppageMs
        );

        // Status duration calculation
        const statusDurations = calculateStatusDurationsFromGPS(
          allGpsRecords.map((rec) => ({ timestamp: rec.timestamp })),
          shipment.start_time
            ? Math.floor(new Date(shipment.start_time).getTime() / 1000)
            : 0
        );

        console.log("Status Durations:", statusDurations);

        // Get Intutrack data if GPS vendor is Intugine
        let intutrackData = null;
        if (
          gpsDetailsRow?.gps_vendor === "Intugine" &&
          equip?.driver_mobile_no
        ) {
          const intutrack = intutrackMap.get(equip.driver_mobile_no);
          if (intutrack) {
            intutrackData = {
              consent_status: intutrack.current_consent,
              last_updated_time: intutrack.updated_at
                ? formatDate(new Date(intutrack.updated_at).toISOString())
                : "",
              operator: intutrack.operator,
            };
          }
        }

        // Process stops
        const processedStops = await Promise.all(
          stops.map(async (stop) => {
            const lrArr = customerLRMap[stop.id] || [];
            const lr = lrArr[0];
            const customer = lr ? allCustomersMap.get(lr.customer_id) : null;

            let stop_location_address = "";
            if (stop.latitude && stop.longitude) {
              try {
                stop_location_address = await reverseGeocode(
                  Number(stop.latitude),
                  Number(stop.longitude)
                );
              } catch {
                stop_location_address = "";
              }
            }

            // Get geofence name
            let geofence_name = "";
            if (stop.location_id) {
              const [geofence] = await db
                .select()
                .from(geofence_table)
                .where(eq(geofence_table.location_id, stop.location_id))
                .limit(1);
              geofence_name = geofence?.geofence_name || "";
            }

            // Calculate loading/unloading time
            let loading_unloading_time = "1h";
            if (stop.location_id) {
              const [geofence] = await db
                .select()
                .from(geofence_table)
                .where(eq(geofence_table.location_id, stop.location_id))
                .limit(1);
              if (geofence && geofence.time) {
                loading_unloading_time = geofence.time;
              }
            }

            // Calculate detention time for this stop
            let detention_time = "";
            if (stop.entry_time && stop.exit_time) {
              const entry = new Date(stop.entry_time).getTime();
              const exit = new Date(stop.exit_time).getTime();
              const loadingTime =
                parseFloat(loading_unloading_time.replace("h", "")) *
                60 *
                60 *
                1000;
              let detentionMs = exit - entry - loadingTime;
              if (detentionMs < 0) detentionMs = 0;
              detention_time = formatMsToHoursMinutes(detentionMs);
            }

            const avgSpeedKmh = 40;

            // --- Status logic copied from getAllTrips ---
            let status = "pending";
            if (stop.exit_time) {
              status = "completed";
            } else if (stop.entry_time) {
              status = "in_progress";
            } else {
              // Calculate ceta as ETA from current location to stop (in minutes)
              if (
                latestGps &&
                latestGps.longitude &&
                latestGps.latitude &&
                stop.latitude &&
                stop.longitude &&
                avgSpeedKmh > 0
              ) {
                const distance = haversine(
                  Number(latestGps.latitude),
                  Number(latestGps.longitude),
                  Number(stop.latitude),
                  Number(stop.longitude)
                );
                const cetaMinutes = Math.round(distance / avgSpeedKmh);
                stop.ceta = cetaMinutes.toString();

                // Calculate expected arrival time
                const now = Date.now();
                const expectedArrival = now + cetaMinutes * 60 * 1000;
                const plannedTime = stop.planned_departure_date
                  ? new Date(stop.planned_departure_date).getTime()
                  : 0;

                if (plannedTime >= expectedArrival) {
                  status = "on_time";
                } else {
                  status = "delayed";
                }
              } else {
                stop.ceta = "0";
                status = "on_time";
              }
            }
            // --- End status logic ---

            return {
              planned_sequence: stop.stop_sequence,
              stop_type: stop.stop_type === "P" ? "Pickup" : "Delivery",
              lr_number: lr?.lr_number || "",
              stop_location_address,
              location_name: geofence_name,
              customer_name: customer?.customer_name || "",
              actual_sequence: stop.actual_sequence || 0,
              entry_time: stop.entry_time || "",
              exit_time: stop.exit_time || "",
              loading_unloading_time,
              detention_time,
              status,
            };
          })
        );

        return {
          vehicle_number: equip?.equipment_id || "",
          shipment_id: shipment.shipment_id,
          trip_status: shipment.status,
          vehicle_status,
          current_location_address,
          current_location_coordinates,
          gps_vendor_last: last_gps_vendor,
          gprs_time,
          gps_time,
          vehicle_status_duration: statusDurations,
          route_name: shipment.route_name,
          domain_name: shipment.domain_name,
          service_provider_alias_value:
            equip?.service_provider_alias_value || "",
          start_time: shipment.created_at
            ? formatDate(new Date(shipment.created_at).toISOString())
            : "",
          start_location: shipment.start_location,
          end_time: shipment.end_time || "",
          end_location: shipment.end_location,
          total_distance: total_distance.toFixed(2),
          total_time: formatMsToHoursMinutes(totalTripTime),
          covered_distance: covered_distance.toFixed(2),
          average_in_day: (
            covered_distance /
            (totalTripTime / (1000 * 60 * 60 * 24))
          ).toFixed(2),
          total_stoppage_time: formatMsToHoursMinutes(totalStoppageMs),
          total_detention_time: formatMsToHoursMinutes(totalDetentionMs),
          total_drive_time: formatMsToHoursMinutes(totalDriveMs),
          driver_name: equip?.driver_name || "",
          driver_mobile: equip?.driver_mobile_no || "",
          gps_type: gpsDetailsRow?.gps_type || "",
          gps_frequency: gpsDetailsRow?.gps_frequency?.toString() || "",
          gps_unit_id: gpsDetailsRow?.gps_unit_id || "",
          gps_vendor: gpsDetailsRow?.gps_vendor || "",
          shipment_source: "logifriet",
          intutrack_data: intutrackData,
          stops: processedStops,
        };
      })
    );

    return trips;
  } catch (error) {
    console.error("❌ Error fetching trips by customer groups:", error);
    throw new Error("Unable to fetch trip data by customer groups");
  }
}
