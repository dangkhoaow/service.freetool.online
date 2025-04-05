// Simple Express API server for the HEIC converter service
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');

// Import our queue manager
const { addJob, getJobStatus } = require('./lib/queue/queue-manager.ts');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/temp'));
  },
  filename: function (req, file, cb) {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

// Create Express app
const app = express();

// Configure CORS - using a function to set the appropriate origin
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed
    const allowedOrigins = ['http://localhost:3000', 'https://freetool.online'];
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, origin);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-upload-content-type', 'x-upload-content-length'],
  credentials: true
}));

// Add OPTIONS handler for preflight requests
app.options('*', cors());

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const tempUploadsDir = path.join(uploadsDir, 'temp');
const convertedDir = path.join(uploadsDir, 'converted');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true });
}
if (!fs.existsSync(convertedDir)) {
  fs.mkdirSync(convertedDir, { recursive: true });
}

// Serve files from uploads directory
app.use('/api/heic-converter/files', express.static(path.join(__dirname, 'uploads')));

// HEIC Converter API endpoint
app.post('/api/heic-converter', upload.array('files', 20), async (req, res) => {
  try {
    console.log('Received conversion request');
    
    // Extract files from request
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Get conversion settings from form data
    const outputFormat = req.body.outputFormat || 'jpg';
    const quality = parseInt(req.body.quality || '80', 10);
    
    // Generate job ID
    const jobId = uuidv4();
    
    // Extract user ID from authorization header or use anonymous
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : 'anonymous';
    const userId = token.startsWith('user_') ? token.substring(5) : 'anonymous';
    
    // Add job to the queue
    await addJob({
      jobId,
      userId,
      files: files.map(file => ({
        name: file.originalname,
        path: file.path,
        size: file.size,
        type: file.mimetype,
        lastModified: new Date().getTime()
      })),
      outputFormat,
      quality,
      pdfOptions: {
        pageSize: 'a4',
        orientation: 'portrait'
      },
      priority: 1
    });
    
    // Return response with job ID
    return res.status(200).json({
      success: true,
      jobId,
      message: 'Conversion job added to queue',
      filesCount: files.length
    });
  } catch (error) {
    console.error('Error processing HEIC conversion request:', error);
    return res.status(500).json({
      error: 'Failed to process conversion request',
      details: error.message
    });
  }
});

// Get job status endpoint
app.get('/api/heic-converter/jobs/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log(`Received job status request for job ID: ${jobId}`);
    
    if (!jobId) {
      console.log('No job ID provided');
      return res.status(400).json({ error: 'Job ID is required' });
    }
    
    console.log(`Fetching job status for ID: ${jobId}`);
    const job = await getJobStatus(jobId);
    console.log(`Job data from queue:`, job ? 'found' : 'not found');
    
    if (!job) {
      console.log(`Job ${jobId} not found in the system`);
      return res.status(404).json({ error: 'Job not found' });
    }
    
    console.log(`Returning job status for ${jobId}:`, job.status);
    return res.status(200).json(job);
  } catch (error) {
    console.error('Error checking job status:', error);
    return res.status(500).json({
      error: 'Failed to check job status',
      details: error.message
    });
  }
});

// ZIP download endpoint
app.get('/api/heic-converter/files/download-zip/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log(`Received ZIP download request for job: ${jobId}`);
    
    // Get the job data
    const job = await getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Create a proper ZIP file with actual converted files
    const zipPath = path.join(__dirname, 'uploads', 'temp', `${jobId}.zip`);
    
    // Use archiver to create a real ZIP file
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Create a write stream for the ZIP file
    const output = fs.createWriteStream(zipPath);
    
    // Listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on('close', function() {
      console.log(`ZIP archive created: ${archive.pointer()} total bytes`);
      
      // Set headers for downloading
      res.setHeader('Content-Disposition', `attachment; filename="converted-${job.outputFormat}-${new Date().toISOString().slice(0, 10)}.zip"`);
      res.setHeader('Content-Type', 'application/zip');
      
      // Send the file
      res.sendFile(zipPath, (err) => {
        if (err) {
          console.error('Error sending ZIP file:', err);
        }
        
        // Clean up the temporary ZIP file after sending
        fs.unlink(zipPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting temporary ZIP file:', unlinkErr);
          }
        });
      });
    });
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    // Add each converted file to the ZIP
    let filesAdded = 0;
    for (const file of job.files) {
      if (file.status === 'completed' && file.convertedPath) {
        // Get the actual file path by decoding the URL-encoded path
        const decodedPath = decodeURIComponent(file.convertedPath);
        const filePath = path.join(__dirname, 'uploads', decodedPath);
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
          // Add the file with its converted name
          archive.file(filePath, { name: file.convertedName || path.basename(filePath) });
          filesAdded++;
          console.log(`Added file to ZIP: ${filePath}`);
        } else {
          console.warn(`File not found for ZIP: ${filePath}`);
        }
      }
    }
    
    if (filesAdded === 0) {
      return res.status(404).json({ error: 'No valid files found to include in ZIP' });
    }
    
    // Finalize the archive (i.e. we are done appending files but streams have to finish)
    archive.finalize();
    
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    res.status(500).json({ error: 'Failed to create ZIP file' });
  }
});

// File download endpoint - this should be AFTER the download-zip endpoint to avoid route conflicts
app.get('/api/heic-converter/files/:filePath+', (req, res) => {
  try {
    const { filePath } = req.params;
    console.log(`Received file download request for: ${filePath}`);
    
    // Make sure the file exists
    const fullPath = path.join(__dirname, 'uploads', filePath);
    console.log(`Looking for file at: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${fullPath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Determine the filename from the path
    const filename = path.basename(filePath);
    
    // Set headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

module.exports = app;
