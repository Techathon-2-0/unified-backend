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
exports.changepassword = exports.getUserbyUsername = exports.loginUser = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const mysql2_1 = require("drizzle-orm/mysql2");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
//working
const getAllUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield db.select().from(schema_1.usersTable);
        const data = [];
        for (const user of users) {
            const temp = {
                id: user.id,
                name: user.name,
                phone: user.phone,
                username: user.username,
                email: user.email,
                active: user.active,
                roles: "",
                tag: user.tag,
                usertypes: [],
                vehiclegrp: [],
                geofencegrp: [],
                customergrp: [],
            };
            const userRoles = yield db.select().from(schema_1.user_role).where((0, drizzle_orm_1.eq)(schema_1.user_role.user_id, user.id));
            if (userRoles.length > 0 && userRoles[0].role_id !== null && userRoles[0].role_id !== undefined) {
                const roleData = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, userRoles[0].role_id));
                temp.roles = roleData.length > 0 ? roleData[0].role_name : '';
            }
            const userTypes = yield db.select().from(schema_1.user_usertype).where((0, drizzle_orm_1.eq)(schema_1.user_usertype.user_id, user.id));
            if (userTypes.length > 0) {
                for (const userType of userTypes) {
                    const typeData = yield db.select().from(schema_1.usertype).where((0, drizzle_orm_1.eq)(schema_1.usertype.id, userType.user_type_id));
                    if (typeData.length > 0) {
                        temp.usertypes.push(typeData[0].user_type);
                    }
                }
            }
            const vehicleGroups = yield db.select().from(schema_1.user_group).where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, user.id));
            if (vehicleGroups.length > 0) {
                for (const vehicleGroup of vehicleGroups) {
                    const groupData = yield db.select().from(schema_1.group).where((0, drizzle_orm_1.eq)(schema_1.group.id, vehicleGroup.vehicle_group_id));
                    if (groupData.length > 0) {
                        temp.vehiclegrp.push(groupData[0].group_name);
                    }
                }
            }
            const geofenceGroups = yield db.select().from(schema_1.user_geofence_group).where((0, drizzle_orm_1.eq)(schema_1.user_geofence_group.user_id, user.id));
            if (geofenceGroups.length > 0) {
                for (const geofenceGroup of geofenceGroups) {
                    const groupData = yield db.select().from(schema_1.geofencegroup).where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, geofenceGroup.geofence_group_id));
                    if (groupData.length > 0) {
                        temp.geofencegrp.push(groupData[0].geo_group);
                    }
                }
            }
            const custgrp = yield db.select().from(schema_1.user_customer_group).where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, user.id));
            if (custgrp.length > 0) {
                for (const cu of custgrp) {
                    if (cu.customer_group_id !== null && cu.customer_group_id !== undefined) {
                        const gp = yield db.select().from(schema_1.customer_group).where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, cu.customer_group_id));
                        if (gp.length > 0) {
                            temp.customergrp.push(gp[0].group_name);
                        }
                    }
                }
            }
            data.push(temp);
        }
        return data;
    }
    catch (error) {
        console.error('Error fetching users:', error);
    }
});
exports.getAllUsers = getAllUsers;
// working
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, parseInt(req.params.id)));
        const user = users[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const temp = {
            id: user.id,
            name: user.name,
            phone: user.phone,
            username: user.username,
            email: user.email,
            active: user.active,
            roles: "",
            tag: user.tag,
            usertypes: [],
            vehiclegrp: [],
            geofencegrp: [],
            customergrp: [],
        };
        const userRoles = yield db.select().from(schema_1.user_role).where((0, drizzle_orm_1.eq)(schema_1.user_role.user_id, user.id));
        if (userRoles.length > 0 && userRoles[0].role_id !== null && userRoles[0].role_id !== undefined) {
            const roleData = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, userRoles[0].role_id));
            temp.roles = roleData.length > 0 ? roleData[0].role_name : '';
        }
        // const userTags = await db.select().from(user_usertag).where(eq(user_usertag.user_id, user.id));
        // if (userTags.length > 0 && userTags[0].user_tag_id !== null && userTags[0].user_tag_id !== undefined) {
        //   const tagData = await db.select().from(usertag).where(eq(usertag.id, userTags[0].user_tag_id as number));
        //   temp.tag = tagData.length > 0 ? tagData[0].user_tag : '';
        // }
        const userTypes = yield db.select().from(schema_1.user_usertype).where((0, drizzle_orm_1.eq)(schema_1.user_usertype.user_id, user.id));
        if (userTypes.length > 0) {
            for (const userType of userTypes) {
                const typeData = yield db.select().from(schema_1.usertype).where((0, drizzle_orm_1.eq)(schema_1.usertype.id, userType.user_type_id));
                if (typeData.length > 0) {
                    temp.usertypes.push(typeData[0].user_type);
                }
            }
        }
        const vehicleGroups = yield db.select().from(schema_1.user_group).where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, user.id));
        if (vehicleGroups.length > 0) {
            for (const vehicleGroup of vehicleGroups) {
                const groupData = yield db.select().from(schema_1.group).where((0, drizzle_orm_1.eq)(schema_1.group.id, vehicleGroup.vehicle_group_id));
                if (groupData.length > 0) {
                    temp.vehiclegrp.push(groupData[0].group_name);
                }
            }
        }
        const geofenceGroups = yield db.select().from(schema_1.user_geofence_group).where((0, drizzle_orm_1.eq)(schema_1.user_geofence_group.user_id, user.id));
        if (geofenceGroups.length > 0) {
            for (const geofenceGroup of geofenceGroups) {
                const groupData = yield db.select().from(schema_1.geofencegroup).where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, geofenceGroup.geofence_group_id));
                if (groupData.length > 0) {
                    temp.geofencegrp.push(groupData[0].geo_group);
                }
            }
        }
        const custgrp = yield db.select().from(schema_1.user_customer_group).where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, user.id));
        if (custgrp.length > 0) {
            for (const cu of custgrp) {
                if (cu.customer_group_id !== null && cu.customer_group_id !== undefined) {
                    const gp = yield db.select().from(schema_1.customer_group).where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, cu.customer_group_id));
                    if (gp.length > 0) {
                        temp.customergrp.push(gp[0].group_name);
                    }
                }
            }
        }
        return temp;
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
});
exports.getUserById = getUserById;
// working
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, phone, username, email, password, roles, tag, usertypes, custgrp } = req.body;
        const vehiclegrp = req.body.vehiclegroup || [];
        const geofencegrp = req.body.geofencegroup || [];
        // console.log('Creating user with data:', req.body);
        // res.status(201).json({
        // message: 'User created successfully'});
        // Check if username or email already exists
        const existingUser = yield db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.usersTable.username, username), (0, drizzle_orm_1.eq)(schema_1.usersTable.email, email)));
        if (existingUser.length > 0) {
            const d = {};
            let uname = 0;
            let em = 0;
            for (const u of existingUser) {
                if (u.username === username) {
                    uname = 1;
                }
                if (u.email === email) {
                    em = 1;
                }
            }
            if (uname && em) {
                res.status(400).json({ message: 'Username and Email already exists', username, email });
            }
            else if (uname) {
                res.status(400).json({ message: 'Username already exists', username });
            }
            else if (em) {
                res.status(400).json({ message: 'Email already exists', email });
            }
        }
        // // Hash password
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // // Create new user
        const newUser = yield db.insert(schema_1.usersTable).values({
            name,
            phone,
            username,
            email,
            password: hashedPassword,
            active: true, // Default to active
            tag: tag || null // Default to null if not provided
        }).$returningId();
        const userId = newUser[0].id;
        const q = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.role_name, roles));
        if (q.length > 0) {
            yield db.insert(schema_1.user_role).values({
                user_id: userId,
                role_id: q[0].id
            });
        }
        // const dd=await db.select().from(usertag).where(eq(usertag.user_tag, tag));
        //   if(dd.length > 0){
        //     await db.insert(user_usertag).values({
        //       user_id: userId,
        //       user_tag_id: dd[0].id
        //     });
        //   }
        for (const u of usertypes) {
            const d = yield db.select().from(schema_1.usertype).where((0, drizzle_orm_1.eq)(schema_1.usertype.user_type, u));
            if (d.length > 0) {
                yield db.insert(schema_1.user_usertype).values({
                    user_id: userId,
                    user_type_id: d[0].id
                });
            }
        }
        for (const v of vehiclegrp) {
            const d = yield db.select().from(schema_1.group).where((0, drizzle_orm_1.eq)(schema_1.group.group_name, v));
            if (d.length > 0) {
                yield db.insert(schema_1.user_group).values({
                    user_id: userId,
                    vehicle_group_id: d[0].id
                });
            }
        }
        for (const g of geofencegrp) {
            const d = yield db.select().from(schema_1.geofencegroup).where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.geo_group, g));
            if (d.length > 0) {
                yield db.insert(schema_1.user_geofence_group).values({
                    user_id: userId,
                    geofence_group_id: d[0].id
                });
            }
        }
        for (const g of custgrp) {
            const d = yield db.select().from(schema_1.customer_group).where((0, drizzle_orm_1.eq)(schema_1.customer_group.group_name, g));
            if (d.length > 0) {
                yield db.insert(schema_1.user_customer_group).values({
                    user_id: userId,
                    customer_group_id: d[0].id
                });
            }
        }
        return { userId, name, phone, username, email, roles, tag, usertypes, vehiclegrp, geofencegrp, custgrp };
    }
    catch (error) {
        console.error('Error creating user:', error);
        // res.status(500).json({ message: 'Failed to create user' });
    }
});
exports.createUser = createUser;
//working
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, phone, username, email, roles, tag, usertypes, active, custgrp } = req.body;
        const vehiclegrp = req.body.vehiclegroup || [];
        const geofencegrp = req.body.geofencegroup || [];
        // console.log('Creating user with data:', req.body);
        // res.status(201).json({
        // message: 'User created successfully'});
        // Check if username or email already exists
        const existingUser = yield db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, parseInt(id)));
        if (existingUser.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        yield db.update(schema_1.usersTable).set({
            name,
            phone,
            username,
            email,
            active: active,
            tag: tag || null // Default to null if not provided
        }).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, parseInt(id)));
        yield db.delete(schema_1.user_role).where((0, drizzle_orm_1.eq)(schema_1.user_role.user_id, parseInt(id)));
        // await db.delete(user_usertag).where(eq(user_usertag.user_id, parseInt(id)));
        yield db.delete(schema_1.user_usertype).where((0, drizzle_orm_1.eq)(schema_1.user_usertype.user_id, parseInt(id)));
        yield db.delete(schema_1.user_group).where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, parseInt(id)));
        yield db.delete(schema_1.user_geofence_group).where((0, drizzle_orm_1.eq)(schema_1.user_geofence_group.user_id, parseInt(id)));
        yield db.delete(schema_1.user_customer_group).where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, parseInt(id)));
        const q = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.role_name, roles));
        if (q.length > 0) {
            yield db.insert(schema_1.user_role).values({
                user_id: parseInt(id),
                role_id: q[0].id
            });
        }
        // const dd=await db.select().from(usertag).where(eq(usertag.user_tag, tag));
        //   if(dd.length > 0){
        //     await db.insert(user_usertag).values({
        //       user_id: parseInt(id),
        //       user_tag_id: dd[0].id
        //     });
        //   }
        for (const u of usertypes) {
            const d = yield db.select().from(schema_1.usertype).where((0, drizzle_orm_1.eq)(schema_1.usertype.user_type, u));
            if (d.length > 0) {
                yield db.insert(schema_1.user_usertype).values({
                    user_id: parseInt(id),
                    user_type_id: d[0].id
                });
            }
        }
        for (const v of vehiclegrp) {
            const d = yield db.select().from(schema_1.group).where((0, drizzle_orm_1.eq)(schema_1.group.group_name, v));
            if (d.length > 0) {
                yield db.insert(schema_1.user_group).values({
                    user_id: parseInt(id),
                    vehicle_group_id: d[0].id
                });
            }
        }
        for (const g of geofencegrp) {
            const d = yield db.select().from(schema_1.geofencegroup).where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.geo_group, g));
            if (d.length > 0) {
                yield db.insert(schema_1.user_geofence_group).values({
                    user_id: parseInt(id),
                    geofence_group_id: d[0].id
                });
            }
        }
        for (const g of custgrp) {
            const d = yield db.select().from(schema_1.customer_group).where((0, drizzle_orm_1.eq)(schema_1.customer_group.group_name, g));
            if (d.length > 0) {
                yield db.insert(schema_1.user_customer_group).values({
                    user_id: parseInt(id),
                    customer_group_id: d[0].id
                });
            }
        }
        return { name, phone, username, email, roles, tag, usertypes, vehiclegrp, geofencegrp };
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
});
exports.updateUser = updateUser;
// working
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = yield db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, parseInt(id)));
        if (existingUser.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Delete all user relations
        yield db.delete(schema_1.user_role).where((0, drizzle_orm_1.eq)(schema_1.user_role.user_id, parseInt(id)));
        yield db.delete(schema_1.user_usertype).where((0, drizzle_orm_1.eq)(schema_1.user_usertype.user_id, parseInt(id)));
        yield db.delete(schema_1.user_group).where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, parseInt(id)));
        yield db.delete(schema_1.user_geofence_group).where((0, drizzle_orm_1.eq)(schema_1.user_geofence_group.user_id, parseInt(id)));
        yield db.delete(schema_1.user_customer_group).where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, parseInt(id)));
        // Delete the user
        yield db.delete(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, parseInt(id)));
        return 1;
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
        return 0;
    }
});
exports.deleteUser = deleteUser;
// working
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        // Find user by username
        const user = yield db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.usersTable.username, username), (0, drizzle_orm_1.eq)(schema_1.usersTable.email, username) // Allow login with email as well
        ));
        if (user.length === 0) {
            return 0;
        }
        if (user[0].active === false) {
            return 10;
        }
        // Compare password
        const isPasswordValid = yield bcrypt_1.default.compare(password, user[0].password);
        if (!isPasswordValid) {
            return 0;
        }
        // return 1;
        const data = {
            id: user[0].id,
            name: user[0].name,
            token: "",
            phone: user[0].phone,
            username: user[0].username,
            email: user[0].email,
            active: user[0].active,
            roles: "",
            tag: user[0].tag,
            usertypes: [],
            vehiclegrp: [],
            geofencegrp: [],
            customergrp: [],
        };
        // Get user's role
        const userRole = yield db.select().from(schema_1.user_role).where((0, drizzle_orm_1.eq)(schema_1.user_role.user_id, user[0].id));
        const roleId = userRole.length > 0 ? userRole[0].role_id : null;
        if (roleId) {
            const roleData = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, roleId));
            data.roles = roleData.length > 0 ? roleData[0].role_name : '';
        }
        // Get user's tag
        // const userTag = await db.select().from(user_usertag).where(eq(user_usertag.user_id, user[0].id));
        // if (userTag.length > 0 && userTag[0].user_tag_id !== null && userTag[0].user_tag_id !== undefined) {
        //   const tagData = await db.select().from(usertag).where(eq(usertag.id, userTag[0].user_tag_id as number));
        //   data.tag = tagData.length > 0 ? tagData[0].user_tag : '';
        // }
        // Get user's usertypes
        const userTypes = yield db.select().from(schema_1.user_usertype).where((0, drizzle_orm_1.eq)(schema_1.user_usertype.user_id, user[0].id));
        if (userTypes.length > 0) {
            for (const userType of userTypes) {
                const typeData = yield db.select().from(schema_1.usertype).where((0, drizzle_orm_1.eq)(schema_1.usertype.id, userType.user_type_id));
                if (typeData.length > 0) {
                    data.usertypes.push(typeData[0].user_type);
                }
            }
        }
        // Get user's vehicle groups
        const vehicleGroups = yield db.select().from(schema_1.user_group).where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, user[0].id));
        if (vehicleGroups.length > 0) {
            for (const vehicleGroup of vehicleGroups) {
                const groupData = yield db.select().from(schema_1.group).where((0, drizzle_orm_1.eq)(schema_1.group.id, vehicleGroup.vehicle_group_id));
                if (groupData.length > 0) {
                    data.vehiclegrp.push(groupData[0].group_name);
                }
            }
        }
        // Get user's geofence groups
        const geofenceGroups = yield db.select().from(schema_1.user_geofence_group).where((0, drizzle_orm_1.eq)(schema_1.user_geofence_group.user_id, user[0].id));
        if (geofenceGroups.length > 0) {
            for (const geofenceGroup of geofenceGroups) {
                const groupData = yield db.select().from(schema_1.geofencegroup).where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, geofenceGroup.geofence_group_id));
                if (groupData.length > 0) {
                    data.geofencegrp.push(groupData[0].geo_group);
                }
            }
        }
        const custgrp = yield db.select().from(schema_1.user_customer_group).where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, user[0].id));
        if (custgrp.length > 0) {
            for (const cu of custgrp) {
                if (cu.customer_group_id !== null && cu.customer_group_id !== undefined) {
                    const gp = yield db.select().from(schema_1.customer_group).where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, cu.customer_group_id));
                    if (gp.length > 0) {
                        data.customergrp.push(gp[0].group_name);
                    }
                }
            }
        }
        // // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user[0].id, username: user[0].username, role: roleId }, process.env.JWT_SECRET, { expiresIn: '1d' });
        data.token = token;
        return data;
    }
    catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});
