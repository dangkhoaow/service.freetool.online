import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

type TokenPayload = {
  userId: string;
  email?: string;
  role: 'free' | 'paid' | 'admin';
  // Fields reserved for future Google OAuth integration
  accessToken?: string;
  refreshToken?: string;
  // Field reserved for future Stripe integration
  stripeCustomerId?: string;
};

/**
 * Generate JWT token for authentication
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as TokenPayload);
      }
    });
  });
}

/**
 * Middleware to check if user is authenticated
 */
export async function isAuthenticated(token: string | undefined | null): Promise<{ 
  authenticated: boolean; 
  payload?: TokenPayload 
}> {
  if (!token) {
    return { authenticated: false };
  }

  try {
    const payload = await verifyToken(token);
    return { authenticated: true, payload };
  } catch (error) {
    return { authenticated: false };
  }
}

/**
 * Middleware to check if user is an admin
 */
export async function isAdmin(token: string | undefined | null): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const payload = await verifyToken(token);
    return payload.role === 'admin';
  } catch (error) {
    return false;
  }
}
