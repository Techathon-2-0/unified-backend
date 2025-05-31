import { Request, Response } from 'express';
import { drizzle } from "drizzle-orm/mysql2";
import { usersTable, role, usertype, vehiclegroup, geofencegroup, usertag, user_role, user_geofence_group, user_vehicle_group, user_usertype, user_usertag } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// import { db } from '../db/connection';
// const db = drizzle(process.env.DATABASE_URL!);
const db = drizzle(process.env.DATABASE_URL!);
//working
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await db.select().from(usersTable);
    const data=[];
    for(const user of users){
      const temp={
        id: user.id,
        name: user.name,
        phone: user.phone,
        username: user.username,
        email: user.email,
        active: user.active,
        roles:"",
        tag: "",
        usertypes: [] as string[],
        vehiclegrp: [] as string[],
        geofencegrp: [] as string[]
      }
      const userRoles = await db.select().from(user_role).where(eq(user_role.user_id, user.id));
      if (userRoles.length > 0 && userRoles[0].role_id !== null && userRoles[0].role_id !== undefined) {
        const roleData = await db.select().from(role).where(eq(role.id, userRoles[0].role_id as number));
        temp.roles = roleData.length > 0 ? roleData[0].role_name : '';
      }
      const userTags = await db.select().from(user_usertag).where(eq(user_usertag.user_id, user.id));
      if (userTags.length > 0 && userTags[0].user_tag_id !== null && userTags[0].user_tag_id !== undefined) {
        const tagData = await db.select().from(usertag).where(eq(usertag.id, userTags[0].user_tag_id as number));
        temp.tag = tagData.length > 0 ? tagData[0].user_tag : '';
      }
      const userTypes = await db.select().from(user_usertype).where(eq(user_usertype.user_id, user.id));
      if (userTypes.length > 0) {
        for (const userType of userTypes) {
          const typeData = await db.select().from(usertype).where(eq(usertype.id, userType.user_type_id as number));
          if (typeData.length > 0) {
            temp.usertypes.push(typeData[0].user_type);
          }
        }
      }
      const vehicleGroups = await db.select().from(user_vehicle_group).where(eq(user_vehicle_group.user_id, user.id));
      if (vehicleGroups.length > 0) {
        for (const vehicleGroup of vehicleGroups) {
          const groupData = await db.select().from(vehiclegroup).where(eq(vehiclegroup.id, vehicleGroup.vehicle_group_id as number));
          if (groupData.length > 0) {
            temp.vehiclegrp.push(groupData[0].vehicle_group);
          }
        }
      }
      const geofenceGroups = await db.select().from(user_geofence_group).where(eq(user_geofence_group.user_id, user.id));
      if (geofenceGroups.length > 0) {
        for (const geofenceGroup of geofenceGroups) {
          const groupData = await db.select().from(geofencegroup).where(eq(geofencegroup.id, geofenceGroup.geofence_group_id as number));
          if (groupData.length > 0) {
            temp.geofencegrp.push(groupData[0].geo_group);
          }
        }
      }
      data.push(temp);
    }
    return data;
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// working
export const getUserById = async (req: Request, res: Response) => {
  try {
   const users = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id)));
   const user = users[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
   const temp={
      id: user.id,
      name: user.name,
      phone: user.phone,
      username: user.username,
      email: user.email,
      active: user.active,
      roles:"",
      tag: "",
      usertypes: [] as string[],
      vehiclegrp: [] as string[],
      geofencegrp: [] as string[]
    }
    const userRoles = await db.select().from(user_role).where(eq(user_role.user_id, user.id));
    if (userRoles.length > 0 && userRoles[0].role_id !== null && userRoles[0].role_id !== undefined) {
      const roleData = await db.select().from(role).where(eq(role.id, userRoles[0].role_id as number));
      temp.roles = roleData.length > 0 ? roleData[0].role_name : '';
    }
    const userTags = await db.select().from(user_usertag).where(eq(user_usertag.user_id, user.id));
    if (userTags.length > 0 && userTags[0].user_tag_id !== null && userTags[0].user_tag_id !== undefined) {
      const tagData = await db.select().from(usertag).where(eq(usertag.id, userTags[0].user_tag_id as number));
      temp.tag = tagData.length > 0 ? tagData[0].user_tag : '';
    }
    const userTypes = await db.select().from(user_usertype).where(eq(user_usertype.user_id, user.id));
    if (userTypes.length > 0) {
    for (const userType of userTypes) {
        const typeData = await db.select().from(usertype).where(eq(usertype.id, userType.user_type_id as number));
        if (typeData.length > 0) {
          temp.usertypes.push(typeData[0].user_type);
        }
      }
    }
    const vehicleGroups = await db.select().from(user_vehicle_group).where(eq(user_vehicle_group.user_id, user.id));
    if (vehicleGroups.length > 0) {
      for (const vehicleGroup of vehicleGroups) {
        const groupData = await db.select().from(vehiclegroup).where(eq(vehiclegroup.id, vehicleGroup.vehicle_group_id as number));
        if (groupData.length > 0) {
          temp.vehiclegrp.push(groupData[0].vehicle_group);
        }
      }
    }
    const geofenceGroups = await db.select().from(user_geofence_group).where(eq(user_geofence_group.user_id, user.id));
    if (geofenceGroups.length > 0) {
      for (const geofenceGroup of geofenceGroups) {
          const groupData = await db.select().from(geofencegroup).where(eq(geofencegroup.id, geofenceGroup.geofence_group_id as number));
          if (groupData.length > 0) {
            temp.geofencegrp.push(groupData[0].geo_group);
          }
        }
      }
    return temp;
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

// working
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, phone, username, email, password, roles,tag,usertypes} = req.body;
    const vehiclegrp = req.body.vehiclegroup || [];
    const geofencegrp = req.body.geofencegroup || [];
    // console.log('Creating user with data:', req.body);
    // res.status(201).json({
      // message: 'User created successfully'});
    // Check if username or email already exists
    const existingUser = await db.select().from(usersTable).where(
      or(
        eq(usersTable.username, username),
        eq(usersTable.email, email)
      )
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    
    // // Hash password
    const hashedPassword = await bcrypt.hash(password,10);
    
    // // Create new user
    const newUser = await db.insert(usersTable).values({
      name,
      phone,
      username,
      email,
      password: hashedPassword,
      active: true, // Default to active
    }).$returningId();
    
    const userId = newUser[0].id;
    const q=await db.select().from(role).where(eq(role.role_name, roles));
      if(q.length > 0){
        await db.insert(user_role).values({
          user_id: userId,
          role_id: q[0].id
        });
    }
    const dd=await db.select().from(usertag).where(eq(usertag.user_tag, tag));
      if(dd.length > 0){
        await db.insert(user_usertag).values({
          user_id: userId,
          user_tag_id: dd[0].id
        });
      }
    for(const u of usertypes){
      const d=await db.select().from(usertype).where(eq(usertype.user_type, u));
      if(d.length > 0){
        await db.insert(user_usertype).values({
          user_id: userId,
          user_type_id: d[0].id
        });
      }
    }

    for(const v of vehiclegrp){
      const d=await db.select().from(vehiclegroup).where(eq(vehiclegroup.vehicle_group, v));
      if(d.length > 0){
        await db.insert(user_vehicle_group).values({
          user_id: userId,
          vehicle_group_id: d[0].id
        });
      }
    }

    for(const g of geofencegrp){
      const d=await db.select().from(geofencegroup).where(eq(geofencegroup.geo_group, g));

      if(d.length > 0){
        await db.insert(user_geofence_group).values({
          user_id: userId,
          geofence_group_id: d[0].id
        });
      }
    }

    return {userId,name, phone, username, email, roles, tag, usertypes, vehiclegrp, geofencegrp};
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

//working
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, username, email, roles,tag,usertypes,active} = req.body;
    const vehiclegrp = req.body.vehiclegroup || [];
    const geofencegrp = req.body.geofencegroup || [];
    // console.log('Creating user with data:', req.body);
    // res.status(201).json({
      // message: 'User created successfully'});
    // Check if username or email already exists
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(id)))
    if( existingUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    await db.update(usersTable).set({
      name,
      phone,
      username,
      email,
      active:active
    }).where(eq(usersTable.id, parseInt(id)));

    await db.delete(user_role).where(eq(user_role.user_id, parseInt(id)));
    await db.delete(user_usertag).where(eq(user_usertag.user_id, parseInt(id)));
    await db.delete(user_usertype).where(eq(user_usertype.user_id, parseInt(id)));
    await db.delete(user_vehicle_group).where(eq(user_vehicle_group.user_id, parseInt(id)));
    await db.delete(user_geofence_group).where(eq(user_geofence_group.user_id, parseInt(id)));

    const q=await db.select().from(role).where(eq(role.role_name, roles));
      if(q.length > 0){
        await db.insert(user_role).values({
          user_id: parseInt(id),
          role_id: q[0].id
        });
    }
    const dd=await db.select().from(usertag).where(eq(usertag.user_tag, tag));
      if(dd.length > 0){
        await db.insert(user_usertag).values({
          user_id: parseInt(id),
          user_tag_id: dd[0].id
        });
      }
    for(const u of usertypes){
      const d=await db.select().from(usertype).where(eq(usertype.user_type, u));
      if(d.length > 0){
        await db.insert(user_usertype).values({
          user_id: parseInt(id),
          user_type_id: d[0].id
        });
      }
    }

    for(const v of vehiclegrp){
      const d=await db.select().from(vehiclegroup).where(eq(vehiclegroup.vehicle_group, v));
      if(d.length > 0){
        await db.insert(user_vehicle_group).values({
          user_id: parseInt(id),
          vehicle_group_id: d[0].id
        });
      }
    }

    for(const g of geofencegrp){
      const d=await db.select().from(geofencegroup).where(eq(geofencegroup.geo_group, g));

      if(d.length > 0){
        await db.insert(user_geofence_group).values({
          user_id: parseInt(id),
          geofence_group_id: d[0].id
        });
      }
    }

    return {name, phone, username, email, roles, tag, usertypes, vehiclegrp, geofencegrp};
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// working
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // console.log('Creating user with data:', req.body);
    // res.status(201).json({
      // message: 'User created successfully'});
    // Check if username or email already exists
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(id)))
    if( existingUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }   

    await db.delete(user_role).where(eq(user_role.user_id, parseInt(id)));
    await db.delete(user_usertag).where(eq(user_usertag.user_id, parseInt(id)));
    await db.delete(user_usertype).where(eq(user_usertype.user_id, parseInt(id)));
    await db.delete(user_vehicle_group).where(eq(user_vehicle_group.user_id, parseInt(id)));
    await db.delete(user_geofence_group).where(eq(user_geofence_group.user_id, parseInt(id)));
    await db.delete(usersTable).where(eq(usersTable.id, parseInt(id)));
    return 1;
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// working
export const loginUser = async (req :Request,res:Response) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username
    const user = await db.select().from(usersTable).where(
      or(
        eq(usersTable.username, username),
        eq(usersTable.email, username) // Allow login with email as well
      )  
    );
    
    if (user.length === 0) {
      return 0
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user[0].password);
    
    if (!isPasswordValid) {
      return 0
    }
    // return 1;
    const data={
      id: user[0].id,
      name: user[0].name,
      token:"",
      username: user[0].username,
      email: user[0].email,
      active: user[0].active,
      roles: "",
      tag: "",
      usertypes: [] as string[],
      vehiclegrp: [] as string[],
      geofencegrp: [] as string[]
    };
    // Get user's role
    const userRole = await db.select().from(user_role).where(eq(user_role.user_id, user[0].id));
    const roleId = userRole.length > 0 ? userRole[0].role_id : null;
    
    if (roleId) {
      const roleData = await db.select().from(role).where(eq(role.id, roleId));
      data.roles = roleData.length > 0 ? roleData[0].role_name : '';
    }

    // Get user's tag
    const userTag = await db.select().from(user_usertag).where(eq(user_usertag.user_id, user[0].id));
    if (userTag.length > 0 && userTag[0].user_tag_id !== null && userTag[0].user_tag_id !== undefined) {
      const tagData = await db.select().from(usertag).where(eq(usertag.id, userTag[0].user_tag_id as number));
      data.tag = tagData.length > 0 ? tagData[0].user_tag : '';
    }
    // Get user's usertypes
    const userTypes = await db.select().from(user_usertype).where(eq(user_usertype.user_id, user[0].id));
    if (userTypes.length > 0) {
      for (const userType of userTypes) {
        const typeData = await db.select().from(usertype).where(eq(usertype.id, userType.user_type_id as number));
        if (typeData.length > 0) {
          data.usertypes.push(typeData[0].user_type);
        }
      }
    }
    // Get user's vehicle groups
    const vehicleGroups = await db.select().from(user_vehicle_group).where(eq(user_vehicle_group.user_id, user[0].id));
    if (vehicleGroups.length > 0) {
      for (const vehicleGroup of vehicleGroups) {
        const groupData = await db.select().from(vehiclegroup).where(eq(vehiclegroup.id, vehicleGroup.vehicle_group_id as number));
        if (groupData.length > 0) {
          data.vehiclegrp.push(groupData[0].vehicle_group);
        }
      }
    }
    // Get user's geofence groups
    const geofenceGroups = await db.select().from(user_geofence_group).where(eq(user_geofence_group.user_id, user[0].id));
    if (geofenceGroups.length > 0) {
      for (const geofenceGroup of geofenceGroups) {
        const groupData = await db.select().from(geofencegroup).where(eq(geofencegroup.id, geofenceGroup.geofence_group_id as number));
        if (groupData.length > 0) {
          data.geofencegrp.push(groupData[0].geo_group);
        }
      }
    }

    // // Generate JWT token
    const token = jwt.sign(
      { id: user[0].id, username: user[0].username, role: roleId },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
    
    data.token=token;
    return data;
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};


