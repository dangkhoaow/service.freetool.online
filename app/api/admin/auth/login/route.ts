import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth/jwt';
import bcrypt from 'bcryptjs';

/**
 * POST handler for admin login
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Check if credentials provided
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // In a real implementation, these would be stored in a database
    // For now, we use environment variables for the admin credentials
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin-password-change-in-production';

    // Check if username matches
    if (username !== adminUsername) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // In a real implementation, the password would be hashed
    // For this example, we're doing a direct comparison
    const passwordMatches = password === adminPassword;

    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: 'admin',
      role: 'admin',
    });

    // Return token
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Failed to process login request' },
      { status: 500 }
    );
  }
}
