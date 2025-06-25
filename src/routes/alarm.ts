import express from 'express';
import { getAllAlarms, getAlarmById, createAlarm, updateAlarm, deleteAlarm } from '../controller/alarm_Controller';
const alarmRouter = express.Router();   

// Alarm Routes
alarmRouter.get('/alarm', async (req, res) => {
    try {
        await getAllAlarms(req, res);
        // res.status(200).json(alarms);
    } catch (error) {
        console.error('Error fetching alarms:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }   
});

alarmRouter.get('/alarm/:id', async (req, res) => {
    try {
        const alarm = await getAlarmById(req, res);
        if (alarm) {
            res.status(200).json(alarm);
        } else {
            res.status(404).json({ message: 'Alarm not found' });
        }
    } catch (error) {
        console.error('Error fetching alarm:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

alarmRouter.post('/alarm', async (req, res) => {
    try {
        const newAlarm = await createAlarm(req, res);
        res.status(201).json(newAlarm);
    } catch (error) {
        console.error('Error creating alarm:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

alarmRouter.put('/alarm/:id', async (req, res) => {
    try {
        const updatedAlarm = await updateAlarm(req, res);
        if (updatedAlarm) {
            res.status(200).json(updatedAlarm);
        } else {
            res.status(404).json({ message: 'Alarm not found' });
        }
    } catch (error) {
        console.error('Error updating alarm:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

alarmRouter.delete('/alarm/:id', async (req, res) => {
    try {
        const deletedAlarm = await deleteAlarm(req, res);
        if (deletedAlarm) {
            res.status(200).json({ message: 'Alarm deleted successfully' });
        } else {
            res.status(404).json({ message: 'Alarm not found' });
        }
    } catch (error) {
        console.error('Error deleting alarm:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default alarmRouter;