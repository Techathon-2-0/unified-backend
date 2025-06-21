import express from "express";
import { createGroup, deleteGroup, getAllGroups, getGroupById, searchGroups, updateGroup, getGroupsByUserId } from "../controller/Group_Controller";

const GroupRouter = express.Router();

// Route to create a new group
GroupRouter.post("/groups", async (req, res) => {
    try {
        const data = await createGroup(req, res);
        res.status(201).json({ message: "Group created successfully", data });
    }catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
});

//router to search groups
GroupRouter.get("/groups/search", async (req, res) => {
    try {
        const data = await searchGroups(req, res); 
        res.status(200).json({ message: "Groups fetched successfully", data });
    } catch (error) {
        console.error("Error searching groups:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
});


GroupRouter.get("/groups", async (req, res) => {
    try {
        // Assuming you have a function to get all groups
        // console.log("Fetching all groups");
        const data = await getAllGroups(req, res);
        // console.log(data);
        res.status(200).json({ message: "Groups fetched successfully", data });
        // res.status(200).json({ message: "Groups fetched successfully" });    
    } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
});

// Route to get group by ID
GroupRouter.get("/groups/:id", async (req, res) => {    
    
    try {
        const data = await getGroupById(req, res);
        if (data) {
            res.status(200).json({ message: "Group fetched successfully", data });
        } else {
            res.status(404).json({ message: "Group not found" });
        }
    } catch (error) {
        console.error("Error fetching group by ID:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
});


//router to update group by ID
GroupRouter.put("/groups/:id", async (req, res) => {
    try {
        const data = await updateGroup(req, res); 
        if (data) {
            res.status(200).json({ message: "Group updated successfully", data });
        } else {
            res.status(404).json({ message: "Group not found" });
        }   
    } catch (error) {
        console.error("Error updating group:", error);  
        res.status(500).json({ message: "Internal server error", error: error });
    }
});

// route too delete group by ID
GroupRouter.delete("/groups/:id", async (req, res) => {
    try {
        await deleteGroup(req, res);
    } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
});

// Route to get all groups associated with a user
GroupRouter.get("/groups/user/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await getGroupsByUserId(userId);
        res.status(200).json({ message: "Groups fetched successfully", data });
    } catch (error) {
        console.error("Error fetching user's groups:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
});

export default GroupRouter;