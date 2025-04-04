import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { UploadedFile } from '@/lib/utils/form-parser';
import { processHeicConversion } from '@/lib/conversion/heic-converter';
import { getWebSocketInstance } from '@/lib/websocket/websocket-server';
import Redis from 'ioredis';

// Redis connection
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// Create Redis connection
const connection = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

// Define queue for HEIC conversion jobs
export const conversionQueue = new Queue('heic-conversion', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Listen for queue events
const queueEvents = new QueueEvents('heic-conversion', { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  // Notify client via WebSocket
  const { userId, status, result } = JSON.parse(returnvalue);
  const io = getWebSocketInstance();
  if (io) {
    io.to(userId).emit('job:completed', { jobId, status, result });
  }
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  // Get job data to access userId
  conversionQueue.getJob(jobId).then(job => {
    if (job) {
      const userId = job.data.userId;
      const io = getWebSocketInstance();
      if (io) {
        io.to(userId).emit('job:failed', { jobId, error: failedReason });
      }
    }
  });
});

queueEvents.on('progress', ({ jobId, data }) => {
  // Update progress via WebSocket
  const progress = JSON.parse(data);
  const { userId } = progress;
  const io = getWebSocketInstance();
  if (io) {
    io.to(userId).emit('job:progress', { jobId, progress });
  }
});

// Job data interface
export interface ConversionJobData {
  jobId: string;
  userId: string;
  files: UploadedFile[];
  outputFormat: string;
  quality: number;
  pdfOptions: {
    pageSize: string;
    orientation: string;
  };
  priority: number;
}

// Initialize worker to process jobs
export function initWorker() {
  const worker = new Worker(
    'heic-conversion',
    async (job: Job<ConversionJobData>) => {
      const { userId, files, outputFormat, quality, pdfOptions } = job.data;
      
      try {
        // Report progress: starting
        await job.updateProgress({ userId, status: 'processing', fileIndex: 0, totalFiles: files.length });
        
        // Process HEIC conversion
        const result = await processHeicConversion(files, outputFormat, quality, pdfOptions, async (progress) => {
          // Update progress during conversion
          await job.updateProgress({ userId, ...progress });
        });
        
        // Return results
        return JSON.stringify({
          userId,
          status: 'completed',
          result
        });
      } catch (error) {
        console.error('Error processing conversion job:', error);
        throw new Error(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    { connection, concurrency: 3 }  // Process 3 jobs concurrently
  );

  // Handle worker errors
  worker.on('error', err => {
    console.error('Worker error:', err);
  });

  return worker;
}

// Add job to queue
export async function addJob(jobData: ConversionJobData) {
  return await conversionQueue.add('convert', jobData, {
    priority: jobData.priority,
    jobId: jobData.jobId,
  });
}

// Get job by ID
export async function getJob(jobId: string) {
  return await conversionQueue.getJob(jobId);
}

// Get job status
export async function getJobStatus(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;
  
  const state = await job.getState();
  const progress = job.progress as { status: string; fileIndex: number; totalFiles: number } || { status: 'unknown' };
  
  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    attempts: job.attemptsMade,
    timestamp: job.timestamp,
  };
}

// Get active jobs count
export async function getActiveJobsCount() {
  return await conversionQueue.getActiveCount();
}

// Get waiting jobs count
export async function getWaitingJobsCount() {
  return await conversionQueue.getWaitingCount();
}

// Get completed jobs count
export async function getCompletedJobsCount() {
  return await conversionQueue.getCompletedCount();
}

// Get failed jobs count
export async function getFailedJobsCount() {
  return await conversionQueue.getFailedCount();
}
