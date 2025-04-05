// Register ts-node to handle TypeScript files directly
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    esModuleInterop: true,
    moduleResolution: 'node',
    allowJs: true,
    baseUrl: '.',
    paths: {
      '@/*': ['./*']
    }
  }
});

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Import the Express API server
const apiServer = require('./api-server');

// Direct imports for TypeScript files
const websocketServer = require('./lib/websocket/websocket-server');
const queueManager = require('./lib/queue/queue-manager');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, './uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialize Next.js app
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Port to run the server on
const port = parseInt(process.env.PORT || '3001', 10);

// Prepare the application
app.prepare().then(() => {
  // Create HTTP server that handles both Next.js and Express API requests
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Apply CORS middleware
    cors({
      origin: ['http://localhost:3000', 'http://localhost:3001', 'https://freetool.online'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'adminToken']
    })(req, res, () => {
      // Let Next.js handle all requests, including API routes
      handle(req, res, parsedUrl);
    });
  });

  // Initialize WebSocket server
  const io = websocketServer.initWebSocketServer(server);
  console.log('WebSocket server initialized');

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });

  // Handle graceful shutdown
  function shutdown() {
    console.log('Server is shutting down...');
    
    // Close WebSocket server
    if (io) {
      io.close();
      console.log('WebSocket server closed');
    }

    // Close server
    server.close(() => {
      console.log('HTTP server closed');
    });
  }

  // Listen for termination signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
