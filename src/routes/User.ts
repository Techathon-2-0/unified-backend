import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  getUserbyUsername,
  logoutUser,
} from '../controller/UserController';
import { validateUserSession } from '../middleware/sessionValidator';


const userRouter = express.Router();

//working 
userRouter.get('/user',  async (req, res) => {
    const { searchTerm } = req.query;

    try {
        let data;
        if (searchTerm) {
            data = await getUserbyUsername(searchTerm.toString()); // Pass only searchTerm
            res.status(200).json({ message: "Search results", data });
        } else {
            console.log("Fetching all users...");
            data = await getAllUsers(); // No need for req, res
            res.status(200).json({ message: 'All users fetched successfully', data });
        }
        return;
    } catch (error) {
        console.error("Error in GET /users:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});


//working
userRouter.get('/user/id/:id', async (req, res) => {
    const data = await getUserById(req,res);
    if (data) {
        res.send({ message: 'User fetched successfully', data });
    } else {
        res.status(404).send({ message: 'User not found' });
    }
});


//woarkgin
userRouter.post('/user', async (req, res) => {
    //create user   
    await createUser(req, res);

});


//working
userRouter.put('/user/:id', async (req, res) => {
    //update user
    const data = await updateUser(req, res);
    if (data) {
        res.send({ message: 'User updated successfully', data });
    } else {
        res.status(404).send({ message: 'User not found' });
    }
});

//working
userRouter.delete('/user/:id', validateUserSession, async (req: Request, res: Response) => {
    // First check if the session is invalidated (using type assertion)
    if ((req as any).invalidatedSession) {
        // Set cookies with immediate expiry to clear them
        res.cookie('authToken', '', { expires: new Date(0) });
        res.cookie('userData', '', { expires: new Date(0) });
        
        res.status(401).send({ 
            message: 'Session invalidated', 
            logout: true,
            clearCookies: true
        });
        return;
    }
    
    // Delete user
    const data = await deleteUser(req, res);

    if (data) {
        // Check if the deleted user is the current authenticated user
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
                
                // If the deleted user is the current user, indicate client should log out
                if (decoded.id === parseInt(req.params.id)) {
                    // Set cookies with immediate expiry to clear them
                    res.cookie('authToken', '', { expires: new Date(0) });
                    res.cookie('userData', '', { expires: new Date(0) });
                    
                    res.send({ 
                        message: 'User deleted successfully',
                        logout: true,
                        clearCookies: true
                    });
                    return;
                }
            } catch (error) {
                console.error("Error verifying token:", error);
            }
        }
        
        res.send({ message: 'User deleted successfully'});
    } else {
        res.status(404).send({ message: 'User not found' });
    }
});

//working
userRouter.post('/login', async (req, res) => {
    //login user
    const data = await loginUser(req, res);
    if (data) {
       if(data==10){
         res.status(409).send({ message: 'User is Inactive' });
       }else{
         res.send({ message: 'User logged in successfully', data });
       }
    } else {
        res.status(401).send({ message: 'Invalid credentials' });
    }
});

// Add this endpoint to check user session validity
userRouter.get('/user/validate', validateUserSession, (req: Request, res: Response) => {
  if ((req as any).invalidatedSession) {
    res.status(401).send({ 
      message: 'Invalid session',
      logout: true,
      clearCookies: true
    });
    return;
  }
  
  res.status(200).send({ valid: true });
});

userRouter.delete('/userlogout', async (req, res) => {
  await logoutUser(req, res);
});




export default userRouter;