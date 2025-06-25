import  {processContinuousDrivingAlerts}  from './continuous_driving'
import { processGeofenceAlerts } from './geofence';
import { processOverspeedingAlerts } from './overspeeding';
import { processStoppageAlerts } from './stoppage';
import { processRouteDeviationAlerts } from './routeDeviation';

// Configuration for alert processing
const ALERT_CONFIG = {
  enableProcessing: process.env.ENABLE_ALERT_PROCESSING === 'true',
  processingInterval: parseInt(process.env.ALERT_PROCESSING_INTERVAL || '1200000'),
  batchSize: parseInt(process.env.ALERT_BATCH_SIZE || '100')
};

// Track last processing time to avoid too frequent processing
let lastProcessingTime = 0;

export async function processAllAlerts(): Promise<void> {
  try {
    // Check if alert processing is enabled
    if (!ALERT_CONFIG.enableProcessing) {
      console.log('⏭️ Alert processing is disabled');
      return;
    }

    // Rate limiting: don't process alerts too frequently
    const currentTime = Date.now();
    if (currentTime - lastProcessingTime < ALERT_CONFIG.processingInterval) {
      console.log('⏳ Skipping alert processing (rate limited)');
      return;
    }

    console.log('🔍 Starting alert processing for all alert types...');
    lastProcessingTime = currentTime;
    
    // Process all alert types in parallel for better performance
    const alertPromises = [
      processOverspeedingAlerts().catch(err => console.error('❌ Overspeeding alerts failed:', err)),
      processStoppageAlerts().catch(err => console.error('❌ Stoppage alerts failed:', err)),
      processContinuousDrivingAlerts().catch(err => console.error('❌ Continuous driving alerts failed:', err)),
      processGeofenceAlerts().catch(err => console.error('❌ Geofence alerts failed:', err)),
      processRouteDeviationAlerts().catch(err => console.error('❌ Route deviation alerts failed:', err))
    ];

    // Wait for all alert processing to complete
    await Promise.allSettled(alertPromises);
    
    console.log('✅ Alert processing completed for all types');
    
  } catch (error) {
    console.error('❌ Error in master alert processor:', error);
    // Don't throw error to prevent GPS processing from failing
  }
}

/**
 * Process alerts for a specific vehicle
 * This can be used for targeted alert processing
 * @param vehicleNumber - The vehicle number to process alerts for
 */
export async function processAlertsForVehicle(vehicleNumber: string): Promise<void> {
  try {
    console.log(`🔍 Processing alerts for vehicle: ${vehicleNumber}`);
    
    // For now, we'll run all alerts as they already filter by vehicle groups
    await processAllAlerts();
    
  } catch (error) {
    console.error(`❌ Error processing alerts for vehicle ${vehicleNumber}:`, error);
  }
}