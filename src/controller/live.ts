import { Trip } from "../types/trip";
import { readTripXMLData } from '../utilities/xmlfunc';
import { shipment, equipment, event, stop, customer_lr_detail, gps_details, transmission_header, gps_schema } from '../db/schema';
import { eq } from "drizzle-orm";
import { mysqlTable, int, varchar, double, timestamp } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";

const db=drizzle(process.env.DATABASE_URL!);

export async function getLiveData() {

    const shipdata=await db.select().from(shipment);
    const res=[];
    for(const ship of shipdata){
        const temp={
            id: ship.id.toString(),
            domainName: ship.domain_name,
            shipmentId: ship.shipment_id,
            status: ship.status,
            type: ship.route_type,

            //gps schema 
            speed: 0,
            gpsTime: "",
            gprsTime: "",
            distance: "",
            address: "",
            battery: "",
            power: "",
            lat: 1,
            lng: 1,
            shipmentSource: "",


            //equipment 
            driverName: " ",
            driverMobile: " ",
            vehicleNumber: " ",
            drivers: "",

            //gps_details
            gpsType: "",
            vendorName: "",

            //user set karega
            gpsPing: "",
            group: "",
            lastAlarm: "",



            altitude: "",
            rfid: "",
            tag: "",
            gpsStatus: "",
            gprsStatus: "",
            ignitionStatus: "",
            sensor: "",
            ac: "",
            lockStatus: "",
            hasSpeedChart: true,

        }
        const equipdata=await db.select().from(equipment).where(eq(equipment.shipment_id,ship.id));
        if(equipdata.length>0){
            const equip=equipdata[0];
            temp.driverName = equip.driver_name ?? "";
            temp.driverMobile = equip.driver_mobile_no??"";
            temp.vehicleNumber = equip.equipment_id??"";
            temp.drivers = equip.driver_details ?? "";
        }

        const gpsdata=await db.select().from(gps_details).where(eq(gps_details.shipment_id,ship.id));
        if(gpsdata.length>0){
            temp.gpsType = gpsdata[0].gps_type ?? "";
            temp.vendorName = gpsdata[0].gps_vendor ?? "";
        }

        const gps_schema_data=await db.select().from(gps_schema).where(eq(gps_schema.equipmentId,equipdata[0].id));
        if(gps_schema_data.length>0){
            const gps_schema_item=gps_schema_data[0];
            temp.speed = gps_schema_item.speed ?? 0;
            temp.gpsTime = gps_schema_item.gpstimestamp ? new Date(gps_schema_item.gpstimestamp * 1000).toLocaleString() : "";
            temp.gprsTime = gps_schema_item.gprstimestamp ? new Date(gps_schema_item.gprstimestamp * 1000).toLocaleString() : "";
            temp.distance = gps_schema_item.dtcDistance ?? "";
            temp.address = gps_schema_item.address ?? "";
            temp.battery = gps_schema_item.internalBatteryLevel ?? "";
            temp.power = gps_schema_item.power ?? "";
            temp.lat = gps_schema_item.latitude ?? 1;
            temp.lng = gps_schema_item.longitude ?? 1;
        }
        res.push(temp);
    }
    
    return {data:res};

}