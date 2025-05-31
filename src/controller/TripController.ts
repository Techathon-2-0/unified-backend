import { Trip } from "../types/trip";
import { readTripXMLData } from '../utilities/xmlfunc';
import { shipment, equipment, event, stop, customer_lr_detail, gps_details, transmission_header } from '../db/schema';
import { eq } from "drizzle-orm";
import { mysqlTable, int, varchar, double, timestamp } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";

const db = drizzle(process.env.DATABASE_URL!); // Adjust the import based on your project structure

//working
export async function getTripById(id: string) {
    try {
        // Fetch shipment data from the database
        const shipmentData = await db.select()
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
        const equipmentData = await db.select()
            .from(equipment)
            .where(eq(equipment.shipment_id, shipmentData[0].id));
            
        if (!equipmentData || equipmentData.length === 0) {
            console.log(`No equipment found for shipment ID: ${shipmentData[0].id}`);
        }
        
        // Fetch related event data
        const eventData = await db.select()
            .from(event)
            .where(eq(event.shipment_id, shipmentData[0].id));
            
        // Fetch related stops with customer details
        const stopsData = await db.select()
            .from(stop)
            .where(eq(stop.shipment_id, shipmentData[0].id))
            .orderBy(stop.stop_sequence);
            
        // Fetch customer LR details for each stop
        const stopsWithCustomerDetails = await Promise.all(stopsData.map(async (stop) => {
            const customerDetails = await db.select()
                .from(customer_lr_detail)
                .where(eq(customer_lr_detail.stop_id, stop.id));
                
            return {
                ...stop,
                customerDetails
            };
        }));

        // Fetch GPS details
        const gpsData = await db.select()
            .from(gps_details)
            .where(eq(gps_details.shipment_id, shipmentData[0].id))
            .limit(1);
            
        // Map database entities to Trip type
        const tripData: Trip = {
            id: shipmentData[0].shipment_id ?? '',
            status: shipmentData[0].status as any,
            routeId: shipmentData[0].route_id || '',
            routeName: shipmentData[0].route_name || '',
            routeType: shipmentData[0].route_type || '',
            startTime: shipmentData[0].start_time || '',
            endTime: shipmentData[0].end_time || '',
            driverName: equipmentData[0]?.driver_name || '',
            driverMobile: equipmentData[0]?.driver_mobile_no || '',
            driverDetails: equipmentData[0]?.driver_details || '',
            location: shipmentData[0].current_location || '',
            locationDateTime: shipmentData[0].location_datetime || '',
            shipmentId: shipmentData[0].shipment_id ?? '',
            vehicleName: equipmentData[0]?.vehicle_name || '',
            vehicleStatus: equipmentData[0]?.vehicle_status || 'Moving',
            statusDuration: equipmentData[0]?.status_duration || '0h 0m',
            totalDetentionTime: shipmentData[0].total_detention_time || '0h 0m',
            totalStoppageTime: shipmentData[0].total_stoppage_time || '0h 0m',
            totalDriveTime: shipmentData[0].total_drive_time || '0h 0m',
            domainName: shipmentData[0].domain_name || '',
            equipmentId: equipmentData[0]?.equipment_id || '',
            coordinates: [
                shipmentData[0].current_latitude || 0,
                shipmentData[0].current_longitude || 0
            ] as [number, number],
            stops: stopsWithCustomerDetails.map((stop, index) => ({
                point: stop.point_number || index + 1,
                name: String(stop.stop_name || stop.location_id || ''),
                status: stop.stop_status || 'Pending',
                locationId: String(stop.location_id || ''),
                stopType: stop.stop_type === 'P' ? 'Pickup' : 'Delivery',
                plannedTime: stop.planned_departure_date || '',
                eta: stop.eta || '',
                actualSequence: stop.actual_sequence || stop.stop_sequence || 0,
                entryTime: stop.entry_time || '',
                exitTime: stop.exit_time || '',
                detentionTime: stop.detention_time || '',
                customerDetails: stop.customerDetails || []
            }))
        };

        return tripData;
    } catch (error) {
        console.error('Error getting trip by ID:', error);
        throw error;
    }
}

//working
export async function getAllTrips(
    page = 1,
    limit = 100,
    sortField = 'id',
    sortOrder: 'asc' | 'desc' = 'asc',
    filters: Record<string, string> = {}
) {

    try {
        const gooddata=[];
        const ship =await db.select()
        .from(shipment)
        .limit(limit)
        .offset((page - 1) * limit);
        for(const sh of ship) {
            const trip= {
                id: sh.id,
                status: sh.status,//ok
                routeId: sh.route_id,//ok
                routeName: sh.route_name,//ok
                routeType: sh.route_type,//ok
                startTime: sh.start_time,//ok
                endTime: sh.end_time,//ok
                shipmentId: sh.shipment_id,
                totalDetentionTime: sh.total_detention_time,
                totalStoppageTime: sh.total_stoppage_time,
                totalDriveTime: sh.total_drive_time,
                domainName: sh.domain_name,
                coordinates: [sh.current_latitude, sh.current_longitude],

                //equipment
                equipmentId: '',
                driverName:'',
                driverMobile: '',
                driverDetails: '',
                vehicleName: '',
                vehicleStatus: '',
                statusDuration: '',

                //event 
                location: '',
                locationDateTime:'' ,
                
                //stop
                stops:{}
            };
            const equip=await db.select().from(equipment)
           .where(eq(equipment.shipment_id, ship[0].id));
            
            trip.equipmentId = equip[0]?.equipment_id || '';
            trip.driverName = equip[0]?.driver_name || '';
            trip.driverMobile = equip[0]?.driver_mobile_no || '';                
            trip.driverDetails = equip[0]?.driver_details || '';
            trip.vehicleName = equip[0]?.vehicle_name || '';
            trip.vehicleStatus = equip[0]?.vehicle_status || 'Moving';
            trip.statusDuration = equip[0]?.status_duration || '0h 0m';

            const eventData = await db.select()
            .from(event)
            .where(eq(event.shipment_id, ship[0].id));

            trip.location = eventData[0]?.event_location || '';
            trip.locationDateTime = eventData[0]?.event_datetime || '';
            const stopsData = await db.select()
            .from(stop)
            .where(eq(stop.shipment_id, ship[0].id));

            const stopdata=[];
            for (const stop of stopsData) {
                const temp={
                    point: stop.point_number,
                    name: stop.stop_name,
                    status: stop.stop_status ,
                    locationId: stop.location_id,
                    stopType: stop.stop_type,
                    plannedTime: stop.planned_departure_date ,
                    eta: stop.eta ,
                    actualSequence: stop.actual_sequence,
                    entryTime: stop.entry_time,
                    exitTime: stop.exit_time ,
                    detentionTime: stop.detention_time,
                }
                stopdata.push(temp);
            }
            trip.stops = stopdata;
             gooddata.push(trip);
        }
        
        // console.log(gooddata[0]);

        // console.log("asdsd");
        // return [];
        // console.log(ship);
        return gooddata;
    } catch (error) {
        console.error('Error getting trips:', error);
        throw error;
    }
}

