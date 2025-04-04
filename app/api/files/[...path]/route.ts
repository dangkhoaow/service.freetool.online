import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth/jwt';
import { join } from 'path';
import fs from 'fs/promises';

/**
 * GET handler for file downloads
 * Serves files from the local storage
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Verify authentication
    const token = req.headers.get('authorization')?.split(' ')[1];
    const { authenticated } = await isAuthenticated(token);
    
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get file path from URL parameters
    const filePath = params.path.join('/');
    
    // Construct full file path (prefixed with storage directory)
    const storagePath = process.env.STORAGE_LOCAL_PATH || './uploads';
    const fullPath = join(process.cwd(), storagePath, filePath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Get file stats
    const stats = await fs.stat(fullPath);
    
    // Read file
    const fileBuffer = await fs.readFile(fullPath);
    
    // Set appropriate content type based on file extension
    const contentType = getContentType(fullPath);
    
    // Return file as response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="${getFileName(filePath)}"`,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
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
