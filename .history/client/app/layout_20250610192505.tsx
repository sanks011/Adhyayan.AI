import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Adhyayan AI - AI-Powered Learning Platform",
  description: "Transform your learning with AI-powered mind maps and interactive study tools",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1f2937",
                border: "1px solid #374151",
                color: "#f9fafb",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
