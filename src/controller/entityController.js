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
exports.createEntity = createEntity;
exports.getAllEntities = getAllEntities;
exports.getEntityById = getEntityById;
exports.searchEntities = searchEntities;
exports.deleteEntity = deleteEntity;
exports.updateEntity = updateEntity;
exports.getAllActiveVendors = getAllActiveVendors;
const mysql2_1 = require("drizzle-orm/mysql2");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
const vahn_Controller_1 = require("./vahn_Controller"); // Importing the vahan data fetching function
// working
function createEntity(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { vehicleNumber, type, status, vendorIds } = req.body;
            // Validate required fields
            if (!vehicleNumber || !type || status === undefined || !vendorIds || !Array.isArray(vendorIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields. vehicleNumber, type, status, and vendorIds array are required'
                });
            }
            // Check if vendors exist
            const existingVendors = yield db.select()
                .from(schema_1.vendor)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.vendor.id, vendorIds), (0, drizzle_orm_1.eq)(schema_1.vendor.status, true))); // Assuming we only want active vendors
            if (existingVendors.length !== vendorIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more vendor IDs do not exist'
                });
            }
            // Create entity
            const [insertedEntity] = yield db.insert(schema_1.entity).values({
                vehicleNumber,
                type,
                status: Boolean(status),
            }).$returningId();
            // Create vendor relationships
            for (const vendorId of vendorIds) {
                yield db.insert(schema_1.entity_vendor).values({
                    entity_id: insertedEntity.id,
                    vendor_id: vendorId
                });
            }
            const entityVendors = yield db.select({
                id: schema_1.vendor.id,
                name: schema_1.vendor.name,
                status: schema_1.vendor.status
            })
                .from(schema_1.entity_vendor)
                .innerJoin(schema_1.vendor, (0, drizzle_orm_1.eq)(schema_1.entity_vendor.vendor_id, schema_1.vendor.id))
                .where((0, drizzle_orm_1.eq)(schema_1.entity_vendor.entity_id, insertedEntity.id));
            // Return the entity with its vendors
            res.status(201).json({
                success: true,
                message: 'Entity created successfully',
                data: Object.assign(Object.assign({}, insertedEntity), { vendors: entityVendors })
            });
            // Fetch vehicle data from VAHAN API and store it in the database
            try {
                // Create a mock request object to use with getVahanData
                const mockReq = {
                    body: {
                        vehiclenumber: vehicleNumber
                    }
                };
                // Create a mock response object to capture VAHAN API response
                const mockRes = {
                    status: function (statusCode) {
                        this.statusCode = statusCode;
                        return this;
                    },
                    json: function (data) {
                        this.responseData = data;
                        return this;
                    },
                    statusCode: 0,
                    responseData: null
                };
                // Call VAHAN API
                yield (0, vahn_Controller_1.getVahanData)(mockReq, mockRes);
                // console.log('VAHAN API response:', vahanData    );
                // If we got a successful response, store the data
                if (mockRes.statusCode === 200 && mockRes.responseData) {
                    const vahanData = mockRes.responseData.json;
                    // Insert VAHAN data into the database
                    yield db.insert(schema_1.vahan).values({
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
                        entity_id: insertedEntity.id
                    });
                    console.log('VAHAN data stored successfully for vehicle:', vehicleNumber);
                }
                else {
                    console.warn('Failed to fetch VAHAN data for vehicle:', vehicleNumber);
                }
            }
            catch (vahanError) {
                // Log error but don't fail the entity creation
                console.error('Error fetching or storing VAHAN data:', vahanError);
            }
        }
        catch (error) {
            console.error('Error creating entity:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function getAllEntities(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const entities = yield db.select().from(schema_1.entity);
            // For each entity, get its vendors
            const entitiesWithVendors = yield Promise.all(entities.map((ent) => __awaiter(this, void 0, void 0, function* () {
                const vendorRelations = yield db
                    .select({
                    id: schema_1.vendor.id,
                    name: schema_1.vendor.name,
                    status: schema_1.vendor.status
                })
                    .from(schema_1.entity_vendor)
                    .innerJoin(schema_1.vendor, (0, drizzle_orm_1.eq)(schema_1.entity_vendor.vendor_id, schema_1.vendor.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.entity_vendor.entity_id, ent.id));
                return Object.assign(Object.assign({}, ent), { vendors: vendorRelations });
            })));
            res.status(200).json({
                success: true,
                data: entitiesWithVendors
            });
        }
        catch (error) {
            console.error('Error fetching entities:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch entities',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
// umm idts we will need this , but keeping for future reference .. WORKING
function getEntityById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Get entity
            const entityResult = yield db.select()
                .from(schema_1.entity)
                .where((0, drizzle_orm_1.eq)(schema_1.entity.id, parseInt(id)))
                .limit(1);
            if (entityResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Entity not found'
                });
            }
            // Get vendors for this entity
            const vendorRelations = yield db
                .select({
                id: schema_1.vendor.id,
                name: schema_1.vendor.name,
                status: schema_1.vendor.status
            })
                .from(schema_1.entity_vendor)
                .innerJoin(schema_1.vendor, (0, drizzle_orm_1.eq)(schema_1.entity_vendor.vendor_id, schema_1.vendor.id))
                .where((0, drizzle_orm_1.eq)(schema_1.entity_vendor.entity_id, parseInt(id)));
            res.status(200).json({
                success: true,
                data: Object.assign(Object.assign({}, entityResult[0]), { vendors: vendorRelations })
            });
        }
        catch (error) {
            console.error('Error fetching entity:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch entity',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
// SEARCH ENTITIES BY VEHICLE NUMBER OR ID
//working as well 
function searchEntities(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const searchQuery = req.query.query;
            if (!searchQuery) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }
            // Search for entities matching either vehicle number (case-insensitive) or ID
            const entities = yield db.select()
                .from(schema_1.entity)
                .where((0, drizzle_orm_1.sql) `LOWER(${schema_1.entity.vehicleNumber}) LIKE LOWER(${`%${searchQuery}%`})
                    OR CAST(${schema_1.entity.id} AS CHAR) = ${searchQuery}`);
            // If no entities found, return empty array
            if (entities.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: []
                });
            }
            // For each entity, get its vendors
            const entitiesWithVendors = yield Promise.all(entities.map((ent) => __awaiter(this, void 0, void 0, function* () {
                const vendorRelations = yield db
                    .select({
                    id: schema_1.vendor.id,
                    name: schema_1.vendor.name,
                    status: schema_1.vendor.status
                })
                    .from(schema_1.entity_vendor)
                    .innerJoin(schema_1.vendor, (0, drizzle_orm_1.eq)(schema_1.entity_vendor.vendor_id, schema_1.vendor.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.entity_vendor.entity_id, ent.id));
                return Object.assign(Object.assign({}, ent), { vendors: vendorRelations });
            })));
            res.status(200).json({
                success: true,
                data: entitiesWithVendors
            });
        }
        catch (error) {
            console.error('Error searching entities:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search entities',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function deleteEntity(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Check if entity exists
            const entityExists = yield db.select({ id: schema_1.entity.id })
                .from(schema_1.entity)
                .where((0, drizzle_orm_1.eq)(schema_1.entity.id, parseInt(id)))
                .limit(1);
            if (entityExists.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Entity not found'
                });
            }
            // Delete the entity_vendor relations first
            yield db.delete(schema_1.entity_vendor)
                .where((0, drizzle_orm_1.eq)(schema_1.entity_vendor.entity_id, parseInt(id)));
            // The vahan records will be automatically deleted due to ON DELETE CASCADE
            // Then delete the entity
            yield db.delete(schema_1.entity)
                .where((0, drizzle_orm_1.eq)(schema_1.entity.id, parseInt(id)));
            res.status(200).json({
                success: true,
                message: 'Entity deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting entity:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete entity',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//wokring : vehicleNumber cannot be updated
function updateEntity(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { type, status, vendorIds } = req.body;
            // Explicitly don't allow vehicleNumber updates
            if (req.body.vehicleNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Vehicle number cannot be updated'
                });
            }
            // Check if entity exists
            const entityExists = yield db.select()
                .from(schema_1.entity)
                .where((0, drizzle_orm_1.eq)(schema_1.entity.id, parseInt(id)))
                .limit(1);
            if (entityExists.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Entity not found'
                });
            }
            // Update entity fields
            const updateData = {};
            if (type !== undefined)
                updateData.type = type;
            if (status !== undefined)
                updateData.status = Boolean(status);
            if (Object.keys(updateData).length > 0) {
                yield db.update(schema_1.entity)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_1.entity.id, parseInt(id)));
            }
            if (vendorIds && Array.isArray(vendorIds)) {
                const existingVendors = yield db.select()
                    .from(schema_1.vendor)
                    .where((0, drizzle_orm_1.inArray)(schema_1.vendor.id, vendorIds));
                if (existingVendors.length !== vendorIds.length) {
                    return res.status(400).json({
                        success: false,
                        message: 'One or more vendor IDs do not exist'
                    });
                }
                // Delete existing vendor relations
                yield db.delete(schema_1.entity_vendor)
                    .where((0, drizzle_orm_1.eq)(schema_1.entity_vendor.entity_id, parseInt(id)));
                // Add new vendor relations
                for (const vendorId of vendorIds) {
                    yield db.insert(schema_1.entity_vendor).values({
                        entity_id: parseInt(id),
                        vendor_id: vendorId
                    });
                }
                const indianTime = new Date();
                indianTime.setHours(indianTime.getHours() + 5);
                indianTime.setMinutes(indianTime.getMinutes() + 30);
                yield db.update(schema_1.entity)
                    .set({ updatedAt: indianTime })
                    .where((0, drizzle_orm_1.eq)(schema_1.entity.id, parseInt(id)));
            }
            // Get updated entity with vendors
            const updatedEntity = yield db.select()
                .from(schema_1.entity)
                .where((0, drizzle_orm_1.eq)(schema_1.entity.id, parseInt(id)))
                .limit(1);
            const vendorRelations = yield db
                .select({
                id: schema_1.vendor.id,
                name: schema_1.vendor.name,
                status: schema_1.vendor.status
            })
                .from(schema_1.entity_vendor)
                .innerJoin(schema_1.vendor, (0, drizzle_orm_1.eq)(schema_1.entity_vendor.vendor_id, schema_1.vendor.id))
                .where((0, drizzle_orm_1.eq)(schema_1.entity_vendor.entity_id, parseInt(id)));
            res.status(200).json({
                success: true,
                message: 'Entity updated successfully',
                data: Object.assign(Object.assign({}, updatedEntity[0]), { vendors: vendorRelations })
            });
        }
        catch (error) {
            console.error('Error updating entity:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update entity',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
//working
function getAllActiveVendors(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const vendors = yield db.select().from(schema_1.vendor).where((0, drizzle_orm_1.eq)(schema_1.vendor.status, true));
            res.status(200).json({
                success: true,
                data: vendors
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
