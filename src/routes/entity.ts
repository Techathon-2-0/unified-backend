import express, { Request, Response, NextFunction } from 'express';
import { createEntity, deleteEntity, getAllEntities, getAllActiveVendors, getEntityById, searchEntities, updateEntity } from '../controller/entityController';

const Entityrouter = express.Router();
//working
Entityrouter.post('/entity', async (req, res) => {
    try {
        // Remove res.send from controller, only send here
        const data = await createEntity(req, res);
        if (!res.headersSent) {
            res.send({ message: 'entity created successfully', data });
        }
    } catch (error) {
        console.error('Error creating entity:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
});

//working
Entityrouter.get('/entity', async (req, res) => {
    try {
        const data = await getAllEntities(req, res);
        if (!res.headersSent) {
            res.send({ message: 'entity fetched successfully', data });
        }
    } catch (error) {
        console.error('Error fetching entity:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
})

// Add the search route before the /:id route to prevent conflicts
// IMPORTANT: This needs to be before the '/:id' route!
// WORKING
Entityrouter.get('/entity/search', async (req, res) => {
    try {
        const data=await searchEntities(req, res);
        if (!res.headersSent) {
            res.send({ message: 'Entities searched successfully', data });
        }
    } catch (error) {
        console.error('Error searching entities:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
});

//working
Entityrouter.get('/entity/:id', async (req, res) => {
    try {
        const entityId = req.params.id;
        const data = await getEntityById(req, res);
        if (!res.headersSent) {
            if (data) {
                res.send({ message: 'entity fetched successfully', data });
            } else {
                res.status(404).send({ message: 'entity not found' });
            }
        }
    } catch (error) {
        console.error('Error fetching entity by ID:', error);   
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
});

//working
Entityrouter.delete('/entity/:id', async (req, res) => {
    try{
        const data = await deleteEntity(req, res);
        if (!res.headersSent) {
            if (data) {
                res.send({ message: 'entity deleted successfully', data });
            } else {
                res.status(404).send({ message: 'entity not found' });
            }
        }
    }catch (error) {
        console.error('Error deleting entity:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }   
});

//working
Entityrouter.put('/entity/:id', async (req, res) => {
    try {
        const data = await updateEntity(req, res);
        if (!res.headersSent) {
            if (data) {
                res.send({ message: 'entity updated successfully', data });
            } else {
                res.status(404).send({ message: 'entity not found' });
            }
        }
    } catch (error) {
        console.error('Error updating entity:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
});

//working
Entityrouter.get('/vendors', async (req, res) => {
    try {
        const data = await getAllActiveVendors(req, res);
        if (!res.headersSent) {
            res.send({ message: 'Vendors fetched successfully', data });
        }
    } catch (error) {
        console.error('Error fetching vendors:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
});

export default Entityrouter;