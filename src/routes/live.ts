import exprese from 'express';
import { getLiveData } from '../controller/live';

const liveRouter = exprese.Router();

liveRouter.get('/live', async (req, res) => {
    const data= await getLiveData();
    res.send({message:data});
});

liveRouter.get('/live/:id', (req, res) => {

});



export default liveRouter;
