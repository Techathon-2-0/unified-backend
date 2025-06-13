import 'express';

declare global {
  namespace Express {
    interface Request {
      invalidatedSession?: boolean;
      deletedUserId?: number;
    }
  }
}