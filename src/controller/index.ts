import 'dotenv/config';
import { usersTable } from '../db/schema';
import { drizzle } from 'drizzle-orm/mysql2';
const db = drizzle(process.env.DATABASE_URL!);

export default async function testing() {
  const users = await db.select().from(usersTable);
  return users;
}


