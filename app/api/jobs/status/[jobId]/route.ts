import { NextRequest, NextResponse } from "next/server";
import { getJobStatus } from "@/lib/queue/queue-manager";
import { extractUserIdFromToken } from "@/lib/auth/auth-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  console.log("=== Job status endpoint called ===");
  console.log("Request URL:", request.url);
  console.log("Request headers:", request.headers);

  try {
    const jobId = params.jobId;
    console.log("Job ID from path:", jobId);
    
    // Extract bearer token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    console.log("Auth token:", token);
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Use extractUserIdFromToken instead of verifyUser
    const userId = extractUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    console.log("Calling getJobStatus with jobId:", jobId);
    const jobStatus = await getJobStatus(jobId);
    if (!jobStatus) {
      console.log("Job not found in queue or completed jobs");
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    
    // Ensure we return all file information
    const response = {
      ...jobStatus,
      files: jobStatus.files.map(file => ({
        ...file,
        convertedPath: file.convertedPath,
        thumbnailUrl: file.thumbnailUrl,
        convertedName: file.convertedName,
        status: file.status
      }))
    };
    
    console.log("Returning job status:", response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error in job status endpoint:", {
      error: error,
      stack: error.stack,
      message: error.message
    });
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
