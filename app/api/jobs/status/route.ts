import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth/jwt';
import { getJobStatus } from '@/lib/queue/queue-manager';

/**
 * GET handler for job status
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const token = req.headers.get('authorization')?.split(' ')[1];
    const { authenticated, payload } = await isAuthenticated(token);
    
    if (!authenticated || !payload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get job ID from query params
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('id');
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    // Get job status
    const status = await getJobStatus(jobId);
    
    if (!status) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns this job
    if (status.data.userId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized to access this job' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
