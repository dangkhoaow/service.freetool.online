import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * GET handler for admin token verification
 */
export async function GET(req: NextRequest) {
  try {
    // Get token from Authorization header
    const token = req.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token required' },
        { status: 401 }
      );
    }

    try {
      const decoded = await verifyToken(token);
      
      // Check if user has admin role
      if (decoded.role !== 'admin') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      
      return NextResponse.json({ 
        authenticated: true,
        user: {
          id: decoded.userId,
          role: decoded.role,
        }
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
