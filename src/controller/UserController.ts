import { Request, Response } from "express";
import { drizzle } from "drizzle-orm/mysql2";
import {
  usersTable,
  role,
  usertype,
  group as vehiclegroup,
  geofencegroup,
  user_role,
  user_geofence_group,
  user_group as user_vehicle_group,
  user_usertype,
  user_customer_group,
  customer_group,
} from "../db/schema";
import { eq, and, or, sql, like, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import { db } from "../db/connection";

export async function makeuserinactive(existingUser: any,token: string,status?:false) {
      try{
        const response=await axios.put(`${process.env.SSO_URL}/user`,{
          name: existingUser[0].email,
          firstName: existingUser[0].username,
          lastName: existingUser[0].username,
          ou: `${process.env.SSO_OU}`,
          employeeCode: "",
          designation: null,
          contactNumber: "",
          isActive: status
        }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
        return response;
      }catch(error){
        console.error('Error making user inactive:', error);
        return {status: 500, data: { message: 'Failed to make user inactive' }};
      }
}



//working
export const getAllUsers = async () => {
  try {
    const users = await db.select().from(usersTable);
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
        usertypes: [] as string[],
        vehiclegrp: [] as string[],
        geofencegrp: [] as string[],
        customergrp: [] as string[],
      };
      const userRoles = await db
        .select()
        .from(user_role)
        .where(eq(user_role.user_id, user.id));
      if (
        userRoles.length > 0 &&
        userRoles[0].role_id !== null &&
        userRoles[0].role_id !== undefined
      ) {
        const roleData = await db
          .select()
          .from(role)
          .where(eq(role.id, userRoles[0].role_id as number));
        temp.roles = roleData.length > 0 ? roleData[0].role_name : "";
      }
      const userTypes = await db
        .select()
        .from(user_usertype)
        .where(eq(user_usertype.user_id, user.id));
      if (userTypes.length > 0) {
        for (const userType of userTypes) {
          const typeData = await db
            .select()
            .from(usertype)
            .where(eq(usertype.id, userType.user_type_id as number));
          if (typeData.length > 0) {
            temp.usertypes.push(typeData[0].user_type);
          }
        }
      }
      const vehicleGroups = await db
        .select()
        .from(user_vehicle_group)
        .where(eq(user_vehicle_group.user_id, user.id));
      if (vehicleGroups.length > 0) {
        for (const vehicleGroup of vehicleGroups) {
          const groupData = await db
            .select()
            .from(vehiclegroup)
            .where(
              eq(vehiclegroup.id, vehicleGroup.vehicle_group_id as number)
            );
          if (groupData.length > 0) {
            temp.vehiclegrp.push(groupData[0].group_name);
          }
        }
      }
      const geofenceGroups = await db
        .select()
        .from(user_geofence_group)
        .where(eq(user_geofence_group.user_id, user.id));
      if (geofenceGroups.length > 0) {
        for (const geofenceGroup of geofenceGroups) {
          const groupData = await db
            .select()
            .from(geofencegroup)
            .where(
              eq(geofencegroup.id, geofenceGroup.geofence_group_id as number)
            );
          if (groupData.length > 0) {
            temp.geofencegrp.push(groupData[0].geo_group);
          }
        }
      }
      const custgrp = await db
        .select()
        .from(user_customer_group)
        .where(eq(user_customer_group.user_id, user.id));
      if (custgrp.length > 0) {
        for (const cu of custgrp) {
          if (
            cu.customer_group_id !== null &&
            cu.customer_group_id !== undefined
          ) {
            const gp = await db
              .select()
              .from(customer_group)
              .where(eq(customer_group.id, cu.customer_group_id));
            if (gp.length > 0) {
              temp.customergrp.push(gp[0].group_name);
            }
          }
        }
      }
      data.push(temp);
    }
    return data;
  } catch (error) {
    console.error("Error fetching users:", error);
  }
};

