import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth/jwt';
import { getJobStatus } from '@/lib/queue/queue-manager';

/**
 * GET handler for job status
 */
export async function GET(req: NextRequest) {
  try {
    console.log('=== Job status endpoint called ===');
    console.log('Request headers:', req.headers);
    
    // Verify authentication
    const token = req.headers.get('authorization')?.split(' ')[1];
    console.log('Auth token:', token);
    
    const { authenticated, payload } = await isAuthenticated(token);
    console.log('Auth result:', { 
      authenticated, 
      userId: payload?.userId, 
      role: payload?.role,
      payload
    });
    
    if (!authenticated || !payload) {
      console.error('Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get job ID from query parameters or path parameter
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId') || req.url.split('/').pop();
    console.log('Raw URL:', req.url);
    console.log('Parsed URL:', new URL(req.url));
    console.log('Search params:', searchParams.toString());
    console.log('Job ID from params:', jobId);
    
    if (!jobId) {
      console.error('No job ID provided');
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    // Get job status
    console.log('Calling getJobStatus with jobId:', jobId);
    const status = await getJobStatus(jobId);
    console.log('Job status response:', status);
    
    if (!status) {
      console.error('Job not found in queue');
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns this job
    console.log('Checking job ownership:', {
      userId: status.userId,
      payloadUserId: payload.userId,
      role: payload.role
    });
    
    if (status.userId !== payload.userId && payload.role !== 'admin') {
      console.error('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized to access this job' },
        { status: 403 }
      );
    }
    
    console.log('Returning job status:', {
      jobId: status.jobId,
      status: status.status,
      progress: status.progress
    });
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting job status:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}

export async function GET_query(req: NextRequest) {
  try {
    console.log('=== Job status query endpoint called ===');
    
    // Verify authentication
    const token = req.headers.get('authorization')?.split(' ')[1];
    const { authenticated, payload } = await isAuthenticated(token);
    
    if (!authenticated || !payload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get job ID from query parameters
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    
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
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error in job status endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
