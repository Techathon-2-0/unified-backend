"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Group_Controller_1 = require("../controller/Group_Controller");
const GroupRouter = express_1.default.Router();
// Route to create a new group
GroupRouter.post("/groups", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Group_Controller_1.createGroup)(req, res);
        res.status(201).json({ message: "Group created successfully", data });
    }
    catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
}));
//router to search groups
GroupRouter.get("/groups/search", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Group_Controller_1.searchGroups)(req, res);
        res.status(200).json({ message: "Groups fetched successfully", data });
    }
    catch (error) {
        console.error("Error searching groups:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
}));
GroupRouter.get("/groups", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Assuming you have a function to get all groups
        const data = yield (0, Group_Controller_1.getAllGroups)(req, res);
        res.status(200).json({ message: "Groups fetched successfully", data });
    }
    catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
}));
// Route to get group by ID
GroupRouter.get("/groups/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Group_Controller_1.getGroupById)(req, res);
        if (data) {
            res.status(200).json({ message: "Group fetched successfully", data });
        }
        else {
            res.status(404).json({ message: "Group not found" });
        }
    }
    catch (error) {
        console.error("Error fetching group by ID:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
}));
//router to update group by ID
GroupRouter.put("/groups/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, Group_Controller_1.updateGroup)(req, res);
        if (data) {
            res.status(200).json({ message: "Group updated successfully", data });
        }
        else {
            res.status(404).json({ message: "Group not found" });
        }
    }
    catch (error) {
        console.error("Error updating group:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
}));
// route too delete group by ID
GroupRouter.delete("/groups/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, Group_Controller_1.deleteGroup)(req, res);
    }
    catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
}));
// Route to get all groups associated with a user
GroupRouter.get("/groups/user/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const data = yield (0, Group_Controller_1.getGroupsByUserId)(userId);
        res.status(200).json({ message: "Groups fetched successfully", data });
    }
    catch (error) {
        console.error("Error fetching user's groups:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
}));
exports.default = GroupRouter;
