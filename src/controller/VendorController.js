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
exports.createVendor = createVendor;
exports.getAllVendors = getAllVendors;
exports.getVendorById = getVendorById;
exports.updateVendor = updateVendor;
exports.deleteVendor = deleteVendor;
exports.searchVendors = searchVendors;
const mysql2_1 = require("drizzle-orm/mysql2");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
//working
function createVendor(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { name, status } = req.body;
            // Validate required fields
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor name is required'
                });
            }
            // Check if vendor with same name already exists
            const existingVendor = yield db.select()
                .from(schema_1.vendor)
                .where((0, drizzle_orm_1.eq)(schema_1.vendor.name, name));
            if (existingVendor.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'A vendor with this name already exists'
                });
            }
            // Create vendor
            const [insertedVendor] = yield db.insert(schema_1.vendor).values({
                name,
                status: status === undefined ? true : Boolean(status)
            }).$returningId();
            res.status(201).json({
                success: true,
                message: 'Vendor created successfully',
                data: insertedVendor
            });
        }
        catch (error) {
            console.error('Error creating vendor:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function getAllVendors(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield db.select().from(schema_1.vendor);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            console.error('Error fetching vendors:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch vendors',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function getVendorById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Get vendor
            const vendorResult = yield db.select()
                .from(schema_1.vendor)
                .where((0, drizzle_orm_1.eq)(schema_1.vendor.id, parseInt(id)))
                .limit(1);
            if (vendorResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            res.status(200).json({
                success: true,
                data: vendorResult[0]
            });
        }
        catch (error) {
            console.error('Error fetching vendor:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch vendor',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function updateVendor(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { status } = req.body;
            // Check if any update data was provided
            if (status === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'No update data provided'
                });
            }
            // Check if vendor exists
            const existingVendor = yield db.select()
                .from(schema_1.vendor)
                .where((0, drizzle_orm_1.eq)(schema_1.vendor.id, parseInt(id)))
                .limit(1);
            if (existingVendor.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            // Update vendor
            const updateData = {};
            if (status !== undefined)
                updateData.status = Boolean(status);
            yield db.update(schema_1.vendor)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.vendor.id, parseInt(id)));
            // Fetch the updated vendor
            const [updatedVendor] = yield db.select()
                .from(schema_1.vendor)
                .where((0, drizzle_orm_1.eq)(schema_1.vendor.id, parseInt(id)))
                .limit(1);
            res.status(200).json({
                success: true,
                message: 'Vendor updated successfully',
                data: updatedVendor
            });
        }
        catch (error) {
            console.error('Error updating vendor:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update vendor',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function deleteVendor(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Check if vendor exists
            const existingVendor = yield db.select()
                .from(schema_1.vendor)
                .where((0, drizzle_orm_1.eq)(schema_1.vendor.id, parseInt(id)))
                .limit(1);
            if (existingVendor.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            // Check if vendor is associated with any entities
            const entityAssociations = yield db.select()
                .from(schema_1.entity_vendor)
                .where((0, drizzle_orm_1.eq)(schema_1.entity_vendor.vendor_id, parseInt(id)))
                .limit(1);
            if (entityAssociations.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete vendor as it is associated with one or more entities'
                });
            }
            // Delete vendor
            yield db.delete(schema_1.vendor)
                .where((0, drizzle_orm_1.eq)(schema_1.vendor.id, parseInt(id)));
            res.status(200).json({
                success: true,
                message: 'Vendor deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting vendor:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete vendor',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function searchVendors(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const searchQuery = req.query.query;
            const statusFilter = req.query.status;
            if (!searchQuery) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }
            // Check if search query is a number (ID) or string (name)
            const isNumeric = /^\d+$/.test(searchQuery);
            let query;
            if (isNumeric) {
                // Search by ID
                if (statusFilter === 'true') {
                    query = db.select()
                        .from(schema_1.vendor)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vendor.id, parseInt(searchQuery)), (0, drizzle_orm_1.eq)(schema_1.vendor.status, true)));
                }
                else if (statusFilter === 'false') {
                    query = db.select()
                        .from(schema_1.vendor)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vendor.id, parseInt(searchQuery)), (0, drizzle_orm_1.eq)(schema_1.vendor.status, false)));
                }
                else {
                    query = db.select()
                        .from(schema_1.vendor)
                        .where((0, drizzle_orm_1.eq)(schema_1.vendor.id, parseInt(searchQuery)));
                }
            }
            else {
                // Search by name (case insensitive)
                if (statusFilter === 'true') {
                    query = db.select()
                        .from(schema_1.vendor)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `LOWER(${schema_1.vendor.name}) LIKE LOWER(${`%${searchQuery}%`})`, (0, drizzle_orm_1.eq)(schema_1.vendor.status, true)));
                }
                else if (statusFilter === 'false') {
                    query = db.select()
                        .from(schema_1.vendor)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `LOWER(${schema_1.vendor.name}) LIKE LOWER(${`%${searchQuery}%`})`, (0, drizzle_orm_1.eq)(schema_1.vendor.status, false)));
                }
                else {
                    query = db.select()
                        .from(schema_1.vendor)
                        .where((0, drizzle_orm_1.sql) `LOWER(${schema_1.vendor.name}) LIKE LOWER(${`%${searchQuery}%`})`);
                }
            }
            const results = yield query;
            res.status(200).json({
                success: true,
                data: results
            });
        }
        catch (error) {
            console.error('Error searching vendors:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search vendors',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
