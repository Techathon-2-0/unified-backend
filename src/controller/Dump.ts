import { drizzle } from "drizzle-orm/mysql2";
import { geofencegroup, report, tabs, usertype, vendor } from "../db/schema";
import { eq } from "drizzle-orm";
import { debug } from "console";
const utype=['Driver','Customer','consignee','Consignor','Attendant','Admin'];
const utag=['VIP','Priority','Standard','Test'];
const vg=['Inbound March','SAWL_Assembly_Dock','SAWL_Assembly_Additional','SAWL_Body_Dock']
const gg=['Flex3']

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
export async function insertdumpdata() {
    try{
        for(const ut of utype){
            const d=await db.select().from(usertype).where(eq(usertype.user_type, ut));
            console.log(d);
            if(d.length===0){

                await db.insert(usertype).values({
                    user_type: ut
                });
            }
        }
        // for(const ut of vg){
        //     const d=await db.select().from(vehiclegroup).where(eq(vehiclegroup.vehicle_group, ut));
        //     if(d.length===0){
        //         await db.insert(vehiclegroup).values({
        //             vehicle_group: ut
        //         });
        //     }
        // }
        for(const ut of gg){
            const d=await db.select().from(geofencegroup).where(eq(geofencegroup.geo_group, ut));
            if(d.length===0){
                await db.insert(geofencegroup).values({
                    geo_group: ut
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
                console.log(`Added vendor: ${vendorName}`);
            }
        }
        
        console.log("Data inserted successfully");

        return {message: "Data inserted successfully"};
    }catch (err) {
    
    }
}