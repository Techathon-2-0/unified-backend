import { Request, Response } from 'express';
// import { db } from '../db/connection';
import { drizzle } from "drizzle-orm/mysql2";
import { customer_lr_detail, customer_group, customer_group_relation } from '../db/schema';
import { eq, like, and, or, inArray, ne } from 'drizzle-orm';

const db=drizzle(process.env.DATABASE_URL!);

// working
export async function createCustomer(req: Request, res: Response) {
    try {
        const { lr_number, customer_id, customer_name, customer_location, stop_id } = req.body;
        
        // Validate required fields
        if (!customer_name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields. customer_name is required' 
            });
        }
        
        // Create customer
        const [insertedCustomer] = await db.insert(customer_lr_detail).values({
            lr_number,
            customer_id,
            customer_name,
            customer_location,
            stop_id
        }).$returningId();
        
        // Get newly created customer
        const newCustomer = await db.select()
            .from(customer_lr_detail)
            .where(eq(customer_lr_detail.id, insertedCustomer.id))
            .limit(1);
        
        return newCustomer[0];
        
    } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
    }
}

// wrokiong
export async function getAllCustomers(req: Request, res: Response) {
    try {
        const customers = await db.select()
            .from(customer_lr_detail);
        
        return customers;
    } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
    }
}

// workingh
export async function getCustomerById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        const customer = await db.select()
            .from(customer_lr_detail)
            .where(eq(customer_lr_detail.id, parseInt(id)))
            .limit(1);
        
        if (customer.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }
        
        return customer[0];
    } catch (error) {
        console.error('Error fetching customer:', error);
        throw error;
    }
}

//wrorking
export async function updateCustomerById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { lr_number, customer_id, customer_name, customer_location, stop_id } = req.body;
        
        // Check if customer exists
        const existingCustomer = await db.select()
            .from(customer_lr_detail)
            .where(eq(customer_lr_detail.id, parseInt(id)))
            .limit(1);
        
        if (existingCustomer.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }
        
        // Create update data object
        const updateData: any = {};
        if (lr_number !== undefined) updateData.lr_number = lr_number;
        if (customer_id !== undefined) updateData.customer_id = customer_id;
        if (customer_name !== undefined) updateData.customer_name = customer_name;
        if (customer_location !== undefined) updateData.customer_location = customer_location;
        if (stop_id !== undefined) updateData.stop_id = stop_id;
        
        // Update customer
        await db.update(customer_lr_detail)
            .set(updateData)
            .where(eq(customer_lr_detail.id, parseInt(id)));
        
        // Get updated customer
        const updatedCustomer = await db.select()
            .from(customer_lr_detail)
            .where(eq(customer_lr_detail.id, parseInt(id)))
            .limit(1);
        
        return updatedCustomer[0];
    } catch (error) {
        console.error('Error updating customer:', error);
        throw error;
    }
}

//working
export async function deleteCustomer(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        // Check if customer exists
        const existingCustomer = await db.select()
            .from(customer_lr_detail)
            .where(eq(customer_lr_detail.id, parseInt(id)))
            .limit(1);
        
        if (existingCustomer.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }
        
        // Delete customer group relations first
        await db.delete(customer_group_relation)
            .where(eq(customer_group_relation.customer_id, parseInt(id)));
        
        // Delete customer
        await db.delete(customer_lr_detail)
            .where(eq(customer_lr_detail.id, parseInt(id)));
        
        return { id: parseInt(id) };
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
    }
}

//working
export async function searchCustomers(req: Request, res: Response) {
    try {
        const { query } = req.query;
        
        if (!query) {
            return await getAllCustomers(req, res);
        }
        
        const searchQuery = `%${query}%`;
        
        const customers = await db.select()
            .from(customer_lr_detail)
            .where(
                or(
                    like(customer_lr_detail.lr_number, searchQuery),
                    like(customer_lr_detail.customer_id, searchQuery),
                    like(customer_lr_detail.customer_name, searchQuery),
                    like(customer_lr_detail.customer_location, searchQuery)
                )
            );
        
        return customers;
    } catch (error) {
        console.error('Error searching customers:', error);
        throw error;
    }
}



