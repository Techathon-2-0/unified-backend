import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runAdditionalMigration(): Promise<void> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST! ,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD! ,
    database: process.env.DB_NAME! ,
    multipleStatements: true
  });

  try {
    console.log('🔧 Applying additional critical indexes...');
    
    const additionalIndexes = [
      'CREATE INDEX idx_shipment_status_domain_created ON shipment(status, domain_name, created_at DESC)',
      'CREATE INDEX idx_equipment_equipment_id ON equipment(equipment_id, shipment_id)',
      'CREATE INDEX idx_alert_updated_at ON alert(updated_at DESC, status)',
      'CREATE INDEX idx_users_search ON users_table(active, name, username, email)',
      'CREATE INDEX idx_customers_search ON customers(customer_name, customer_id, customer_location)',
      'CREATE INDEX idx_geofence_proximity ON geofence_table(latitude, longitude, status, geofence_type)',
      'CREATE INDEX idx_stop_geofence_tracking ON stop(shipment_id, latitude, longitude, geo_fence_radius)',
      'CREATE INDEX idx_vendor_status_name ON vendor(status, name)',
      'CREATE INDEX idx_alarm_status_category ON alarm(alarm_status, alarm_category, alarm_type_id)',
      'CREATE INDEX idx_gps_timestamp_cleanup ON gps_schema(gpstimestamp, created_at)',
      'CREATE INDEX idx_equipment_driver_mobile ON equipment(driver_mobile_no, shipment_id)',
      'CREATE INDEX idx_user_role_lookup ON user_role(user_id, role_id)'
    ];
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const indexSQL of additionalIndexes) {
      try {
        await connection.execute(indexSQL);
        successCount++;
        console.log(`✅ Created additional index`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          skipCount++;
          console.log(`⚠️  Index already exists`);
        } else {
          console.error(`❌ Error: ${error.message}`);
        }
      }
    }
    
    console.log(`\n📊 Additional Migration Results:`);
    console.log(`✅ Successfully created: ${successCount} indexes`);
    console.log(`⚠️  Already existed: ${skipCount} indexes`);
    
  } finally {
    await connection.end();
  }
}

async function main() {
  try {
    await runAdditionalMigration();
    console.log('🎉 Additional indexing completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Additional migration failed:', error);
    process.exit(1);
  }
}

main();