// working
export const getUserById = async (req: Request, res: Response) => {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, parseInt(req.params.id)));
    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
      usertypes: [] as string[],
      vehiclegrp: [] as string[],
      geofencegrp: [] as string[],
      customergrp: [] as string[],
    };
    const userRoles = await db
      .select()
      .from(user_role)
      .where(eq(user_role.user_id, user.id));
    if (
      userRoles.length > 0 &&
      userRoles[0].role_id !== null &&
      userRoles[0].role_id !== undefined
    ) {
      const roleData = await db
        .select()
        .from(role)
        .where(eq(role.id, userRoles[0].role_id as number));
      temp.roles = roleData.length > 0 ? roleData[0].role_name : "";
    }
    // const userTags = await db.select().from(user_usertag).where(eq(user_usertag.user_id, user.id));
    // if (userTags.length > 0 && userTags[0].user_tag_id !== null && userTags[0].user_tag_id !== undefined) {
    //   const tagData = await db.select().from(usertag).where(eq(usertag.id, userTags[0].user_tag_id as number));
    //   temp.tag = tagData.length > 0 ? tagData[0].user_tag : '';
    // }
    const userTypes = await db
      .select()
      .from(user_usertype)
      .where(eq(user_usertype.user_id, user.id));
    if (userTypes.length > 0) {
      for (const userType of userTypes) {
        const typeData = await db
          .select()
          .from(usertype)
          .where(eq(usertype.id, userType.user_type_id as number));
        if (typeData.length > 0) {
          temp.usertypes.push(typeData[0].user_type);
        }
      }
    }
    const vehicleGroups = await db
      .select()
      .from(user_vehicle_group)
      .where(eq(user_vehicle_group.user_id, user.id));
    if (vehicleGroups.length > 0) {
      for (const vehicleGroup of vehicleGroups) {
        const groupData = await db
          .select()
          .from(vehiclegroup)
          .where(eq(vehiclegroup.id, vehicleGroup.vehicle_group_id as number));
        if (groupData.length > 0) {
          temp.vehiclegrp.push(groupData[0].group_name);
        }
      }
    }
    const geofenceGroups = await db
      .select()
      .from(user_geofence_group)
      .where(eq(user_geofence_group.user_id, user.id));
    if (geofenceGroups.length > 0) {
      for (const geofenceGroup of geofenceGroups) {
        const groupData = await db
          .select()
          .from(geofencegroup)
          .where(
            eq(geofencegroup.id, geofenceGroup.geofence_group_id as number)
          );
        if (groupData.length > 0) {
          temp.geofencegrp.push(groupData[0].geo_group);
        }
      }
    }
    const custgrp = await db
      .select()
      .from(user_customer_group)
      .where(eq(user_customer_group.user_id, user.id));
    if (custgrp.length > 0) {
      for (const cu of custgrp) {
        if (
          cu.customer_group_id !== null &&
          cu.customer_group_id !== undefined
        ) {
          const gp = await db
            .select()
            .from(customer_group)
            .where(eq(customer_group.id, cu.customer_group_id));
          if (gp.length > 0) {
            temp.customergrp.push(gp[0].group_name);
          }
        }
      }
    }
    return temp;
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

