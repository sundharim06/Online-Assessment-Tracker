"use client"

import { useEffect, useCallback, useRef } from "react"

interface KeyboardBlockerProps {
  enabled: boolean
  onViolation?: (violation: string, keyCombo: string) => void
  allowedKeys?: string[]
  strictMode?: boolean
  onCriticalViolation?: (violation: string, keyCombo: string) => void
  onAltTabViolation?: (violation: string, keyCombo: string) => void
}

export function KeyboardBlocker({
  enabled,
  onViolation,
  allowedKeys = [],
  strictMode = true,
  onCriticalViolation,
  onAltTabViolation,
}: KeyboardBlockerProps) {
  const altKeyPressed = useRef(false)
  const tabKeyPressed = useRef(false)
  const altTabDetected = useRef(false)

  const preventAltTab = useCallback(
    (event: KeyboardEvent) => {
      if (event.altKey && (event.key === "Tab" || event.code === "Tab")) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()

        // Additional prevention methods
        if (event.cancelable) {
          event.returnValue = false
        }

        altTabDetected.current = true

        // Trigger violation immediately
        if (onAltTabViolation) {
          onAltTabViolation("Alt+Tab detected - Exam terminated", "Alt+Tab")
        }

        return false
      }
    },
    [onAltTabViolation],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      if (event.key === "Alt") {
        altKeyPressed.current = true
      }
      if (event.key === "Tab" && altKeyPressed.current) {
        tabKeyPressed.current = true
      }

      if (event.altKey && (event.key === "Tab" || event.code === "Tab")) {
        preventAltTab(event)
        return false
      }

      const key = event.key
      const code = event.code
      const ctrl = event.ctrlKey
      const alt = event.altKey
      const shift = event.shiftKey
      const meta = event.metaKey

      // Create key combination string for logging
      const keyCombo = [
        meta && "Meta",
        ctrl && "Ctrl",
        alt && "Alt",
        shift && "Shift",
        key !== "Control" && key !== "Alt" && key !== "Shift" && key !== "Meta" && key,
      ]
        .filter(Boolean)
        .join("+")

      // Check if key is in allowed list
      if (allowedKeys.includes(key) || allowedKeys.includes(keyCombo)) {
        return
      }

      let blocked = false
      let violationType = ""
      let isCritical = false
      let isAltTab = false

      if (key === "Escape") {
        blocked = true
        violationType = "Escape key pressed - Critical security violation detected"
        isCritical = true
      }

      // Block all function keys (F1-F24)
      else if (key.match(/^F\d+$/)) {
        blocked = true
        violationType = "Function key blocked"
      }

      // Block developer tools access
      else if (
        (ctrl && shift && key === "I") || // DevTools
        (ctrl && shift && key === "J") || // Console
        (ctrl && shift && key === "C") || // Element inspector
        (ctrl && key === "U") || // View source
        key === "F12" // DevTools
      ) {
        blocked = true
        violationType = "Developer tools access blocked"
      }

      // Block page refresh and navigation
      else if (
        (ctrl && key === "R") || // Refresh
        (ctrl && shift && key === "R") || // Hard refresh
        key === "F5" || // Refresh
        (ctrl && key === "F5") || // Hard refresh
        (ctrl && key === "L") || // Address bar
        (ctrl && key === "T") || // New tab
        (ctrl && key === "N") || // New window
        (ctrl && shift && key === "N") || // New incognito
        (ctrl && key === "W") || // Close tab
        (ctrl && shift && key === "T") || // Reopen closed tab
        (alt && key === "ArrowLeft") || // Back
        (alt && key === "ArrowRight") || // Forward
        key === "Backspace" // Back (when not in input)
      ) {
        blocked = true
        violationType = "Navigation/refresh blocked"
      } else if (
        (ctrl && key === "Tab") || // Switch tabs
        (ctrl && shift && key === "Tab") || // Switch tabs reverse
        (alt && key === "Tab") || // Switch windows - CRITICAL
        (alt && shift && key === "Tab") || // Switch windows reverse - CRITICAL
        (ctrl && key >= "1" && key <= "9") || // Switch to tab number
        (meta && key === "Tab") || // Mac window switching
        (meta && key === "`") || // Mac app switching
        (alt && key === "Escape") // Alt+Esc window switching
      ) {
        blocked = true
        violationType = "Window/tab switching blocked"
        if ((alt && key === "Tab") || (alt && shift && key === "Tab")) {
          isAltTab = true
          violationType = "Alt+Tab detected - Exam terminated immediately"
          isCritical = true
        }
      }

      // Block system shortcuts
      else if (
        (ctrl && alt && key === "Delete") || // Task manager
        (ctrl && shift && key === "Escape") || // Task manager
        (alt && key === "F4") || // Close window
        key === "Meta" || // Windows key
        meta || // Any Meta key combination
        (alt && key === " ") || // Alt+Space (window menu)
        (ctrl && key === "Escape") // Start menu
      ) {
        blocked = true
        violationType = "System shortcut blocked"
      }

      // Block clipboard operations
      else if (
        (ctrl && key === "C") || // Copy
        (ctrl && key === "V") || // Paste
        (ctrl && key === "X") || // Cut
        (ctrl && key === "A") || // Select all
        (ctrl && key === "Z") || // Undo
        (ctrl && key === "Y") || // Redo
        (ctrl && shift && key === "Z") // Redo alternative
      ) {
        blocked = true
        violationType = "Clipboard operation blocked"
      }

      // Block file operations
      else if (
        (ctrl && key === "S") || // Save
        (ctrl && key === "O") || // Open
        (ctrl && key === "P") || // Print
        (ctrl && shift && key === "S") || // Save as
        (ctrl && key === "H") || // History
        (ctrl && key === "D") || // Bookmark
        (ctrl && shift && key === "Delete") // Clear browsing data
      ) {
        blocked = true
        violationType = "File operation blocked"
      }

      // Block search and find
      else if (
        (ctrl && key === "F") || // Find
        (ctrl && key === "G") || // Find next
        (ctrl && shift && key === "G") || // Find previous
        (ctrl && key === "E") || // Search
        key === "F3" // Find next
      ) {
        blocked = true
        violationType = "Search operation blocked"
      }

      // In strict mode, block additional keys
      if (strictMode && !isCritical) {
        // Block additional navigation
        if (key === "Home" || key === "End" || (ctrl && key === "Home") || (ctrl && key === "End")) {
          blocked = true
          violationType = "Navigation key blocked"
        }

        // Block zoom operations
        else if ((ctrl && key === "+") || (ctrl && key === "-") || (ctrl && key === "0") || (ctrl && key === "=")) {
          blocked = true
          violationType = "Zoom operation blocked"
        }
      }

      // Block the event if it's in the blocked list
      if (blocked) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()

        if (event.cancelable) {
          event.returnValue = false
        }

        if (isAltTab && onAltTabViolation) {
          onAltTabViolation(violationType, keyCombo)
        } else if (isCritical && onCriticalViolation) {
          onCriticalViolation(violationType, keyCombo)
        } else {
          onViolation?.(violationType, keyCombo)
        }
        return false
      }

      return true
    },
    [enabled, onViolation, onCriticalViolation, onAltTabViolation, allowedKeys, strictMode, preventAltTab],
  )

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      if (event.key === "Alt") {
        altKeyPressed.current = false
        // Reset Alt+Tab detection after a short delay
        setTimeout(() => {
          altTabDetected.current = false
        }, 100)
      }
      if (event.key === "Tab") {
        tabKeyPressed.current = false
      }

      // Immediate Alt+Tab blocking
      if (event.altKey && (event.key === "Tab" || event.code === "Tab")) {
        preventAltTab(event)
        return false
      }

      // Block key up events for system keys to prevent any delayed actions
      if (
        event.key === "Meta" ||
        event.key === "Alt" ||
        (event.key === "Tab" && event.altKey) ||
        event.key.match(/^F\d+$/)
      ) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
    },
    [enabled, preventAltTab],
  )

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Immediate Alt+Tab blocking
      if (event.altKey && (event.key === "Tab" || event.code === "Tab")) {
        preventAltTab(event)
        return false
      }

      // Additional blocking for key press events
      if (event.ctrlKey || event.altKey || event.metaKey || event.key.match(/^F\d+$/)) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
    },
    [enabled, preventAltTab],
  )

  const handleWindowBlur = useCallback(() => {
    if (enabled && altTabDetected.current && onAltTabViolation) {
      // Only trigger if we actually detected Alt+Tab key combination
      onAltTabViolation("Alt+Tab confirmed - Window focus lost after Alt+Tab detection", "Alt+Tab + Window Blur")
    }
    // Reset detection flags
    altKeyPressed.current = false
    tabKeyPressed.current = false
  }, [enabled, onAltTabViolation])

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown, { capture: true, passive: false })
      document.addEventListener("keyup", handleKeyUp, { capture: true, passive: false })
      document.addEventListener("keypress", handleKeyPress, { capture: true, passive: false })

      window.addEventListener("blur", handleWindowBlur, { capture: true })

      // Block context menu (right-click)
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault()
        onViolation?.("Right-click context menu blocked", "Right-click")
      }

      // Block drag and drop
      const handleDragStart = (e: DragEvent) => {
        e.preventDefault()
        onViolation?.("Drag operation blocked", "Drag")
      }

      // Block text selection in strict mode
      const handleSelectStart = (e: Event) => {
        if (strictMode) {
          e.preventDefault()
          onViolation?.("Text selection blocked", "Select")
        }
      }

      document.addEventListener("contextmenu", handleContextMenu, { capture: true })
      document.addEventListener("dragstart", handleDragStart, { capture: true })
      document.addEventListener("selectstart", handleSelectStart, { capture: true })

      const style = document.createElement("style")
      style.textContent = `
        * {
          -webkit-user-select: ${strictMode ? "none" : "text"} !important;
          -moz-user-select: ${strictMode ? "none" : "text"} !important;
          -ms-user-select: ${strictMode ? "none" : "text"} !important;
          user-select: ${strictMode ? "none" : "text"} !important;
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
          user-drag: none !important;
        }
        
        input, textarea {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }

        /* Prevent any focus outline that might indicate Alt+Tab */
        *:focus {
          outline: none !important;
        }
      `
      document.head.appendChild(style)

      return () => {
        document.removeEventListener("keydown", handleKeyDown, { capture: true })
        document.removeEventListener("keyup", handleKeyUp, { capture: true })
        document.removeEventListener("keypress", handleKeyPress, { capture: true })

        window.removeEventListener("blur", handleWindowBlur, { capture: true })

        document.removeEventListener("contextmenu", handleContextMenu, { capture: true })
        document.removeEventListener("dragstart", handleDragStart, { capture: true })
        document.removeEventListener("selectstart", handleSelectStart, { capture: true })

        if (style.parentNode) {
          style.parentNode.removeChild(style)
        }
      }
    }
  }, [enabled, handleKeyDown, handleKeyUp, handleKeyPress, handleWindowBlur, onViolation, strictMode])

  return null // This component doesn't render anything
}
