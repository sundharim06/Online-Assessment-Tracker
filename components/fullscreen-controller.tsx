"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Maximize, Minimize, AlertTriangle, Monitor } from "lucide-react"

interface FullscreenControllerProps {
  enabled: boolean
  onFullscreenChange?: (isFullscreen: boolean) => void
  onViolation?: (violation: string, reason: string) => void
  autoEnter?: boolean
  preventExit?: boolean
  showControls?: boolean
  violationLimit?: number
  onTerminate?: () => void
}

export function FullscreenController({
  enabled,
  onFullscreenChange,
  onViolation,
  autoEnter = false,
  preventExit = false,
  showControls = true,
  violationLimit = 3,
  onTerminate,
}: FullscreenControllerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [exitAttempts, setExitAttempts] = useState(0)
  const [showExitWarning, setShowExitWarning] = useState(false)

  // Check if fullscreen API is supported
  useEffect(() => {
    const supported = !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    )
    setIsSupported(supported)
  }, [])

  // Monitor fullscreen state changes
  const handleFullscreenChange = useCallback(() => {
    const fullscreenElement =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement

    const newIsFullscreen = !!fullscreenElement
    setIsFullscreen(newIsFullscreen)
    onFullscreenChange?.(newIsFullscreen)

    // If user exits fullscreen while protection is enabled
    if (!newIsFullscreen && enabled && preventExit) {
      const newAttempts = exitAttempts + 1
      setExitAttempts(newAttempts)

      if (newAttempts >= violationLimit) {
        onViolation?.(
          `Fullscreen exit violation limit exceeded (${newAttempts}/${violationLimit})`,
          "security_violation",
        )
        onTerminate?.()
        return
      }

      setShowExitWarning(true)
      onViolation?.(`Fullscreen exit attempt ${newAttempts}`, "fullscreen_violation")

      enterFullscreen()
      setShowExitWarning(false)
    }
  }, [enabled, preventExit, onFullscreenChange, onViolation, exitAttempts, violationLimit, onTerminate])

  // Enter fullscreen mode
  const enterFullscreen = useCallback(async () => {
    if (!isSupported) {
      onViolation?.("Fullscreen not supported on this browser", "browser_incompatible")
      return false
    }

    try {
      const element = document.documentElement

      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen()
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen()
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen()
      }

      return true
    } catch (error) {
      onViolation?.("Failed to enter fullscreen mode", "fullscreen_error")
      return false
    }
  }, [isSupported, onViolation])

  // Exit fullscreen mode
  const exitFullscreen = useCallback(async () => {
    if (!isFullscreen) return true

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }

      return true
    } catch (error) {
      onViolation?.("Failed to exit fullscreen mode", "fullscreen_error")
      return false
    }
  }, [isFullscreen, onViolation])

  // Handle escape key in fullscreen
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen && preventExit) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()

        const newAttempts = exitAttempts + 1
        setExitAttempts(newAttempts)

        if (newAttempts >= violationLimit) {
          onViolation?.(`Escape key violation limit exceeded (${newAttempts}/${violationLimit})`, "security_violation")
          onTerminate?.()
          return
        }

        onViolation?.(`Escape key violation - Attempt ${newAttempts}`, "escape_key_violation")

        enterFullscreen()
      }
    },
    [isFullscreen, preventExit, onViolation, enterFullscreen, exitAttempts, violationLimit, onTerminate],
  )

  // Monitor window focus to detect Alt+Tab attempts
  const handleVisibilityChange = useCallback(() => {
    if (enabled && preventExit && document.hidden && isFullscreen) {
      const newAttempts = exitAttempts + 1
      setExitAttempts(newAttempts)

      if (newAttempts >= violationLimit) {
        onViolation?.(`Focus loss violation limit exceeded (${newAttempts}/${violationLimit})`, "security_violation")
        onTerminate?.()
        return
      }

      onViolation?.("Window focus lost - potential Alt+Tab attempt", "focus_loss_violation")
    }
  }, [enabled, preventExit, isFullscreen, onViolation, exitAttempts, violationLimit, onTerminate])

  // Set up event listeners
  useEffect(() => {
    if (enabled) {
      // Fullscreen change events
      document.addEventListener("fullscreenchange", handleFullscreenChange)
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.addEventListener("mozfullscreenchange", handleFullscreenChange)
      document.addEventListener("MSFullscreenChange", handleFullscreenChange)

      // Escape key blocking
      document.addEventListener("keydown", handleEscapeKey, { capture: true })

      // Visibility change monitoring
      document.addEventListener("visibilitychange", handleVisibilityChange)

      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange)
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
        document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
        document.removeEventListener("MSFullscreenChange", handleFullscreenChange)
        document.removeEventListener("keydown", handleEscapeKey, { capture: true })
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    }
  }, [enabled, handleFullscreenChange, handleEscapeKey, handleVisibilityChange])

  // Auto-enter fullscreen when enabled
  useEffect(() => {
    if (enabled && autoEnter && !isFullscreen && isSupported) {
      enterFullscreen()
    }
  }, [enabled, autoEnter, isFullscreen, isSupported, enterFullscreen])

  // Auto-exit fullscreen when disabled
  useEffect(() => {
    if (!enabled && isFullscreen) {
      exitFullscreen()
    }
  }, [enabled, isFullscreen, exitFullscreen])

  if (!isSupported) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Fullscreen Not Supported:</strong> Your browser doesn't support fullscreen mode. Please use a modern
          browser like Chrome, Firefox, or Edge for the best exam experience.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      {showExitWarning && (
        <div className="fixed inset-0 bg-red-900 bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full border-2 border-red-500 shadow-2xl">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
              <h3 className="text-xl font-bold text-red-800">Security Violation Detected</h3>
              <p className="text-red-700">
                Unauthorized attempt to exit fullscreen mode during protected exam session.
              </p>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-sm text-red-600">
                  <strong>Exit Attempts:</strong> {exitAttempts}/{violationLimit}
                </p>
                <p className="text-sm text-red-600">
                  {exitAttempts >= violationLimit
                    ? "Exam will be terminated!"
                    : "Returning to fullscreen mode automatically..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Controls */}
      {showControls && (
        <div className="flex items-center gap-2">
          {!isFullscreen ? (
            <Button
              onClick={enterFullscreen}
              size="sm"
              variant="outline"
              className="flex items-center gap-2 bg-transparent"
              disabled={!isSupported}
            >
              <Maximize className="h-4 w-4" />
              Enter Fullscreen
            </Button>
          ) : (
            <Button
              onClick={exitFullscreen}
              size="sm"
              variant="outline"
              className="flex items-center gap-2 bg-transparent"
              disabled={preventExit}
            >
              <Minimize className="h-4 w-4" />
              {preventExit ? "Protected Mode" : "Exit Fullscreen"}
            </Button>
          )}

          {/* Fullscreen Status Indicator */}
          <div className="flex items-center gap-1 text-sm">
            <Monitor className={`h-4 w-4 ${isFullscreen ? "text-green-600" : "text-gray-400"}`} />
            <span className={isFullscreen ? "text-green-600" : "text-gray-500"}>
              {isFullscreen ? "Fullscreen" : "Windowed"}
            </span>
          </div>
        </div>
      )}

      {/* Fullscreen Status Alert */}
      {enabled && !isFullscreen && (
        <Alert className="border-orange-200 bg-orange-50">
          <Monitor className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Fullscreen Required:</strong> Please enter fullscreen mode for the secure exam environment.
            {exitAttempts > 0 && (
              <span className="block mt-1 text-sm">
                Exit attempts detected: {exitAttempts}/{violationLimit}. Continued violations may result in exam
                termination.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Browser Compatibility Info */}
      {enabled && isSupported && (
        <style jsx global>{`
          /* Hide browser UI in fullscreen */
          :-webkit-full-screen {
            width: 100% !important;
            height: 100% !important;
          }
          
          :-moz-full-screen {
            width: 100% !important;
            height: 100% !important;
          }
          
          :-ms-fullscreen {
            width: 100% !important;
            height: 100% !important;
          }
          
          :fullscreen {
            width: 100% !important;
            height: 100% !important;
          }
          
          /* Prevent scrolling in fullscreen */
          html:-webkit-full-screen,
          html:-moz-full-screen,
          html:-ms-fullscreen,
          html:fullscreen {
            overflow: hidden !important;
          }
          
          body:-webkit-full-screen,
          body:-moz-full-screen,
          body:-ms-fullscreen,
          body:fullscreen {
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `}</style>
      )}
    </>
  )
}
