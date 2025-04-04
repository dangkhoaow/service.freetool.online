import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { subscribeToJobProgress } from '../queue/queue-manager';

let io: SocketServer | null = null;

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(server: HttpServer) {
  if (io) return io;

  // Create Socket.IO server
  io = new SocketServer(server, {
    cors: {
      origin: '*', // Allow all origins in development mode
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // For development, we'll skip authentication

  // Handle client connections
  if (io) {
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      // Get userId from query parameters
      const userId = socket.handshake.query.userId as string;
      if (userId) {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
      }

      // Handle subscription to job updates
      socket.on('subscribe:job', (jobId: string) => {
        console.log(`Client ${socket.id} subscribed to job ${jobId}`);
        
        // Subscribe to job progress updates
        const unsubscribe = subscribeToJobProgress(jobId, (data) => {
          // Emit job updates to the connected client
          socket.emit('jobUpdate', data);
          console.log(`Emitting job update for ${jobId}:`, JSON.stringify(data).substring(0, 100) + '...');
        });
        
        // Cleanup subscription when client disconnects
        socket.on('disconnect', () => {
          unsubscribe();
          console.log(`Client ${socket.id} unsubscribed from job ${jobId}`);
        });
      });

      // Handle client disconnections
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  console.log('WebSocket server initialized');
  return io;
}

// Get the WebSocket server instance
export function getWebSocketInstance() {
  return io;
}

// Broadcast job updates to all connected clients
export function broadcastJobUpdate(jobId: string, data: any) {
  if (!io) return;
  
  io.emit('jobUpdate', { jobId, ...data });
  console.log(`Broadcasting job update for ${jobId}`);
}

/**
 * Send a message to a specific user
 * @param userId The user ID to send the message to
 * @param event The event name
 * @param data The data to send
 */
export function sendToUser(userId: string, event: string, data: any) {
  if (!io) return;
  
  io.to(userId).emit(event, data);
}

/**
 * Send a message to all subscribers of a job
 */
export function sendJobUpdate(jobId: string, event: string, data: any) {
  if (io) {
    io.to(`job:${jobId}`).emit(event, data);
  }
}

/**
 * Send a message to all admin users
 */
export function sendAdminUpdate(event: string, data: any) {
  if (io) {
    io.to('admin').emit(event, data);
  }
}

/**
 * Send a system-wide broadcast message
 */
export function broadcast(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}
