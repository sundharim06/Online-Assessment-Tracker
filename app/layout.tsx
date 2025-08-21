import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/toaster"
import { GlobalRefreshProtection } from "@/components/global-refresh-protection"

export const metadata: Metadata = {
  title: "Online Assessment System",
  description: "Secure assessment platform with OAuth authentication",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Disable all console methods globally
              console.log = function() {};
              console.warn = function() {};
              console.error = function() {};
              console.debug = function() {};
              console.info = function() {};
              console.trace = function() {};
              console.table = function() {};
              console.group = function() {};
              console.groupEnd = function() {};
              console.groupCollapsed = function() {};
              console.time = function() {};
              console.timeEnd = function() {};
              console.count = function() {};
              console.countReset = function() {};
              console.clear = function() {};
            `,
          }}
        />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <GlobalRefreshProtection />
            {children}
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
