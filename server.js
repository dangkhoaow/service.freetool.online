// Register ts-node to handle TypeScript files directly
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    esModuleInterop: true
  }
});

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// Import the Express API server
const apiServer = require('./api-server');

// Direct imports for TypeScript files
const websocketServer = require('./lib/websocket/websocket-server');
const queueManager = require('./lib/queue/queue-manager');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, 'uploads/temp');
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
    
    // If it's an API request, let the Express API server handle it
    if (req.url.startsWith('/api/')) {
      apiServer(req, res);
      return;
    }

    // Otherwise, let Next.js handle it
    handle(req, res, parsedUrl);
  });

  // Initialize WebSocket server
  const io = websocketServer.initWebSocketServer(server);
  console.log('WebSocket server initialized');

  // Start the server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server...');
    
    // Close the server
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  // Listen for termination signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
