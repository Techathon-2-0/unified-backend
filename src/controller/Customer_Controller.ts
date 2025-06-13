import { Request, Response } from 'express';
// import { db } from '../db/connection';
import { drizzle } from "drizzle-orm/mysql2";
import { customer_lr_detail, customer_group, customer_group_relation, customers, user_customer_group , usersTable } from '../db/schema';
import { eq, like, and, or, inArray, ne, sql } from 'drizzle-orm';

const db=drizzle(process.env.DATABASE_URL!);

// working
export async function createCustomer(req: Request, res: Response) {
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
        
        const existingCustomer = await db.select()
            .from(customers)
            .where(eq(customers.customer_id, customer_id))
            .limit(1);
            
        if (existingCustomer.length > 0) {
            // Customer exists, use existing record
            customerRecord = existingCustomer[0];
            
            // Optionally update customer info if provided
            if (customer_name !== customerRecord.customer_name || 
                customer_location !== customerRecord.customer_location) {
                
                await db.update(customers)
                    .set({ 
                        customer_name, 
                        customer_location,
                        updated_at: new Date()
                    })
                    .where(eq(customers.id, customerRecord.id));
                    
                // Get the updated record
                customerRecord = {
                    ...customerRecord,
                    customer_name,
                    customer_location,
                    updated_at: new Date()
                };
            }
        } else {
            // Create new customer record
            const [insertResult] = await db.insert(customers).values({
                customer_id,
                customer_name,
                customer_location
            }).$returningId();
            
            // Fetch the newly created customer
            const newCustomer = await db.select()
                .from(customers)
                .where(eq(customers.id, insertResult.id))
                .limit(1);
                
            customerRecord = newCustomer[0];
        }
        
        // Create LR detail record if stop_id is provided
        let lrRecord = null;
        if (stop_id && lr_number) {
            const [lrResult] = await db.insert(customer_lr_detail).values({
                lr_number,
                customer_id: customerRecord.id,
                stop_id: parseInt(stop_id)
            }).$returningId();
            
            // Get the LR detail
            lrRecord = await db.select()
                .from(customer_lr_detail)
                .where(eq(customer_lr_detail.id, lrResult.id))
                .limit(1);
        }
        
        return {
            success: true,
            message: 'Customer created successfully',
            customer: customerRecord,
            lr_detail: lrRecord ? lrRecord[0] : null
        };
        
    } catch (error) {
        console.error('Error creating customer:', error);
        return {
            success: false,
            message: 'Error creating customer',
            error: (error as Error).message
        };
    }
}

// wrokiong
export async function getAllCustomers(req: Request, res: Response) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        
        const customersData = await db.select()
            .from(customers)
            .limit(limit)
            .offset(offset);
            
        // Get total count for pagination
        const countResult = await db.select({
            count: sql<number>`COUNT(${customers.id})`
        })
        .from(customers);
        
        const total = Number(countResult[0].count);
        
        // For each customer, get their LR details
        const customersWithLR = await Promise.all(customersData.map(async (customer) => {
            const lrDetails = await db.select()
                .from(customer_lr_detail)
                .where(eq(customer_lr_detail.customer_id, customer.id));
                
            return {
                ...customer,
                lr_details: lrDetails
            };
        }));
        
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
    } catch (error) {
        console.error('Error fetching customers:', error);
        return {
            success: false,
            message: 'Error fetching customers',
            error: (error as Error).message
        };
    }
}

