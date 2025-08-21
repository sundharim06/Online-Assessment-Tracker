"use client"

import { useState, useEffect, useCallback } from "react"

interface KioskModeOptions {
  onViolation?: () => void
  allowedKeys?: string[]
}

export function useKioskMode(enabled = false, options: KioskModeOptions = {}) {
  const [isKioskActive, setIsKioskActive] = useState(false)
  const [violations, setViolations] = useState<string[]>([])

  // Default blocked key combinations
  const blockedKeys = [
    "F12",
    "F11",
    "F5",
    "F1",
    "Alt+Tab",
    "Alt+F4",
    "Ctrl+Shift+I",
    "Ctrl+Shift+J",
    "Ctrl+Shift+C",
    "Ctrl+U",
    "Ctrl+S",
    "Ctrl+A",
    "Ctrl+P",
    "Ctrl+R",
    "Ctrl+F5",
    "Ctrl+Shift+R",
    "Ctrl+W",
    "Ctrl+T",
    "Ctrl+N",
    "Ctrl+Shift+N",
    "Ctrl+Shift+T",
    "Ctrl+H",
    "Ctrl+D",
    "Ctrl+L",
    "Ctrl+E",
    "Windows",
    "Alt+Space",
    "Ctrl+Alt+Del",
    "Ctrl+Shift+Esc",
  ]

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      const key = event.key
      const ctrl = event.ctrlKey
      const alt = event.altKey
      const shift = event.shiftKey
      const meta = event.metaKey

      // Block function keys
      if (key.startsWith("F") && key.length <= 3) {
        event.preventDefault()
        setViolations((prev) => [...prev, `Function key ${key} blocked`])
        options.onViolation?.()
        return false
      }

      // Block developer tools shortcuts
      if ((ctrl && shift && (key === "I" || key === "J" || key === "C")) || (ctrl && key === "U") || key === "F12") {
        event.preventDefault()
        setViolations((prev) => [...prev, "Developer tools access blocked"])
        options.onViolation?.()
        return false
      }

      // Block refresh shortcuts
      if ((ctrl && key === "R") || (ctrl && shift && key === "R") || key === "F5" || (ctrl && key === "F5")) {
        event.preventDefault()
        setViolations((prev) => [...prev, "Page refresh blocked"])
        options.onViolation?.()
        return false
      }

      // Block navigation shortcuts
      if (
        (ctrl && (key === "L" || key === "T" || key === "N" || key === "W")) ||
        (ctrl && shift && (key === "N" || key === "T")) ||
        (alt && (key === "Left" || key === "Right")) ||
        (ctrl &&
          (key === "Tab" ||
            key === "1" ||
            key === "2" ||
            key === "3" ||
            key === "4" ||
            key === "5" ||
            key === "6" ||
            key === "7" ||
            key === "8" ||
            key === "9"))
      ) {
        event.preventDefault()
        setViolations((prev) => [...prev, "Navigation shortcut blocked"])
        options.onViolation?.()
        return false
      }

      // Block system shortcuts
      if (alt && key === "Tab") {
        event.preventDefault()
        setViolations((prev) => [...prev, "Alt+Tab blocked"])
        options.onViolation?.()
        return false
      }

      // Block Windows key
      if (meta || key === "Meta") {
        event.preventDefault()
        setViolations((prev) => [...prev, "Windows key blocked"])
        options.onViolation?.()
        return false
      }

      // Block other system combinations
      if ((ctrl && alt && key === "Delete") || (ctrl && shift && key === "Escape") || (alt && key === "F4")) {
        event.preventDefault()
        setViolations((prev) => [...prev, "System shortcut blocked"])
        options.onViolation?.()
        return false
      }

      return true
    },
    [enabled, options],
  )

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (enabled) {
        event.preventDefault()
        setViolations((prev) => [...prev, "Right-click context menu blocked"])
        options.onViolation?.()
      }
    },
    [enabled, options],
  )

  const handleVisibilityChange = useCallback(() => {
    if (enabled && document.hidden) {
      setViolations((prev) => [...prev, "Window focus lost - potential violation"])
      options.onViolation?.()
    }
  }, [enabled, options])

  const enterKioskMode = useCallback(async () => {
    try {
      // Request fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }

      setIsKioskActive(true)
      setViolations([])

      // Hide cursor after 3 seconds of inactivity
      let cursorTimeout: NodeJS.Timeout
      const hideCursor = () => {
        document.body.style.cursor = "none"
      }
      const showCursor = () => {
        document.body.style.cursor = "default"
        clearTimeout(cursorTimeout)
        cursorTimeout = setTimeout(hideCursor, 3000)
      }

      document.addEventListener("mousemove", showCursor)
      cursorTimeout = setTimeout(hideCursor, 3000)
    } catch (error) {
      console.error("Failed to enter kiosk mode:", error)
    }
  }, [])

  const exitKioskMode = useCallback(async () => {
    try {
      // Exit fullscreen
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
      }

      setIsKioskActive(false)
      document.body.style.cursor = "default"
    } catch (error) {
      console.error("Failed to exit kiosk mode:", error)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      // Add event listeners
      document.addEventListener("keydown", handleKeyDown, true)
      document.addEventListener("contextmenu", handleContextMenu, true)
      document.addEventListener("visibilitychange", handleVisibilityChange)

      // Disable text selection
      document.body.style.userSelect = "none"
      document.body.style.webkitUserSelect = "none"

      // Disable drag and drop
      document.addEventListener("dragstart", (e) => e.preventDefault())
      document.addEventListener("drop", (e) => e.preventDefault())

      return () => {
        document.removeEventListener("keydown", handleKeyDown, true)
        document.removeEventListener("contextmenu", handleContextMenu, true)
        document.removeEventListener("visibilitychange", handleVisibilityChange)

        // Restore text selection
        document.body.style.userSelect = ""
        document.body.style.webkitUserSelect = ""
      }
    }
  }, [enabled, handleKeyDown, handleContextMenu, handleVisibilityChange])

  return {
    isKioskActive,
    violations,
    enterKioskMode,
    exitKioskMode,
    clearViolations: () => setViolations([]),
  }
}
