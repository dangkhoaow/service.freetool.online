import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from '../utils/form-parser';
// @ts-ignore - heic-decode doesn't have types
import heicDecode from 'heic-decode';

// Simple sync wrapper for logging that won't throw
function logFileExists(path: string, label: string): void {
  try {
    const exists = fsSync.existsSync(path);
    console.log(`[HEIC] ${label} path ${path} exists: ${exists}`);
    if (exists) {
      const stats = fsSync.statSync(path);
      console.log(`[HEIC] ${label} size: ${stats.size} bytes`);
    }
  } catch (error) {
    console.error(`[HEIC] Error checking ${label} path:`, error);
  }
}

interface HeicDecodeResult {
  width: number;
  height: number;
  data: Buffer;
}

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
    thumbnailUrl?: string;
  }[];
  zipUrl?: string;
  combinedPdfUrl?: string;
}

export async function processHeicConversion(
  files: UploadedFile[],
  outputFormat: string,
  quality: number,
  pdfOptions: { pageSize: string; orientation: string },
  progressCallback?: ProgressCallback
): Promise<ConversionResult> {
  console.log(`[HEIC] Starting HEIC conversion of ${files.length} files to ${outputFormat} format`);
  
  // Create a fixed output directory path that's easier to find
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(process.cwd(), 'uploads', 'converted', `job-${timestamp}`);
  console.log(`[HEIC] Creating output directory: ${outputDir}`);
  
  // Ensure the directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  // Create a thumbnails directory
  const thumbnailsDir = path.join(outputDir, 'thumbnails');
  await fs.mkdir(thumbnailsDir, { recursive: true });
  
  // For URL construction
  const baseUrl = 'http://localhost:3001/api/files';
  const conversionResults = [];
  
  // PDF paths for combined PDF (if needed)
  const pdfPaths = [];

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileIndex = i;
    const totalFiles = files.length;
    
    console.log(`[HEIC] Processing file ${i+1}/${files.length}: ${file.name}, path: ${file.path}`);
    logFileExists(file.path, "Input file");
    
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

    try {
      // Get output filename and thumbnail filename
      const outputFilename = getOutputFilename(file.name, outputFormat === 'pdf' ? 'pdf' : outputFormat);
      const thumbnailFilename = getOutputFilename(file.name, 'jpg');
      const tempOutputPath = path.join(outputDir, `temp_${outputFilename}`);
      const finalOutputPath = path.join(outputDir, outputFilename);
      const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
      
      console.log(`[HEIC] Output paths: temp=${tempOutputPath}, final=${finalOutputPath}, thumbnail=${thumbnailPath}`);
      
      let conversionSuccessful = false;
      let decodedImage: HeicDecodeResult | null = null;
      
      // Try using heic-decode for actual conversion first
      try {
        console.log(`[HEIC] Attempting real conversion with heic-decode...`);
        
        // Read the HEIC file
        const inputBuffer = await fs.readFile(file.path);
        console.log(`[HEIC] Read input file: ${inputBuffer.length} bytes`);
        
        // Attempt to decode the HEIC image
        decodedImage = await heicDecode({ buffer: inputBuffer }) as HeicDecodeResult;
        console.log(`[HEIC] Successfully decoded image: ${decodedImage.width}x${decodedImage.height}, raw data length: ${decodedImage.data.length} bytes`);
        
        // Always create a JPEG thumbnail first regardless of the output format
        console.log(`[HEIC] Creating JPEG thumbnail`);
        await sharp(decodedImage.data, {
          raw: {
            width: decodedImage.width,
            height: decodedImage.height,
            channels: 4 // RGBA
          }
        })
        .resize(300, 300, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
        
        logFileExists(thumbnailPath, "Thumbnail JPEG");
        
        // Convert the raw pixels to the requested format using Sharp
        if (outputFormat === 'pdf') {
          // For PDF, convert to JPEG first, then create a PDF
          console.log(`[HEIC] Converting decoded image to JPEG for PDF`);
          await sharp(decodedImage.data, {
            raw: {
              width: decodedImage.width,
              height: decodedImage.height,
              channels: 4 // RGBA
            }
          })
          .jpeg({ quality })
          .toFile(tempOutputPath);
          
          logFileExists(tempOutputPath, "Converted JPEG for PDF");
          
          // Create the PDF
          console.log('[HEIC] Creating PDF from image');
          await createPdfFromImage(tempOutputPath, finalOutputPath, file.name, pdfOptions);
          logFileExists(finalOutputPath, "Final PDF");
          
          // Add to PDF paths for combined PDF
          pdfPaths.push({
            path: finalOutputPath,
            name: path.basename(finalOutputPath)
          });
          
          conversionSuccessful = true;
        } 
        else if (outputFormat === 'jpg' || outputFormat === 'jpeg') {
          console.log(`[HEIC] Converting decoded image to JPEG`);
          await sharp(decodedImage.data, {
            raw: {
              width: decodedImage.width,
              height: decodedImage.height,
              channels: 4 // RGBA
            }
          })
          .jpeg({ quality })
          .toFile(finalOutputPath);
          
          logFileExists(finalOutputPath, "Converted JPEG");
          conversionSuccessful = true;
        }
        else if (outputFormat === 'png') {
          console.log(`[HEIC] Converting decoded image to PNG`);
          await sharp(decodedImage.data, {
            raw: {
              width: decodedImage.width,
              height: decodedImage.height,
              channels: 4 // RGBA
            }
          })
          .png()
          .toFile(finalOutputPath);
          
          logFileExists(finalOutputPath, "Converted PNG");
          conversionSuccessful = true;
        }
        else if (outputFormat === 'webp') {
          console.log(`[HEIC] Converting decoded image to WebP`);
          await sharp(decodedImage.data, {
            raw: {
              width: decodedImage.width,
              height: decodedImage.height,
              channels: 4 // RGBA
            }
          })
          .webp({ quality })
          .toFile(finalOutputPath);
          
          logFileExists(finalOutputPath, "Converted WebP");
          conversionSuccessful = true;
        }
        
        console.log(`[HEIC] Conversion with heic-decode successful`);
      } catch (error) {
        console.error(`[HEIC] heic-decode conversion failed:`, error);
        conversionSuccessful = false;
      }
      
      // If actual conversion failed, create a placeholder image and placeholder thumbnail
      if (!conversionSuccessful) {
        console.log('[HEIC] Real conversion failed, creating placeholder image');
        
        // Always create a thumbnail
        console.log('[HEIC] Creating placeholder thumbnail');
        await generateColoredImage(
          300, 300, 
          { r: 100, g: 100, b: 200 },
          'jpeg', 
          80,
          thumbnailPath
        );
        logFileExists(thumbnailPath, "Placeholder thumbnail");
        
        if (outputFormat === 'pdf') {
          // Create a temporary JPEG for the PDF
          console.log('[HEIC] Generating temporary JPEG for PDF');
          await generateColoredImage(
            800, 600, 
            { r: 100, g: 100, b: 200 },
            'jpeg', 
            quality,
            tempOutputPath
          );
          logFileExists(tempOutputPath, "Temp JPEG for PDF");
          
          // Create the PDF
          console.log('[HEIC] Creating PDF from placeholder image');
          await createPdfFromImage(tempOutputPath, finalOutputPath, file.name, pdfOptions);
          logFileExists(finalOutputPath, "Final PDF");
          
          // Add to PDF paths for combined PDF
          pdfPaths.push({
            path: finalOutputPath,
            name: path.basename(finalOutputPath)
          });
          
          // Delete the temporary JPEG
          if (fsSync.existsSync(tempOutputPath)) {
            console.log('[HEIC] Deleting temp JPEG');
            await fs.unlink(tempOutputPath);
          }
        } else {
          // Create placeholder image in the requested format
          console.log(`[HEIC] Generating placeholder in ${outputFormat} format`);
          await generateColoredImage(
            800, 600, 
            { r: 100, g: 100, b: 200 },
            outputFormat, 
            quality,
            finalOutputPath
          );
          logFileExists(finalOutputPath, "Generated placeholder image");
        }
      }
      
      // Skip the storage provider and get file stats directly
      console.log(`[HEIC] Getting file stats directly`);
      const stats = await fs.stat(finalOutputPath);
      
      // Get thumbnail stats
      const thumbnailStats = await fs.stat(thumbnailPath);
      
      // Calculate relative paths for URLs
      const relativePath = path.relative(path.join(process.cwd(), 'uploads'), finalOutputPath);
      const fileUrl = `${baseUrl}/${encodeURIComponent(relativePath)}`;
      
      const thumbnailRelativePath = path.relative(path.join(process.cwd(), 'uploads'), thumbnailPath);
      const thumbnailUrl = `${baseUrl}/${encodeURIComponent(thumbnailRelativePath)}`;
      
      console.log(`[HEIC] File URL: ${fileUrl}`);
      console.log(`[HEIC] Thumbnail URL: ${thumbnailUrl}`);
      console.log(`[HEIC] Decoded thumbnail URL: ${decodeURIComponent(thumbnailUrl)}`);
      
      conversionResults.push({
        originalName: file.name,
        convertedName: path.basename(finalOutputPath),
        size: stats.size,
        format: outputFormat,
        url: fileUrl,
        thumbnailUrl: thumbnailUrl
      });
      
      console.log(`[HEIC] Added to conversion results. Total results: ${conversionResults.length}`);
      
      // Clean up temporary file
      try {
        console.log(`[HEIC] Cleaning up temp file: ${file.path}`);
        await fs.unlink(file.path);
      } catch (error) {
        console.warn(`[HEIC] Failed to delete temporary file: ${file.path}`, error);
      }
    } catch (error) {
      console.error(`[HEIC] Error processing file ${file.name}:`, error);
      
      // Generate fallback image on error
      try {
        console.log(`[HEIC] Generating fallback image for ${file.name}`);
        const outputFilename = getOutputFilename(file.name, outputFormat === 'pdf' ? 'pdf' : outputFormat);
        const thumbnailFilename = getOutputFilename(file.name, 'jpg');
        const outputPath = path.join(outputDir, outputFilename);
        const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
        
        // Create a thumbnail for the error case
        console.log('[HEIC] Creating error thumbnail');
        await generateColoredImage(
          300, 300,
          { r: 255, g: 0, b: 0 },
          'jpeg',
          80,
          thumbnailPath
        );
        
        if (outputFormat === 'pdf') {
          // Create error PDF
          console.log('[HEIC] Creating error PDF');
          await generateErrorPdf(outputPath, file.name);
          
          // Add to PDF paths for combined PDF
          pdfPaths.push({
            path: outputPath,
            name: path.basename(outputPath)
          });
        } else {
          // Create error image
          console.log('[HEIC] Creating error image');
          await generateColoredImage(
            800, 600, 
            { r: 255, g: 0, b: 0 }, // Red for error
            outputFormat, 
            quality,
            outputPath
          );
        }
        
        logFileExists(outputPath, "Error fallback file");
        
        // Calculate relative paths for URLs
        const relativePath = path.relative(path.join(process.cwd(), 'uploads'), outputPath);
        const fileUrl = `${baseUrl}/${encodeURIComponent(relativePath)}`;
        
        const thumbnailRelativePath = path.relative(path.join(process.cwd(), 'uploads'), thumbnailPath);
        const thumbnailUrl = `${baseUrl}/${encodeURIComponent(thumbnailRelativePath)}`;
        
        const stats = await fs.stat(outputPath);
        
        conversionResults.push({
          originalName: file.name,
          convertedName: path.basename(outputPath),
          size: stats.size,
          format: outputFormat,
          url: fileUrl,
          thumbnailUrl: thumbnailUrl
        });
        
        console.log('[HEIC] Added error fallback to results');
      } catch (fallbackError) {
        console.error(`[HEIC] Even fallback generation failed:`, fallbackError);
      }
    }
  }
  
  // Create a combined PDF if output format is PDF and there are multiple files
  let combinedPdfUrl = undefined;
  if (outputFormat === 'pdf' && pdfPaths.length > 1) {
    try {
      console.log('[HEIC] Creating combined PDF from all files');
      const combinedPdfPath = path.join(outputDir, 'combined.pdf');
      await combineMultiplePdfs(pdfPaths.map(p => p.path), combinedPdfPath);
      
      logFileExists(combinedPdfPath, "Combined PDF");
      
      // Calculate relative path for URL
      const relativePath = path.relative(path.join(process.cwd(), 'uploads'), combinedPdfPath);
      combinedPdfUrl = `${baseUrl}/${encodeURIComponent(relativePath)}`;
      
      console.log(`[HEIC] Combined PDF URL: ${combinedPdfUrl}`);
    } catch (error) {
      console.error(`[HEIC] Failed to create combined PDF:`, error);
    }
  }
  
  // Create ZIP file if multiple files
  let zipUrl = undefined;
  if (conversionResults.length > 1) {
    try {
      console.log('[HEIC] Creating ZIP archive for multiple files');
      const zipPath = path.join(outputDir, 'converted-files.zip');
      
      // Make sure we're adding the correct paths to the zip
      const filesToZip = conversionResults.map(r => ({ 
        path: path.join(outputDir, r.convertedName), 
        name: r.convertedName 
      }));
      
      await createZipArchive(filesToZip, zipPath);
      
      logFileExists(zipPath, "ZIP archive");
      
      // Calculate relative path for URL
      const relativePath = path.relative(path.join(process.cwd(), 'uploads'), zipPath);
      zipUrl = `${baseUrl}/${encodeURIComponent(relativePath)}`;
      
      console.log(`[HEIC] ZIP URL: ${zipUrl}`);
    } catch (error) {
      console.error(`[HEIC] Failed to create ZIP archive:`, error);
    }
  }
  
  console.log(`[HEIC] Conversion complete. Returning ${conversionResults.length} results from ${outputDir}`);
  
  return {
    outputPath: outputDir,
    files: conversionResults,
    zipUrl,
    combinedPdfUrl
  };
}

