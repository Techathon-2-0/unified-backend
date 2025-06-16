import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse DATABASE_URL or use default values
const getDatabaseConfig = () => {
  try {
    // Use DATABASE_URL from environment variables
    const dbUrl = process.env.DATABASE_URL || 'mysql://user:1234567890@localhost:3306/mll_vehicle_gps';
    
    // Parse the connection string
    const matches = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!matches) {
      throw new Error('Invalid DATABASE_URL format');
    }
    
    const [, user, password, host, port, database] = matches;
    
    return {
      host,
      user,
      password,
      database,
      port: parseInt(port, 10)
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    // Fallback to hardcoded values if parsing fails
    return {
      host: 'localhost',
      user: 'user',
      password: '1234567890',
      database: 'mll_vehicle_gps',
      port: 3306
    };
  }
};

const dbConfig = getDatabaseConfig();
const connection = mysql.createPool(dbConfig);

console.log(`Connected to database: ${dbConfig.database} on ${dbConfig.host}`);

// Extend NodeJS.Global to include 'connection'
declare global {
  // eslint-disable-next-line no-var
  var connection: mysql.Pool;
}

module.exports = async () => {
  global.connection = connection;
};

// Global test setup code goes here
beforeAll(async () => {
  // Setup code that runs before all tests
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup code that runs after all tests
  console.log('Cleaning up test environment...');
  // Close database connection when tests are done
  await connection.end();
});
// The beforeAll function is provided by most test frameworks (like Jest).
// If not available, you can define a simple version for setup purposes:

function beforeAll(setupFn: () => Promise<void>) {
    setupFn();
}
function afterAll(teardownFn: () => Promise<void>) {
    // If a global afterAll is not available (e.g., outside Jest), run teardown immediately.
    teardownFn();
}

