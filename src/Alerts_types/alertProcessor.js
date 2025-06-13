"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAllAlerts = processAllAlerts;
exports.processAlertsForVehicle = processAlertsForVehicle;
const continuous_driving_1 = require("./continuous_driving");
const geofence_1 = require("./geofence");
const overspeeding_1 = require("./overspeeding");
const stoppage_1 = require("./stoppage");
const routeDeviation_1 = require("./routeDeviation");
// Configuration for alert processing
const ALERT_CONFIG = {
    enableProcessing: process.env.ENABLE_ALERT_PROCESSING === 'true',
    processingInterval: parseInt(process.env.ALERT_PROCESSING_INTERVAL || '120000'),
    batchSize: parseInt(process.env.ALERT_BATCH_SIZE || '100')
};
// Track last processing time to avoid too frequent processing
let lastProcessingTime = 0;
function processAllAlerts() {
    return __awaiter(this, void 0, void 0, function* () {
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
                (0, overspeeding_1.processOverspeedingAlerts)().catch(err => console.error('❌ Overspeeding alerts failed:', err)),
                (0, stoppage_1.processStoppageAlerts)().catch(err => console.error('❌ Stoppage alerts failed:', err)),
                (0, continuous_driving_1.processContinuousDrivingAlerts)().catch(err => console.error('❌ Continuous driving alerts failed:', err)),
                (0, geofence_1.processGeofenceAlerts)().catch(err => console.error('❌ Geofence alerts failed:', err)),
                (0, routeDeviation_1.processRouteDeviationAlerts)().catch(err => console.error('❌ Route deviation alerts failed:', err))
            ];
            // Wait for all alert processing to complete
            yield Promise.allSettled(alertPromises);
            console.log('✅ Alert processing completed for all types');
        }
        catch (error) {
            console.error('❌ Error in master alert processor:', error);
            // Don't throw error to prevent GPS processing from failing
        }
    });
}
/**
 * Process alerts for a specific vehicle
 * This can be used for targeted alert processing
 * @param vehicleNumber - The vehicle number to process alerts for
 */
function processAlertsForVehicle(vehicleNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`🔍 Processing alerts for vehicle: ${vehicleNumber}`);
            // For now, we'll run all alerts as they already filter by vehicle groups
            yield processAllAlerts();
        }
        catch (error) {
            console.error(`❌ Error processing alerts for vehicle ${vehicleNumber}:`, error);
        }
    });
}
