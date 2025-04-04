import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/jwt';

// This would be a real implementation that tracks worker status
// For now, we'll return mock data
const mockWorkers = [
  {
    id: 'worker-1',
    status: 'active',
    jobsProcessed: 156,
    currentJob: {
      id: 'job-123',
      type: 'heic-to-jpg',
      progress: 75,
    },
  },
  {
    id: 'worker-2',
    status: 'idle',
    jobsProcessed: 93,
    currentJob: undefined,
  },
  {
    id: 'worker-3',
    status: 'active',
    jobsProcessed: 127,
    currentJob: {
      id: 'job-456',
      type: 'heic-to-pdf',
      progress: 30,
    },
  },
];

/**
 * GET handler for worker statistics
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
    
    // In a real implementation, this would get actual worker data
    // For now, return mock data
    return NextResponse.json(mockWorkers);
  } catch (error) {
    console.error('Error getting worker stats:', error);
    return NextResponse.json(
      { error: 'Failed to get worker statistics' },
      { status: 500 }
    );
  }
}
