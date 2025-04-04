"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import AdminLayout from "@/components/admin/admin-layout";
import { useRouter } from "next/navigation";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// System metrics interface
interface SystemMetrics {
  cpu: number;
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  uptime: number;
}

// Queue stats interface
interface QueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
}

// Worker stats interface
interface WorkerStats {
  id: string;
  status: "active" | "idle";
  jobsProcessed: number;
  currentJob?: {
    id: string;
    type: string;
    progress: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [workers, setWorkers] = useState<WorkerStats[]>([]);
  const [chartData, setChartData] = useState({
    labels: Array(30).fill("").map((_, i) => `${i + 1}s ago`).reverse(),
    datasets: [
      {
        label: "CPU Usage (%)",
        data: Array(30).fill(0),
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
      {
        label: "Memory Usage (%)",
        data: Array(30).fill(0),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) {
          router.push("/admin/login");
          return;
        }

        const response = await fetch("/api/admin/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          router.push("/admin/login");
          return;
        }

        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/admin/login");
      }
    };

    checkAuth();
  }, [router]);

  // Fetch initial data
  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
      fetchQueueStats();
      fetchWorkers();

      // Set up interval for live updates
      const interval = setInterval(() => {
        fetchMetrics();
        fetchQueueStats();
        fetchWorkers();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Update chart when metrics change
  useEffect(() => {
    if (metrics) {
      setChartData((prevData) => {
        const cpuData = [...prevData.datasets[0].data.slice(1), metrics.cpu];
        const memoryData = [...prevData.datasets[1].data.slice(1), metrics.memory.percentage];

        return {
          ...prevData,
          datasets: [
            {
              ...prevData.datasets[0],
              data: cpuData,
            },
            {
              ...prevData.datasets[1],
              data: memoryData,
            },
          ],
        };
      });
    }
  }, [metrics]);

  // Fetch system metrics
  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/metrics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  // Fetch queue statistics
  const fetchQueueStats = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/queue/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQueueStats(data);
      }
    } catch (error) {
      console.error("Error fetching queue stats:", error);
    }
  };

  // Fetch worker information
  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/workers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkers(data);
      }
    } catch (error) {
      console.error("Error fetching workers:", error);
    }
  };

  // Format bytes to readable format
  const formatBytes = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Byte";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
  };

  // Format uptime to readable format
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workers">Workers</TabsTrigger>
            <TabsTrigger value="queue">Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.cpu.toFixed(2)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.memory.percentage.toFixed(2)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(metrics?.memory.used || 0)} / {formatBytes(metrics?.memory.total || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.disk.percentage.toFixed(2)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(metrics?.disk.used || 0)} / {formatBytes(metrics?.disk.total || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatUptime(metrics?.uptime || 0)}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>System Metrics History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Line
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          title: {
                            display: true,
                            text: "Usage (%)",
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map((worker) => (
                <Card key={worker.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Worker {worker.id}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            worker.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {worker.status}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Jobs Processed:</span>
                        <span>{worker.jobsProcessed}</span>
                      </div>
                      
                      {worker.currentJob && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Current Job:</span>
                            <span>{worker.currentJob.id}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Progress:</span>
                            <span>{worker.currentJob.progress}%</span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${worker.currentJob.progress}%` }}
                            ></div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queueStats?.active || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Waiting Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queueStats?.waiting || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queueStats?.completed || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queueStats?.failed || 0}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
