"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  LogOut,
  BarChart,
  Server
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    // Clear admin token and redirect to login
    if (typeof window !== "undefined") {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin/login";
    }
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: "Users",
      path: "/admin/users",
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: "Worker Stats",
      path: "/admin/workers",
      icon: <Server className="w-5 h-5" />,
    },
    {
      name: "Job Reports",
      path: "/admin/reports",
      icon: <BarChart className="w-5 h-5" />,
    },
    {
      name: "Settings",
      path: "/admin/settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white shadow-md">
        <div className="flex flex-col flex-1">
          <div className="px-4 py-6 border-b">
            <h2 className="text-xl font-bold">
              FreeTool <span className="text-primary">Admin</span>
            </h2>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-4 py-3 rounded-md ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-gray-700 rounded-md hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden bg-white shadow-sm py-4 px-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          FreeTool <span className="text-primary">Admin</span>
        </h2>
        
        {/* Mobile menu button would go here */}
      </div>

      {/* Main content */}
      <div className="md:ml-64 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
