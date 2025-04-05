"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ToastProps {
  title: string
  description: string
  status?: "success" | "error" | "info"
}

interface ToastContextType {
  toast: (props: ToastProps) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(ToastProps & { id: number })[]>([])
  const [counter, setCounter] = useState(0)

  const addToast = (props: ToastProps) => {
    const id = counter
    setCounter((prev) => prev + 1)
    setToasts((prev) => [...prev, { ...props, id }])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 5000)
  }

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-md shadow-md flex items-start justify-between ${
              toast.status === "error"
                ? "bg-red-50 text-red-900"
                : toast.status === "success"
                  ? "bg-green-50 text-green-900"
                  : "bg-blue-50 text-blue-900"
            }`}
          >
            <div>
              <h3 className="font-medium">{toast.title}</h3>
              <p className="text-sm">{toast.description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeToast(toast.id)} className="h-5 w-5 -mt-1 -mr-1">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function toast(props: ToastProps) {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context.toast(props)
}

