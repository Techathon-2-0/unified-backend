import {Request , Response} from 'express';
import { drizzle } from "drizzle-orm/mysql2";
import { eq, inArray , sql , and } from 'drizzle-orm';
import {entity , entity_vendor , vendor} from '../db/schema';
const db = drizzle(process.env.DATABASE_URL!);


// working

export async function createEntity(req: Request, res: Response) {
    
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
        const existingVendors = await db.select()
            .from(vendor)
            .where(and(
                inArray(vendor.id, vendorIds),
                eq(vendor.status, true)
            )); // Assuming we only want active vendors
            
        if (existingVendors.length !== vendorIds.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'One or more vendor IDs do not exist' 
            });
        }
        
        // Create entity
        const [insertedEntity] = await db.insert(entity).values({
            vehicleNumber,
            type,
            status: Boolean(status), 
        }).$returningId();
        
        // Create vendor relationships
        for(const vendorId of vendorIds) {
            await db.insert(entity_vendor).values({
                entity_id: insertedEntity.id,
                vendor_id: vendorId
            });
        }
        const entityVendors = await db.select({
            id: vendor.id,
            name: vendor.name,
            status: vendor.status
        })
        .from(entity_vendor)
        .innerJoin(vendor, eq(entity_vendor.vendor_id, vendor.id))
        .where(eq(entity_vendor.entity_id, insertedEntity.id));
        
   
        
        // Return the entity with its vendors
        res.status(201).json({
            success: true,
            message: 'Entity created successfully',
            data: {
                ...insertedEntity,
                vendors: entityVendors
            }
        });
        
    } catch (error) {
        console.error('Error creating entity:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

//working
export async function getAllEntities(req: Request, res: Response) {
    try {
        const entities = await db.select().from(entity);
        
        // For each entity, get its vendors
        const entitiesWithVendors = await Promise.all(
            entities.map(async (ent) => {
                const vendorRelations = await db
                    .select({
                        id: vendor.id,
                        name: vendor.name,
                        status: vendor.status
                    })
                    .from(entity_vendor)
                    .innerJoin(vendor, eq(entity_vendor.vendor_id, vendor.id))
                    .where(eq(entity_vendor.entity_id, ent.id));
                
                return {
                    ...ent,
                    vendors: vendorRelations
                };
            })
        );
        
        res.status(200).json({
            success: true,
            data: entitiesWithVendors
        });
        
    } catch (error) {
        console.error('Error fetching entities:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch entities',
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}

// umm idts we will need this , but keeping for future reference .. WORKING
export async function getEntityById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        // Get entity
        const entityResult = await db.select()
            .from(entity)
            .where(eq(entity.id, parseInt(id)))
            .limit(1);
            
        if (entityResult.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Entity not found' 
            });
        }
        
        // Get vendors for this entity
        const vendorRelations = await db
            .select({
                id: vendor.id,
                name: vendor.name,
                status: vendor.status
            })
            .from(entity_vendor)
            .innerJoin(vendor, eq(entity_vendor.vendor_id, vendor.id))
            .where(eq(entity_vendor.entity_id, parseInt(id)));
        
        res.status(200).json({
            success: true,
            data: {
                ...entityResult[0],
                vendors: vendorRelations
            }
        });
        
    } catch (error) {
        console.error('Error fetching entity:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch entity',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

// SEARCH ENTITIES BY VEHICLE NUMBER OR ID
//working as well 
export async function searchEntities(req: Request, res: Response) {
    try {
        const searchQuery = req.query.query as string;
        
        if (!searchQuery) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        // Search for entities matching either vehicle number (case-insensitive) or ID
        const entities = await db.select()
            .from(entity)
            .where(
                sql`LOWER(${entity.vehicleNumber}) LIKE LOWER(${`%${searchQuery}%`})
                    OR CAST(${entity.id} AS CHAR) = ${searchQuery}`
            );
        
        // If no entities found, return empty array
        if (entities.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }
        
        // For each entity, get its vendors
        const entitiesWithVendors = await Promise.all(
            entities.map(async (ent) => {
                const vendorRelations = await db
                    .select({
                        id: vendor.id,
                        name: vendor.name,
                        status: vendor.status
                    })
                    .from(entity_vendor)
                    .innerJoin(vendor, eq(entity_vendor.vendor_id, vendor.id))
                    .where(eq(entity_vendor.entity_id, ent.id));
                
                return {
                    ...ent,
                    vendors: vendorRelations
                };
            })
        );
        
        res.status(200).json({
            success: true,
            data: entitiesWithVendors
        });
        
    } catch (error) {
        console.error('Error searching entities:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to search entities',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

//working
export async function deleteEntity(req: Request, res: Response) {
    
    try {
        const { id } = req.params;
        // Check if entity exists
        const entityExists = await db.select({ id: entity.id })
            .from(entity)
            .where(eq(entity.id, parseInt(id)))
            .limit(1);
            
        if(entityExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Entity not found' 
            });
        }
        await db.delete(entity_vendor)
            .where(eq(entity_vendor.entity_id, parseInt(id)));
        
        // Then delete the entity
        await db.delete(entity)
            .where(eq(entity.id, parseInt(id)));
        
        
        res.status(200).json({
            success: true,
            message: 'Entity deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting entity:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete entity',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

//wokring : vehicleNumber cannot be updated
export async function updateEntity(req: Request, res: Response) {
    
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
        const entityExists = await db.select()
            .from(entity)
            .where(eq(entity.id, parseInt(id)))
            .limit(1);
            
        if (entityExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Entity not found' 
            });
        }
        
        // Update entity fields
        const updateData: any = {};
        if (type !== undefined) updateData.type = type;
        if (status !== undefined) updateData.status = Boolean(status);
        
        if (Object.keys(updateData).length > 0) {
            await db.update(entity)
                .set(updateData)
                .where(eq(entity.id, parseInt(id)));
        }
        
        if(vendorIds && Array.isArray(vendorIds)) {
            const existingVendors = await db.select()
                .from(vendor)
                .where(
                    inArray(vendor.id, vendorIds),
                    // eq(vendor.status, true)
                );
                
            if (existingVendors.length !== vendorIds.length) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'One or more vendor IDs do not exist' 
                });
            }
            
            // Delete existing vendor relations
            await db.delete(entity_vendor)
                .where(eq(entity_vendor.entity_id, parseInt(id)));
            
            // Add new vendor relations
            for (const vendorId of vendorIds) {
                await db.insert(entity_vendor).values({
                    entity_id: parseInt(id),
                    vendor_id: vendorId
                });
            }
            const indianTime = new Date();
            indianTime.setHours(indianTime.getHours() + 5);
            indianTime.setMinutes(indianTime.getMinutes() + 30);
            await db.update(entity)
            .set({ updatedAt: indianTime })
            .where(eq(entity.id, parseInt(id)));
        }
        
        // Get updated entity with vendors
        const updatedEntity = await db.select()
            .from(entity)
            .where(eq(entity.id, parseInt(id)))
            .limit(1);
            
        const vendorRelations = await db
            .select({
                id: vendor.id,
                name: vendor.name,
                status: vendor.status
            })
            .from(entity_vendor)
            .innerJoin(vendor, eq(entity_vendor.vendor_id, vendor.id))
            .where(eq(entity_vendor.entity_id, parseInt(id)));

            
        
        res.status(200).json({
            success: true,
            message: 'Entity updated successfully',
            data: {
                ...updatedEntity[0],
                vendors: vendorRelations
            }
        });

        
    } catch (error) {
        console.error('Error updating entity:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update entity',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
    
}

//working
export async function getAllActiveVendors(req: Request, res: Response) {
    try {
        const vendors = await db.select().from(vendor).where(eq(vendor.status, true));
        
        res.status(200).json({
            success: true,
            data: vendors
        });
        
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch vendors',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}