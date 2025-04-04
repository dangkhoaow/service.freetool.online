# FreeTool HEIC Converter Backend Service

This is the backend service for the HEIC conversion functionality on freetool.online. It handles asynchronous conversion of HEIC files to various formats including JPG, PNG, WEBP, and PDF with customizable options.

## Features

- **Asynchronous Job Processing**: Uses BullMQ with Redis for reliable job queue management
- **Priority Queue System**: Higher priority for paid users
- **Real-time Updates**: WebSocket integration for live job status updates
- **Secure Authentication**: JWT-based authentication system
- **Admin Dashboard**: Monitor system resources, worker activities, and manage settings
- **Flexible Storage**: Support for both local file storage and Amazon S3
- **Conversion Options**:
  - Output formats: JPG, PNG, WEBP, PDF
  - Quality settings
  - PDF orientation and page size options
  - AI Optimization (placeholder for future implementation)

## System Architecture

The service is built with the following architecture:

- **Frontend Communication**: REST API endpoints with JWT authentication
- **Job Queue**: BullMQ with Redis for reliable job processing
- **Workers**: Background processing for file conversions
- **WebSockets**: Real-time job status updates
- **Storage**: Configurable local or S3 storage

## Setup and Installation

### Prerequisites

- Node.js 18.x or higher
- Redis server (for BullMQ job queue)
- NPM or Yarn for package management

### Environment Setup

1. Clone the repository:
   ```
   git clone [repository-url]
   cd service.freetool.online
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables by copying the `.env.local.example` to `.env.local` and setting appropriate values:
   ```
   cp .env.local.example .env.local
   ```

4. Ensure Redis is running locally (or update environment variables to point to your Redis instance)

### Running the Service

#### Development Mode

```
npm run dev
```

This will start the development server with hot reloading.

#### Production Mode

```
npm run build
npm start
```

## API Endpoints

### HEIC Conversion

**POST /api/heic-converter**

Endpoint for uploading HEIC files and starting the conversion process.

**Request Headers:**
- `Authorization`: Bearer token for authentication

**Request Body (multipart/form-data):**
- `files`: One or more HEIC files
- `outputFormat`: Target format ('jpg', 'png', 'webp', or 'pdf')
- `quality`: Image quality (1-100)
- `pageSize`: PDF page size (when outputFormat is 'pdf')
- `orientation`: PDF orientation (when outputFormat is 'pdf')

**Response:**
```json
{
  "success": true,
  "jobId": "job-uuid",
  "message": "Conversion job added to queue",
  "filesCount": 3
}
```

### Job Status

**GET /api/jobs/status?id={jobId}**

Get the current status of a conversion job.

**Request Headers:**
- `Authorization`: Bearer token for authentication

**Response:**
```json
{
  "id": "job-uuid",
  "state": "completed",
  "progress": {
    "status": "processing",
    "fileIndex": 2,
    "totalFiles": 5,
    "percentage": 40
  },
  "data": {
    "userId": "user-id",
    "priority": 10
  }
}
```

### File Download

**GET /api/files/{filePath}**

Download a converted file.

**Request Headers:**
- `Authorization`: Bearer token for authentication

**Response:**
The file content with appropriate content-type and content-disposition headers.

## Admin Dashboard

The admin dashboard provides monitoring and configuration capabilities:

- `/admin/dashboard`: System monitoring (CPU, memory, disk usage)
- `/admin/workers`: View and manage worker processes
- `/admin/settings`: Configure storage settings (local disk or S3)
- `/admin/users`: View user list (placeholder for future implementation)

Admin access requires login with the configured admin credentials.

## Worker Process

The worker process handles file conversions in the background. Features include:

- Concurrent processing of multiple jobs
- Prioritization based on user status
- Progress reporting through WebSockets
- Error handling and retry mechanisms

## Future Expansion

The service is designed for future expansion with:

- Google OAuth integration for user authentication
- Stripe subscription integration for paid users
- User management with role-based permissions
- Additional conversion options and optimizations

## License

Copyright © 2025 FreeTool. All rights reserved.
