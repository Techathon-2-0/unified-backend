import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { 
  entity, 
  vendor, 
  shipment, 
  equipment, 
  stop, 
  transmission_header,
  geofence_table
} from '../db/schema';
import { insertGpsData } from './Gpsfetcher';
import dotenv from 'dotenv';

dotenv.config();

// Create a database connection
const db = drizzle(process.env.DATABASE_URL!);

// Sample data for testing
const testVehicleNumber = "TEST123";
const testGpsVendor = "TestVendor";

// Sample GPS data points that simulate movement around a geofence
// This creates a path where the vehicle approaches, enters, and then exits a geofence
const createSampleGpsData = (vehicleNumber: string, vendorName: string, geofenceCenter: {lat: number, lng: number}) => {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Create points that approach, enter, and exit a geofence
  // Assuming the geofence has a radius of 100 meters
  // These coordinates simulate movement near Delhi, India
  return [
    // 200m away from geofence (outside)
    {
      trailerNumber: vehicleNumber,
      GPSVendor: vendorName,
      timestamp: timestamp - 300,
      gpstimestamp: timestamp - 300,
      gprstimestamp: timestamp - 300,
      latitude: geofenceCenter.lat + 0.002, // ~200m away
      longitude: geofenceCenter.lng,
      heading: 180,
      speed: 30,
      numberOfSatellites: "8",
      digitalInput1: 1,
      internalBatteryLevel: "85",
      address: "Sample Address 1"
    },
    // 50m away from geofence (outside, approaching)
    {
      trailerNumber: vehicleNumber,
      GPSVendor: vendorName,
      timestamp: timestamp - 200,
      gpstimestamp: timestamp - 200,
      gprstimestamp: timestamp - 200,
      latitude: geofenceCenter.lat + 0.0005, // ~50m away
      longitude: geofenceCenter.lng,
      heading: 180,
      speed: 20,
      numberOfSatellites: "8",
      digitalInput1: 1,
      internalBatteryLevel: "85",
      address: "Sample Address 2"
    },
    // Inside the geofence (entry event should trigger)
    {
      trailerNumber: vehicleNumber,
      GPSVendor: vendorName,
      timestamp: timestamp - 100,
      gpstimestamp: timestamp - 100,
      gprstimestamp: timestamp - 100,
      latitude: geofenceCenter.lat + 0.0001, // ~10m inside
      longitude: geofenceCenter.lng,
      heading: 180,
      speed: 10,
      numberOfSatellites: "8",
      digitalInput1: 1,
      internalBatteryLevel: "85",
      address: "Inside Geofence"
    },
    // Still inside the geofence
    {
      trailerNumber: vehicleNumber,
      GPSVendor: vendorName,
      timestamp: timestamp - 50,
      gpstimestamp: timestamp - 50,
      gprstimestamp: timestamp - 50,
      latitude: geofenceCenter.lat - 0.0001, // Moving inside
      longitude: geofenceCenter.lng,
      heading: 180,
      speed: 5,
      numberOfSatellites: "8",
      digitalInput1: 1,
      internalBatteryLevel: "85",
      address: "Still Inside Geofence"
    },
    // Exiting the geofence (exit event should trigger)
    {
      trailerNumber: vehicleNumber,
      GPSVendor: vendorName,
      timestamp: timestamp,
      gpstimestamp: timestamp,
      gprstimestamp: timestamp,
      latitude: geofenceCenter.lat - 0.002, // ~200m away, exited
      longitude: geofenceCenter.lng,
      heading: 180,
      speed: 30,
      numberOfSatellites: "8",
      digitalInput1: 1,
      internalBatteryLevel: "85",
      address: "Outside Geofence Again"
    }
  ];
};

