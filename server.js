const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initWebSocketServer } = require('./lib/websocket/websocket-server');
const { initWorker } = require('./lib/queue/queue-manager');

// Initialize Next.js app
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Port to run the server on
const port = parseInt(process.env.PORT || '3001', 10);

// Prepare the application
app.prepare().then(() => {
  // Create HTTP server
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize WebSocket server
  initWebSocketServer(server);

  // Initialize worker for processing jobs
  const worker = initWorker();

  console.log(`Worker initialized with ID: ${worker.id}`);

  // Start the server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server...');
    
    // Close the worker
    worker.close().then(() => {
      console.log('Worker closed');
      
      // Close the server
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  };

  // Listen for termination signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
