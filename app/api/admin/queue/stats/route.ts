import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/jwt';
import { 
  getActiveJobsCount, 
  getWaitingJobsCount, 
  getCompletedJobsCount,
  getFailedJobsCount 
} from '@/lib/queue/queue-manager';

/**
 * GET handler for queue statistics
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
    
    // Get queue statistics
    const active = await getActiveJobsCount();
    const waiting = await getWaitingJobsCount();
    const completed = await getCompletedJobsCount();
    const failed = await getFailedJobsCount();
    
    return NextResponse.json({
      active,
      waiting,
      completed,
      failed,
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return NextResponse.json(
      { error: 'Failed to get queue statistics' },
      { status: 500 }
    );
  }
}