// cusotmer groupo fucntion 



export async function createCustomerGroup(req: Request, res: Response) {
    try {
        const { group_name, customerIds } = req.body;
        
        // Validate required fields
        if (!group_name || !customerIds || !Array.isArray(customerIds)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields. group_name and customerIds array are required' 
            });
        }
        
        // Check if group name already exists
        const existingGroup = await db.select()
            .from(customer_group)
            .where(eq(customer_group.group_name, group_name))
            .limit(1);
            
        if (existingGroup.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Group name already exists' 
            });
        }
        
        // Check if customers exist
        const existingCustomers = await db.select()
            .from(customer_lr_detail)
            .where(
                inArray(customer_lr_detail.id, customerIds)
            );
            
        if (existingCustomers.length !== customerIds.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'One or more customer IDs do not exist' 
            });
        }
        
        // Create group
        const [insertedGroup] = await db.insert(customer_group).values({
            group_name
        }).$returningId();
        
        // Create customer relationships
        for (const customerId of customerIds) {
            await db.insert(customer_group_relation).values({
                customer_id: customerId,
                group_id: insertedGroup.id
            });
        }
        
        // Get customers in the group for response
        const customerRelations = await db
            .select({
                id: customer_lr_detail.id,
                customer_name: customer_lr_detail.customer_name,
                lr_number: customer_lr_detail.lr_number
            })
            .from(customer_group_relation)
            .innerJoin(customer_lr_detail, eq(customer_group_relation.customer_id, customer_lr_detail.id))
            .where(eq(customer_group_relation.group_id, insertedGroup.id));
        
        const indianTime = new Date();
        indianTime.setHours(indianTime.getHours() + 5);
        indianTime.setMinutes(indianTime.getMinutes() + 30);
        
        return {
            id: insertedGroup,
            group_name,
            created_at: indianTime,
            updated_at: indianTime,
            customers: customerRelations
        };
        
    } catch (error) {
        console.error('Error creating customer group:', error);
        throw error;
    }
}

//wokring
export async function getAllCustomerGroups(req: Request, res: Response) {
    try {
        const groups = await db.select()
            .from(customer_group);
        
        // Get customers for each group
        const groupsWithCustomers = await Promise.all(
            groups.map(async (group) => {
                const customers = await db
                    .select({
                        id: customer_lr_detail.id,
                        customer_name: customer_lr_detail.customer_name,
                        lr_number: customer_lr_detail.lr_number
                    })
                    .from(customer_group_relation)
                    .innerJoin(customer_lr_detail, eq(customer_group_relation.customer_id, customer_lr_detail.id))
                    .where(eq(customer_group_relation.group_id, group.id));
                
                return {
                    ...group,
                    customers
                };
            })
        );
        
        return groupsWithCustomers;
    } catch (error) {
        console.error('Error fetching customer groups:', error);
        throw error;
    }
}

