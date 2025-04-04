"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import AdminLayout from "@/components/admin/admin-layout";

interface StorageSettings {
  type: "local" | "s3";
  localPath: string;
  s3: {
    bucketName: string;
    region: string;
    accessKey: string;
    secretKey: string;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<StorageSettings>({
    type: "local",
    localPath: "./uploads",
    s3: {
      bucketName: "",
      region: "us-east-1",
      accessKey: "",
      secretKey: "",
    },
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
        fetchSettings();
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/admin/login");
      }
    };

    checkAuth();
  }, [router]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Your changes have been saved successfully",
          status: "success",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save settings",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        status: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateStorageType = (type: "local" | "s3") => {
    setSettings({ ...settings, type });
  };

  const updateLocalPath = (localPath: string) => {
    setSettings({ ...settings, localPath });
  };

  const updateS3Settings = (field: keyof StorageSettings["s3"], value: string) => {
    setSettings({
      ...settings,
      s3: {
        ...settings.s3,
        [field]: value,
      },
    });
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
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Storage Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base">Storage Type</Label>
              <RadioGroup
                value={settings.type}
                onValueChange={(value) => updateStorageType(value as "local" | "s3")}
                className="flex flex-col space-y-2 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="local" id="local" />
                  <Label htmlFor="local">Local Storage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="s3" id="s3" />
                  <Label htmlFor="s3">Amazon S3</Label>
                </div>
              </RadioGroup>
            </div>

            {settings.type === "local" ? (
              <div>
                <Label htmlFor="localPath">Local Storage Path</Label>
                <Input
                  id="localPath"
                  value={settings.localPath}
                  onChange={(e) => updateLocalPath(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Relative to the application root directory or absolute path
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bucketName">S3 Bucket Name</Label>
                  <Input
                    id="bucketName"
                    value={settings.s3.bucketName}
                    onChange={(e) => updateS3Settings("bucketName", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="region">S3 Region</Label>
                  <Input
                    id="region"
                    value={settings.s3.region}
                    onChange={(e) => updateS3Settings("region", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="accessKey">Access Key</Label>
                  <Input
                    id="accessKey"
                    value={settings.s3.accessKey}
                    onChange={(e) => updateS3Settings("accessKey", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={settings.s3.secretKey}
                    onChange={(e) => updateS3Settings("secretKey", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem("adminToken");
                        const response = await fetch("/api/admin/settings/test-s3", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify(settings.s3),
                        });

                        if (response.ok) {
                          toast({
                            title: "Connection Successful",
                            description: "Successfully connected to S3 bucket",
                            status: "success",
                          });
                        } else {
                          const error = await response.json();
                          toast({
                            title: "Connection Failed",
                            description: error.message || "Failed to connect to S3 bucket",
                            status: "error",
                          });
                        }
                      } catch (error) {
                        console.error("Error testing S3 connection:", error);
                        toast({
                          title: "Connection Error",
                          description: "An unexpected error occurred",
                          status: "error",
                        });
                      }
                    }}
                    variant="outline"
                  >
                    Test Connection
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>File Cleanup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-cleanup" className="text-base">Automatic Cleanup</Label>
                  <p className="text-sm text-gray-500">Automatically remove converted files after they've been downloaded</p>
                </div>
                <Switch
                  id="auto-cleanup"
                  checked={true}
                  // This would be connected to a state variable in a real implementation
                />
              </div>

              <div>
                <Label htmlFor="retention">File Retention Period (days)</Label>
                <Input
                  id="retention"
                  type="number"
                  min={1}
                  max={30}
                  value={7}
                  className="mt-1"
                  // This would be connected to a state variable in a real implementation
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
