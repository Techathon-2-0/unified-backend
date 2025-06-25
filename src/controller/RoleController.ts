import { Request, Response } from 'express';
import { drizzle } from "drizzle-orm/mysql2";
import { report, role, role_report, role_tabs, tabs } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL!);

//working
export async function getAllRoles(){
  try {

    const roles = await db.select().from(role);

    const data=[];
    for (const r of roles) {

      const rawdata={
      id: r.id,
      role_name: r.role_name,
      created_at: r.created_at,
      updated_at: r.updated_at,
      tabs_access: [] as { [key: string]: number }[],
      report_access: [] as string[]
    }
       const d=await db.select().from(role_tabs).where(eq(role_tabs.role_id, r.id));
      //  const tabsAccess = {};

      for(const item of d){
        console.log(item);
        if (item.tab_id !== null && item.tab_id !== undefined) {
          const tabData = await db.select().from(tabs).where(eq(tabs.id, item.tab_id));
          console.log(tabData);
         rawdata.tabs_access.push({
            [tabData[0].tab_name]: (item.status ? 2 : 1)
          });
        }
      }

      const dd=await db.select().from(role_report).where(eq(role_report.role_id, r.id));

      for(const item of dd){
        if (item.report_id !== null && item.report_id !== undefined) {
          const reportData = await db.select().from(report).where(eq(report.id, item.report_id));
          if (reportData.length > 0) {
            rawdata.report_access.push(reportData[0].report_name);
          }
        }
      }    
      // console.log(rawdata);
      data.push(rawdata);   
    }
    // console.log(data);
    return data;
  } catch (error) {
    console.error('Error fetching roles:', error);

  }
};

//working
export const getRoleById = async (req: Request, res: Response) => {
  try {

    const roles = await db.select().from(role).where(eq(role.id, Number(req.params.id)));
    // console.log(roles);
    const data:any=[];
    for (const r of roles) {
      console.log(r);
      const rawdata={
      id: roles[0].id,
      role_name: roles[0].role_name,
      created_at: roles[0].created_at,
      updated_at: roles[0].updated_at,
      tabs_access: [] as { [key: string]: number }[],
      report_access: [] as string[]
    }
       const d=await db.select().from(role_tabs).where(eq(role_tabs.role_id, r.id));
      //  const tabsAccess = {};

       console.log("enter");

      for(const item of d){
        console.log(item);
        if (item.tab_id !== null && item.tab_id !== undefined) {
          const tabData = await db.select().from(tabs).where(eq(tabs.id, item.tab_id));
          // console.log(tabData);
         rawdata.tabs_access.push({
            [tabData[0].tab_name]: (item.status ? 2 : 1)
          });
        }
      }

      const dd=await db.select().from(role_report).where(eq(role_report.role_id, r.id));

      for(const item of dd){
        if (item.report_id !== null && item.report_id !== undefined) {
          const reportData = await db.select().from(report).where(eq(report.id, item.report_id));
          if (reportData.length > 0) {
            rawdata.report_access.push(reportData[0].report_name);
          }
        }
      }    
      data.push(rawdata);   
    }
    // console.log(data);
    res.json({ message: 'Role fetched successfully', data });
  } catch (error) {
    // console.error('Error fetching roles:', error);

  }
};

//working
export const createRole = async (req: Request, res: Response) => {
  try {
    const { role_name,tabs_access,report_access} = req.body;

    const check1=await db.select().from(role).where(eq(role.role_name, role_name));
    if (check1.length > 0) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const roleid = await db.insert(role).values({
      role_name: role_name
    }).$returningId();
    const q = await db.select().from(role).where(eq(role.id, roleid[0].id));
    for (const item of tabs_access) {
      const [key, value]:any = Object.entries(item)[0];
      const d = await db.select().from(tabs).where(eq(tabs.tab_name, key));
      
      if (d.length > 0) { // always good to check!
        await db.insert(role_tabs).values({
          role_id: roleid[0].id,
          tab_id: d[0].id,
          status: (value>1?true:false),
        });
      } else {
        // console.warn(`No tab found for key: ${key}`);
      }
    }
    for (const item of report_access) {
      const d = await db.select().from(report).where(eq(report.report_name, item));
      
      if (d.length > 0) { 
        await db.insert(role_report).values({
          role_id: roleid[0].id,
          report_id: d[0].id,
        });
      }
    }

    res.json({ message: 'Role created successfully', role_name,created_at:q[0].created_at, updated_at: q[0].updated_at,tabs_access, report_access });
    // res.status(201).json({ id: newRole[0], role_name });
  } catch (error) {
    // console.error('Error creating role:', error);
    res.status(500).json({ message: 'Failed to create role' });
  }
};

