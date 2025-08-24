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
              window.originalConsole = {
                log: console.log,
                warn: console.warn,
                error: console.error,
                debug: console.debug,
                info: console.info,
                trace: console.trace,
                table: console.table,
                group: console.group,
                groupEnd: console.groupEnd,
                groupCollapsed: console.groupCollapsed,
                time: console.time,
                timeEnd: console.timeEnd,
                count: console.count,
                countReset: console.countReset,
                clear: console.clear
              };

              // Function to disable console
              window.disableConsole = function() {
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
              };

              // Function to enable console
              window.enableConsole = function() {
                Object.assign(console, window.originalConsole);
              };

              // Global keyboard shortcut handler for admin access
              document.addEventListener('keydown', function(event) {
                if (event.altKey && event.shiftKey && event.key === 'Y') {
                  event.preventDefault();
                  window.location.href = '/rag/droid';
                }
              });

              // Check if current page is admin exam page and enable console accordingly
              function checkConsoleAccess() {
                const currentPath = window.location.pathname;
                if (currentPath === '/rag/droid') {
                  window.enableConsole();
                } else {
                  window.disableConsole();
                }
              }

              // Initial check
              checkConsoleAccess();

              // Monitor route changes for SPA navigation
              let lastUrl = location.href;
              new MutationObserver(() => {
                const url = location.href;
                if (url !== lastUrl) {
                  lastUrl = url;
                  setTimeout(checkConsoleAccess, 100); // Small delay to ensure route change is complete
                }
              }).observe(document, { subtree: true, childList: true });

              // Also check on popstate (back/forward navigation)
              window.addEventListener('popstate', () => {
                setTimeout(checkConsoleAccess, 100);
              });
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
