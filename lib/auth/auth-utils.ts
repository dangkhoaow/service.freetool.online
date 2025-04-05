export function extractUserIdFromToken(token: string): string | null {
  if (!token) {
    return null;
  }

  // Handle both JWT and user_{userId} token formats
  if (token.startsWith('user_')) {
    return token.substring(5);
  }

  try {
    // For JWT tokens, we'll just return the token as is since we don't need to verify it here
    return token;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
}
