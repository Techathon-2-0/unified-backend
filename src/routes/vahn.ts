import express from 'express';
import { getVahanData, getVahanFromDb } from "../controller/vahn_Controller"

const Vahnrouter = express.Router();

Vahnrouter.post('/vahn', async (req, res) => {
    try {
        const data = await getVahanData(req, res);
        res.status(200).json({ message: 'Vahan data fetched successfully', data });
    }
    catch (error) {
        console.error('Error fetching Vahan data:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch Vahan data' });
    }
});

Vahnrouter.get('/vahn/:vehicleNumber', async (req, res) => {
    try {
        const vehicleNumber = req.params.vehicleNumber;
        const data = await getVahanFromDb(req, res);
        res.status(200).json({ message: 'Vahan data fetched successfully', data });
    }
    catch (error) {
        console.error('Error fetching Vahan data from database:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch Vahan data from database' });
    }
});

export default Vahnrouter;