//working
export async function insertTripFromXML() {
   for(let i=1;i<201;i++){
    const data = await readTripXMLData(`${i}.xml`);
    const res= await insertData(data);
   }
    

    // const data = await readTripXMLData("1.xml");
    // const res= await insertData(data);
    // console.log(res);
    return { message: "Data inserted successfully" };
    
}   
//working
export async function insertData(data :any) {
    console.log(data);
    const transmissionHeader=data.TransmissionHeader;
    // console.log("Inserting Transmission Header:", transmissionHeader);
    const TransmissionId=await db.insert(transmission_header).values({   
        username:transmissionHeader.UserName,
        password: transmissionHeader.Password,
        token: transmissionHeader.Token || ''
    }).$returningId();

    const shipmentData = data.TransmissionDetails.Shipment;
    const shipmentid=await db.insert(shipment).values({

        domain_name: shipmentData.Domain_Name,
        shipment_id: shipmentData.Shipment_Id,
        route_name: shipmentData.RouteName,
        transmission_header_id: Number(TransmissionId[0].id),
        status: 'Active', 

        route_id: "",
        route_type:"",

        start_time: "",
        end_time: "",

        current_location:  '',
        location_datetime: "",
        current_latitude:  0,
        current_longitude:  0,

        total_detention_time: '',
        total_stoppage_time: '',
        total_drive_time: ''

    }).$returningId();
    
    const equipmentData = shipmentData.Equipment;
    const equipmentid=await db.insert(equipment).values({
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
        updated_at: new Date()
    }).$returningId();

    const eventData = shipmentData.Events.Event;

    const eventid= await db.insert(event).values({
        event_code: eventData.EventCode,
        event_datetime: eventData.EventDateTime,
        shipment_id: Number(shipmentid[0].id),
        event_type: '',
        event_location: '',
        event_latitude:  0,
        event_longitude: 0,
        created_at: new Date(),
        updated_at: new Date()
    }).$returningId();


    const stops = shipmentData.Stops.Stop || [];
    // console.log("Inserting Stops:", stops);
    for (const st of stops) {
        const stopId = await db.insert(stop).values({
            location_id:st.Location_Id,
            stop_type: st.StopType,
            stop_sequence: parseInt(st.StopSequence, 10),
            latitude: parseFloat(st.Latitude),
            longitude: parseFloat(st.Longitude),
            geo_fence_radius: parseInt(st.GeoFenceRadius, 10) || 0,
            planned_departure_date: st.PlannedDepartureDate || '',
            shipment_id: Number(shipmentid[0].id),

            stop_name: '',
            stop_status: '',
            eta:'',
            actual_sequence: 0,
            entry_time:'',
            exit_time: '',
            detention_time: '',
            point_number:0,
            created_at: new Date(),
            updated_at: new Date()
        }).$returningId();
        // console.log("Inserted Stop ID:", stopId);
        const customerLRDetails = st.CustomerLRDetails?.CustomerLRDetail || [];
        const customerLRDetailsArray = Array.isArray(customerLRDetails) ? customerLRDetails : [customerLRDetails];
        for (const lrDetail of customerLRDetailsArray) {
            console.log("Inserting Customer LR Detail:", lrDetail);
            await db.insert(customer_lr_detail).values({
                lr_number: lrDetail.LrNumber,
                customer_id: lrDetail.Customer_ID,
                customer_name: lrDetail.Customer_Name,
                customer_location: lrDetail.Customer_Location,
                stop_id: Number(stopId[0].id),
            });
        }
    }

    // Insert GPS Details

    const gpsDetails = shipmentData.GPSDetails;
    // console.log("Inserting GPS Details:", gpsDetails);
    const gpsDetailsId = await db.insert(gps_details).values({
        gps_type: gpsDetails.GPSType,
        gps_frequency: parseInt(gpsDetails.GPSFrequency, 10),
        gps_unit_id: gpsDetails.GPSUnitID,
        gps_vendor: gpsDetails.GPSVendor,
        shipment_id: Number(shipmentid[0].id),
        created_at: new Date(),
        updated_at: new Date()
    }).$returningId();
    // console.log("Inserted GPS Details ID:", gpsDetailsId);

    return data;
}
