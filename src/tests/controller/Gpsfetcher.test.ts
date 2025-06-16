const mysql = require('mysql2/promise');
const Gpsfetcher = require('../../controller/Gpsfetcher');
const { vi, expect, test, describe, beforeEach, afterEach } = require('vitest');
const { insertGpsData } = require('../../controller/Gpsfetcher');

describe('Gpsfetcher', () => {
	let connection;

	beforeAll(async () => {
		connection = await mysql.createConnection({
			host: 'localhost',
			user: 'your_username',
			password: 'your_password',
			database: 'your_database'
		});
	});

	afterAll(async () => {
		await connection.end();
	});

	test('should fetch GPS data', async () => {
		const gpsData = await Gpsfetcher.fetchData(connection);
		expect(gpsData).toBeDefined();
		expect(Array.isArray(gpsData)).toBe(true);
	});
});
// Import jest mocking utilities and the module to test

// Mock the database and other dependencies
vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: vi.fn(() => mockDb)
}));

// Set up mock database functions
const mockSelect = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

// Create mock DB object with chained methods
const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate
};

// Configure the mock method chains
beforeEach(() => {
  // Reset all mocks
  vi.resetAllMocks();
  
  // Setup chaining for select queries
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ 
    orderBy: mockOrderBy,
    limit: mockLimit 
  });
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  
  // Setup chaining for insert queries
  mockInsert.mockReturnValue({ values: mockValues });
  
  // Setup chaining for update queries
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockWhere });
  
  // Mock process.env
  process.env.DATABASE_URL = 'mock-db-url';
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Geofence entry and exit detection', () => {
  test('should detect when a vehicle enters a geofence', async () => {
    // Test data for a vehicle entering a geofence
    const testData = [[{
      trailerNumber: 'TR001',
      timestamp: '2023-06-01T10:00:00Z',
      gpstimestamp: '2023-06-01T10:00:00Z',
      gprstimestamp: '2023-06-01T10:00:00Z',
      longitude: 73.8567,  // Inside geofence
      latitude: 18.5204,   // Inside geofence
      heading: 90,
      speed: 0,
      numberOfSatellites: 8,
      digitalInput1: 1,
      internalBatteryLevel: 95,
      GPSVendor: 'TestVendor'
    }]];

    // Mock entity, vendor, and equipment lookups
    mockWhere.mockImplementation((condition) => {
      if (condition?.column?.name === 'vehicleNumber') {
        return Promise.resolve([{ vehicleNumber: 'TR001', id: 1 }]);
      } else if (condition?.column?.name === 'name') {
        return Promise.resolve([{ name: 'TestVendor', status: true, id: 1 }]);
      } else if (condition?.column?.name === 'equipment_id') {
        return Promise.resolve([{ equipment_id: 'TR001', shipment_id: 'SHIP001', id: 1 }]);
      } else if (condition?.column?.name === 'shipment_id') {
        return Promise.resolve([{
          id: 1,
          shipment_id: 'SHIP001',
          latitude: 18.5204,
          longitude: 73.8567,
          geo_fence_radius: 1000
        }]);
      } else if (condition?.column?.name === 'trailerNumber') {
        // Previous position was outside geofence
        return Promise.resolve([{
          trailerNumber: 'TR001',
          latitude: 18.5404,  // Outside geofence
          longitude: 73.8767,
          timestamp: '2023-06-01T09:50:00Z'
        }]);
      }
      return Promise.resolve([]);
    });

    // Call the function
    await insertGpsData(testData);

    // Verify geofence entry was detected
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      entry_time: expect.any(String)
    }));
    
    // Verify GPS data was inserted
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        trailerNumber: 'TR001'
      })
    ]));
  });

  test('should detect when a vehicle exits a geofence', async () => {
    // Test data for a vehicle exiting geofence
    const testData = [[{
      trailerNumber: 'TR002',
      timestamp: '2023-06-01T11:00:00Z',
      gpstimestamp: '2023-06-01T11:00:00Z',
      gprstimestamp: '2023-06-01T11:00:00Z',
      longitude: 73.8967,  // Outside geofence
      latitude: 18.5404,   // Outside geofence
      heading: 90,
      speed: 20,
      numberOfSatellites: 10,
      digitalInput1: 1,
      internalBatteryLevel: 90,
      GPSVendor: 'TestVendor'
    }]];

    // Mock database responses
    mockWhere.mockImplementation((condition) => {
      if (condition?.column?.name === 'vehicleNumber') {
        return Promise.resolve([{ vehicleNumber: 'TR002', id: 2 }]);
      } else if (condition?.column?.name === 'name') {
        return Promise.resolve([{ name: 'TestVendor', status: true, id: 1 }]);
      } else if (condition?.column?.name === 'equipment_id') {
        return Promise.resolve([{ equipment_id: 'TR002', shipment_id: 'SHIP002', id: 2 }]);
      } else if (condition?.column?.name === 'shipment_id') {
        return Promise.resolve([{
          id: 2,
          shipment_id: 'SHIP002',
          latitude: 18.5204,
          longitude: 73.8567,
          geo_fence_radius: 1000
        }]);
      } else if (condition?.column?.name === 'trailerNumber') {
        // Previous position was inside geofence
        return Promise.resolve([{
          trailerNumber: 'TR002',
          latitude: 18.5204,  // Inside geofence
          longitude: 73.8567,
          timestamp: '2023-06-01T10:50:00Z'
        }]);
      }
      return Promise.resolve([]);
    });

    // Call the function
    await insertGpsData(testData);

    // Verify geofence exit was detected
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      exit_time: expect.any(String)
    }));
    
    // Verify GPS data was inserted
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        trailerNumber: 'TR002'
      })
    ]));
  });

  test('should not update timestamps when vehicle stays inside a geofence', async () => {
    // Setup test data for a vehicle remaining inside geofence
    const testData = [[{
      trailerNumber: 'TR003',
      timestamp: '2023-06-01T12:00:00Z',
      gpstimestamp: '2023-06-01T12:00:00Z',
      gprstimestamp: '2023-06-01T12:00:00Z',
      longitude: 73.8567,  // Inside geofence
      latitude: 18.5204,   // Inside geofence
      heading: 180,
      speed: 5,
      numberOfSatellites: 9,
      digitalInput1: 1,
      internalBatteryLevel: 85,
      GPSVendor: 'TestVendor'
    }]];

    // Mock database responses
    mockWhere.mockImplementation((condition) => {
      if (condition?.column?.name === 'vehicleNumber') {
        return Promise.resolve([{ vehicleNumber: 'TR003', id: 3 }]);
      } else if (condition?.column?.name === 'name') {
        return Promise.resolve([{ name: 'TestVendor', status: true, id: 1 }]);
      } else if (condition?.column?.name === 'equipment_id') {
        return Promise.resolve([{ equipment_id: 'TR003', shipment_id: 'SHIP003', id: 3 }]);
      } else if (condition?.column?.name === 'shipment_id') {
        return Promise.resolve([{
          id: 3,
          shipment_id: 'SHIP003',
          latitude: 18.5204,
          longitude: 73.8567,
          geo_fence_radius: 1000
        }]);
      } else if (condition?.column?.name === 'trailerNumber') {
        // Previous position was also inside geofence
        return Promise.resolve([{
          trailerNumber: 'TR003',
          latitude: 18.5204,  // Inside geofence
          longitude: 73.8567,
          timestamp: '2023-06-01T11:50:00Z'
        }]);
      }
      return Promise.resolve([]);
    });

    // Call the function
    await insertGpsData(testData);

    // Should not update entry or exit time since there was no boundary crossing
    expect(mockUpdate).not.toHaveBeenCalled();
    
    // Should still insert GPS data
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        trailerNumber: 'TR003'
      })
    ]));
  });

  test('should not update timestamps when vehicle stays outside a geofence', async () => {
    // Setup test data for a vehicle remaining outside geofence
    const testData = [[{
      trailerNumber: 'TR004',
      timestamp: '2023-06-01T13:00:00Z',
      gpstimestamp: '2023-06-01T13:00:00Z',
      gprstimestamp: '2023-06-01T13:00:00Z',
      longitude: 73.9567,  // Outside geofence
      latitude: 18.6204,   // Outside geofence
      heading: 270,
      speed: 40,
      numberOfSatellites: 12,
      digitalInput1: 1,
      internalBatteryLevel: 80,
      GPSVendor: 'TestVendor'
    }]];

    // Mock database responses
    mockWhere.mockImplementation((condition) => {
      if (condition?.column?.name === 'vehicleNumber') {
        return Promise.resolve([{ vehicleNumber: 'TR004', id: 4 }]);
      } else if (condition?.column?.name === 'name') {
        return Promise.resolve([{ name: 'TestVendor', status: true, id: 1 }]);
      } else if (condition?.column?.name === 'equipment_id') {
        return Promise.resolve([{ equipment_id: 'TR004', shipment_id: 'SHIP004', id: 4 }]);
      } else if (condition?.column?.name === 'shipment_id') {
        return Promise.resolve([{
          id: 4,
          shipment_id: 'SHIP004',
          latitude: 18.5204,
          longitude: 73.8567,
          geo_fence_radius: 1000
        }]);
      } else if (condition?.column?.name === 'trailerNumber') {
        // Previous position was also outside geofence
        return Promise.resolve([{
          trailerNumber: 'TR004',
          latitude: 18.6304,  // Outside geofence
          longitude: 73.9667,
          timestamp: '2023-06-01T12:50:00Z'
        }]);
      }
      return Promise.resolve([]);
    });

    // Call the function
    await insertGpsData(testData);

    // Should not update entry or exit time
    expect(mockUpdate).not.toHaveBeenCalled();
    
    // Should still insert GPS data
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        trailerNumber: 'TR004'
      })
    ]));
  });

  test('should handle first-time GPS record properly', async () => {
    // Setup test data for a vehicle with no previous GPS record
    const testData = [[{
      trailerNumber: 'TR005',
      timestamp: '2023-06-01T14:00:00Z',
      gpstimestamp: '2023-06-01T14:00:00Z',
      gprstimestamp: '2023-06-01T14:00:00Z',
      longitude: 73.8567,  // Inside geofence
      latitude: 18.5204,   // Inside geofence
      heading: 0,
      speed: 0,
      numberOfSatellites: 10,
      digitalInput1: 1,
      internalBatteryLevel: 100,
      GPSVendor: 'TestVendor'
    }]];

    // Mock database responses
    mockWhere.mockImplementation((condition) => {
      if (condition?.column?.name === 'vehicleNumber') {
        return Promise.resolve([{ vehicleNumber: 'TR005', id: 5 }]);
      } else if (condition?.column?.name === 'name') {
        return Promise.resolve([{ name: 'TestVendor', status: true, id: 1 }]);
      } else if (condition?.column?.name === 'equipment_id') {
        return Promise.resolve([{ equipment_id: 'TR005', shipment_id: 'SHIP005', id: 5 }]);
      } else if (condition?.column?.name === 'shipment_id') {
        return Promise.resolve([{
          id: 5,
          shipment_id: 'SHIP005',
          latitude: 18.5204,
          longitude: 73.8567,
          geo_fence_radius: 1000
        }]);
      } else if (condition?.column?.name === 'trailerNumber') {
        // No previous GPS data
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    // Call the function
    await insertGpsData(testData);

    // Should update entry time (first record is inside geofence)
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      entry_time: expect.any(String)
    }));
    
    // Should insert GPS data
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        trailerNumber: 'TR005'
      })
    ]));
  });

  test('should handle empty data arrays', async () => {
    await insertGpsData([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test('should skip invalid vehicles or vendors', async () => {
    const testData = [[{
      trailerNumber: 'INVALID',
      timestamp: '2023-06-01T12:00:00Z',
      gpstimestamp: '2023-06-01T12:00:00Z',
      gprstimestamp: '2023-06-01T12:00:00Z',
      longitude: 73.8567,
      latitude: 18.5204,
      heading: 90,
      speed: 0,
      numberOfSatellites: 8,
      digitalInput1: 1,
      internalBatteryLevel: 95,
      GPSVendor: 'InvalidVendor'
    }]];

    // Return empty arrays to simulate no matching entities/vendors
    mockWhere.mockImplementation(() => {
      return Promise.resolve([]);
    });

    await insertGpsData(testData);
    
    // No data should be inserted
    expect(mockInsert).not.toHaveBeenCalled();
  });
});