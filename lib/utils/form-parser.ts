import { NextRequest } from 'next/server';
import formidable from 'formidable';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Define interface for file metadata
export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
  tempId: string;
}

// Maximum file size in bytes (default to 50MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '50', 10) * 1024 * 1024;
const MAX_FILES = parseInt(process.env.MAX_FILES_PER_REQUEST || '25', 10);
const TEMP_DIR = join(process.cwd(), 'uploads', 'temp');

/**
 * Parse multipart form data from request
 */
export async function parseFormData(req: NextRequest): Promise<{
  files: UploadedFile[];
  fields: Record<string, string>;
}> {
  // Ensure temp directory exists
  await mkdir(TEMP_DIR, { recursive: true });

  // Create a new form instance
  const form = formidable({
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE,
    uploadDir: TEMP_DIR,
    filename: (_name, _ext, part) => {
      const uniqueId = uuidv4();
      const originalName = part.originalFilename || 'unknown';
      // Keep original extension
      const ext = originalName.substring(originalName.lastIndexOf('.'));
      return `${uniqueId}${ext}`;
    },
    filter: (part) => {
      // Allow only HEIC/HEIF files
      return (
        part.name === 'files' &&
        part.mimetype?.includes('image/heic') ||
        part.originalFilename?.toLowerCase().endsWith('.heic') ||
        part.originalFilename?.toLowerCase().endsWith('.heif') ||
        false
      );
    },
  });

  // Convert request to Node.js readable stream
  const reqBodyStream = await streamify(req);

  // Parse form data
  return new Promise((resolve, reject) => {
    form.parse(reqBodyStream, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      // Format the files array
      const uploadedFiles: UploadedFile[] = (Array.isArray(files.files) ? files.files : [files.files])
        .filter(Boolean)
        .map((file) => ({
          name: file.originalFilename || 'unknown',
          path: file.filepath,
          size: file.size,
          type: file.mimetype || 'application/octet-stream',
          tempId: uuidv4(),
        }));

      // Format the fields object
      const formFields: Record<string, string> = {};
      Object.keys(fields).forEach(key => {
        const field = fields[key];
        if (Array.isArray(field)) {
          formFields[key] = field[0];
        } else if (field !== undefined) {
          formFields[key] = field;
        }
      });

      resolve({
        files: uploadedFiles,
        fields: formFields,
      });
    });
  });
}

/**
 * Convert Next.js request to Node.js readable stream for formidable
 */
async function streamify(req: NextRequest): Promise<any> {
  const bodyStream = req.body;
  if (!bodyStream) {
    throw new Error('Request body is empty');
  }

  // Create Node.js-compatible request object from Next.js request
  const headers = Object.fromEntries(req.headers.entries());
  
  return {
    headers,
    method: req.method,
    url: req.url,
    body: bodyStream,
    pipe: (writable: any) => {
      // Create a readable stream from the request body
      const reader = bodyStream.getReader();
      
      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            writable.end();
            return;
          }
          writable.write(value);
          read();
        }).catch(err => {
          writable.destroy(err);
        });
      }
      
      read();
      return writable;
    }
  };
}
