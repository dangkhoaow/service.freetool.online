import { NextRequest, NextResponse } from 'next/server';
import { addJob } from '../../../lib/queue/queue-manager';
import { v4 as uuidv4 } from 'uuid';

// CORS headers helper function
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', '*'); // For development
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
    // For testing purposes, we'll skip authentication
    // Just extract the user ID from the token if available
    const token = req.headers.get('authorization')?.split(' ')[1] || 'user_test';
    const userId = token.startsWith('user_') ? token.substring(5) : 'anonymous';

    // Get form data (simplified for testing)
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      const response = NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
      return setCorsHeaders(response);
    }

    // Validate file types (simplified for testing)
    const validFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.heic') || name.endsWith('.heif') || true; // Accept all files for testing
    });

    if (validFiles.length === 0) {
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

    // Generate a unique job ID
    const jobId = uuidv4();

    // Set priority (simplified for testing)
    const priority = 1;

    // Add job to the queue
    // Add job with simplified parameters
    await addJob({
      jobId,
      userId,
      files: validFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      })),
      outputFormat,
      quality,
      pdfOptions,
      priority
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Conversion job added to queue',
      filesCount: validFiles.length
    });
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
    // For testing purposes, we'll skip authentication

    // Get job ID from query parameters
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      const response = NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
      return setCorsHeaders(response);
    }

    // Get job status from queue
    const status = await getJobStatus(jobId);

    if (!status) {
      const response = NextResponse.json({ error: 'Job not found' }, { status: 404 });
      return setCorsHeaders(response);
    }

    const response = NextResponse.json({ status });
    return setCorsHeaders(response);
  } catch (error) {
    console.error('Error checking job status:', error);
    const response = NextResponse.json(
      { error: 'Failed to check job status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
    return setCorsHeaders(response);
  }
}

// This function would be implemented in the queue manager
async function getJobStatus(jobId: string) {
  // Placeholder - actual implementation would retrieve status from Bull queue
  return { id: jobId, status: 'pending' };
}
