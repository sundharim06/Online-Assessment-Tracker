"use client"

import type React from "react"
import { SessionProvider } from "next-auth/react"
import { useState, useEffect } from "react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)

    const clearStaleExamData = () => {
      const examInProgress = sessionStorage.getItem("examInProgress")
      const examStarted = sessionStorage.getItem("examStarted")

      // If there's stale exam data from a previous session, clear it
      if (examInProgress === "true" || examStarted === "true") {
        console.log("[v0] Clearing stale exam session data")
        sessionStorage.removeItem("examInProgress")
        sessionStorage.removeItem("examStarted")
        sessionStorage.removeItem("studentId")
        sessionStorage.removeItem("studentName")
        sessionStorage.removeItem("studentSection")
        sessionStorage.removeItem("studentDepartment")
        sessionStorage.removeItem("studentEmail")
        sessionStorage.removeItem("studentPhone")
        sessionStorage.removeItem("registrationComplete")
      }
    }

    clearStaleExamData()
  }, [])

  if (!hasMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  )
}
