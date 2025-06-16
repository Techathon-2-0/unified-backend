import express from 'express';
import { createVendor, deleteVendor, getAllVendors, getVendorById, searchVendors, updateVendor } from '../controller/VendorController';

const vendorRouter = express.Router();
//wroking
vendorRouter.post('/vendor', async (req, res) => {
    try {
        const data = await createVendor(req, res);
        res.send({ message: 'Vendor created successfully', data });
    } catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//working
vendorRouter.get('/vendor/search', async (req, res) => {
    try {
        await searchVendors(req, res);
    } catch (error) {
        console.error('Error searching vendors:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


//working
vendorRouter.get('/vendor', async (req, res) => {
    try {
        // Implement logic to fetch all vendors
        const data = await getAllVendors(req, res);
        res.send({ message: 'Vendors fetched successfully', data: [] }); // Placeholder for actual data
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//working
vendorRouter.get('/vendor/:id', async (req, res) => {
    try {
       const data= await getVendorById(req, res);
        res.send({ message: `Vendor with ID ${req.params.id} fetched successfully`, data });
    } catch (error) {
        console.error('Error fetching vendor by ID:', error);   
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


//working
vendorRouter.put('/vendor/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedVendor = await updateVendor(req , res)
        res.send({ message: `Vendor with ID ${id} updated successfully` });
    }
    catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//working
vendorRouter.delete('/vendor/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await deleteVendor(req, res);
        res.send({ message: `Vendor with ID ${id} deleted successfully` });
    }
    catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


export default vendorRouter;