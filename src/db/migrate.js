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
exports.runMigrations = runMigrations;
const promise_1 = __importDefault(require("mysql2/promise"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function runMigrations() {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield promise_1.default.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true
        });
        try {
            console.log('📊 Applying critical database indexes...');
            const migrationPath = path_1.default.join(__dirname, '../migrations/001_comprehensive_indexes.sql');
            const migrationSQL = fs_1.default.readFileSync(migrationPath, 'utf8');
            // Better SQL parsing - handle multi-line statements
            const statements = migrationSQL
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => {
                // Remove empty statements and comment-only lines
                const cleaned = stmt.replace(/--.*$/gm, '').trim();
                return cleaned.length > 0 && !cleaned.startsWith('--');
            });
            let successCount = 0;
            let skipCount = 0;
            let errorCount = 0;
            console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                try {
                    console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
                    yield connection.execute(statement);
                    successCount++;
                    console.log(`✅ Index created successfully`);
                }
                catch (error) {
                    if (error.code === 'ER_DUP_KEYNAME') {
                        console.log(`⚠️  Index already exists, skipping...`);
                        skipCount++;
                    }
                    else {
                        console.error(`❌ Error creating index: ${error.message}`);
                        console.error(`Failed SQL: ${statement.substring(0, 100)}...`);
                        errorCount++;
                    }
                }
            }
            console.log(`\n📊 Migration Results:`);
            console.log(`✅ Successfully created: ${successCount} indexes`);
            console.log(`⚠️  Already existed: ${skipCount} indexes`);
            console.log(`❌ Failed: ${errorCount} indexes`);
        }
        finally {
            yield connection.end();
        }
    });
}
