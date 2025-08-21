"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useKioskMode } from "@/hooks/use-kiosk-mode"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Lock, Unlock, AlertTriangle, Eye, EyeOff } from "lucide-react"

interface ProtectedWindowProps {
  children: ReactNode
  enabled?: boolean
  onViolation?: (violation: string) => void
  onModeChange?: (isProtected: boolean) => void
  title?: string
  showViolations?: boolean
}

export function ProtectedWindow({
  children,
  enabled = false,
  onViolation,
  onModeChange,
  title = "Protected Exam Environment",
  showViolations = false,
}: ProtectedWindowProps) {
  const [isProtected, setIsProtected] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [violationCount, setViolationCount] = useState(0)

  const handleViolation = (violation: string) => {
    setViolationCount((prev) => prev + 1)
    onViolation?.(violation)
  }

  const { isKioskActive, violations, enterKioskMode, exitKioskMode, clearViolations } = useKioskMode(isProtected, {
    onViolation: () => handleViolation("Security violation detected"),
  })

  const enableProtection = async () => {
    setShowWarning(true)
  }

  const confirmProtection = async () => {
    setIsProtected(true)
    setShowWarning(false)
    clearViolations()
    setViolationCount(0)
    await enterKioskMode()
    onModeChange?.(true)
  }

  const disableProtection = async () => {
    setIsProtected(false)
    await exitKioskMode()
    onModeChange?.(false)
  }

  useEffect(() => {
    if (enabled && !isProtected) {
      enableProtection()
    }
  }, [enabled])

  // Warning modal before entering protected mode
  if (showWarning) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl border-orange-300 shadow-2xl">
          <CardHeader className="bg-orange-50 border-b border-orange-200">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-orange-600" />
              <div>
                <CardTitle className="text-xl text-orange-800">Enter Protected Exam Mode</CardTitle>
                <p className="text-sm text-orange-600 mt-1">Secure testing environment will be activated</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Important Security Notice:</strong> Once activated, this mode will restrict your computer access
                to ensure exam integrity.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Protected Mode Features:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span>Fullscreen mode enforced</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span>Keyboard shortcuts disabled</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <EyeOff className="h-4 w-4 text-blue-600" />
                  <span>Right-click menu blocked</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <span>Window switching prevented</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span>Developer tools blocked</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span>System shortcuts disabled</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">What will be blocked:</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• Alt+Tab, Windows key, Ctrl+Alt+Del</p>
                <p>• F12, Ctrl+Shift+I (Developer Tools)</p>
                <p>• F5, Ctrl+R (Page Refresh)</p>
                <p>• Ctrl+T, Ctrl+N (New Tabs/Windows)</p>
                <p>• Right-click context menu</p>
                <p>• Text selection and copy/paste</p>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-800 text-sm">
                <strong>Note:</strong> You can exit protected mode after completing your exam. This ensures a fair
                testing environment for all students.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={confirmProtection} className="flex-1 bg-green-600 hover:bg-green-700">
                <Lock className="h-4 w-4 mr-2" />
                Activate Protected Mode
              </Button>
              <Button onClick={() => setShowWarning(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isProtected ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Protected Mode Status Bar */}
      {isProtected && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium">PROTECTED EXAM MODE ACTIVE</span>
            <Badge variant="secondary" className="bg-red-700 text-red-100">
              Secure
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            {violationCount > 0 && (
              <Badge variant="destructive" className="bg-yellow-600">
                {violationCount} Violation{violationCount !== 1 ? "s" : ""}
              </Badge>
            )}
            <Button
              onClick={disableProtection}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-100 hover:bg-red-700 bg-transparent"
            >
              <Unlock className="h-3 w-3 mr-1" />
              Exit Protected Mode
            </Button>
          </div>
        </div>
      )}

      {/* Violation Alerts */}
      {showViolations && violations.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Security Violations Detected:</span>
          </div>
          <div className="mt-2 space-y-1">
            {violations.slice(-3).map((violation, index) => (
              <p key={index} className="text-xs text-yellow-700">
                • {violation}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isProtected ? "p-0" : "p-4"}`}>
        {!isProtected && !enabled && (
          <div className="mb-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Standard Mode</p>
                      <p className="text-sm text-blue-700">Click to enable exam protection</p>
                    </div>
                  </div>
                  <Button onClick={enableProtection} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Lock className="h-4 w-4 mr-2" />
                    Enable Protection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {children}
      </div>

      {/* Fullscreen overlay for kiosk mode */}
      {isKioskActive && (
        <style jsx global>{`
          body {
            overflow: hidden !important;
          }
          
          /* Hide scrollbars */
          ::-webkit-scrollbar {
            display: none;
          }
          
          /* Disable text selection */
          * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }
          
          /* Disable drag and drop */
          * {
            -webkit-user-drag: none !important;
            -khtml-user-drag: none !important;
            -moz-user-drag: none !important;
            -o-user-drag: none !important;
            user-drag: none !important;
          }
        `}</style>
      )}
    </div>
  )
}