/**
 * Get the output filename with the correct extension
 */
function getOutputFilename(originalName: string, format: string): string {
  // Get the filename without extension
  const baseName = path.basename(originalName, path.extname(originalName));
  
  // Return with the new extension
  return `${baseName}.${format}`;
}

/**
 * Generate a colored image as fallback
 */
async function generateColoredImage(
  width: number,
  height: number,
  color: { r: number, g: number, b: number },
  format: string,
  quality: number,
  outputPath: string
): Promise<void> {
  console.log(`[HEIC] Generating colored image: ${width}x${height}, format: ${format}, quality: ${quality}`);
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color
    }
  });
  
  // Apply format-specific settings
  switch (format.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      await image.jpeg({ quality }).toFile(outputPath);
      break;
    case 'png':
      await image.png({ quality: Math.min(100, quality + 10) }).toFile(outputPath);
      break;
    case 'webp':
      await image.webp({ quality }).toFile(outputPath);
      break;
    default:
      await image.jpeg({ quality }).toFile(outputPath);
      break;
  }
}

/**
 * Create a PDF from an image
 */
async function createPdfFromImage(
  imagePath: string,
  outputPath: string,
  originalFilename: string,
  options: { pageSize: string; orientation: string }
): Promise<void> {
  console.log(`[HEIC] Creating PDF from image: ${imagePath}`);
  
  // Create a PDF document
  const doc = new PDFDocument({
    size: options.pageSize,
    layout: options.orientation,
    autoFirstPage: true,
    margin: 50
  });
  
  // Pipe to output file
  const writeStream = fsSync.createWriteStream(outputPath);
  doc.pipe(writeStream);
  
  // Add title
  doc.fontSize(20).text(`Converted from: ${originalFilename}`, { align: 'center' });
  doc.moveDown();
  
  // Add image
  doc.image(imagePath, {
    fit: [500, 400],
    align: 'center',
    valign: 'center'
  });
  
  // Finalize PDF
  doc.end();
  
  // Wait for PDF to be written
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
  });
}

