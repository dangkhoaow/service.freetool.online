import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { verifyToken } from '@/lib/auth/jwt';

let io: SocketServer | null = null;

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(httpServer: HttpServer) {
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
  
  io = new SocketServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = await verifyToken(token);
      
      // Attach user data to socket for future reference
      socket.data.user = {
        id: decoded.userId,
        role: decoded.role,
      };
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    
    if (userId) {
      // Join user to a room with their ID for targeted messages
      socket.join(userId);
      
      console.log(`User ${userId} connected to WebSocket`);
      
      // Handle subscription to job updates
      socket.on('subscribe:job', (jobId) => {
        socket.join(`job:${jobId}`);
        console.log(`User ${userId} subscribed to job ${jobId}`);
      });
      
      // Handle unsubscription from job updates
      socket.on('unsubscribe:job', (jobId) => {
        socket.leave(`job:${jobId}`);
        console.log(`User ${userId} unsubscribed from job ${jobId}`);
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected from WebSocket`);
      });
    }
  });

  return io;
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketInstance() {
  return io;
}

/**
 * Send a message to a specific user
 */
export function sendToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(userId).emit(event, data);
  }
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
