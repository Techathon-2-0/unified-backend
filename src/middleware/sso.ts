import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1] || process.env.SSO_TOKEN; // Expecting 'Bearer <token>'
    // console.log('Auth header:', token);
    console.log('Auth header:', authHeader);
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    console.log('Received token:', token);
    try { 
        const response = await axios.post(
            `${process.env.SSO_URL}/oauth/check_token`, // Replace with your auth service URL
            new URLSearchParams({ token }), // x-www-form-urlencoded body
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        // console.log('SSO response:', response.data);
        const tokenData = response.data;

        if (!tokenData.active) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        // Attach user/token info to request for use in routes
        // req.user = tokenData;
        // console.log('Authenticated user:', tokenData);
        next();

    } catch (error: any) {
        console.error('Auth middleware error:', error?.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: 'Token validation failed',
            error: error?.response?.data || error.message
        });
    }
}