//working
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id, role_name, tabs_access, report_access } = req.body;
    // Check if the role exists
    const existingRole = await db.select().from(role).where(eq(role.id, id));
    if (existingRole.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Update the role name
    await db.update(role).set({ role_name:role_name, updated_at: sql`NOW()` }).where(eq(role.id, id));
     const q = await db.select().from(role).where(eq(role.id, id));
    // Clear existing tabs and reports for the role
    await db.delete(role_tabs).where(eq(role_tabs.role_id, id));
    await db.delete(role_report).where(eq(role_report.role_id, id));

    // Insert new tabs access
    let is=false;
    for (const item of tabs_access) {
      const [key, value]: any = Object.entries(item)[0];
      const tabData = await db.select().from(tabs).where(eq(tabs.tab_name, key));
      if (tabData.length > 0) {
        await db.insert(role_tabs).values({
          role_id: id,
          tab_id: tabData[0].id,
          status: (value > 1 ? true : false),
        });
      }
    }

    // Insert new report access
    if(report_access && report_access.length > 0) {
      for (const item of report_access) {
        const reportData = await db.select().from(report).where(eq(report.report_name, item));
        
        if (reportData.length > 0) {
          await db.insert(role_report).values({
            role_id: id,
            report_id: reportData[0].id,
          });
        }
      }
    }
    console.log("Role updated successfully:");
    res.json({ message: 'Role updated successfully',id, role_name, created_at: existingRole[0].created_at, updated_at: q[0].updated_at,tabs_access, report_access });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Failed to update role' });
  }
}

//working
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if the role exists
    const existingRole = await db.select().from(role).where(eq(role.id, Number(id)));
    if (existingRole.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    await db.delete(role_tabs).where(eq(role_tabs.role_id, Number(id)));
    await db.delete(role_report).where(eq(role_report.role_id, Number(id)));
    // Delete the role
    await db.delete(role).where(eq(role.id, Number(id)));

    // Optionally, delete associated tabs and reports


    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    // console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Failed to delete role' });
  }
}

import { user_role } from '../db/schema';

// Get roles by user ID
export const getRolesByUserId = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    // Adjust the join below to match your schema
    // Example assumes a user_role table with user_id and role_id
    const userRoles = await db.select().from(role)
      .innerJoin(user_role, eq(role.id, user_role.role_id))
      .where(eq(user_role.user_id, userId));

    const data = [];
    for (const ur of userRoles) {
      const r = ur.role;
      const rawdata = {
        id: r.id,
        role_name: r.role_name,
        created_at: r.created_at,
        updated_at: r.updated_at,
        tabs_access: [] as { [key: string]: number }[],
        report_access: [] as string[]
      };
      const d = await db.select().from(role_tabs).where(eq(role_tabs.role_id, r.id));
      for (const item of d) {
        if (item.tab_id !== null && item.tab_id !== undefined) {
          const tabData = await db.select().from(tabs).where(eq(tabs.id, item.tab_id));
          rawdata.tabs_access.push({
            [tabData[0].tab_name]: (item.status ? 2 : 1)
          });
        }
      }
      const dd = await db.select().from(role_report).where(eq(role_report.role_id, r.id));
      for (const item of dd) {
        if (item.report_id !== null && item.report_id !== undefined) {
          const reportData = await db.select().from(report).where(eq(report.id, item.report_id));
          if (reportData.length > 0) {
            rawdata.report_access.push(reportData[0].report_name);
          }
        }
      }
      data.push(rawdata);
    }
    res.status(200).json({ message: 'Roles fetched successfully', roles: data });
  } catch (error) {
    console.error('Error fetching roles by user ID:', error);
    res.status(500).json({ message: 'Failed to fetch roles by user ID' });
  }
};

