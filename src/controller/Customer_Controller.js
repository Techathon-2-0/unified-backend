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
exports.createCustomer = createCustomer;
exports.getAllCustomers = getAllCustomers;
exports.getCustomerById = getCustomerById;
exports.updateCustomerById = updateCustomerById;
exports.deleteCustomer = deleteCustomer;
exports.searchCustomers = searchCustomers;
exports.createCustomerGroup = createCustomerGroup;
exports.getAllCustomerGroups = getAllCustomerGroups;
exports.getCustomerGroupById = getCustomerGroupById;
exports.updateCustomerGroup = updateCustomerGroup;
exports.deleteCustomerGroup = deleteCustomerGroup;
exports.searchCustomerGroups = searchCustomerGroups;
exports.getCustomerNamesByUserAccess = getCustomerNamesByUserAccess;
exports.getCustomerGroupsByUserId = getCustomerGroupsByUserId;
// import { db } from '../db/connection';
const mysql2_1 = require("drizzle-orm/mysql2");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
// working
function createCustomer(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { customer_id, customer_name, customer_location, lr_number, stop_id } = req.body;
            // Validate required fields
            if (!customer_name || !customer_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields. customer_name and customer_id are required'
                });
            }
            // First check if the customer already exists
            let customerRecord;
            const existingCustomer = yield db.select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.eq)(schema_1.customers.customer_id, customer_id))
                .limit(1);
            if (existingCustomer.length > 0) {
                // Customer exists, use existing record
                customerRecord = existingCustomer[0];
                // Optionally update customer info if provided
                if (customer_name !== customerRecord.customer_name ||
                    customer_location !== customerRecord.customer_location) {
                    yield db.update(schema_1.customers)
                        .set({
                        customer_name,
                        customer_location,
                        updated_at: new Date()
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, customerRecord.id));
                    // Get the updated record
                    customerRecord = Object.assign(Object.assign({}, customerRecord), { customer_name,
                        customer_location, updated_at: new Date() });
                }
            }
            else {
                // Create new customer record
                const [insertResult] = yield db.insert(schema_1.customers).values({
                    customer_id,
                    customer_name,
                    customer_location
                }).$returningId();
                // Fetch the newly created customer
                const newCustomer = yield db.select()
                    .from(schema_1.customers)
                    .where((0, drizzle_orm_1.eq)(schema_1.customers.id, insertResult.id))
                    .limit(1);
                customerRecord = newCustomer[0];
            }
            // Create LR detail record if stop_id is provided
            let lrRecord = null;
            if (stop_id && lr_number) {
                const [lrResult] = yield db.insert(schema_1.customer_lr_detail).values({
                    lr_number,
                    customer_id: customerRecord.id,
                    stop_id: parseInt(stop_id)
                }).$returningId();
                // Get the LR detail
                lrRecord = yield db.select()
                    .from(schema_1.customer_lr_detail)
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.id, lrResult.id))
                    .limit(1);
            }
            return {
                success: true,
                message: 'Customer created successfully',
                customer: customerRecord,
                lr_detail: lrRecord ? lrRecord[0] : null
            };
        }
        catch (error) {
            console.error('Error creating customer:', error);
            return {
                success: false,
                message: 'Error creating customer',
                error: error.message
            };
        }
    });
}
// wrokiong
function getAllCustomers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const customersData = yield db.select()
                .from(schema_1.customers)
                .limit(limit)
                .offset(offset);
            // Get total count for pagination
            const countResult = yield db.select({
                count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.customers.id})`
            })
                .from(schema_1.customers);
            const total = Number(countResult[0].count);
            // For each customer, get their LR details
            const customersWithLR = yield Promise.all(customersData.map((customer) => __awaiter(this, void 0, void 0, function* () {
                const lrDetails = yield db.select()
                    .from(schema_1.customer_lr_detail)
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.customer_id, customer.id));
                return Object.assign(Object.assign({}, customer), { lr_details: lrDetails });
            })));
            return {
                success: true,
                data: customersWithLR,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            console.error('Error fetching customers:', error);
            return {
                success: false,
                message: 'Error fetching customers',
                error: error.message
            };
        }
    });
}
// workingh
function getCustomerById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const customer = yield db.select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.eq)(schema_1.customers.id, parseInt(id)))
                .limit(1);
            if (customer.length === 0) {
                return {
                    success: false,
                    message: 'Customer not found'
                };
            }
            // Get customer's LR details
            const lrDetails = yield db.select()
                .from(schema_1.customer_lr_detail)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.customer_id, parseInt(id)));
            return {
                success: true,
                data: Object.assign(Object.assign({}, customer[0]), { lr_details: lrDetails })
            };
        }
        catch (error) {
            console.error('Error fetching customer:', error);
            return {
                success: false,
                message: 'Error fetching customer',
                error: error.message
            };
        }
    });
}
//wrorking
function updateCustomerById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { lr_number, customer_id, customer_name, customer_location, stop_id } = req.body;
            // Check if customer exists
            const existingCustomer = yield db.select()
                .from(schema_1.customer_lr_detail)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.id, parseInt(id)))
                .limit(1);
            if (existingCustomer.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }
            // Create update data object
            const updateData = {};
            if (lr_number !== undefined)
                updateData.lr_number = lr_number;
            if (customer_id !== undefined)
                updateData.customer_id = customer_id;
            if (customer_name !== undefined)
                updateData.customer_name = customer_name;
            if (customer_location !== undefined)
                updateData.customer_location = customer_location;
            if (stop_id !== undefined)
                updateData.stop_id = stop_id;
            // Update customer
            yield db.update(schema_1.customer_lr_detail)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.id, parseInt(id)));
            // Get updated customer
            const updatedCustomer = yield db.select()
                .from(schema_1.customer_lr_detail)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.id, parseInt(id)))
                .limit(1);
            return updatedCustomer[0];
        }
        catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    });
}
//working
function deleteCustomer(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Check if customer exists
            const existingCustomer = yield db.select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.eq)(schema_1.customers.id, parseInt(id)))
                .limit(1);
            if (existingCustomer.length === 0) {
                return {
                    success: false,
                    message: 'Customer not found'
                };
            }
            // First delete LR details associated with this customer
            yield db.delete(schema_1.customer_lr_detail)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.customer_id, parseInt(id)));
            // Delete from customer group relations
            yield db.delete(schema_1.customer_group_relation)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group_relation.customer_id, parseInt(id)));
            // Finally delete the customer
            yield db.delete(schema_1.customers)
                .where((0, drizzle_orm_1.eq)(schema_1.customers.id, parseInt(id)));
            return {
                success: true,
                message: 'Customer deleted successfully',
                id: parseInt(id)
            };
        }
        catch (error) {
            console.error('Error deleting customer:', error);
            return {
                success: false,
                message: 'Error deleting customer',
                error: error.message
            };
        }
    });
}
//working
function searchCustomers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { query } = req.query;
            if (!query) {
                return yield getAllCustomers(req, res);
            }
            const searchQuery = `%${query}%`;
            const customersData = yield db.select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.customers.customer_id, searchQuery), (0, drizzle_orm_1.like)(schema_1.customers.customer_name, searchQuery), (0, drizzle_orm_1.like)(schema_1.customers.customer_location, searchQuery)));
            // For each customer, get their LR details
            const customersWithLR = yield Promise.all(customersData.map((customer) => __awaiter(this, void 0, void 0, function* () {
                const lrDetails = yield db.select()
                    .from(schema_1.customer_lr_detail)
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_lr_detail.customer_id, customer.id));
                return Object.assign(Object.assign({}, customer), { lr_details: lrDetails });
            })));
            return {
                success: true,
                data: customersWithLR
            };
        }
        catch (error) {
            console.error('Error searching customers:', error);
            return {
                success: false,
                message: 'Error searching customers',
                error: error.message
            };
        }
    });
}
// cusotmer groupo fucntion 
function createCustomerGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { group_name, customerIds } = req.body;
            // Validate required fields
            if (!group_name || !customerIds || !Array.isArray(customerIds)) {
                return {
                    success: false,
                    message: 'Missing required fields. group_name and customerIds array are required'
                };
            }
            // Check if group name already exists
            const existingGroup = yield db.select()
                .from(schema_1.customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group.group_name, group_name))
                .limit(1);
            if (existingGroup.length > 0) {
                return {
                    success: false,
                    message: 'Group name already exists'
                };
            }
            // Check if customers exist
            const existingCustomers = yield db.select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.inArray)(schema_1.customers.id, customerIds));
            if (existingCustomers.length !== customerIds.length) {
                return {
                    success: false,
                    message: 'One or more customer IDs do not exist'
                };
            }
            // Create group
            const [insertedGroup] = yield db.insert(schema_1.customer_group).values({
                group_name
            }).$returningId();
            // Create customer relationships
            for (const customerId of customerIds) {
                yield db.insert(schema_1.customer_group_relation).values({
                    customer_id: customerId,
                    group_id: insertedGroup.id
                });
            }
            // Get customers in the group for response
            const customerRelations = yield db
                .select({
                id: schema_1.customers.id,
                customer_id: schema_1.customers.customer_id,
                customer_name: schema_1.customers.customer_name
            })
                .from(schema_1.customer_group_relation)
                .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customer_group_relation.customer_id, schema_1.customers.id))
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group_relation.group_id, insertedGroup.id));
            const indianTime = new Date();
            indianTime.setHours(indianTime.getHours() + 5);
            indianTime.setMinutes(indianTime.getMinutes() + 30);
            return {
                success: true,
                data: {
                    id: insertedGroup.id,
                    group_name,
                    created_at: indianTime,
                    updated_at: indianTime,
                    customers: customerRelations
                }
            };
        }
        catch (error) {
            console.error('Error creating customer group:', error);
            return {
                success: false,
                message: 'Error creating customer group',
                error: error.message
            };
        }
    });
}
//wokring
function getAllCustomerGroups(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const groups = yield db.select()
                .from(schema_1.customer_group);
            // Get customers for each group
            const groupsWithCustomers = yield Promise.all(groups.map((group) => __awaiter(this, void 0, void 0, function* () {
                // Use join with the customers table through customer_group_relation
                const customerDetails = yield db
                    .select({
                    id: schema_1.customers.id,
                    customer_id: schema_1.customers.customer_id,
                    customer_name: schema_1.customers.customer_name,
                    customer_location: schema_1.customers.customer_location
                })
                    .from(schema_1.customer_group_relation)
                    .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customer_group_relation.customer_id, schema_1.customers.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_group_relation.group_id, group.id));
                return Object.assign(Object.assign({}, group), { customers: customerDetails });
            })));
            return groupsWithCustomers;
        }
        catch (error) {
            console.error('Error fetching customer groups:', error);
            throw error;
        }
    });
}
//getCustomerGroupById function updated for normalized schema
function getCustomerGroupById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const group = yield db.select()
                .from(schema_1.customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, parseInt(id)))
                .limit(1);
            if (group.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer group not found'
                });
            }
            // Get customer details using the join with customers table
            const customerDetails = yield db
                .select({
                id: schema_1.customers.id,
                customer_id: schema_1.customers.customer_id,
                customer_name: schema_1.customers.customer_name,
                customer_location: schema_1.customers.customer_location
            })
                .from(schema_1.customer_group_relation)
                .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customer_group_relation.customer_id, schema_1.customers.id))
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group_relation.group_id, parseInt(id)));
            return Object.assign(Object.assign({}, group[0]), { customers: customerDetails });
        }
        catch (error) {
            console.error('Error fetching customer group:', error);
            throw error;
        }
    });
}
//workignm
function updateCustomerGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { group_name, customerIds } = req.body;
            // Check if group exists
            const existingGroup = yield db.select()
                .from(schema_1.customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, parseInt(id)))
                .limit(1);
            if (existingGroup.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer group not found'
                });
            }
            // Update group name if provided
            if (group_name) {
                // Check if the new name already exists (excluding current group)
                const nameExists = yield db.select()
                    .from(schema_1.customer_group)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customer_group.group_name, group_name), (0, drizzle_orm_1.ne)(schema_1.customer_group.id, parseInt(id))))
                    .limit(1);
                if (nameExists.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Group name already exists'
                    });
                }
                yield db.update(schema_1.customer_group)
                    .set({ group_name })
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, parseInt(id)));
            }
            // Update customer relationships if provided
            if (customerIds && Array.isArray(customerIds)) {
                // Check if customers exist
                const existingCustomers = yield db.select()
                    .from(schema_1.customers)
                    .where((0, drizzle_orm_1.inArray)(schema_1.customers.id, customerIds));
                if (existingCustomers.length !== customerIds.length) {
                    return res.status(400).json({
                        success: false,
                        message: 'One or more customer IDs do not exist'
                    });
                }
                // Delete existing customer relationships
                yield db.delete(schema_1.customer_group_relation)
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_group_relation.group_id, parseInt(id)));
                // Add new customer relationships
                for (const customerId of customerIds) {
                    yield db.insert(schema_1.customer_group_relation).values({
                        customer_id: customerId,
                        group_id: parseInt(id)
                    });
                }
                // Force updated_at to refresh
                const indianTime = new Date();
                indianTime.setHours(indianTime.getHours() + 5);
                indianTime.setMinutes(indianTime.getMinutes() + 30);
                yield db.update(schema_1.customer_group)
                    .set({ updated_at: indianTime })
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, parseInt(id)));
            }
            // Get updated group with customers
            const updatedGroup = yield db.select()
                .from(schema_1.customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, parseInt(id)))
                .limit(1);
            // Get customer details using the join with customers table
            const customerDetails = yield db
                .select({
                id: schema_1.customers.id,
                customer_id: schema_1.customers.customer_id,
                customer_name: schema_1.customers.customer_name,
                customer_location: schema_1.customers.customer_location
            })
                .from(schema_1.customer_group_relation)
                .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customer_group_relation.customer_id, schema_1.customers.id))
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group_relation.group_id, parseInt(id)));
            return Object.assign(Object.assign({}, updatedGroup[0]), { customers: customerDetails });
        }
        catch (error) {
            console.error('Error updating customer group:', error);
            throw error;
        }
    });
}
//deleteCustomerGroup function - already works with normalized schema
function deleteCustomerGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            // Check if group exists
            const existingGroup = yield db.select()
                .from(schema_1.customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, parseInt(id)))
                .limit(1);
            if (existingGroup.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer group not found'
                });
            }
            // Delete customer group relations first
            yield db.delete(schema_1.customer_group_relation)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group_relation.group_id, parseInt(id)));
            // Delete customer group
            yield db.delete(schema_1.customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, parseInt(id)));
            return { id: parseInt(id) };
        }
        catch (error) {
            console.error('Error deleting customer group:', error);
            throw error;
        }
    });
}
// searchCustomerGroups function updated for normalized schema
function searchCustomerGroups(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { query } = req.query;
            if (!query) {
                return yield getAllCustomerGroups(req, res);
            }
            const searchQuery = `%${query}%`;
            // First get all groups that match the search query
            const groups = yield db.select()
                .from(schema_1.customer_group)
                .where((0, drizzle_orm_1.like)(schema_1.customer_group.group_name, searchQuery));
            // Get customers for each matching group
            const groupsWithCustomers = yield Promise.all(groups.map((group) => __awaiter(this, void 0, void 0, function* () {
                // Get customer details using the join with customers table
                const customerDetails = yield db
                    .select({
                    id: schema_1.customers.id,
                    customer_id: schema_1.customers.customer_id,
                    customer_name: schema_1.customers.customer_name,
                    customer_location: schema_1.customers.customer_location
                })
                    .from(schema_1.customer_group_relation)
                    .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customer_group_relation.customer_id, schema_1.customers.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_group_relation.group_id, group.id));
                return Object.assign(Object.assign({}, group), { customers: customerDetails });
            })));
            return groupsWithCustomers;
        }
        catch (error) {
            console.error('Error searching customer groups:', error);
            throw error;
        }
    });
}
//wokring
function getCustomerNamesByUserAccess(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            if (!userId) {
                return {
                    success: false,
                    message: 'User ID is required'
                };
            }
            // First check if the user exists and has access to any customer groups
            const userCustomerGroups = yield db.select({
                customerGroupId: schema_1.user_customer_group.customer_group_id
            })
                .from(schema_1.user_customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, parseInt(userId)));
            if (userCustomerGroups.length === 0) {
                return {
                    success: false,
                    message: 'User has no customer group access'
                };
            }
            // Get all the customer group IDs the user has access to
            const customerGroupIds = userCustomerGroups.map(group => group.customerGroupId);
            // Get all customer IDs from these groups using group relations
            const customerRelations = yield db.select({
                customerId: schema_1.customer_group_relation.customer_id
            })
                .from(schema_1.customer_group_relation)
                .where((0, drizzle_orm_1.inArray)(schema_1.customer_group_relation.group_id, customerGroupIds.filter((id) => id !== null)));
            if (customerRelations.length === 0) {
                return {
                    success: true,
                    message: 'No customers found in the assigned groups',
                    data: []
                };
            }
            // Get unique customer IDs
            const uniqueCustomerIds = Array.from(new Set(customerRelations.map(relation => relation.customerId)));
            // Finally get the customer details
            const customerDetails = yield db.select({
                id: schema_1.customers.id,
                customer_id: schema_1.customers.customer_id,
                customer_name: schema_1.customers.customer_name
            })
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.inArray)(schema_1.customers.id, uniqueCustomerIds));
            // Get the group names for reference
            const groupDetails = yield db.select({
                id: schema_1.customer_group.id,
                group_name: schema_1.customer_group.group_name
            })
                .from(schema_1.customer_group)
                .where((0, drizzle_orm_1.inArray)(schema_1.customer_group.id, customerGroupIds.filter((id) => id !== null)));
            return {
                success: true,
                data: {
                    user_id: parseInt(userId),
                    groups: groupDetails,
                    customers: customerDetails
                }
            };
        }
        catch (error) {
            console.error('Error fetching customer names by user access:', error);
            return {
                success: false,
                message: 'Error fetching customer names',
                error: error.message
            };
        }
    });
}
//working
function getCustomerGroupsByUserId(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            if (!userId) {
                return {
                    success: false,
                    message: 'User ID is required'
                };
            }
            // Check if user exists
            const user = yield db.select()
                .from(schema_1.usersTable)
                .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, parseInt(userId)))
                .limit(1);
            if (user.length === 0) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }
            // Get all customer groups the user has access to
            const userCustomerGroups = yield db.select({
                customerGroupId: schema_1.user_customer_group.customer_group_id
            })
                .from(schema_1.user_customer_group)
                .where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, parseInt(userId)));
            if (userCustomerGroups.length === 0) {
                return {
                    success: true,
                    message: 'User has no customer group access',
                    data: {
                        user_id: parseInt(userId),
                        customer_groups: []
                    }
                };
            }
            // Get all the customer group IDs the user has access to
            const customerGroupIds = userCustomerGroups.map(group => group.customerGroupId);
            // Get details of these customer groups including their customers
            const customerGroups = yield Promise.all(customerGroupIds.map((groupId) => __awaiter(this, void 0, void 0, function* () {
                // Get group details
                const group = yield db.select()
                    .from(schema_1.customer_group)
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, groupId))
                    .limit(1);
                if (group.length === 0) {
                    return null;
                }
                // Get customers in this group
                const customerDetails = yield db
                    .select({
                    id: schema_1.customers.id,
                    customer_id: schema_1.customers.customer_id,
                    customer_name: schema_1.customers.customer_name
                })
                    .from(schema_1.customer_group_relation)
                    .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customer_group_relation.customer_id, schema_1.customers.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.customer_group_relation.group_id, groupId));
                return Object.assign(Object.assign({}, group[0]), { customers: customerDetails });
            })));
            // Filter out any null values (in case a group was deleted but the relation still exists)
            const validCustomerGroups = customerGroups.filter(group => group !== null);
            return {
                success: true,
                data: {
                    user_id: parseInt(userId),
                    customer_groups: validCustomerGroups
                }
            };
        }
        catch (error) {
            console.error('Error fetching customer groups by user ID:', error);
            return {
                success: false,
                message: 'Error fetching customer groups',
                error: error.message
            };
        }
    });
}