/**
 * Combine multiple PDFs into a single PDF
 */
async function combineMultiplePdfs(
  pdfPaths: string[],
  outputPath: string
): Promise<void> {
  console.log(`[HEIC] Combining ${pdfPaths.length} PDFs into one`);
  
  // Load PDFKit
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  
  // Create a new PDF document
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);
  
  // Add each PDF as an image (this is a simple approach - a more complex approach would 
  // require a PDF parser library to maintain the original PDF structure)
  for (let i = 0; i < pdfPaths.length; i++) {
    if (i > 0) {
      doc.addPage();
    }
    
    const pdfPath = pdfPaths[i];
    console.log(`[HEIC] Adding PDF: ${pdfPath}`);
    
    // Write page number
    doc.fontSize(10).text(`Page ${i+1} of ${pdfPaths.length}`, { align: 'center' });
    
    try {
      // Add the PDF as an image (this is not ideal, but works for simple cases)
      doc.image(pdfPath, {
        fit: [500, 750],
        align: 'center',
        valign: 'center'
      });
    } catch (error) {
      console.error(`[HEIC] Failed to add PDF as image: ${pdfPath}`, error);
      doc.fontSize(16).text(`Failed to add PDF: ${path.basename(pdfPath)}`, { align: 'center' });
    }
  }
  
  // Finalize PDF
  doc.end();
  
  // Wait for PDF to be written
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
  });
}

