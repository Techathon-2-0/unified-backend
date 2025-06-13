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
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertdumpdata = insertdumpdata;
const mysql2_1 = require("drizzle-orm/mysql2");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const utype = ['Driver', 'Customer', 'consignee', 'Consignor', 'Attendant', 'Admin'];
const utag = ['VIP', 'Priority', 'Standard', 'Test'];
const vg = ['Inbound March', 'SAWL_Assembly_Dock', 'SAWL_Assembly_Additional', 'SAWL_Body_Dock'];
const gg = ['Flex3'];
const tb = ["dashboard", "trail", "list_map", "trip_dashboard", "report", "schedule_report", "alarm", "geofence_config", "geofence_group", "geofence_stats", "user_reponsibility", "user_access", "entities", "group", "vendors", "customer"];
const rp = ["Trip wise alarm report",
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
    "Alarm Log"];
const vendors = [
    'GTROPY',
    'AXESTRACK',
    'FLEETRIDER',
];
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
function insertdumpdata() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            for (const ut of utype) {
                const d = yield db.select().from(schema_1.usertype).where((0, drizzle_orm_1.eq)(schema_1.usertype.user_type, ut));
                console.log(d);
                if (d.length === 0) {
                    yield db.insert(schema_1.usertype).values({
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
            for (const ut of gg) {
                const d = yield db.select().from(schema_1.geofencegroup).where((0, drizzle_orm_1.eq)(schema_1.geofencegroup.geo_group, ut));
                if (d.length === 0) {
                    yield db.insert(schema_1.geofencegroup).values({
                        geo_group: ut
                    });
                }
            }
            for (const ut of tb) {
                const d = yield db.select().from(schema_1.tabs).where((0, drizzle_orm_1.eq)(schema_1.tabs.tab_name, ut));
                if (d.length === 0) {
                    yield db.insert(schema_1.tabs).values({
                        tab_name: ut
                    });
                }
            }
            for (const ut of rp) {
                const d = yield db.select().from(schema_1.report).where((0, drizzle_orm_1.eq)(schema_1.report.report_name, ut));
                if (d.length === 0) {
                    yield db.insert(schema_1.report).values({
                        report_name: ut
                    });
                }
            }
            for (const vendorName of vendors) {
                const existingVendor = yield db.select().from(schema_1.vendor).where((0, drizzle_orm_1.eq)(schema_1.vendor.name, vendorName));
                if (existingVendor.length === 0) {
                    yield db.insert(schema_1.vendor).values({
                        name: vendorName
                    });
                    console.log(`Added vendor: ${vendorName}`);
                }
            }
            console.log("Data inserted successfully");
            return { message: "Data inserted successfully" };
        }
        catch (err) {
        }
    });
}
