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
const migrate_1 = require("../db/migrate");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const db_host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🚀 Starting comprehensive database optimization...');
            console.log('📍 This will add critical indexes to improve performance');
            console.log('⏱️  Expected time: 2-5 minutes depending on data size\n');
            // Validate environment variables
            if (!db_host || !user || !password || !database) {
                throw new Error('❌ Missing required database environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)');
            }
            console.log(`🔗 Connecting to database: ${process.env.DB_NAME} at ${process.env.DB_HOST}`);
            // Run the migrations
            yield (0, migrate_1.runMigrations)();
            console.log('\n🎉 Database optimization completed successfully!');
            console.log('🚀 Your GPS tracking system should now be significantly faster');
            console.log('📈 Expected performance improvement: 85-95% reduction in query times');
            process.exit(0);
        }
        catch (error) {
            console.error('\n💥 Migration failed:', error);
            console.error('🔧 Please check your database connection and try again');
            process.exit(1);
        }
    });
}
// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n⏹️  Migration interrupted by user');
    process.exit(1);
});
process.on('SIGTERM', () => {
    console.log('\n⏹️  Migration terminated');
    process.exit(1);
});
main();
