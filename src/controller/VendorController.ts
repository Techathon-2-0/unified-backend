import { Request, Response } from 'express';
import { drizzle } from "drizzle-orm/mysql2";
import { eq, like, or, and, not, sql } from 'drizzle-orm';
import { vendor, entity_vendor } from '../db/schema';

const db = drizzle(process.env.DATABASE_URL!);

//working
export async function createVendor(req: Request, res: Response) {
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
        const existingVendor = await db.select()
            .from(vendor)
            .where(eq(vendor.name, name));

        if (existingVendor.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A vendor with this name already exists'
            });
        }

        // Create vendor
        const [insertedVendor] = await db.insert(vendor).values({
            name,
            status: status === undefined ? true : Boolean(status)
        }).$returningId();

        res.status(201).json({
            success: true,
            message: 'Vendor created successfully',
            data: insertedVendor
        });
    } catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

//working
export async function getAllVendors(req: Request, res: Response) {
    try {
        const result = await db.select().from(vendor);
        
        res.status(200).json({
            success: true,
            data: result
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

//working
export async function getVendorById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        // Get vendor
        const vendorResult = await db.select()
            .from(vendor)
            .where(eq(vendor.id, parseInt(id)))
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
    } catch (error) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

//working
export async function updateVendor(req: Request, res: Response) {
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
        const existingVendor = await db.select()
            .from(vendor)
            .where(eq(vendor.id, parseInt(id)))
            .limit(1);
        
        if (existingVendor.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }
        
        
        // Update vendor
        const updateData: any = {};
        if (status !== undefined) updateData.status = Boolean(status);
        
        await db.update(vendor)
            .set(updateData)
            .where(eq(vendor.id, parseInt(id)));

        // Fetch the updated vendor
        const [updatedVendor] = await db.select()
            .from(vendor)
            .where(eq(vendor.id, parseInt(id)))
            .limit(1);

        res.status(200).json({
            success: true,
            message: 'Vendor updated successfully',
            data: updatedVendor
        });
    } catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update vendor',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

//working
export async function deleteVendor(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        // Check if vendor exists
        const existingVendor = await db.select()
            .from(vendor)
            .where(eq(vendor.id, parseInt(id)))
            .limit(1);
        
        if (existingVendor.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }
        
        // Check if vendor is associated with any entities
        const entityAssociations = await db.select()
            .from(entity_vendor)
            .where(eq(entity_vendor.vendor_id, parseInt(id)))
            .limit(1);
        
        if (entityAssociations.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete vendor as it is associated with one or more entities'
            });
        }
        
        // Delete vendor
        await db.delete(vendor)
            .where(eq(vendor.id, parseInt(id)));
        
        res.status(200).json({
            success: true,
            message: 'Vendor deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete vendor',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

//working
export async function searchVendors(req: Request, res: Response) {
    try {
        const searchQuery = req.query.query as string;
        const statusFilter = req.query.status as string | undefined;
        
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
                    .from(vendor)
                    .where(and(
                        eq(vendor.id, parseInt(searchQuery)),
                        eq(vendor.status, true)
                    ));
            } else if (statusFilter === 'false') {
                query = db.select()
                    .from(vendor)
                    .where(and(
                        eq(vendor.id, parseInt(searchQuery)),
                        eq(vendor.status, false)
                    ));
            } else {
                query = db.select()
                    .from(vendor)
                    .where(eq(vendor.id, parseInt(searchQuery)));
            }
        } else {
            // Search by name (case insensitive)
            if (statusFilter === 'true') {
                query = db.select()
                    .from(vendor)
                    .where(and(
                        sql`LOWER(${vendor.name}) LIKE LOWER(${`%${searchQuery}%`})`,
                        eq(vendor.status, true)
                    ));
            } else if (statusFilter === 'false') {
                query = db.select()
                    .from(vendor)
                    .where(and(
                        sql`LOWER(${vendor.name}) LIKE LOWER(${`%${searchQuery}%`})`,
                        eq(vendor.status, false)
                    ));
            } else {
                query = db.select()
                    .from(vendor)
                    .where(sql`LOWER(${vendor.name}) LIKE LOWER(${`%${searchQuery}%`})`);
            }
        }
        
        const results = await query;
        
        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error searching vendors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search vendors',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}