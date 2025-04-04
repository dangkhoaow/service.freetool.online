"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/admin-layout";

// Sample user data structure - this would come from a database in a real implementation
interface User {
  id: string;
  email: string;
  name: string;
  status: "Free" | "Paid";
  joinedAt: string;
  lastActive: string;
  stripeCustomerId?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Placeholder data - in a real implementation, this would come from an API call
  const [users] = useState<User[]>([
    {
      id: "1",
      email: "user1@example.com",
      name: "John Doe",
      status: "Free",
      joinedAt: "2023-01-15",
      lastActive: "2023-04-02",
    },
    {
      id: "2",
      email: "user2@example.com",
      name: "Jane Smith",
      status: "Paid",
      joinedAt: "2023-02-20",
      lastActive: "2023-04-03",
      stripeCustomerId: "cus_123456",
    },
    {
      id: "3",
      email: "user3@example.com",
      name: "Robert Johnson",
      status: "Free",
      joinedAt: "2023-03-10",
      lastActive: "2023-04-01",
    },
  ]);

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

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold mb-6">Users</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <Input
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button variant="outline">Export Users</Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.status === "Paid" ? "default" : "outline"}
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.joinedAt}</TableCell>
                        <TableCell>{user.lastActive}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm">View</Button>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Showing {filteredUsers.length} of {users.length} users
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-md border border-dashed text-center">
              <p className="text-gray-500">
                This is a placeholder for the user management system.<br />
                In the future, it will be connected to a database and integrate with Stripe payment data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
