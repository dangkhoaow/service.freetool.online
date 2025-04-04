import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import PDFDocument from 'pdfkit';
import { UploadedFile } from '@/lib/utils/form-parser';
import { getStorageProvider } from '@/lib/storage/storage-provider';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';

type ProgressCallback = (progress: {
  status: string;
  fileIndex: number;
  totalFiles: number;
  currentFileName: string;
  percentage?: number;
}) => Promise<void>;

interface ConversionResult {
  outputPath: string;
  files: {
    originalName: string;
    convertedName: string;
    size: number;
    format: string;
    url: string;
  }[];
  zipUrl?: string;
}

/**
 * Process HEIC conversion to target format
 */
export async function processHeicConversion(
  files: UploadedFile[],
  outputFormat: string,
  quality: number,
  pdfOptions: { pageSize: string; orientation: string },
  progressCallback?: ProgressCallback
): Promise<ConversionResult> {
  // Create output directory
  const outputDir = path.join(process.cwd(), 'uploads', 'converted', uuidv4());
  await fs.mkdir(outputDir, { recursive: true });

  const storage = getStorageProvider();
  const conversionResults = [];

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileIndex = i;
    const totalFiles = files.length;
    
    // Update progress
    if (progressCallback) {
      await progressCallback({
        status: 'processing',
        fileIndex,
        totalFiles,
        currentFileName: file.name,
        percentage: Math.round((fileIndex / totalFiles) * 100)
      });
    }

    // Read HEIC file
    const inputBuffer = await fs.readFile(file.path);
    
    let outputBuffer: Buffer;
    let outputPath: string;
    
    // Convert based on target format
    if (outputFormat === 'pdf') {
      // For PDF, we first convert to JPEG and then create a PDF
      outputPath = await convertToPdf(
        inputBuffer, 
        outputDir, 
        file.name, 
        quality,
        pdfOptions
      );
    } else {
      // For image formats (jpg, png, webp)
      outputBuffer = await convertToImage(
        inputBuffer, 
        outputFormat, 
        quality
      );
      
      // Get output filename
      const outputFilename = getOutputFilename(file.name, outputFormat);
      outputPath = path.join(outputDir, outputFilename);
      
      // Save converted file
      await fs.writeFile(outputPath, outputBuffer);
    }
    
    // Upload to storage
    const fileUrl = await storage.uploadFile(
      outputPath,
      `converted/${path.basename(outputPath)}`
    );
    
    // Get file stats
    const stats = await fs.stat(outputPath);
    
    conversionResults.push({
      originalName: file.name,
      convertedName: path.basename(outputPath),
      size: stats.size,
      format: outputFormat,
      url: fileUrl
    });
    
    // Clean up temporary file
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.warn(`Failed to delete temporary file: ${file.path}`, error);
    }
  }
  
  // Create ZIP file if multiple files
  let zipUrl = undefined;
  if (conversionResults.length > 1) {
    const zipPath = path.join(outputDir, 'converted-files.zip');
    await createZipArchive(
      conversionResults.map(r => ({ path: path.join(outputDir, r.convertedName), name: r.convertedName })),
      zipPath
    );
    
    zipUrl = await storage.uploadFile(
      zipPath,
      `converted/converted-files-${uuidv4()}.zip`
    );
  }
  
  return {
    outputPath: outputDir,
    files: conversionResults,
    zipUrl
  };
}

/**
 * Convert HEIC buffer to image format (JPG, PNG, WEBP)
 */
async function convertToImage(
  inputBuffer: Buffer,
  format: string,
  quality: number
): Promise<Buffer> {
  // First convert HEIC to uncompressed format
  const { width, height, data } = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',  // Temporary format for processing
    quality
  });
  
  // Use sharp for further processing and optimization
  let sharpInstance = sharp(data, { raw: { width, height, channels: 4 } });
  
  // Apply format-specific settings
  switch (format.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg({ quality });
      break;
    case 'png':
      sharpInstance = sharpInstance.png({ quality: Math.min(100, quality + 10) });
      break;
    case 'webp':
      sharpInstance = sharpInstance.webp({ quality });
      break;
    default:
      sharpInstance = sharpInstance.jpeg({ quality });
      break;
  }
  
  return await sharpInstance.toBuffer();
}

/**
 * Convert HEIC to PDF
 */
async function convertToPdf(
  inputBuffer: Buffer,
  outputDir: string,
  filename: string,
  quality: number,
  options: { pageSize: string; orientation: string }
): Promise<string> {
  // First convert HEIC to JPEG
  const { width, height, data } = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality
  });
  
  // Create temporary JPEG file
  const tempJpgPath = path.join(outputDir, `temp-${uuidv4()}.jpg`);
  await fs.writeFile(tempJpgPath, data);
  
  // Create PDF
  const outputFilename = getOutputFilename(filename, 'pdf');
  const pdfPath = path.join(outputDir, outputFilename);
  
  return new Promise((resolve, reject) => {
    try {
      // Set page size and orientation
      const pageSize = options.pageSize || 'a4';
      const isLandscape = options.orientation === 'landscape';
      
      // Create PDF document
      const doc = new PDFDocument({ 
        size: pageSize, 
        layout: isLandscape ? 'landscape' : 'portrait',
        margin: 0
      });
      
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);
      
      // Add the image to the PDF, fitting it to the page
      doc.image(tempJpgPath, 0, 0, { 
        fit: [doc.page.width, doc.page.height],
        align: 'center',
        valign: 'center'
      });
      
      // Finalize the PDF
      doc.end();
      
      writeStream.on('finish', async () => {
        // Clean up temporary JPEG
        try {
          await fs.unlink(tempJpgPath);
        } catch (error) {
          console.warn(`Failed to delete temporary JPEG: ${tempJpgPath}`, error);
        }
        
        resolve(pdfPath);
      });
      
      writeStream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create a zip archive of converted files
 */
async function createZipArchive(
  files: { path: string; name: string }[],
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create output stream
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      resolve(outputPath);
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    // Pipe archive data to the output file
    archive.pipe(output);
    
    // Add files to the archive
    for (const file of files) {
      archive.file(file.path, { name: file.name });
    }
    
    // Finalize the archive
    archive.finalize();
  });
}

/**
 * Generate output filename based on input filename and target format
 */
function getOutputFilename(inputFilename: string, outputFormat: string): string {
  // Remove original extension and add new one
  const baseName = path.basename(inputFilename, path.extname(inputFilename));
  return `${baseName}.${outputFormat}`;
}
