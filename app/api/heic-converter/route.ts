import { NextRequest, NextResponse } from 'next/server';
import { addJob } from '../../../lib/queue/queue-manager';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';

// Configure multer for file uploads
const upload = multer({
  dest: path.join(process.cwd(), 'uploads/temp'),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 20 // Maximum 20 files
  }
});

// CORS headers helper function
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000'); // For development
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  return response;
}

/**
 * POST handler for HEIC conversion API
 * Accepts HEIC files and conversion parameters
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== HEIC Converter API POST Request ===');
    console.log('Request headers:', req.headers);
    
    // For testing purposes, we'll skip authentication
    // Just extract the user ID from the token if available
    const token = req.headers.get('authorization')?.split(' ')[1] || 'user_test';
    const userId = token.startsWith('user_') ? token.substring(5) : 'anonymous';
    console.log('Authenticated user:', userId);

    // Parse the form data
    const formData = await req.formData();
    console.log('Raw form data:', formData);
    
    const files = formData.getAll('files') as File[];
    console.log('Files received:', files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified
    })));
    
    if (!files || files.length === 0) {
      console.error('No files uploaded');
      const response = NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
      return setCorsHeaders(response);
    }

    // Validate file types (simplified for testing)
    const validFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.heic') || name.endsWith('.heif') || true; // Accept all files for testing
    });

    console.log('Valid files:', validFiles.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type
    })));

    if (validFiles.length === 0) {
      console.error('No valid HEIC/HEIF files found');
      const response = NextResponse.json({ error: 'No valid HEIC/HEIF files found' }, { status: 400 });
      return setCorsHeaders(response);
    }

    // Get conversion parameters
    const outputFormat = formData.get('outputFormat')?.toString() || 'jpg';
    const quality = parseInt(formData.get('quality')?.toString() || '80', 10);
    const pdfOptions = {
      pageSize: 'a4',
      orientation: 'portrait'
    };

    console.log('Conversion parameters:', {
      outputFormat,
      quality,
      pdfOptions
    });

    // Generate a unique job ID
    const jobId = uuidv4();
    console.log('Generated job ID:', jobId);

    // Set priority (simplified for testing)
    const priority = 1;

    // Save files to the correct directory
    const uploadDir = path.join(process.cwd(), 'uploads/temp');
    console.log('Upload directory:', uploadDir);
    
    // Ensure the directory exists
    if (!fsSync.existsSync(uploadDir)) {
      console.log('Creating uploads/temp directory');
      fsSync.mkdirSync(uploadDir, { recursive: true });
    }

    // Save files with their original names
    for (const file of validFiles) {
      const filePath = path.join(uploadDir, file.name);
      console.log('Saving file to:', filePath);
      
      // Read the file content
      const fileBuffer = await file.arrayBuffer();
      const fileContent = Buffer.from(fileBuffer);
      
      // Write to disk
      await fs.writeFile(filePath, fileContent);
      
      // Verify file was written
      const stats = fsSync.statSync(filePath);
      console.log(`File ${file.name} saved successfully. Size: ${stats.size} bytes`);
    }

    // Add job to the queue
    console.log('Adding job to queue with files:', validFiles.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified
    })));

    await addJob({
      jobId,
      userId,
      files: validFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        path: path.join('uploads/temp', file.name) // Save relative path
      })),
      outputFormat,
      quality,
      pdfOptions,
      priority
    });

    console.log('Job added to queue successfully');

    const response = NextResponse.json({
      success: true,
      jobId,
      message: 'Conversion job added to queue',
      filesCount: validFiles.length
    });
    return setCorsHeaders(response);
  } catch (error) {
    console.error('Error in HEIC conversion API:', error);
    const response = NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
    return setCorsHeaders(response);
  }
}

/**
 * GET handler to check job status
 */
export async function GET(req: NextRequest) {
  try {
    console.log('=== HEIC Converter API GET Request ===');
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      console.error('No job ID provided');
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    console.log('Checking status for job ID:', jobId);
    const status = await getJobStatus(jobId);

    if (!status) {
      console.error('Job not found:', jobId);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    console.log('Job status:', status);
    const response = NextResponse.json(status);
    return setCorsHeaders(response);
  } catch (error) {
    console.error('Error getting job status:', error);
    const response = NextResponse.json(
      { error: 'Failed to get job status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
    return setCorsHeaders(response);
  }
}

// This function would be implemented in the queue manager
async function getJobStatus(jobId: string) {
  return null;
}
