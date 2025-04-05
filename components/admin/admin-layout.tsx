"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { BarChart3, Settings, Users, Menu, X, LogOut, FileText, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Settings", href: "/admin/settings", icon: Settings },
    { name: "Logs", href: "/admin/logs", icon: FileText },
  ]

  const handleLogout = () => {
    // Clear the admin token
    localStorage.removeItem("adminToken")
    // Redirect to login page
    router.push("/admin/login")
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out md:static md:z-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-6">
            <Link href="/" className="text-xl font-bold">
              Admin Panel
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="md:hidden">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator />

          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link href="/" className="flex items-center px-4 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-100">
              <Home className="mr-3 h-5 w-5" />
              Back to Home
            </Link>

            <Separator className="my-2" />

            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm rounded-md ${
                    isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-4">
            <Button variant="outline" className="w-full flex items-center justify-center" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="ml-auto text-sm text-gray-500">Admin User</div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-gray-100">{children}</main>
      </div>
    </div>
  )
}