// working
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, phone, username, email, password, roles, tag, usertypes } = req.body;
    const custgrp = req.body.custgrp || [];
    const vehiclegrp = req.body.vehiclegroup || [];
    const geofencegrp = req.body.geofencegroup || [];
    const token = req.headers.authorization?.split(" ")[1] || process.env.SSO_TOKEN;

    // SSO call (keep as is - external API call)
    const response = await axios.post(
      `${process.env.SSO_URL}/createUserAndMapGroups`,
      {
        name: email,
        firstName: username,
        lastName: username,
        ou: `${process.env.SSO_OU}`,
        password: password,
        groups: [`${process.env.SSO_GROUP}`],
        permissions: [
          roles == "admin"
            ? `${process.env.SSO_ADMIN_PERMISSION}`
            : `${process.env.SSO_USER_PERMISSION}`,
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status !== 200) {
      return res.status(500).json({ message: "Failed to create user in SSO" });
    }

    // Optimized database transaction
    const result = await db.transaction(async (tx) => {
      // Check if username or email already exists
      const existingUser = await tx
        .select()
        .from(usersTable)
        .where(
          or(eq(usersTable.username, username), eq(usersTable.email, email))
        );

      if (existingUser.length > 0) {
        let uname = 0;
        let em = 0;
        for (const u of existingUser) {
          if (u.username === username) uname = 1;
          if (u.email === email) em = 1;
        }
        if (uname && em) {
          throw new Error("Username and Email already exists");
        } else if (uname) {
          throw new Error("Username already exists");
        } else if (em) {
          throw new Error("Email already exists");
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = await tx
        .insert(usersTable)
        .values({
          name,
          phone,
          username,
          email,
          password: hashedPassword,
          active: true,
          tag: tag || null,
        })
        .$returningId();

      const userId = newUser[0].id;

      // OPTIMIZED: Batch fetch all required IDs in parallel
      const [roleData, userTypeData, vehicleGroupData, geofenceGroupData, customerGroupData] = await Promise.all([
        // Get role ID
        roles ? tx.select().from(role).where(eq(role.role_name, roles)) : Promise.resolve([]),
        
        // Get all user type IDs
        usertypes.length > 0 ? tx.select().from(usertype).where(inArray(usertype.user_type, usertypes)) : Promise.resolve([]),
        
        // Get all vehicle group IDs
        vehiclegrp.length > 0 ? tx.select().from(vehiclegroup).where(inArray(vehiclegroup.group_name, vehiclegrp)) : Promise.resolve([]),
        
        // Get all geofence group IDs
        geofencegrp.length > 0 ? tx.select().from(geofencegroup).where(inArray(geofencegroup.geo_group, geofencegrp)) : Promise.resolve([]),
        
        // Get all customer group IDs
        custgrp.length > 0 ? tx.select().from(customer_group).where(inArray(customer_group.group_name, custgrp)) : Promise.resolve([])
      ]);

      // OPTIMIZED: Batch insert all relationships
      const insertPromises = [];

      // Insert role
      if (roleData.length > 0) {
        insertPromises.push(
          tx.insert(user_role).values({
            user_id: userId,
            role_id: roleData[0].id,
          })
        );
      }

      // Batch insert user types
      if (userTypeData.length > 0) {
        const userTypeValues = userTypeData.map(type => ({
          user_id: userId,
          user_type_id: type.id,
        }));
        insertPromises.push(tx.insert(user_usertype).values(userTypeValues));
      }

      // Batch insert vehicle groups
      if (vehicleGroupData.length > 0) {
        const vehicleGroupValues = vehicleGroupData.map(group => ({
          user_id: userId,
          vehicle_group_id: group.id,
        }));
        insertPromises.push(tx.insert(user_vehicle_group).values(vehicleGroupValues));
      }

      // Batch insert geofence groups
      if (geofenceGroupData.length > 0) {
        const geofenceGroupValues = geofenceGroupData.map(group => ({
          user_id: userId,
          geofence_group_id: group.id,
        }));
        insertPromises.push(tx.insert(user_geofence_group).values(geofenceGroupValues));
      }

      // Batch insert customer groups
      if (customerGroupData.length > 0) {
        const customerGroupValues = customerGroupData.map(group => ({
          user_id: userId,
          customer_group_id: group.id,
        }));
        insertPromises.push(tx.insert(user_customer_group).values(customerGroupValues));
      }

      // Execute all inserts in parallel
      await Promise.all(insertPromises);

      return {
        userId,
        name,
        phone,
        username,
        email,
        roles,
        tag,
        usertypes,
        vehiclegrp,
        geofencegrp,
        custgrp,
      };
    });

    res.status(201).json({
      message: "User created successfully",
      data: result, // Changed from 'user: result' to 'data: result' to match your API response pattern
    });

  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ 
      message: "Failed to create user", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

//working
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, username, email, roles, tag, usertypes, active } =
      req.body;
    const vehiclegrp = req.body.vehiclegroup || [];
    const geofencegrp = req.body.geofencegroup || [];
    const custgrp = req.body.custgrp || [];
    // Check if username or email already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, parseInt(id)));
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

     const ssoResponse = await makeuserinactive(existingUser,req.headers.authorization?.split(' ')[1]||"",active);
     
      if(ssoResponse.status !== 200) {
        console.error('Error making user inactive in SSO:', ssoResponse.data);
        return {};
      }

    await db
      .update(usersTable)
      .set({
        name,
        phone,
        username,
        email,
        active: active,
        tag: tag || null, // Default to null if not provided
      })
      .where(eq(usersTable.id, parseInt(id)));

    await db.delete(user_role).where(eq(user_role.user_id, parseInt(id)));
    // await db.delete(user_usertag).where(eq(user_usertag.user_id, parseInt(id)));
    await db
      .delete(user_usertype)
      .where(eq(user_usertype.user_id, parseInt(id)));
    await db
      .delete(user_vehicle_group)
      .where(eq(user_vehicle_group.user_id, parseInt(id)));
    await db
      .delete(user_geofence_group)
      .where(eq(user_geofence_group.user_id, parseInt(id)));
    await db
      .delete(user_customer_group)
      .where(eq(user_customer_group.user_id, parseInt(id)));

    const q = await db.select().from(role).where(eq(role.role_name, roles));
    if (q.length > 0) {
      await db.insert(user_role).values({
        user_id: parseInt(id),
        role_id: q[0].id,
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
      const d = await db
        .select()
        .from(usertype)
        .where(eq(usertype.user_type, u));
      if (d.length > 0) {
        await db.insert(user_usertype).values({
          user_id: parseInt(id),
          user_type_id: d[0].id,
        });
      }
    }

    for (const v of vehiclegrp) {
      const d = await db
        .select()
        .from(vehiclegroup)
        .where(eq(vehiclegroup.group_name, v));
      if (d.length > 0) {
        await db.insert(user_vehicle_group).values({
          user_id: parseInt(id),
          vehicle_group_id: d[0].id,
        });
      }
    }

    for (const g of geofencegrp) {
      const d = await db
        .select()
        .from(geofencegroup)
        .where(eq(geofencegroup.geo_group, g));

      if (d.length > 0) {
        await db.insert(user_geofence_group).values({
          user_id: parseInt(id),
          geofence_group_id: d[0].id,
        });
      }
    }
    for (const g of custgrp) {
      const d = await db
        .select()
        .from(customer_group)
        .where(eq(customer_group.group_name, g));
      if (d.length > 0) {
        await db.insert(user_customer_group).values({
          user_id: parseInt(id),
          customer_group_id: d[0].id,
        });
      }
    }
    return {
      name,
      phone,
      username,
      email,
      roles,
      tag,
      usertypes,
      vehiclegrp,
      geofencegrp,
      custgrp,
    };
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
};

// working
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token =
      req.headers.authorization?.split(" ")[1] || process.env.SSO_TOKEN;
    // Check if user exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, parseInt(id)));
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
   const response =await makeuserinactive(existingUser,req.headers.authorization?.split(' ')[1]||"");

    console.log(response);
    if (response.status !== 200) {
      console.error("Error deleting user in SSO:", response.data);
      return res.status(500).json({ message: "Failed to delete user in SSO" });
    }

    await db.delete(user_role).where(eq(user_role.user_id, parseInt(id)));
    await db
      .delete(user_usertype)
      .where(eq(user_usertype.user_id, parseInt(id)));
    await db
      .delete(user_vehicle_group)
      .where(eq(user_vehicle_group.user_id, parseInt(id)));
    await db
      .delete(user_geofence_group)
      .where(eq(user_geofence_group.user_id, parseInt(id)));
    await db
      .delete(user_customer_group)
      .where(eq(user_customer_group.user_id, parseInt(id)));

    // Delete the user
    await db.delete(usersTable).where(eq(usersTable.id, parseInt(id)));

    return 1;
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
    return 0;
  }
};

// working
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, username),
          eq(usersTable.email, username) // Allow login with email as well
        )
      );

    if (user.length === 0) {
      return 0;
    }
    if (user[0].active === false) {
      return 10;
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user[0].password);

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
      usertypes: [] as string[],
      vehiclegrp: [] as string[],
      geofencegrp: [] as string[],
      customergrp: [] as string[],
    };
    // Get user's role
    const userRole = await db
      .select()
      .from(user_role)
      .where(eq(user_role.user_id, user[0].id));
    const roleId = userRole.length > 0 ? userRole[0].role_id : null;

    if (roleId) {
      const roleData = await db.select().from(role).where(eq(role.id, roleId));
      data.roles = roleData.length > 0 ? roleData[0].role_name : "";
    }

    // Get user's tag
    // const userTag = await db.select().from(user_usertag).where(eq(user_usertag.user_id, user[0].id));
    // if (userTag.length > 0 && userTag[0].user_tag_id !== null && userTag[0].user_tag_id !== undefined) {
    //   const tagData = await db.select().from(usertag).where(eq(usertag.id, userTag[0].user_tag_id as number));
    //   data.tag = tagData.length > 0 ? tagData[0].user_tag : '';
    // }
    // Get user's usertypes
    const userTypes = await db
      .select()
      .from(user_usertype)
      .where(eq(user_usertype.user_id, user[0].id));
    if (userTypes.length > 0) {
      for (const userType of userTypes) {
        const typeData = await db
          .select()
          .from(usertype)
          .where(eq(usertype.id, userType.user_type_id as number));
        if (typeData.length > 0) {
          data.usertypes.push(typeData[0].user_type);
        }
      }
    }
    // Get user's vehicle groups
    const vehicleGroups = await db
      .select()
      .from(user_vehicle_group)
      .where(eq(user_vehicle_group.user_id, user[0].id));
    if (vehicleGroups.length > 0) {
      for (const vehicleGroup of vehicleGroups) {
        const groupData = await db
          .select()
          .from(vehiclegroup)
          .where(eq(vehiclegroup.id, vehicleGroup.vehicle_group_id as number));
        if (groupData.length > 0) {
          data.vehiclegrp.push(groupData[0].group_name);
        }
      }
    }
    // Get user's geofence groups
    const geofenceGroups = await db
      .select()
      .from(user_geofence_group)
      .where(eq(user_geofence_group.user_id, user[0].id));
    if (geofenceGroups.length > 0) {
      for (const geofenceGroup of geofenceGroups) {
        const groupData = await db
          .select()
          .from(geofencegroup)
          .where(
            eq(geofencegroup.id, geofenceGroup.geofence_group_id as number)
          );
        if (groupData.length > 0) {
          data.geofencegrp.push(groupData[0].geo_group);
        }
      }
    }
    const custgrp = await db
      .select()
      .from(user_customer_group)
      .where(eq(user_customer_group.user_id, user[0].id));
    if (custgrp.length > 0) {
      for (const cu of custgrp) {
        if (
          cu.customer_group_id !== null &&
          cu.customer_group_id !== undefined
        ) {
          const gp = await db
            .select()
            .from(customer_group)
            .where(eq(customer_group.id, cu.customer_group_id));
          if (gp.length > 0) {
            data.customergrp.push(gp[0].group_name);
          }
        }
      }
    }

    // // Generate JWT token
    const token = jwt.sign(
      { id: user[0].id, username: user[0].username, role: roleId },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    data.token = token;
    return data;
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

export const getUserbyUsername = async (searchTerm: string) => {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(
        or(
          like(usersTable.id, `%${searchTerm}%`),
          like(usersTable.name, `%${searchTerm}%`),
          like(usersTable.email, `%${searchTerm}%`),
          like(usersTable.username, `%${searchTerm}%`),
          like(usersTable.phone, `%${searchTerm}%`),
          like(usersTable.tag, `%${searchTerm}%`)
        )
      );

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
        usertypes: [] as string[],
        vehiclegrp: [] as string[],
        geofencegrp: [] as string[],
        customergrp: [] as string[],
      };
      const userRoles = await db
        .select()
        .from(user_role)
        .where(eq(user_role.user_id, user.id));
      if (
        userRoles.length > 0 &&
        userRoles[0].role_id !== null &&
        userRoles[0].role_id !== undefined
      ) {
        const roleData = await db
          .select()
          .from(role)
          .where(eq(role.id, userRoles[0].role_id as number));
        temp.roles = roleData.length > 0 ? roleData[0].role_name : "";
      }
      // const userTags = await db.select().from(user_usertag).where(eq(user_usertag.user_id, user.id));
      // if (userTags.length > 0 && userTags[0].user_tag_id !== null && userTags[0].user_tag_id !== undefined) {
      //   const tagData = await db.select().from(usertag).where(eq(usertag.id, userTags[0].user_tag_id as number));
      //   temp.tag = tagData.length > 0 ? tagData[0].user_tag : '';
      // }
      const userTypes = await db
        .select()
        .from(user_usertype)
        .where(eq(user_usertype.user_id, user.id));
      if (userTypes.length > 0) {
        for (const userType of userTypes) {
          const typeData = await db
            .select()
            .from(usertype)
            .where(eq(usertype.id, userType.user_type_id as number));
          if (typeData.length > 0) {
            temp.usertypes.push(typeData[0].user_type);
          }
        }
      }
      const vehicleGroups = await db
        .select()
        .from(user_vehicle_group)
        .where(eq(user_vehicle_group.user_id, user.id));
      if (vehicleGroups.length > 0) {
        for (const vehicleGroup of vehicleGroups) {
          const groupData = await db
            .select()
            .from(vehiclegroup)
            .where(
              eq(vehiclegroup.id, vehicleGroup.vehicle_group_id as number)
            );
          if (groupData.length > 0) {
            temp.vehiclegrp.push(groupData[0].group_name);
          }
        }
      }
      const geofenceGroups = await db
        .select()
        .from(user_geofence_group)
        .where(eq(user_geofence_group.user_id, user.id));
      if (geofenceGroups.length > 0) {
        for (const geofenceGroup of geofenceGroups) {
          const groupData = await db
            .select()
            .from(geofencegroup)
            .where(
              eq(geofencegroup.id, geofenceGroup.geofence_group_id as number)
            );
          if (groupData.length > 0) {
            temp.geofencegrp.push(groupData[0].geo_group);
          }
        }
      }
      const custgrp = await db
        .select()
        .from(user_customer_group)
        .where(eq(user_customer_group.user_id, user.id));
      if (custgrp.length > 0) {
        for (const cu of custgrp) {
          if (
            cu.customer_group_id !== null &&
            cu.customer_group_id !== undefined
          ) {
            const gp = await db
              .select()
              .from(customer_group)
              .where(eq(customer_group.id, cu.customer_group_id));
            if (gp.length > 0) {
              temp.customergrp.push(gp[0].group_name);
            }
          }
        }
      }
      data.push(temp);
    }
    return data;
  } catch (error) {
    console.log(error);
  }
};

export async function logoutUser(req: Request, res: Response) {
  try {
    console.log("logout called");
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1]; // Expecting
    // 'Bearer <token>'
    console.log("logout token", token);
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    console.log();

    await axios.delete(`${process.env.SSO_URL}/oauth/revoke/${token}`);

    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Logout failed" });
  }
}
