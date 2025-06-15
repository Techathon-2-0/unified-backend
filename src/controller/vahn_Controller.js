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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVahanFromDb = exports.getVahanData = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const mysql2_1 = require("drizzle-orm/mysql2");
dotenv_1.default.config();
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
const getVahanData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get request body from the client
        const requestBody = req.body;
        const vehicleNumber = requestBody.vehiclenumber;
        if (!vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle number is required'
            });
        }
        // API configuration
        const apiUrl = process.env.VITE_API_BASE_URL;
        const apiKey = process.env.VITE_API_KEY;
        const secKey = process.env.VITE_SEC_KEY;
        // Make the request to the VAHAN API
        const response = yield axios_1.default.post(apiUrl, requestBody, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api-key': apiKey,
                'seckey': secKey
            }
        });
        let existingVehicle = [];
        let dbOperation = undefined;
        // Check if we got a successful response
        if (response.status === 200 && response.data) {
            const vahanData = response.data.json;
            // Check if vehicle already exists in the database
            existingVehicle = yield db.select()
                .from(schema_1.vahan)
                .where((0, drizzle_orm_1.eq)(schema_1.vahan.rc_regn_no, vehicleNumber))
                .limit(1);
            const vahanRecordData = {
                status_message: vahanData.stautsMessage || '',
                rc_regn_no: vehicleNumber,
                rc_regn_dt: vahanData.rc_regn_dt || '',
                rc_regn_upto: vahanData.rc_regn_upto || '',
                rc_purchase_dt: vahanData.rc_purchase_dt || '',
                rc_owner_name: vahanData.rc_owner_name || '',
                rc_present_address: vahanData.rc_present_address || '',
                rc_vch_catg_desc: vahanData.rc_vch_catg_desc || '',
                rc_insurance_comp: vahanData.rc_insurance_comp || '',
                rc_insurance_policy_no: vahanData.rc_insurance_policy_no || '',
                rc_insurance_upto: vahanData.rc_insurance_upto || '',
                rc_permit_no: vahanData.rc_permit_no || '',
                rc_permit_type: vahanData.rc_permit_type || '',
                rc_permit_valid_upto: vahanData.rc_permit_valid_upto || '',
                rc_vh_class_desc: vahanData.rc_vh_class_desc || '',
                rc_maker_model: vahanData.rc_maker_model || '',
                rc_maker_desc: vahanData.rc_maker_desc || '',
                rc_color: vahanData.rc_color || '',
                rc_chasi_no: vahanData.rc_chasi_no || '',
                rc_eng_no: vahanData.rc_eng_no || '',
                rc_fuel_desc: vahanData.rc_fuel_desc || '',
                rc_norms_desc: vahanData.rc_norms_desc || '',
                rc_fit_upto: vahanData.rc_fit_upto || '',
                rc_tax_upto: vahanData.rc_tax_upto || '',
                rc_pucc_upto: vahanData.rc_pucc_upto || '',
            };
            if (existingVehicle.length > 0) {
                // Update existing record
                yield db.update(schema_1.vahan)
                    .set(vahanRecordData)
                    .where((0, drizzle_orm_1.eq)(schema_1.vahan.rc_regn_no, vehicleNumber));
                dbOperation = 'updated';
                console.log('VAHAN data updated for vehicle:', vehicleNumber);
            }
            else {
                // Insert new record (entity_id will be null if called directly)
                yield db.insert(schema_1.vahan).values(Object.assign(Object.assign({}, vahanRecordData), { entity_id: null // This will be updated when creating an entity
                 }));
                dbOperation = 'created';
                console.log('VAHAN data created for vehicle:', vehicleNumber);
            }
        }
        // Return the API response to the client
        return res.status(response.status).json(Object.assign(Object.assign({}, response.data), { dbOperation }));
    }
    catch (error) {
        console.error('Error fetching VAHAN data:', error.message);
        // If the error has a response object (from axios), return that status and data
        if (error.response) {
            return res.status(error.response.status).json({
                error: true,
                message: 'Error from VAHAN API',
                details: error.response.data
            });
        }
        // Generic error
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch data from VAHAN API',
            details: error.message
        });
    }
});
exports.getVahanData = getVahanData;
const getVahanFromDb = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { vehicleNumber } = req.params;
        if (!vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle number is required'
            });
        }
        // Query the database for the vehicle data
        const vahanData = yield db.select()
            .from(schema_1.vahan)
            .where((0, drizzle_orm_1.eq)(schema_1.vahan.rc_regn_no, vehicleNumber))
            .limit(1);
        if (vahanData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle data not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Vehicle data retrieved successfully',
            data: vahanData[0]
        });
    }
    catch (error) {
        console.error('Error fetching vehicle data from database:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch vehicle data from database',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getVahanFromDb = getVahanFromDb;
