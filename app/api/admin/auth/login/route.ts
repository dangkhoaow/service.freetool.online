import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth/jwt';
import bcrypt from 'bcryptjs';

console.log('Admin login route initialized');

/**
 * POST handler for admin login
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Received login request');
    const { username, password } = await req.json();

    console.log('Login credentials received:', { username, hasPassword: !!password });
    
    // Check if credentials provided
    if (!username || !password) {
      console.log('Missing credentials:', { username: !!username, password: !!password });
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get admin credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'devAdminPass123!';

    console.log('Checking credentials against:', { 
      expectedUsername: adminUsername,
      hasExpectedPassword: !!adminPassword
    });

    // Check if username matches
    if (username !== adminUsername) {
      console.log('Invalid username:', username);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password
    const passwordMatches = password === adminPassword;

    console.log('Password check result:', { matches: passwordMatches });

    if (!passwordMatches) {
      console.log('Invalid password for user:', username);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('Login successful for user:', username);

    // Generate JWT token
    const token = generateToken({
      userId: 'admin',
      role: 'admin',
    });

    console.log('Generated token:', token);

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
