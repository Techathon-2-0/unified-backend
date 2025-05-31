import { drizzle } from "drizzle-orm/mysql2";
import { transmission_header, shipment, equipment, event, gps_details, stop, customer_lr_detail,gps_schema } from '../db/schema';

import {eq } from "drizzle-orm";
import { readSingleXMLData } from "../utilities/xmlfunc";
import axios from "axios";
const db = drizzle(process.env.DATABASE_URL!);

export async function insertGpsDataFromXML() {
    const response =await  axios.get('https://unifiedapi.mllqa.com/data');
    const data= response.data.messages;
    console.log(data);
    if (!data) {
        console.error("No data received from the API");
        return {message:"errro"};
    }
    for(const item of data) {
      for(const item2 of item){
        insertGpsData(item2);
      }
    }
    return {message:"success"};
}
export async function insertGpsData (data:any) {
  try {


    const equipmentdata=await db.select().from(equipment).where(eq(equipment.equipment_id, data.trailerNumber));
    if( !equipmentdata[0]?.id) {
      console.error("No equipment found for trailer number:", data.trailerNumber);
      return {};
    }

    await db.insert(gps_schema).values({
        equipmentId: Number(equipmentdata[0].id),
        GPSVendor: data.GPSVendor , // Removed because it's not a valid property in gps_schema
        deviceId: data.deviceId,
        trailerNumber: data.trailerNumber,
        timestamp: Number(data.timestamp),
        gpstimestamp: Number(data.gpstimestamp),
        gprstimestamp: Number(data.gprstimestamp),
        address: data.address,
        latitude:Number(data.latitude),
        longitude:Number(data.longitude),
        heading: Number(data.heading),
        speed: Number(data.speed),
        areaCode: data.areaCode,
        cellId: data.cellId,
        mcc: data.mcc,
        mnc: data.mnc,
        lac: data.lac,
        hdop: data.hdop,
        numberOfSatellites: data.numberOfSatellites,
        digitalInput2:Number(data.digitalInput2),
        digitalInput3: Number(data.digitalInput3),
        analogInput1: data.analogInput1,
        digitalOutput1: data.digitalOutput1,
        powerSupplyVoltage: data.powerSupplyVoltage,
        internalBatteryVoltage: data.internalBatteryVoltage,
        internalBatteryLevel: data.internalBatteryLevel,
        power: data.power,
        gsmlevel: data.gsmlevel,
        accelerometerX: data.accelerometerX,
        accelerometerY: data.accelerometerY,
        accelerometerZ: data.accelerometerZ,
        maxAccelX: data.maxAccelX,
        maxAccelY: data.maxAccelY ,
        maxAccelZ: data.maxAccelZ,
        locationSource: data.locationSource,
        serviceProvider: data.serviceProvider,
        gpsSpeed: data.gpsSpeed,
        dtcCount: data.dtcCount,
        dtcDistance: data.dtcDistance ,
        unplugged: data.unplugged,
        gpsOdometer: data.gpsOdometer,
        tilt: data.tilt,
        digitalInput1: Number(data.digitalInput1),
        created_at: new Date(),
        updated_at: new Date()
    });
    return data;
    // return {};
  } catch (error) {
    console.error("Error fetching GPS data:", error);
    throw error;
  }
}