// Function to seed necessary test data in the database
async function seedTestData() {
  try {
    console.log("🌱 Seeding test data...");
    
    // Define geofence center location (somewhere in Delhi, India)
    const geofenceCenter = {
      lat: 28.6139,
      lng: 77.2090
    };

    // 1. Create test vendor
    await db.insert(vendor).values({
      name: testGpsVendor,
      status: true
    });
    console.log("✅ Test vendor created");

    // 2. Create test vehicle entity
    await db.insert(entity).values({
      vehicleNumber: testVehicleNumber,
      type: "TEST_TRUCK",
      status: true
    });
    console.log("✅ Test vehicle entity created");

    // 3. Create test transmission header
    const transmissionHeaderResult = await db.insert(transmission_header).values({
      username: "testuser",
      password: "testpass",
      token: "testtoken"
    });
    
    // Get the first inserted row's ID - MySQL doesn't have native returning but we can query it
    const [transmissionHeader] = await db.select()
      .from(transmission_header)
      .where(sql`username = 'testuser' AND password = 'testpass'`)
      .orderBy(sql`id DESC`)
      .limit(1);
    
    const transmissionHeaderId = transmissionHeader.id;
    console.log("✅ Test transmission header created");

    // 4. Create test shipment
    const shipmentResult = await db.insert(shipment).values({
      domain_name: "test.domain",
      shipment_id: "TEST_SHIPMENT_001",
      route_name: "Test Route",
      transmission_header_id: transmissionHeaderId,
      status: "ACTIVE",
      route_id: "ROUTE_001",
      route_type: "NORMAL",
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 86400000).toISOString(),
      current_location: "Test Location",
      current_latitude: geofenceCenter.lat,
      current_longitude: geofenceCenter.lng
    });
    
    // Get the inserted shipment
    const [shipmentData] = await db.select()
      .from(shipment)
      .where(sql`shipment_id = 'TEST_SHIPMENT_001'`)
      .limit(1);
    
    const shipmentId = shipmentData.id;
    console.log("✅ Test shipment created");

    // 5. Create test equipment with reference to the shipment
    await db.insert(equipment).values({
      equipment_id: testVehicleNumber,
      service_provider_alias_value: "Test Service Provider",
      driver_name: "Test Driver",
      driver_mobile_no: "1234567890",
      shipment_id: shipmentId,
      vehicle_name: "Test Vehicle",
      vehicle_status: "ACTIVE"
    });
    console.log("✅ Test equipment created");

    // 6. Create test geofence
    await db.insert(geofence_table).values({
      geofence_name: "Test Geofence",
      latitude: geofenceCenter.lat,
      longitude: geofenceCenter.lng,
      location_id: "TEST_LOC_001",
      tag: "test_tag",
      stop_type: "LOADING",
      geofence_type: 0, // Circle
      radius: 100, // 100 meters
      status: true,
      address: "Test Geofence Address"
    });
    
    // Get the inserted geofence
    const [geofenceData] = await db.select()
      .from(geofence_table)
      .where(sql`geofence_name = 'Test Geofence'`)
      .limit(1);
    
    const geofenceId = geofenceData.id;
    console.log("✅ Test geofence created");

    // 7. Create test stop with reference to the shipment and geofence
    await db.insert(stop).values({
      location_id: "TEST_LOC_001",
      stop_type: "LOADING",
      stop_sequence: 1,
      latitude: geofenceCenter.lat,
      longitude: geofenceCenter.lng,
      geo_fence_radius: 100, // 100 meters
      planned_departure_date: new Date(Date.now() + 3600000).toISOString(),
      shipment_id: shipmentId,
      stop_name: "Test Stop",
      stop_status: "PENDING",
      point_number: 1
    });
    console.log("✅ Test stop created");

    return { geofenceCenter };
  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    throw error;
  }
}

// Main test function
async function runGpsInsertionTest() {
  try {
    // Seed the necessary test data
    const { geofenceCenter } = await seedTestData();
    console.log("All test data seeded successfully!");

    // Generate sample GPS data
    const sampleGpsData = createSampleGpsData(testVehicleNumber, testGpsVendor, geofenceCenter);
    console.log(`Generated ${sampleGpsData.length} sample GPS points`);

    // Insert the GPS data in batches to simulate movement
    for (let i = 0; i < sampleGpsData.length; i++) {
      console.log(`Inserting GPS point ${i+1}/${sampleGpsData.length}...`);
      await insertGpsData([sampleGpsData[i]]);
      
      // Wait 2 seconds between insertions to simulate real-time data
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("✅ All GPS data inserted successfully");
    console.log("🔍 Check the stop table for entry_time and exit_time updates");
    
    // You could add code here to fetch and display the updated stop data
    
  } catch (error) {
    console.error("❌ Error running GPS insertion test:", error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  console.log("🚀 Starting GPS data insertion test...");
  runGpsInsertionTest().then(() => {
    console.log("✅ Test completed");
    process.exit(0);
  }).catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
}

// Export for use in other test files
export { seedTestData, createSampleGpsData, runGpsInsertionTest };
