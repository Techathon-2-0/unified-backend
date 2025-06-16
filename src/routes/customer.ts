import express from "express";
import { 
    createCustomer, 
    getAllCustomers, 
    getCustomerById, 
    updateCustomerById, 
    deleteCustomer, 
    searchCustomers,
    createCustomerGroup,
    getAllCustomerGroups,
    getCustomerGroupById,
    updateCustomerGroup,
    deleteCustomerGroup,searchCustomerGroups,
    getCustomerNamesByUserAccess,
    getCustomerGroupsByUserId
} from "../controller/Customer_Controller";

const customerRouter = express.Router();

// Customer Routes
customerRouter.post('/customer', async (req, res) => {
    try {
        const data = await createCustomer(req, res);
        res.send({ message: 'Customer created successfully', data });
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});
//workign
customerRouter.get('/customer', async (req, res) => {
    try {
        if (req.query.query) {
            const data = await searchCustomers(req, res);
            res.send({ message: 'Customers found', data });
        } else {
            const data = await getAllCustomers(req, res);
            res.send({ message: 'Customers fetched successfully', data });
        }
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});
//working
customerRouter.get('/customer/:id', async (req, res) => {
    try {
        const data = await getCustomerById(req, res);
        res.send({ message: 'Customer fetched successfully', data });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//working
customerRouter.put('/customer/:id', async (req, res) => {
    try {
        const data = await updateCustomerById(req, res);
        res.send({ message: 'Customer updated successfully', data });
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//wokring
customerRouter.delete('/customer/:id', async (req, res) => {
    try {
        const data = await deleteCustomer(req, res);
        res.send({ message: 'Customer deleted successfully', data });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//working
customerRouter.post('/customer-group', async (req, res) => {
    try {
        const data = await createCustomerGroup(req, res);
        res.send({ message: 'Customer group created successfully', data });
    } catch (error) {
        console.error('Error creating customer group:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//working
customerRouter.get('/customer-group', async (req, res) => {
    try {
        if (req.query.query) {
            const data = await searchCustomerGroups(req, res);
            res.send({ 
                success: true,
                message: 'Customer groups found', 
                data 
            });
        } else {
            const data = await getAllCustomerGroups(req, res);
            res.send({ 
                success: true,
                message: 'Customer groups fetched successfully', 
                data 
            });
        }
    } catch (error) {
        console.error('Error fetching customer groups:', error);
        res.status(500).send({ 
            success: false,
            message: 'Failed to fetch customer groups',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});


//wokring
customerRouter.get('/customer-group/:id', async (req, res) => {
    try {
        const data = await getCustomerGroupById(req, res);
        res.send({ message: 'Customer group fetched successfully', data });
    } catch (error) {
        console.error('Error fetching customer group:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


//wokring
customerRouter.put('/customer-group/:id', async (req, res) => {
    try {
        const data = await updateCustomerGroup(req, res);
        res.send({ message: 'Customer group updated successfully', data });
    } catch (error) {
        console.error('Error updating customer group:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


//.working
customerRouter.delete('/customer-group/:id', async (req, res) => {
    try {
        const data = await deleteCustomerGroup(req, res);
        res.send({ message: 'Customer group deleted successfully', data });
    } catch (error) {
        console.error('Error deleting customer group:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

export default customerRouter;

//working

customerRouter.get('/customer-name-by-user/:userId', async (req, res) => {
    try {
        const data = await getCustomerNamesByUserAccess(req, res);
        res.send({ message: 'Customer group fetched successfully', data });
    } catch (error) {
        console.error('Error fetching customer group by user:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
}
);


//wokring
customerRouter.get('/customer-group-by-user/:userId', async (req, res) => {
    try {
        const data = await getCustomerGroupsByUserId(req, res);
        res.send({ message: 'Customer groups fetched successfully', data });
    } catch (error) {
        console.error('Error fetching customer groups by user:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


// jin cusotmer grp ka access k unn sb customer k name 
// customer grp by user id 