// workingh
export async function getCustomerById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        const customer = await db.select()
            .from(customers)
            .where(eq(customers.id, parseInt(id)))
            .limit(1);
        
        if (customer.length === 0) {
            return {
                success: false, 
                message: 'Customer not found' 
            };
        }
        
        // Get customer's LR details
        const lrDetails = await db.select()
            .from(customer_lr_detail)
            .where(eq(customer_lr_detail.customer_id, parseInt(id)));
            
        return {
            success: true,
            data: {
                ...customer[0],
                lr_details: lrDetails
            }
        };
    } catch (error) {
        console.error('Error fetching customer:', error);
        return {
            success: false,
            message: 'Error fetching customer',
            error: (error as Error).message
        };
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
            .from(customers)
            .where(eq(customers.id, parseInt(id)))
            .limit(1);
        
        if (existingCustomer.length === 0) {
            return {
                success: false, 
                message: 'Customer not found' 
            };
        }
        
        // First delete LR details associated with this customer
        await db.delete(customer_lr_detail)
            .where(eq(customer_lr_detail.customer_id, parseInt(id)));
        
        // Delete from customer group relations
        await db.delete(customer_group_relation)
            .where(eq(customer_group_relation.customer_id, parseInt(id)));
        
        // Finally delete the customer
        await db.delete(customers)
            .where(eq(customers.id, parseInt(id)));
        
        return {
            success: true,
            message: 'Customer deleted successfully',
            id: parseInt(id)
        };
    } catch (error) {
        console.error('Error deleting customer:', error);
        return {
            success: false,
            message: 'Error deleting customer',
            error: (error as Error).message
        };
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
        
        const customersData = await db.select()
            .from(customers)
            .where(
                or(
                    like(customers.customer_id, searchQuery),
                    like(customers.customer_name, searchQuery),
                    like(customers.customer_location, searchQuery)
                )
            );
        
        // For each customer, get their LR details
        const customersWithLR = await Promise.all(customersData.map(async (customer) => {
            const lrDetails = await db.select()
                .from(customer_lr_detail)
                .where(eq(customer_lr_detail.customer_id, customer.id));
                
            return {
                ...customer,
                lr_details: lrDetails
            };
        }));
        
        return {
            success: true,
            data: customersWithLR
        };
    } catch (error) {
        console.error('Error searching customers:', error);
        return {
            success: false,
            message: 'Error searching customers',
            error: (error as Error).message
        };
    }
}



// cusotmer groupo fucntion 



export async function createCustomerGroup(req: Request, res: Response) {
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
        const existingGroup = await db.select()
            .from(customer_group)
            .where(eq(customer_group.group_name, group_name))
            .limit(1);
            
        if (existingGroup.length > 0) {
            return {
                success: false, 
                message: 'Group name already exists' 
            };
        }
        
        // Check if customers exist
        const existingCustomers = await db.select()
            .from(customers)
            .where(
                inArray(customers.id, customerIds)
            );
            
        if (existingCustomers.length !== customerIds.length) {
            return {
                success: false, 
                message: 'One or more customer IDs do not exist' 
            };
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
                id: customers.id,
                customer_id: customers.customer_id,
                customer_name: customers.customer_name
            })
            .from(customer_group_relation)
            .innerJoin(customers, eq(customer_group_relation.customer_id, customers.id))
            .where(eq(customer_group_relation.group_id, insertedGroup.id));
        
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
    } catch (error) {
        console.error('Error creating customer group:', error);
        return {
            success: false,
            message: 'Error creating customer group',
            error: (error as Error).message
        };
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
                // Use join with the customers table through customer_group_relation
                const customerDetails = await db
                    .select({
                        id: customers.id,
                        customer_id: customers.customer_id,
                        customer_name: customers.customer_name,
                        customer_location: customers.customer_location
                    })
                    .from(customer_group_relation)
                    .innerJoin(
                        customers, 
                        eq(customer_group_relation.customer_id, customers.id)
                    )
                    .where(eq(customer_group_relation.group_id, group.id));
                
                return {
                    ...group,
                    customers: customerDetails
                };
            })
        );
        
        return groupsWithCustomers;
    } catch (error) {
        console.error('Error fetching customer groups:', error);
        throw error;
    }
}

//getCustomerGroupById function updated for normalized schema
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
        
        // Get customer details using the join with customers table
        const customerDetails = await db
            .select({
                id: customers.id,
                customer_id: customers.customer_id,
                customer_name: customers.customer_name,
                customer_location: customers.customer_location
            })
            .from(customer_group_relation)
            .innerJoin(
                customers, 
                eq(customer_group_relation.customer_id, customers.id)
            )
            .where(eq(customer_group_relation.group_id, parseInt(id)));
        
        return {
            ...group[0],
            customers: customerDetails
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
                .from(customers)
                .where(
                    inArray(customers.id, customerIds)
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
            
        // Get customer details using the join with customers table
        const customerDetails = await db
            .select({
                id: customers.id,
                customer_id: customers.customer_id,
                customer_name: customers.customer_name,
                customer_location: customers.customer_location
            })
            .from(customer_group_relation)
            .innerJoin(
                customers, 
                eq(customer_group_relation.customer_id, customers.id)
            )
            .where(eq(customer_group_relation.group_id, parseInt(id)));
        
        return {
            ...updatedGroup[0],
            customers: customerDetails
        };
    } catch (error) {
        console.error('Error updating customer group:', error);
        throw error;
    }
}

//deleteCustomerGroup function - already works with normalized schema
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

