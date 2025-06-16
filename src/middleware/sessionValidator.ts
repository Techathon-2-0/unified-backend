import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/mysql2";
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL!);

export const validateUserSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No need to set invalidatedSession if there's no token
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
      
      // Check if user still exists
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, decoded.id))
        .limit(1);
      
      if (user.length === 0) {
        // User doesn't exist - invalidate the session
        (req as any).invalidatedSession = true;
        (req as any).deletedUserId = decoded.id;
      }
    } catch (jwtError) {
      // JWT verification failed
      (req as any).invalidatedSession = true;
    }
    
    next();
  } catch (error) {
    // Let the request proceed, but mark the session as invalid
    (req as any).invalidatedSession = true;
    next();
  }
};