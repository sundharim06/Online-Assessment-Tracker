"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Trophy } from "lucide-react"

interface AssessmentResult {
  totalScore: number
  totalMarks: number
  correctAnswers: number
  wrongAnswers: number
  submittedAt: string
  answeredQuestions?: number
  totalAvailableQuestions?: number
  marksFromAnsweredQuestions?: number
  totalExamMarks?: number
  reviewData?: any // Assuming reviewData is an object or array
}

export default function ResultsPage() {
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [studentName, setStudentName] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    console.log("[v0] Results page mounted, checking session data")

    try {
      const resultData = sessionStorage.getItem("assessmentResult")
      const name = sessionStorage.getItem("studentName")

      console.log("[v0] Session data found:", { hasResult: !!resultData, hasName: !!name })

      if (!resultData || !name) {
        console.log("[v0] Missing session data, redirecting to home")
        router.push("/")
        return
      }

      const parsedResult = JSON.parse(resultData)
      console.log("[v0] Parsed result:", parsedResult)

      setResult(parsedResult.result)
      setStudentName(name)

      if (parsedResult.result.reviewData) {
        sessionStorage.setItem("reviewData", JSON.stringify(parsedResult.result.reviewData))
      }

      // Prevent back navigation
      const preventBack = () => {
        console.log("[v0] Preventing back navigation")
        window.history.pushState(null, "", window.location.href)
      }

      // Push initial state and set up popstate listener
      window.history.pushState(null, "", window.location.href)
      window.addEventListener("popstate", preventBack)

      // Prevent page refresh and navigation
      const preventRefresh = (e: BeforeUnloadEvent) => {
        console.log("[v0] Preventing page refresh")
        e.preventDefault()
        e.returnValue = "Exam completed. Refreshing will not change your results."
        return "Exam completed. Refreshing will not change your results."
      }

      window.addEventListener("beforeunload", preventRefresh)

      let touchStartX = 0
      let touchStartY = 0

      const preventSwipeStart = (e: TouchEvent) => {
        try {
          if (e.touches.length > 1) {
            e.preventDefault()
            return
          }

          const touch = e.touches[0]
          touchStartX = touch.clientX
          touchStartY = touch.clientY
          console.log("[v0] Touch start:", { x: touchStartX, y: touchStartY })
        } catch (error) {
          console.log("[v0] Touch start error:", error)
        }
      }

      const preventSwipeMove = (e: TouchEvent) => {
        try {
          if (e.touches.length > 1) {
            e.preventDefault()
            return
          }

          const touch = e.touches[0]
          const deltaX = Math.abs(touch.clientX - touchStartX)
          const deltaY = Math.abs(touch.clientY - touchStartY)
          const threshold = 50

          // Prevent horizontal swipes that could trigger navigation
          if (deltaX > threshold && deltaX > deltaY) {
            console.log("[v0] Preventing horizontal swipe navigation")
            e.preventDefault()
          }

          // Prevent edge swipes
          if (touchStartX < threshold || touchStartX > window.innerWidth - threshold) {
            e.preventDefault()
          }
        } catch (error) {
          console.log("[v0] Touch move error:", error)
        }
      }

      // Prevent keyboard shortcuts that could navigate away
      const preventKeyboardNavigation = (e: KeyboardEvent) => {
        try {
          // Prevent Alt+Left/Right (back/forward)
          if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
            console.log("[v0] Preventing Alt+Arrow navigation")
            e.preventDefault()
            return false
          }

          // Prevent Ctrl+R, F5 (refresh)
          if ((e.ctrlKey && e.key === "r") || e.key === "F5") {
            console.log("[v0] Preventing refresh shortcut")
            e.preventDefault()
            return false
          }

          // Prevent Backspace navigation (when not in input)
          if (e.key === "Backspace" && !(e.target as HTMLElement)?.matches("input, textarea")) {
            console.log("[v0] Preventing backspace navigation")
            e.preventDefault()
            return false
          }
        } catch (error) {
          console.log("[v0] Keyboard event error:", error)
        }
      }

      // Disable right-click context menu
      const preventContextMenu = (e: MouseEvent) => {
        try {
          console.log("[v0] Preventing context menu")
          e.preventDefault()
          return false
        } catch (error) {
          console.log("[v0] Context menu error:", error)
        }
      }

      try {
        document.addEventListener("touchstart", preventSwipeStart, { passive: false })
        document.addEventListener("touchmove", preventSwipeMove, { passive: false })
        document.addEventListener("keydown", preventKeyboardNavigation)
        document.addEventListener("contextmenu", preventContextMenu)
        console.log("[v0] All event listeners added successfully")
      } catch (error) {
        console.log("[v0] Error adding event listeners:", error)
      }

      // Clear assessment data from sessionStorage to prevent retaking
      sessionStorage.removeItem("currentQuestion")
      sessionStorage.removeItem("answers")
      sessionStorage.removeItem("examStartTime")
      sessionStorage.removeItem("timeRemaining")
      console.log("[v0] Cleared assessment session data")

      // Cleanup function
      return () => {
        console.log("[v0] Cleaning up event listeners")
        try {
          window.removeEventListener("popstate", preventBack)
          window.removeEventListener("beforeunload", preventRefresh)
          document.removeEventListener("touchstart", preventSwipeStart)
          document.removeEventListener("touchmove", preventSwipeMove)
          document.removeEventListener("keydown", preventKeyboardNavigation)
          document.removeEventListener("contextmenu", preventContextMenu)
        } catch (error) {
          console.log("[v0] Error removing event listeners:", error)
        }
      }
    } catch (error) {
      console.log("[v0] Error in main useEffect:", error)
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    console.log("[v0] Setting up history override")
    try {
      // Override browser navigation methods
      const originalPushState = window.history.pushState
      const originalReplaceState = window.history.replaceState

      window.history.pushState = (...args) => {
        console.log("[v0] History pushState intercepted")
        // Allow only current page updates
        return originalPushState.apply(window.history, args)
      }

      window.history.replaceState = (...args) => {
        console.log("[v0] History replaceState intercepted")
        // Allow only current page updates
        return originalReplaceState.apply(window.history, args)
      }

      return () => {
        console.log("[v0] Restoring original history methods")
        window.history.pushState = originalPushState
        window.history.replaceState = originalReplaceState
      }
    } catch (error) {
      console.log("[v0] Error setting up history override:", error)
    }
  }, [])

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  console.log("[v0] Rendering results page with data:", result)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">Assessment Complete!</CardTitle>
          <p className="text-gray-600">Congratulations, {studentName}</p>
          <p className="text-xs text-gray-500 mt-2">
            Results are final. Navigation and refresh are disabled for exam integrity.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {result.totalScore}/{result.totalMarks}
              </div>
              <div className="text-sm text-gray-600">Total Marks</div>
              {result.answeredQuestions && result.totalAvailableQuestions && (
                <div className="text-xs text-gray-500 mt-1">
                  Attempted: {result.answeredQuestions}/{result.totalAvailableQuestions} questions
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-semibold text-green-700">{result.correctAnswers}</div>
                <div className="text-sm text-green-600">Correct</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-lg font-semibold text-red-700">{result.wrongAnswers}</div>
                <div className="text-sm text-red-600">Wrong</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {result.wrongAnswers > 0 && (
              <Button
                onClick={() => {
                  console.log("[v0] Navigating to wrong answers page")
                  router.push("/wrong-answers")
                }}
                variant="destructive"
                className="w-full mb-2 flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                View Wrong Answers ({result.wrongAnswers})
              </Button>
            )}
            <Button
              onClick={() => {
                console.log("[v0] Printing results")
                window.print()
              }}
              variant="outline"
              className="w-full"
            >
              Print Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
