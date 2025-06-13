import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export async function runMigrations(): Promise<void> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST! ,
    user: process.env.DB_USER! ,
    password: process.env.DB_PASSWORD! ,
    database: process.env.DB_NAME! ,
    multipleStatements: true
  });

  try {
    console.log('📊 Applying critical database indexes...');
    
    const migrationPath = path.join(__dirname, '../migrations/001_comprehensive_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Better SQL parsing - handle multi-line statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Remove empty statements and comment-only lines
        const cleaned = stmt.replace(/--.*$/gm, '').trim();
        return cleaned.length > 0 && !cleaned.startsWith('--');
      });
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        await connection.execute(statement);
        successCount++;
        console.log(`✅ Index created successfully`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️  Index already exists, skipping...`);
          skipCount++;
        } else {
          console.error(`❌ Error creating index: ${error.message}`);
          console.error(`Failed SQL: ${statement.substring(0, 100)}...`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📊 Migration Results:`);
    console.log(`✅ Successfully created: ${successCount} indexes`);
    console.log(`⚠️  Already existed: ${skipCount} indexes`);
    console.log(`❌ Failed: ${errorCount} indexes`);
    
  } finally {
    await connection.end();
  }
}