exports.loginUser = loginUser;
const getUserbyUsername = (searchTerm) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield db
            .select()
            .from(schema_1.usersTable)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.usersTable.id, `%${searchTerm}%`), (0, drizzle_orm_1.like)(schema_1.usersTable.name, `%${searchTerm}%`), (0, drizzle_orm_1.like)(schema_1.usersTable.email, `%${searchTerm}%`), (0, drizzle_orm_1.like)(schema_1.usersTable.username, `%${searchTerm}%`), (0, drizzle_orm_1.like)(schema_1.usersTable.phone, `%${searchTerm}%`), (0, drizzle_orm_1.like)(schema_1.usersTable.tag, `%${searchTerm}%`)));
        if (users.length === 0) {
            return;
        }
        const data = [];
        for (const user of users) {
            if (user.active === false) {
                continue;
            }
            const temp = {
                id: user.id,
                name: user.name,
                phone: user.phone,
                username: user.username,
                email: user.email,
                active: user.active,
                roles: "",
                tag: user.tag,
                usertypes: [],
                vehiclegrp: [],
                geofencegrp: [],
                customergrp: [],
            };
            const userRoles = yield db.select().from(schema_1.user_role).where((0, drizzle_orm_1.eq)(schema_1.user_role.user_id, user.id));
            if (userRoles.length > 0 && userRoles[0].role_id !== null && userRoles[0].role_id !== undefined) {
                const roleData = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, userRoles[0].role_id));
                temp.roles = roleData.length > 0 ? roleData[0].role_name : '';
            }
            // const userTags = await db.select().from(user_usertag).where(eq(user_usertag.user_id, user.id));
            // if (userTags.length > 0 && userTags[0].user_tag_id !== null && userTags[0].user_tag_id !== undefined) {
            //   const tagData = await db.select().from(usertag).where(eq(usertag.id, userTags[0].user_tag_id as number));
            //   temp.tag = tagData.length > 0 ? tagData[0].user_tag : '';
            // }
            const userTypes = yield db.select().from(schema_1.user_usertype).where((0, drizzle_orm_1.eq)(schema_1.user_usertype.user_id, user.id));
            if (userTypes.length > 0) {
                for (const userType of userTypes) {
                    const typeData = yield db.select().from(schema_1.usertype).where((0, drizzle_orm_1.eq)(schema_1.usertype.id, userType.user_type_id));
                    if (typeData.length > 0) {
                        temp.usertypes.push(typeData[0].user_type);
                    }
                }
            }
            const vehicleGroups = yield db.select().from(schema_1.user_group).where((0, drizzle_orm_1.eq)(schema_1.user_group.user_id, user.id));
            if (vehicleGroups.length > 0) {
                for (const vehicleGroup of vehicleGroups) {
                    const groupData = yield db.select().from(schema_1.group).where((0, drizzle_orm_1.eq)(schema_1.group.id, vehicleGroup.vehicle_group_id));
                    if (groupData.length > 0) {
                        temp.vehiclegrp.push(groupData[0].group_name);
                    }
                }
            }
            const geofenceGroups = yield db.select().from(schema_1.user_geofence_group).where((0, drizzle_orm_1.eq)(schema_1.user_geofence_group.user_id, user.id));
            if (geofenceGroups.length > 0) {
                for (const geofenceGroup of geofenceGroups) {
                    const groupData = yield db.select().from(schema_1.geofencegroup).where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.id, geofenceGroup.geofence_group_id));
                    if (groupData.length > 0) {
                        temp.geofencegrp.push(groupData[0].geo_group);
                    }
                }
            }
            const custgrp = yield db.select().from(schema_1.user_customer_group).where((0, drizzle_orm_1.eq)(schema_1.user_customer_group.user_id, user.id));
            if (custgrp.length > 0) {
                for (const cu of custgrp) {
                    if (cu.customer_group_id !== null && cu.customer_group_id !== undefined) {
                        const gp = yield db.select().from(schema_1.customer_group).where((0, drizzle_orm_1.eq)(schema_1.customer_group.id, cu.customer_group_id));
                        if (gp.length > 0) {
                            temp.customergrp.push(gp[0].group_name);
                        }
                    }
                }
            }
            data.push(temp);
        }
        return data;
    }
    catch (error) {
        console.log(error);
    }
});
exports.getUserbyUsername = getUserbyUsername;
const changepassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { oldPassword, newPassword, id } = req.body;
        // Find user by ID
        const user = yield db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, parseInt(id)));
        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Compare old password
        const isOldPasswordValid = yield bcrypt_1.default.compare(oldPassword, user[0].password);
        if (!isOldPasswordValid) {
            return res.status(400).json({ message: 'Old password is incorrect' });
        }
        // Hash new password
        const hashedNewPassword = yield bcrypt_1.default.hash(newPassword, 10);
        // Update user's password
        yield db.update(schema_1.usersTable).set({ password: hashedNewPassword }).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, parseInt(id)));
        res.status(200).json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Failed to change password' });
    }
});
exports.changepassword = changepassword;
