import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import fs from 'fs/promises';
import { getJobStatus } from '@/lib/queue/queue-manager';
import { extractUserIdFromToken } from '@/lib/auth/auth-utils';

/**
 * GET handler for file downloads
 * Serves files from the local storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    console.log('=== File endpoint called ===');
    console.log('Request URL:', request.url);
    console.log('Request headers:', request.headers);
    
    // Await params to resolve the Next.js error
    const pathSegments = await params.path;
    
    // Verify authentication - support both header and query parameter
    let token = request.headers.get('authorization')?.split(' ')[1];
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token');
    
    console.log('Authentication tokens:', {
      headerToken: token,
      queryToken: queryToken
    });
    
    // Use query token if header token is not present
    if (!token && queryToken) {
      token = queryToken;
    }
    
    if (!token) {
      console.log('No token provided');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Extract userId from token
    const userId = extractUserIdFromToken(token);
    console.log('Extracted user ID:', userId);
    
    if (!userId) {
      console.log('Invalid token format');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Get file path from URL parameters
    const filePath = pathSegments.join('/').replace(/^uploads\//, '');
    console.log('Requested file path:', filePath);
    
    // First try the direct path
    const storageBasePath = process.env.STORAGE_LOCAL_PATH || 'uploads';
    let fullPath: string;

    // Check if this is a converted file request
    const parts = filePath.split('/');
    if (parts.length >= 2 && parts[0] === 'converted' && parts.length >= 3) {
      // For converted files, use job-UUID format
      // The UUID is in parts[1]
      const jobId = parts[1];
      const newPath = ['converted', `job-${jobId}`, ...parts.slice(2)].join('/');
      fullPath = join(process.cwd(), storageBasePath, newPath);
      console.log('Using job-UUID path:', fullPath);
    } else {
      // For non-converted files or invalid paths, use direct path
      fullPath = join(process.cwd(), storageBasePath, filePath);
      console.log('Using direct path:', fullPath);
    }

    console.log('Using file path:', fullPath);
    
    // Try to find the file
    try {
      await fs.access(fullPath);
      console.log('File exists at path:', fullPath);
    } catch (error: any) {
      console.error('File not found:', {
        error: error,
        stack: error.stack,
        message: error.message
      });
      return NextResponse.json(
        { error: 'File not found', path: fullPath },
        { status: 404 }
      );
    }
    
    // Get job ID from path to verify ownership
    const jobIdMatch = filePath.match(/converted\/([^\/]+)/);
    if (jobIdMatch) {
      const jobId = jobIdMatch[1];
      console.log('Found job ID in path:', jobId);
      
      // Check if job exists and belongs to user
      const jobStatus = await getJobStatus(jobId);
      console.log('Job status for job', jobId, ':', jobStatus);
      
      if (!jobStatus) {
        console.log('Job not found in database');
        return NextResponse.json(
          { error: 'Job not found', jobId },
          { status: 404 }
        );
      }
      
      if (jobStatus.userId !== userId) {
        console.log('User does not own this job. Requested by:', userId, 'but job belongs to:', jobStatus.userId);
        return NextResponse.json(
          { error: 'Forbidden', jobId, userId },
          { status: 403 }
        );
      }
    }
    
    // Get file stats
    const stats = await fs.stat(fullPath);
    console.log('File stats:', {
      size: stats.size,
      mtime: stats.mtime,
      atime: stats.atime
    });
    
    // Read file
    const fileBuffer = await fs.readFile(fullPath);
    console.log('File read successfully. Size:', fileBuffer.byteLength, 'bytes');
    
    // Set appropriate content type based on file extension
    const contentType = getContentType(fullPath);
    console.log('Determined content type:', contentType);
    
    // Return file as response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="${getFileName(filePath)}"`,
      },
    });
  } catch (error: any) {
    console.error('Error serving file:', {
      error: error,
      stack: error.stack,
      message: error.message
    });
    return NextResponse.json(
      { error: 'Failed to serve file', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Determine content type based on file extension
 */
function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Extract file name from path
 */
function getFileName(filePath: string): string {
  return filePath.split('/').pop() || 'download';
}
