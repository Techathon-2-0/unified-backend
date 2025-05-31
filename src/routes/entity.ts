import express, { Request, Response, NextFunction } from 'express';
import { createEntity, deleteEntity, getAllEntities, getAllActiveVendors, getEntityById, searchEntities, updateEntity } from '../controller/entityController';

const Entityrouter = express.Router();
//working
Entityrouter.post('/entity', async (req, res) => {
    try {
        const data = await createEntity(req, res);
        res.send({ message: 'entity created successfully', data });
    } catch (error) {
        console.error('Error creating entity:', error);
        
    }
});

//working
Entityrouter.get('/entity', async (req, res) => {
    try {
        const data = await getAllEntities(req, res);
        res.send({ message: 'entity fetched successfully', data });
    } catch (error) {
        console.error('Error fetching entity:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
})

// Add the search route before the /:id route to prevent conflicts
// IMPORTANT: This needs to be before the '/:id' route!
// WORKING
Entityrouter.get('/entity/search', async (req, res) => {
    try {
        await searchEntities(req, res);
    } catch (error) {
        console.error('Error searching entities:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//working
Entityrouter.get('/entity/:id', async (req, res) => {
    try {
        const entityId = req.params.id;
        const data = await getEntityById(req, res);
        if (data) {
            res.send({ message: 'entity fetched successfully', data });
        } else {
            res.status(404).send({ message: 'entity not found' });
        }
    } catch (error) {
        console.error('Error fetching entity by ID:', error);   
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//working
Entityrouter.delete('/entity/:id', async (req, res) => {
    try{
        const data = await deleteEntity(req, res);
        if (data) {
            res.send({ message: 'entity deleted successfully', data });
        } else {
            res.status(404).send({ message: 'entity not found' });
        }
    }catch (error) {
        console.error('Error deleting entity:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }   
});

//working
Entityrouter.put('/entity/:id', async (req, res) => {
    try {

        const data = await updateEntity(req, res); // Assuming createEntity can also handle updates
        if (data) {
            res.send({ message: 'entity updated successfully', data });
        } else {
            res.status(404).send({ message: 'entity not found' });
        }
    } catch (error) {
        console.error('Error updating entity:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

//working
Entityrouter.get('/vendors', async (req, res) => {
    try {
        const data = await getAllActiveVendors(req, res);
        res.send({ message: 'Vendors fetched successfully', data });
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

export default Entityrouter;
