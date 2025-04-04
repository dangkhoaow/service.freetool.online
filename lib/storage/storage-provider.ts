import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Storage provider interface
export interface StorageProvider {
  uploadFile(filePath: string, targetPath: string): Promise<string>;
  getFileUrl(filePath: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
}

// Local storage provider
class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = process.env.STORAGE_LOCAL_PATH || './uploads';
    // Base URL for local file access
    this.baseUrl = process.env.STORAGE_LOCAL_URL || 'http://localhost:3001/api/files';
  }

  async uploadFile(filePath: string, targetPath: string): Promise<string> {
    const destinationPath = path.join(this.basePath, targetPath);
    const directory = path.dirname(destinationPath);
    
    // Create directory if it doesn't exist
    await fs.mkdir(directory, { recursive: true });
    
    // Copy file to destination
    await fs.copyFile(filePath, destinationPath);
    
    // Return the URL for accessing the file
    return `${this.baseUrl}/${encodeURIComponent(targetPath)}`;
  }

  async getFileUrl(filePath: string): Promise<string> {
    // For local storage, just return the file path with base URL
    return `${this.baseUrl}/${encodeURIComponent(filePath)}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    await fs.unlink(fullPath);
  }
}

// S3 storage provider
class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const region = process.env.S3_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET_NAME || '';
    
    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
    });
  }

  async uploadFile(filePath: string, targetPath: string): Promise<string> {
    // Read file content
    const fileContent = await fs.readFile(filePath);
    
    // Upload to S3
    const key = targetPath;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileContent,
      ContentType: this.getContentType(filePath),
    });
    
    await this.client.send(command);
    
    // Return the URL for accessing the file
    return await this.getFileUrl(key);
  }

  async getFileUrl(filePath: string): Promise<string> {
    // Create a presigned URL for temporary access to the file
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });
    
    // URL expires in 1 hour
    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async deleteFile(filePath: string): Promise<void> {
    const command = {
      Bucket: this.bucket,
      Key: filePath,
    };
    
    await this.client.send(command);
  }

  private getContentType(filePath: string): string {
    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.pdf':
        return 'application/pdf';
      case '.zip':
        return 'application/zip';
      default:
        return 'application/octet-stream';
    }
  }
}

// Factory to get the appropriate storage provider
export function getStorageProvider(): StorageProvider {
  const storageType = process.env.STORAGE_TYPE || 'local';
  
  if (storageType === 's3') {
    return new S3StorageProvider();
  }
  
  return new LocalStorageProvider();
}
