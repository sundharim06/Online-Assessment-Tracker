"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

export function GlobalRefreshProtection() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkForRefresh = () => {
      // Check if user has registered for exam (stored during registration)
      const hasRegistered = sessionStorage.getItem("studentId") || sessionStorage.getItem("examStarted")

      if (hasRegistered) {
        // Check if this is a page refresh
        const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming

        if (navigation.type === "reload") {
          console.log("[v0] Page refresh detected after exam registration - clearing session and redirecting")

          // Clear all exam-related session data
          sessionStorage.clear()
          localStorage.clear()

          // Sign out user
          signOut({
            callbackUrl: "/auth/signin",
            redirect: true,
          })

          return
        }
      }
    }

    // Run check on component mount
    checkForRefresh()

    // Set up beforeunload handler to detect refresh attempts
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasRegistered = sessionStorage.getItem("studentId") || sessionStorage.getItem("examStarted")

      if (hasRegistered && pathname !== "/results") {
        e.preventDefault()
        e.returnValue = "Are you sure you want to leave? This will end your exam session."
        return "Are you sure you want to leave? This will end your exam session."
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [router, pathname])

  return null
}