// searchCustomerGroups function updated for normalized schema
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
                // Get customer details using the join with customers table
                const customerDetails = await db
                    .select({
                        id: customers.id,
                        customer_id: customers.customer_id,
                        customer_name: customers.customer_name,
                        customer_location: customers.customer_location
                    })
                    .from(customer_group_relation)
                    .innerJoin(
                        customers, 
                        eq(customer_group_relation.customer_id, customers.id)
                    )
                    .where(eq(customer_group_relation.group_id, group.id));
                
                return {
                    ...group,
                    customers: customerDetails
                };
            })
        );
        
        return groupsWithCustomers;
    } catch (error) {
        console.error('Error searching customer groups:', error);
        throw error;
    }
}

//wokring
export async function getCustomerNamesByUserAccess(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return {
        success: false,
        message: 'User ID is required'
      };
    }
    
    // First check if the user exists and has access to any customer groups
    const userCustomerGroups = await db.select({
      customerGroupId: user_customer_group.customer_group_id
    })
    .from(user_customer_group)
    .where(eq(user_customer_group.user_id, parseInt(userId)));
    
    if (userCustomerGroups.length === 0) {
      return {
        success: false,
        message: 'User has no customer group access'
      };
    }
    
    // Get all the customer group IDs the user has access to
    const customerGroupIds = userCustomerGroups.map(group => group.customerGroupId);
    
    // Get all customer IDs from these groups using group relations
    const customerRelations = await db.select({
      customerId: customer_group_relation.customer_id
    })
    .from(customer_group_relation)
    .where(inArray(customer_group_relation.group_id, customerGroupIds.filter((id): id is number => id !== null)));
    
    if (customerRelations.length === 0) {
      return {
        success: true,
        message: 'No customers found in the assigned groups',
        data: []
      };
    }
    
    // Get unique customer IDs
    const uniqueCustomerIds = Array.from(
      new Set(customerRelations.map(relation => relation.customerId))
    );
    
    // Finally get the customer details
    const customerDetails = await db.select({
      id: customers.id,
      customer_id: customers.customer_id,
      customer_name: customers.customer_name
    })
    .from(customers)
    .where(inArray(customers.id, uniqueCustomerIds));
    
    // Get the group names for reference
    const groupDetails = await db.select({
      id: customer_group.id,
      group_name: customer_group.group_name
    })
    .from(customer_group)
    .where(inArray(customer_group.id, customerGroupIds.filter((id): id is number => id !== null)));
    
    return {
      success: true,
      data: {
        user_id: parseInt(userId),
        groups: groupDetails,
        customers: customerDetails
      }
    };
    
  } catch (error) {
    console.error('Error fetching customer names by user access:', error);
    return {
      success: false,
      message: 'Error fetching customer names',
      error: (error as Error).message
    };
  }
}

//working
export async function getCustomerGroupsByUserId(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return {
        success: false,
        message: 'User ID is required'
      };
    }
    
    // Check if user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, parseInt(userId)))
      .limit(1);
      
    if (user.length === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    // Get all customer groups the user has access to
    const userCustomerGroups = await db.select({
      customerGroupId: user_customer_group.customer_group_id
    })
    .from(user_customer_group)
    .where(eq(user_customer_group.user_id, parseInt(userId)));
    
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
    const customerGroups = await Promise.all(
      customerGroupIds.map(async (groupId) => {
        // Get group details
        const group = await db.select()
          .from(customer_group)
          .where(eq(customer_group.id, groupId as number))
          .limit(1);
          
        if (group.length === 0) {
          return null;
        }
        
        // Get customers in this group
        const customerDetails = await db
          .select({
            id: customers.id,
            customer_id: customers.customer_id,
            customer_name: customers.customer_name
          })
          .from(customer_group_relation)
          .innerJoin(
            customers, 
            eq(customer_group_relation.customer_id, customers.id)
          )
          .where(eq(customer_group_relation.group_id, groupId as number));
          
        return {
          ...group[0],
          customers: customerDetails
        };
      })
    );
    
    // Filter out any null values (in case a group was deleted but the relation still exists)
    const validCustomerGroups = customerGroups.filter(group => group !== null);
    
    return {
      success: true,
      data: {
        user_id: parseInt(userId),
        customer_groups: validCustomerGroups
      }
    };
    
  } catch (error) {
    console.error('Error fetching customer groups by user ID:', error);
    return {
      success: false,
      message: 'Error fetching customer groups',
      error: (error as Error).message
    };
  }
}