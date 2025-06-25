import { drizzle } from "drizzle-orm/mysql2";
import {report, tabs, usertype, vendor, role, role_tabs, role_report, usersTable, user_role, user_usertype} from "../db/schema";
import { eq, or, inArray } from "drizzle-orm";
import { create } from "domain";
import bcrypt from "bcrypt";
const utype=['Driver','Customer','consignee','Consignor','Attendant','Admin'];

const tb=["dashboard","trail","list_map","trip_dashboard","report","schedule_report","alarm","geofence_config","geofence_group","geofence_stats","user_reponsibility","user_access","entities","group","vendors","customer"]

const rp=["Trip wise alarm report",
  "Stops By Day report",
  "Movement report",
  "Fleet Summary report",
  "Trip Summary Report",
  "Geofence Out In report",
  "Geofence In Out report",
  "Drives",
  "Dashboard",
  "Daily Summary",
  "Communication status report",
  "Alarm Log"]

const vendors = [
    'GTROPY',
    'AXESTRACK',
    'FLEETRIDER',
];

const db=drizzle(process.env.DATABASE_URL!);
interface CreateRoleBody {
    role_name: string;
    tabs_access: Array<Record<string, number>>;
    report_access: string[];
}

interface Tab {
    id: number;
    tab_name: string;
}

interface Report {
    id: number;
    report_name: string;
}

interface Role {
    id: number;
    role_name: string;
}

const createRole = async (body: CreateRoleBody): Promise<void> => {
    try {
        const { role_name, tabs_access, report_access } = body;
        const check1: Role[] = await db.select().from(role).where(eq(role.role_name, role_name));
        if (check1.length > 0) {
            return;
        }

        const roleid: { id: number }[] = await db.insert(role).values({
            role_name: role_name
        }).$returningId();
        const q: Role[] = await db.select().from(role).where(eq(role.id, roleid[0].id));
        for (const item of tabs_access) {
            const [key, value]: [string, number] = Object.entries(item)[0];
            const d: Tab[] = await db.select().from(tabs).where(eq(tabs.tab_name, key));
            
            if (d.length > 0) {
                await db.insert(role_tabs).values({
                    role_id: roleid[0].id,
                    tab_id: d[0].id,
                    status: (value > 1 ? true : false),
                });
            }
        }
        for (const item of report_access) {
            const d: Report[] = await db.select().from(report).where(eq(report.report_name, item));
            
            if (d.length > 0) {
                await db.insert(role_report).values({
                    role_id: roleid[0].id,
                    report_id: d[0].id,
                });
            }
        }

        return;
    } catch (error) {
        return;
    }
};


export const createUser = async (body:any) => {
  try {
    const { name, phone, username, email, password, roles, tag, usertypes } = body;


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
        return;
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
      const [roleData, userTypeData] = await Promise.all([
        // Get role ID
        roles ? tx.select().from(role).where(eq(role.role_name, roles)) : Promise.resolve([]),
        
        // Get all user type IDs
        usertypes.length > 0 ? tx.select().from(usertype).where(inArray(usertype.user_type, usertypes)) : Promise.resolve([]),
        
        
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
      };
    });


  } catch (error) {
    console.error("Error creating user:", error);
    
  }
};





export async function insertdumpdata() {
    try{

        //insert role of admin will all user

       await createRole({
            role_name: "Admin",
            tabs_access: [
                { "dashboard": 1 },
                { "trail": 1 },
                { "list_map": 1},
                { "trip_dashboard": 1 },
                { "report": 1 },
                { "schedule_report": 2 },
                { "alarm": 2 },
                { "geofence_config": 2 },
                { "geofence_group": 2 },
                { "geofence_stats": 1 },
                { "user_reponsibility": 2 },
                { "user_access": 2 },
                { "entities": 2 },
                { "group": 2 },
                { "vendors": 2 },
                { "customer": 2 }
            ],
            report_access: [
                "Trip wise alarm report",
                "Stops By Day report",
                "Movement report",
                "Fleet Summary report",
                "Trip Summary Report",
                "Geofence Out In report",
                "Geofence In Out report",
                "Drives",   
                "Dashboard",
                "Daily Summary",
                "Communication status report",
                "Alarm Log"
            ]
        });
        //create user with admin


        for(const ut of utype){
            const d=await db.select().from(usertype).where(eq(usertype.user_type, ut));
            console.log(d);
            if(d.length===0){
                await db.insert(usertype).values({
                    user_type: ut
                });
            }
        }
        for(const ut of tb){
            const d=await db.select().from(tabs).where(eq(tabs.tab_name, ut));
            if(d.length===0){
                await db.insert(tabs).values({
                    tab_name: ut
                });
            }
        }
        for(const ut of rp){
            const d=await db.select().from(report).where(eq(report.report_name, ut));
            if(d.length===0){
                await db.insert(report).values({
                    report_name: ut
                });
            }
        }

        for(const vendorName of vendors){
            const existingVendor = await db.select().from(vendor).where(eq(vendor.name, vendorName));
            if(existingVendor.length === 0){
                await db.insert(vendor).values({
                    name: vendorName
                });
            }
        }
        await createUser({
            name: "Admin",
            phone: "1234567890",
            username: "admin",
            email: `${process.env.DEFAULT_ADMIN_USER}`,
            password: `${process.env.DEFAULT_ADMIN_PASSWORD}`,
            roles: "Admin",
            tag: "Admin",
            usertypes: ["Admin"]
        });
        
        console.log("Dump data inserted successfully");
    }catch (err) {
    
    }
}