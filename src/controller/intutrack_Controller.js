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
exports.getConsentStatus = exports.refreshConsentStatus = void 0;
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const mysql2_1 = require("drizzle-orm/mysql2");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
const refreshConsentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shipmentId = req.query.shipment_id;
        if (!shipmentId) {
            return res.status(400).json({
                success: false,
                message: 'Shipment ID is required'
            });
        }
        // Get driver mobile number from shipment
        const shipmentData = yield db
            .select({
            driver_mobile_no: schema_1.equipment.driver_mobile_no,
            shipment_id: schema_1.shipment.id
        })
            .from(schema_1.shipment)
            .leftJoin(schema_1.equipment, (0, drizzle_orm_1.eq)(schema_1.equipment.shipment_id, schema_1.shipment.id))
            .where((0, drizzle_orm_1.eq)(schema_1.shipment.shipment_id, shipmentId))
            .limit(1);
        if (!shipmentData.length || !shipmentData[0].driver_mobile_no) {
            return res.status(404).json({
                success: false,
                message: 'Driver mobile number not found for this shipment'
            });
        }
        const driverMobile = shipmentData[0].driver_mobile_no;
        // Call Intutrack API
        const intutrackResponse = yield fetch(`${process.env.INTUTRACK_API_URL}/consents?tel=${driverMobile}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${process.env.INTUTRACK_BASE_AUTH}`,
                'Content-Type': 'application/json'
            }
        });
        if (!intutrackResponse.ok) {
            return res.status(intutrackResponse.status).json({
                success: false,
                message: 'Failed to fetch consent status from Intutrack API'
            });
        }
        const apiData = yield intutrackResponse.json();
        if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No consent data found'
            });
        }
        const consentData = apiData[0].result;
        // Check if record already exists
        const existingRecord = yield db
            .select()
            .from(schema_1.intutrack_relation)
            .where((0, drizzle_orm_1.eq)(schema_1.intutrack_relation.phone_number, driverMobile))
            .limit(1);
        if (existingRecord.length > 0) {
            // Update existing record
            yield db
                .update(schema_1.intutrack_relation)
                .set({
                current_consent: consentData.current_consent,
                consent: consentData.consent,
                operator: consentData.operator
            })
                .where((0, drizzle_orm_1.eq)(schema_1.intutrack_relation.phone_number, driverMobile));
        }
        else {
            // Insert new record
            yield db.insert(schema_1.intutrack_relation).values({
                phone_number: driverMobile,
                current_consent: consentData.current_consent,
                consent: consentData.consent,
                operator: consentData.operator
            });
        }
        // Return response to frontend
        return res.status(200).json({
            success: true,
            data: {
                phone_number: consentData.number,
                current_consent: consentData.current_consent,
                consent: consentData.consent,
                operator: consentData.operator,
                consent_suggestion: consentData.consent_suggestion,
                message: consentData.message
            }
        });
    }
    catch (error) {
        console.error('Error in refreshConsentStatus:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.refreshConsentStatus = refreshConsentStatus;
const getConsentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shipmentId = req.query.shipment_id;
        if (!shipmentId) {
            return res.status(400).json({
                success: false,
                message: 'Shipment ID is required'
            });
        }
        // Get driver mobile number from shipment
        const shipmentData = yield db
            .select({
            driver_mobile_no: schema_1.equipment.driver_mobile_no
        })
            .from(schema_1.shipment)
            .leftJoin(schema_1.equipment, (0, drizzle_orm_1.eq)(schema_1.equipment.shipment_id, schema_1.shipment.id))
            .where((0, drizzle_orm_1.eq)(schema_1.shipment.shipment_id, shipmentId))
            .limit(1);
        if (!shipmentData.length || !shipmentData[0].driver_mobile_no) {
            return res.status(404).json({
                success: false,
                message: 'Driver mobile number not found for this shipment'
            });
        }
        const driverMobile = shipmentData[0].driver_mobile_no;
        // Fetch from database
        const consentData = yield db
            .select()
            .from(schema_1.intutrack_relation)
            .where((0, drizzle_orm_1.eq)(schema_1.intutrack_relation.phone_number, driverMobile))
            .limit(1);
        if (!consentData.length) {
            return res.status(404).json({
                success: false,
                message: 'No consent data found. Please refresh to fetch latest data.'
            });
        }
        return res.status(200).json({
            success: true,
            data: consentData[0]
        });
    }
    catch (error) {
        console.error('Error in getConsentStatus:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.getConsentStatus = getConsentStatus;
