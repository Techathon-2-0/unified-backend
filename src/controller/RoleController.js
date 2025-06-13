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
exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoleById = void 0;
exports.getAllRoles = getAllRoles;
const mysql2_1 = require("drizzle-orm/mysql2");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
//working
function getAllRoles() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const roles = yield db.select().from(schema_1.role);
            const data = [];
            for (const r of roles) {
                const rawdata = {
                    id: r.id,
                    role_name: r.role_name,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    tabs_access: [],
                    report_access: []
                };
                const d = yield db.select().from(schema_1.role_tabs).where((0, drizzle_orm_1.eq)(schema_1.role_tabs.role_id, r.id));
                //  const tabsAccess = {};
                for (const item of d) {
                    console.log(item);
                    if (item.tab_id !== null && item.tab_id !== undefined) {
                        const tabData = yield db.select().from(schema_1.tabs).where((0, drizzle_orm_1.eq)(schema_1.tabs.id, item.tab_id));
                        console.log(tabData);
                        rawdata.tabs_access.push({
                            [tabData[0].tab_name]: (item.status ? 2 : 1)
                        });
                    }
                }
                const dd = yield db.select().from(schema_1.role_report).where((0, drizzle_orm_1.eq)(schema_1.role_report.role_id, r.id));
                for (const item of dd) {
                    if (item.report_id !== null && item.report_id !== undefined) {
                        const reportData = yield db.select().from(schema_1.report).where((0, drizzle_orm_1.eq)(schema_1.report.id, item.report_id));
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
        }
        catch (error) {
            console.error('Error fetching roles:', error);
        }
    });
}
;
//working
const getRoleById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roles = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, Number(req.params.id)));
        // console.log(roles);
        const data = [];
        for (const r of roles) {
            console.log(r);
            const rawdata = {
                id: roles[0].id,
                role_name: roles[0].role_name,
                created_at: roles[0].created_at,
                updated_at: roles[0].updated_at,
                tabs_access: [],
                report_access: []
            };
            const d = yield db.select().from(schema_1.role_tabs).where((0, drizzle_orm_1.eq)(schema_1.role_tabs.role_id, r.id));
            //  const tabsAccess = {};
            console.log("enter");
            for (const item of d) {
                console.log(item);
                if (item.tab_id !== null && item.tab_id !== undefined) {
                    const tabData = yield db.select().from(schema_1.tabs).where((0, drizzle_orm_1.eq)(schema_1.tabs.id, item.tab_id));
                    // console.log(tabData);
                    rawdata.tabs_access.push({
                        [tabData[0].tab_name]: (item.status ? 2 : 1)
                    });
                }
            }
            const dd = yield db.select().from(schema_1.role_report).where((0, drizzle_orm_1.eq)(schema_1.role_report.role_id, r.id));
            for (const item of dd) {
                if (item.report_id !== null && item.report_id !== undefined) {
                    const reportData = yield db.select().from(schema_1.report).where((0, drizzle_orm_1.eq)(schema_1.report.id, item.report_id));
                    if (reportData.length > 0) {
                        rawdata.report_access.push(reportData[0].report_name);
                    }
                }
            }
            data.push(rawdata);
        }
        // console.log(data);
        res.json({ message: 'Role fetched successfully', data });
    }
    catch (error) {
        // console.error('Error fetching roles:', error);
    }
});
exports.getRoleById = getRoleById;
//working
const createRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role_name, tabs_access, report_access } = req.body;
        const check1 = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.role_name, role_name));
        if (check1.length > 0) {
            return res.status(400).json({ message: 'Role already exists' });
        }
        const roleid = yield db.insert(schema_1.role).values({
            role_name: role_name
        }).$returningId();
        const q = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, roleid[0].id));
        for (const item of tabs_access) {
            const [key, value] = Object.entries(item)[0];
            const d = yield db.select().from(schema_1.tabs).where((0, drizzle_orm_1.eq)(schema_1.tabs.tab_name, key));
            if (d.length > 0) { // always good to check!
                yield db.insert(schema_1.role_tabs).values({
                    role_id: roleid[0].id,
                    tab_id: d[0].id,
                    status: (value > 1 ? true : false),
                });
            }
            else {
                // console.warn(`No tab found for key: ${key}`);
            }
        }
        for (const item of report_access) {
            const d = yield db.select().from(schema_1.report).where((0, drizzle_orm_1.eq)(schema_1.report.report_name, item));
            if (d.length > 0) {
                yield db.insert(schema_1.role_report).values({
                    role_id: roleid[0].id,
                    report_id: d[0].id,
                });
            }
        }
        res.json({ message: 'Role created successfully', role_name, created_at: q[0].created_at, updated_at: q[0].updated_at, tabs_access, report_access });
        // res.status(201).json({ id: newRole[0], role_name });
    }
    catch (error) {
        // console.error('Error creating role:', error);
        res.status(500).json({ message: 'Failed to create role' });
    }
});
exports.createRole = createRole;
//working
const updateRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, role_name, tabs_access, report_access } = req.body;
        // Check if the role exists
        const existingRole = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, id));
        if (existingRole.length === 0) {
            return res.status(404).json({ message: 'Role not found' });
        }
        // Update the role name
        yield db.update(schema_1.role).set({ role_name: role_name, updated_at: (0, drizzle_orm_1.sql) `NOW()` }).where((0, drizzle_orm_1.eq)(schema_1.role.id, id));
        const q = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, id));
        // Clear existing tabs and reports for the role
        yield db.delete(schema_1.role_tabs).where((0, drizzle_orm_1.eq)(schema_1.role_tabs.role_id, id));
        yield db.delete(schema_1.role_report).where((0, drizzle_orm_1.eq)(schema_1.role_report.role_id, id));
        // Insert new tabs access
        let is = false;
        for (const item of tabs_access) {
            const [key, value] = Object.entries(item)[0];
            const tabData = yield db.select().from(schema_1.tabs).where((0, drizzle_orm_1.eq)(schema_1.tabs.tab_name, key));
            if (tabData.length > 0) {
                yield db.insert(schema_1.role_tabs).values({
                    role_id: id,
                    tab_id: tabData[0].id,
                    status: (value > 1 ? true : false),
                });
            }
        }
        // Insert new report access
        if (report_access && report_access.length > 0) {
            for (const item of report_access) {
                const reportData = yield db.select().from(schema_1.report).where((0, drizzle_orm_1.eq)(schema_1.report.report_name, item));
                if (reportData.length > 0) {
                    yield db.insert(schema_1.role_report).values({
                        role_id: id,
                        report_id: reportData[0].id,
                    });
                }
            }
        }
        console.log("Role updated successfully:");
        res.json({ message: 'Role updated successfully', id, role_name, created_at: existingRole[0].created_at, updated_at: q[0].updated_at, tabs_access, report_access });
    }
    catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ message: 'Failed to update role' });
    }
});
exports.updateRole = updateRole;
//working
const deleteRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if the role exists
        const existingRole = yield db.select().from(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, Number(id)));
        if (existingRole.length === 0) {
            return res.status(404).json({ message: 'Role not found' });
        }
        yield db.delete(schema_1.role_tabs).where((0, drizzle_orm_1.eq)(schema_1.role_tabs.role_id, Number(id)));
        yield db.delete(schema_1.role_report).where((0, drizzle_orm_1.eq)(schema_1.role_report.role_id, Number(id)));
        // Delete the role
        yield db.delete(schema_1.role).where((0, drizzle_orm_1.eq)(schema_1.role.id, Number(id)));
        // Optionally, delete associated tabs and reports
        res.json({ message: 'Role deleted successfully' });
    }
    catch (error) {
        // console.error('Error deleting role:', error);
        res.status(500).json({ message: 'Failed to delete role' });
    }
});
exports.deleteRole = deleteRole;
