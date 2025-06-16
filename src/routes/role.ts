import express, { RequestHandler } from 'express';
import { getAllRoles, getRoleById, createRole, updateRole,deleteRole } from '../controller/RoleController';

const RoleRouter = express.Router();

// GET all roles
 
RoleRouter.get('/roles', async(req,res)=>{

    try {
        const roles = await getAllRoles();
        
        res.status(200).json({message: 'Roles fetched successfully', roles:roles});
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Failed to fetch roles' });
    }
} );
// GET role by ID
RoleRouter.get('/role/:id', getRoleById as RequestHandler);

// POST create new role
RoleRouter.post('/role', createRole as RequestHandler);

// PUT update existing role
RoleRouter.put('/role',updateRole as RequestHandler);

RoleRouter.delete('/role/:id', deleteRole as RequestHandler);
export default RoleRouter;