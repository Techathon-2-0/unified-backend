import exprese from 'express';
import { getLiveData } from '../controller/live';

const liveRouter = exprese.Router();

liveRouter.get('/live', async (req, res) => {
    
});

liveRouter.post('/live/:id', async (req, res) => {
    const userId = req.params.id;
    const {groups}= req.body;
    console.log('Fetching live data for user ID:', userId);
    const data = await getLiveData(userId,groups);

    res.send({ message: data });
});



export default liveRouter;
