import { NextRequest, NextResponse } from 'next/server';
import { parseFormData } from '@/lib/utils/form-parser';
import { verifyToken } from '@/lib/auth/jwt';
import { addJob } from '@/lib/queue/queue-manager';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST handler for HEIC conversion API
 * Accepts HEIC files and conversion parameters
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication token
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Authentication token required' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse multipart form data
    const { files, fields } = await parseFormData(req);
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    // Validate file types
    const validFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.heic') || name.endsWith('.heif');
    });

    if (validFiles.length === 0) {
      return NextResponse.json({ error: 'No valid HEIC/HEIF files found' }, { status: 400 });
    }

    // Get conversion parameters
    const outputFormat = fields.outputFormat || 'jpg';
    const quality = parseInt(fields.quality || '80', 10);
    const pdfOptions = {
      pageSize: fields.pageSize || 'a4',
      orientation: fields.orientation || 'portrait'
    };

    // Generate a unique job ID
    const jobId = uuidv4();

    // Set priority based on user status (defaulting to low for free users)
    // In the future, this would be determined by the user's subscription status
    const priority = decoded.role === 'paid' ? 1 : 10;

    // Add job to the queue
    await addJob({
      jobId,
      userId: decoded.userId,
      files: validFiles,
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
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * GET handler to check job status
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication token
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Authentication token required' }, { status: 401 });
    }

    try {
      await verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get job ID from query parameters
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Get job status from queue
    const status = await getJobStatus(jobId);

    if (!status) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error checking job status:', error);
    return NextResponse.json(
      { error: 'Failed to check job status' },
      { status: 500 }
    );
  }
}

// This function would be implemented in the queue manager
async function getJobStatus(jobId: string) {
  // Placeholder - actual implementation would retrieve status from Bull queue
  return { id: jobId, status: 'pending' };
}
