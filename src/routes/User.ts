import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  
} from '../controller/UserController';
const userRouter = express.Router();


//working 
userRouter.get('/users', async (req, res) => {
    //get all users

    const data = await getAllUsers();
    res.send({ message: 'Users fetched successfully', data });

});

//working
userRouter.get('/users/:id', async (req, res) => {
    //get user by id
    const data = await getUserById(req, res);
    if (data) {
        res.send({ message: 'User fetched successfully', data });
    } else {
        res.status(404).send({ message: 'User not found' });
    }
});


//woarkgin
userRouter.post('/user', async (req, res) => {
    //create user   
    const data = await createUser(req, res);
    res.send({ message: 'User created successfully', data });
});

//working
userRouter.put('/users/:id', async (req, res) => {
    //update user
    const data = await updateUser(req, res);
    if (data) {
        res.send({ message: 'User updated successfully', data });
    } else {
        res.status(404).send({ message: 'User not found' });
    }
});

//working
userRouter.delete('/users/:id', async (req, res) => {
    //delete user
    const data = await deleteUser(req, res);

    if (data) {
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
        res.send({ message: 'User logged in successfully', data });
    } else {
        res.status(401).send({ message: 'Invalid credentials' });
    }
});



export default userRouter;