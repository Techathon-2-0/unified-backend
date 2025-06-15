import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
interface CustomerLRDetail {
    LrNumber: string;
    Customer_ID: string;
    Customer_Name: string;
    Customer_Location: string;
}

interface Stop {
    Location_Id: string;
    StopType: string;
    StopSequence: number;
    Latitude: number;
    Longitude: number;
    GeoFenceRadius: number;
    PlannedDepartureDate: string;
    CustomerLRDetails?: {
        CustomerLRDetail: CustomerLRDetail[];
    };
}

interface Equipment {
    Equipment_Id: string;
    ServiceProviderAliasValue: string;
    DriverName: string;
    DriverMobileNo: string;
}

interface Event {
    EventCode: string;
    EventDateTime: string;
}

interface GPSDetails {
    GPSType: string;
    GPSFrequency: number;
    GPSUnitID: string;
    GPSVendor: string;
}

interface Shipment {
    Domain_Name: string;
    Shipment_Id: string;
    RouteName: string;
    Equipment: Equipment;
    Events: {
        Event: Event[];
    };
    Stops: {
        Stop: Stop[];
    };
    GPSDetails: GPSDetails;
}

interface TransmissionHeader {
    UserName: string;
    Password: string;
    Token: string;
}

interface TransmissionData {
    TransmissionHeader: TransmissionHeader;
    TransmissionDetails: {
        Shipment: Shipment;
    };
}

interface XMLResponse {
    Transmission: TransmissionData;
}

interface GPSData {
    GPSVendor: string;
    deviceId: string;
    trailerNumber: string;
    timestamp: string;
    gpstimestamp: string;
    gprstimestamp: string;
    address: string;
    latitude: string;
    longitude: string;
    heading: string;
    speed: string;
    digitalInput1: string;
    digitalInput2: string;
    digitalInput3: string;
    areaCode: string;
    cellId: string;
    mcc: string;
    mnc: string;
    lac: string;
    hdop: string;
    numberOfSatellites: string;
    analogInput1: string;
    digitalOutput1: string;
    powerSupplyVoltage: string;
    internalBatteryVoltage: string;
    internalBatteryLevel: string;
    power: string;
    gsmlevel: string;
    accelerometerX: string;
    accelerometerY: string;
    accelerometerZ: string;
    maxAccelX: string;
    maxAccelY: string;
    maxAccelZ: string;
    locationSource: string;
    serviceProvider: string;
    gpsSpeed: string;
    dtcCount: string;
    dtcDistance: string;
    unplugged: string;
    gpsOdometer: string;
    tilt: string;
    DeviceInitialIntegrationType?: string;
}

//working
export function readTripXMLData(p:any): TransmissionData {
    try {
        // Read the XML file from public folder
        const xmlData = fs.readFileSync(path.join(process.cwd(), 'public/xml_output', p), 'utf-8');
        
        // Configure XML parser
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true
        });
        
        // Parse XML to JSON
        const result = parser.parse(xmlData) as XMLResponse;
        
        if (!result.Transmission) {
            throw new Error('Invalid XML format: Transmission element not found');
        }
        return result.Transmission;
    } catch (error) {
        console.error('Error reading Trip XML data:', error);
        throw error;
    }
}

//working
export function readSingleXMLData(): GPSData {
    try {
        // Read the XML file
        const xmlData = fs.readFileSync("gps.xml", 'utf-8');
        
        // Replace HTML entities with their actual characters
        const decodedXml = xmlData
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        
        // Configure XML parser
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true
        });
        
        // Parse XML to JSON
        const result = parser.parse(decodedXml);
        
        if (!result.GPSData) {
            throw new Error('Invalid XML format: GPSData root element not found');
        }

        return result.GPSData;
    } catch (error) {
        console.error('Error reading GPS XML data:', error);
        throw error;
    }
}

//working
export function readMultipleXMLData(): GPSData[] {
    try {
        // Read the XML file
        const xmlData = fs.readFileSync("gpsbulk.xml", 'utf-8');
        
        // Replace HTML entities with their actual characters
        const decodedXml = xmlData
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        
        // Configure XML parser
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true,
            isArray: (name) => name === 'GPSData'
        });
        
        // Parse XML to JSON
        const result = parser.parse(decodedXml);

        // Ensure the structure matches <data><GPSData>...</GPSData></data>
        if (!result.data || !result.data.GPSData) {
            throw new Error('Invalid XML format: data or GPSData elements not found');
        }

        return result.data.GPSData as GPSData[];
    } catch (error) {
        console.error('Error reading multiple GPS XML data:', error);
        throw error;
    }
}

