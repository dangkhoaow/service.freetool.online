"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto py-4 px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">FreeTool Service Backend</h1>
            <div>
              <Link href="/admin/login">
                <Button variant="outline">Admin Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Service Status: Online</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <p className="text-green-700 font-medium">All systems operational</p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">API Service</span>
                  <span className="text-green-600">Online</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Job Queue</span>
                  <span className="text-green-600">Online</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Worker Processes</span>
                  <span className="text-green-600">Online</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">WebSocket Server</span>
                  <span className="text-green-600">Online</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">HEIC Converter Service</h3>
                  <p className="text-sm text-gray-600">
                    Backend service for processing HEIC image conversions to various formats including JPG, PNG, WEBP,
                    and PDF.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Supported Features</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Asynchronous job processing</li>
                    <li>Priority queue for paid users</li>
                    <li>Real-time job status updates via WebSockets</li>
                    <li>Secure file handling and storage</li>
                    <li>Comprehensive admin dashboard</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">API Endpoints</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>
                      <code>/api/heic-converter</code> - HEIC conversion endpoint
                    </li>
                    <li>
                      <code>/api/jobs/status</code> - Job status endpoint
                    </li>
                    <li>
                      <code>/api/files/[path]</code> - File download endpoint
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Authentication</h3>
                  <p className="text-sm text-gray-600">
                    All API endpoints require JWT authentication. Tokens are issued securely and validated for each
                    request.
                  </p>
                </div>

                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    View Full Documentation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t py-6">
        <div className="container mx-auto px-6">
          <div className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} FreeTool Service Backend. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