//wokring
export async function getCustomerGroupById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        const group = await db.select()
            .from(customer_group)
            .where(eq(customer_group.id, parseInt(id)))
            .limit(1);
        
        if (group.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer group not found' 
            });
        }
        
        const customers = await db
            .select({
                id: customer_lr_detail.id,
                customer_name: customer_lr_detail.customer_name,
                lr_number: customer_lr_detail.lr_number
            })
            .from(customer_group_relation)
            .innerJoin(customer_lr_detail, eq(customer_group_relation.customer_id, customer_lr_detail.id))
            .where(eq(customer_group_relation.group_id, parseInt(id)));
        
        return {
            ...group[0],
            customers
        };
    } catch (error) {
        console.error('Error fetching customer group:', error);
        throw error;
    }
}
//workignm
export async function updateCustomerGroup(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { group_name, customerIds } = req.body;
        
        // Check if group exists
        const existingGroup = await db.select()
            .from(customer_group)
            .where(eq(customer_group.id, parseInt(id)))
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
            const nameExists = await db.select()
                .from(customer_group)
                .where(
                    and(
                        eq(customer_group.group_name, group_name),
                        ne(customer_group.id, parseInt(id))
                    )
                )
                .limit(1);
                
            if (nameExists.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Group name already exists' 
                });
            }
            
            await db.update(customer_group)
                .set({ group_name })
                .where(eq(customer_group.id, parseInt(id)));
        }
        
        // Update customer relationships if provided
        if (customerIds && Array.isArray(customerIds)) {
            // Check if customers exist
            const existingCustomers = await db.select()
                .from(customer_lr_detail)
                .where(
                    inArray(customer_lr_detail.id, customerIds)
                );
                
            if (existingCustomers.length !== customerIds.length) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'One or more customer IDs do not exist' 
                });
            }
            
            // Delete existing customer relationships
            await db.delete(customer_group_relation)
                .where(eq(customer_group_relation.group_id, parseInt(id)));
            
            // Add new customer relationships
            for (const customerId of customerIds) {
                await db.insert(customer_group_relation).values({
                    customer_id: customerId,
                    group_id: parseInt(id)
                });
            }
            
            // Force updated_at to refresh
            const indianTime = new Date();
            indianTime.setHours(indianTime.getHours() + 5);
            indianTime.setMinutes(indianTime.getMinutes() + 30);
            
            await db.update(customer_group)
                .set({ updated_at: indianTime })
                .where(eq(customer_group.id, parseInt(id)));
        }
        
        // Get updated group with customers
        const updatedGroup = await db.select()
            .from(customer_group)
            .where(eq(customer_group.id, parseInt(id)))
            .limit(1);
            
        const customerRelations = await db
            .select({
                id: customer_lr_detail.id,
                customer_name: customer_lr_detail.customer_name,
                lr_number: customer_lr_detail.lr_number
            })
            .from(customer_group_relation)
            .innerJoin(customer_lr_detail, eq(customer_group_relation.customer_id, customer_lr_detail.id))
            .where(eq(customer_group_relation.group_id, parseInt(id)));
        
        return {
            ...updatedGroup[0],
            customers: customerRelations
        };
    } catch (error) {
        console.error('Error updating customer group:', error);
        throw error;
    }
}

//workign
export async function deleteCustomerGroup(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        // Check if group exists
        const existingGroup = await db.select()
            .from(customer_group)
            .where(eq(customer_group.id, parseInt(id)))
            .limit(1);
        
        if (existingGroup.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer group not found' 
            });
        }
        
        // Delete customer group relations first
        await db.delete(customer_group_relation)
            .where(eq(customer_group_relation.group_id, parseInt(id)));
        
        // Delete customer group
        await db.delete(customer_group)
            .where(eq(customer_group.id, parseInt(id)));
        
        return { id: parseInt(id) };
    } catch (error) {
        console.error('Error deleting customer group:', error);
        throw error;
    }
}

// Search Customer Groups
export async function searchCustomerGroups(req: Request, res: Response) {
    try {
        const { query } = req.query;
        
        if (!query) {
            return await getAllCustomerGroups(req, res);
        }
        
        const searchQuery = `%${query}%`;
        
        // First get all groups that match the search query
        const groups = await db.select()
            .from(customer_group)
            .where(
                like(customer_group.group_name, searchQuery)
            );
        
        // Get customers for each matching group
        const groupsWithCustomers = await Promise.all(
            groups.map(async (group) => {
                const customers = await db
                    .select({
                        id: customer_lr_detail.id,
                        customer_name: customer_lr_detail.customer_name,
                        lr_number: customer_lr_detail.lr_number
                    })
                    .from(customer_group_relation)
                    .innerJoin(customer_lr_detail, eq(customer_group_relation.customer_id, customer_lr_detail.id))
                    .where(eq(customer_group_relation.group_id, group.id));
                
                return {
                    ...group,
                    customers
                };
            })
        );
        
        return groupsWithCustomers;
    } catch (error) {
        console.error('Error searching customer groups:', error);
        throw error;
    }
}