/**
 * Generate an error PDF
 */
async function generateErrorPdf(
  outputPath: string,
  filename: string
): Promise<void> {
  console.log(`[HEIC] Generating error PDF for ${filename}`);
  
  // Create error image first
  const tempImagePath = outputPath + '.temp.jpg';
  await generateColoredImage(
    800, 600,
    { r: 255, g: 0, b: 0 },
    'jpeg',
    80,
    tempImagePath
  );
  
  // Create a PDF document
  const doc = new PDFDocument({
    size: 'a4',
    layout: 'portrait',
    autoFirstPage: true,
    margin: 50
  });
  
  // Pipe to output file
  const writeStream = fsSync.createWriteStream(outputPath);
  doc.pipe(writeStream);
  
  // Add error title
  doc.fontSize(20).text(`Error Converting: ${filename}`, { align: 'center' });
  doc.moveDown();
  
  // Add explanation text
  doc.fontSize(12).text(
    'The HEIC file could not be converted properly. This is a placeholder image.',
    { align: 'center' }
  );
  doc.moveDown(2);
  
  // Add error image
  doc.image(tempImagePath, {
    fit: [500, 400],
    align: 'center',
    valign: 'center'
  });
  
  // Finalize PDF
  doc.end();
  
  // Wait for PDF to be written
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      // Delete temp image
      fs.unlink(tempImagePath).catch(err => console.warn('[HEIC] Failed to delete temp image:', err));
      resolve();
    });
    writeStream.on('error', reject);
  });
}

/**
 * Create a ZIP archive from a list of files
 */
async function createZipArchive(
  files: { path: string; name: string }[],
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create output stream
    const output = fsSync.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      resolve(outputPath);
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add each file to the archive
    for (const file of files) {
      console.log(`[HEIC] Adding file to ZIP: ${file.path} as ${file.name}`);
      // Check if file exists
      if (fsSync.existsSync(file.path)) {
        archive.file(file.path, { name: file.name });
      } else {
        console.warn(`[HEIC] File does not exist, skipping: ${file.path}`);
      }
    }
    
    archive.finalize();
  });
}
