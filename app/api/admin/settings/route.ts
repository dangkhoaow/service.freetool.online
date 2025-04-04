import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/jwt';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'config', 'settings.json');

/**
 * GET handler for admin settings
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.headers.get('authorization')?.split(' ')[1];
    const isAdminUser = await isAdmin(token);
    
    if (!isAdminUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Get settings from file or default
    const settings = await getSettings();
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for updating admin settings
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.headers.get('authorization')?.split(' ')[1];
    const isAdminUser = await isAdmin(token);
    
    if (!isAdminUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Get request body
    const settings = await req.json();
    
    // Validate settings
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      );
    }
    
    // Save settings
    await saveSettings(settings);
    
    // Update environment variables
    updateEnvironmentVariables(settings);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * Get settings from file or return defaults
 */
async function getSettings() {
  try {
    // Ensure config directory exists
    const configDir = path.dirname(SETTINGS_FILE);
    await fs.mkdir(configDir, { recursive: true });
    
    // Try to read settings file
    const fileContent = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Return default settings if file doesn't exist or is invalid
    return {
      type: process.env.STORAGE_TYPE || 'local',
      localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
      s3: {
        bucketName: process.env.S3_BUCKET_NAME || '',
        region: process.env.S3_REGION || 'us-east-1',
        accessKey: process.env.S3_ACCESS_KEY || '',
        secretKey: process.env.S3_SECRET_KEY || '',
      },
    };
  }
}

/**
 * Save settings to file
 */
async function saveSettings(settings: any) {
  // Ensure config directory exists
  const configDir = path.dirname(SETTINGS_FILE);
  await fs.mkdir(configDir, { recursive: true });
  
  // Write settings to file
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * Update environment variables with settings
 * Note: This only updates the current process
 * For a real deployment, this would need to update .env file or use a different mechanism
 */
function updateEnvironmentVariables(settings: any) {
  process.env.STORAGE_TYPE = settings.type;
  process.env.STORAGE_LOCAL_PATH = settings.localPath;
  
  if (settings.type === 's3') {
    process.env.S3_BUCKET_NAME = settings.s3.bucketName;
    process.env.S3_REGION = settings.s3.region;
    process.env.S3_ACCESS_KEY = settings.s3.accessKey;
    process.env.S3_SECRET_KEY = settings.s3.secretKey;
  }
}
