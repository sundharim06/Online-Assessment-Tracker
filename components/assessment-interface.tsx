"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, AlertCircle, Play, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProtectedWindow } from "@/components/protected-window"
import { KeyboardBlocker } from "@/components/keyboard-blocker"
import { FullscreenController } from "@/components/fullscreen-controller"
import type { Question, ExamConfig } from "@/lib/google-sheets"

interface StudentAnswer {
  questionId: number
  selectedAnswer: string[]
  textAnswer?: string
}

function AssessmentInterface() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<StudentAnswer[]>([])
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studentInfo, setStudentInfo] = useState<{ id: string; name: string } | null>(null)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())
  const [lockedQuestions, setLockedQuestions] = useState<Set<number>>(new Set())
  const [examStarted, setExamStarted] = useState(false)
  const [examStartTime, setExamStartTime] = useState<Date | null>(null)
  const [isRefreshDetected, setIsRefreshDetected] = useState(false)
  const [isProtectedMode, setIsProtectedMode] = useState(false)
  const [securityViolations, setSecurityViolations] = useState<string[]>([])
  const [violationCount, setViolationCount] = useState(0)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [isExamTerminated, setIsExamTerminated] = useState(false)
  const [terminationReason, setTerminationReason] = useState<string>("")
  const [showAdminAccess, setShowAdminAccess] = useState(false)
  const [isRoutingToResults, setIsRoutingToResults] = useState(false) // Add routing state to prevent termination screen from showing
  const router = useRouter()
  const { toast } = useToast()

  const submitTerminatedExam = useCallback(
    async (reason: string) => {
      if (!studentInfo) return

      console.log("[v0] Background submission of terminated exam with reason:", reason)
      setIsSubmitting(true)

      const answeredOnly = answers.filter(
        (answer) =>
          (answer.selectedAnswer && answer.selectedAnswer.length > 0) ||
          (answer.textAnswer && answer.textAnswer.trim().length > 0),
      )

      try {
        const lockedQuestionIds = Array.from(lockedQuestions)
          .map((index) => questions[index]?.id)
          .filter(Boolean)

        const response = await fetch("/api/assessment/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: Number.parseInt(studentInfo.id),
            answers: answeredOnly,
            lockedQuestionIds,
            studentName: studentInfo.name,
            studentSection: sessionStorage.getItem("studentSection") || "Unknown",
            studentDepartment: sessionStorage.getItem("studentDepartment") || "Unknown",
            studentEmail: sessionStorage.getItem("studentEmail") || "",
            status: "terminated",
            terminationReason: reason,
            tabSwitchCount: tabSwitchCount,
          }),
        })

        const result = await response.json()
        console.log("[v0] Background terminated exam submission response:", result)

        if (response.ok) {
          const updatedResult = {
            score: answeredOnly.length,
            totalQuestions: questions.length,
            percentage: Math.round((answeredOnly.length / questions.length) * 100),
            status: "terminated",
            reason: reason,
            answeredCount: answeredOnly.length,
            studentName: studentInfo.name,
            studentSection: sessionStorage.getItem("studentSection") || "Unknown",
            studentDepartment: sessionStorage.getItem("studentDepartment") || "Unknown",
            studentEmail: sessionStorage.getItem("studentEmail") || "",
            terminationReason: reason,
            tabSwitchCount: tabSwitchCount,
            ...result,
          }
          sessionStorage.setItem("assessmentResult", JSON.stringify(updatedResult))
        }
      } catch (error) {
        console.error("[v0] Failed to submit terminated exam:", error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [studentInfo, answers, questions, lockedQuestions, tabSwitchCount, toast],
  )

  const handleSecurityViolation = useCallback(
    (violation: string, details?: string) => {
      const violationMessage = details ? `${violation}: ${details}` : violation
      setSecurityViolations((prev) => [...prev, violationMessage])
      setViolationCount((prev) => prev + 1)

      if (violationCount >= 2) {
        setIsExamTerminated(true)
        setTerminationReason(`Security violation limit exceeded: ${violationMessage}`)
        setIsProtectedMode(false)

        toast({
          title: "Exam Terminated",
          description: "Security violation limit exceeded. Exam terminated immediately.",
          variant: "destructive",
          className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
        })
      } else {
        toast({
          title: "Security Warning",
          description: `${violationMessage}. Violations: ${violationCount + 1}/3`,
          variant: "destructive",
          className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
        })
      }
    },
    [violationCount, toast],
  )

  const handleSubmitExam = useCallback(async () => {
    if (!studentInfo) return

    setIsSubmitting(true)
    setIsProtectedMode(false)
    sessionStorage.removeItem("examInProgress")
    sessionStorage.removeItem("examStarted")

    try {
      const lockedQuestionIds = Array.from(lockedQuestions)
        .map((index) => questions[index]?.id)
        .filter(Boolean)

      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: Number.parseInt(studentInfo.id),
          answers: answers,
          lockedQuestionIds, // Send locked question IDs for evaluation
          studentName: studentInfo.name,
          studentSection: sessionStorage.getItem("studentSection") || "Unknown",
          studentDepartment: sessionStorage.getItem("studentDepartment") || "Unknown",
          studentEmail: sessionStorage.getItem("studentEmail") || "",
          status: "completed",
        }),
      })

      const result = await response.json()

      if (response.ok) {
        sessionStorage.setItem("assessmentResult", JSON.stringify(result))
        router.push("/results")
      } else {
        toast({
          title: "Submission Failed",
          description: result.error || "Please try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [studentInfo, answers, router, toast, lockedQuestions, questions])

  useEffect(() => {
    const examInProgress = sessionStorage.getItem("examInProgress")
    const examStartFlag = sessionStorage.getItem("examStarted")

    const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    const isRefresh = navigationEntries.length > 0 && navigationEntries[0].type === "reload"

    if (isRefresh && (examInProgress === "true" || examStartFlag === "true")) {
      setIsRefreshDetected(true)
      setIsProtectedMode(false) // Ensure protected mode is disabled

      sessionStorage.clear()

      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name)
          })
        })
      }

      setTimeout(() => {
        signOut({
          callbackUrl: "/auth/signin",
          redirect: true,
        })
      }, 3000)
    } else if (!isRefresh) {
      sessionStorage.setItem("examInProgress", "true")
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examStarted && !isSubmitting) {
        e.preventDefault()
        e.returnValue = "Are you sure you want to leave? Your exam progress will be lost."
        return "Are you sure you want to leave? Your exam progress will be lost."
      }
    }

    const handleUnload = () => {
      const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
      const isRefresh = navigationEntries.length > 0 && navigationEntries[0].type === "reload"

      if (!isRefresh) {
        sessionStorage.removeItem("examInProgress")
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("unload", handleUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("unload", handleUnload)
      if (!isRefreshDetected) {
        sessionStorage.removeItem("examInProgress")
      }
    }
  }, [examStarted, isSubmitting, isRefreshDetected])

  useEffect(() => {
    if (isRefreshDetected) return

    const loadAssessment = async () => {
      try {
        const studentId = sessionStorage.getItem("studentId")
        const studentName = sessionStorage.getItem("studentName")

        if (!studentId || !studentName) {
          toast({
            title: "Access Denied",
            description: "Please register first to access the assessment",
            variant: "destructive",
          })
          router.push("/")
          return
        }

        setStudentInfo({ id: studentId, name: studentName })

        const sessionId = `${studentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const response = await fetch(`/api/questions?sessionId=${sessionId}&t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        })
        const data = await response.json()

        if (response.ok && data.questions.length > 0) {
          setQuestions(data.questions)
          setExamConfig(data.examConfig)

          const durationMinutes = data.examConfig?.examDurationMinutes || 60
          const durationInSeconds = durationMinutes * 60

          setTimeRemaining(durationInSeconds)

          setAnswers(data.questions.map((q: Question) => ({ questionId: q.id, selectedAnswer: [], textAnswer: "" })))
        } else {
          toast({
            title: "Assessment Not Available",
            description: "The test has been disabled by the administrator. No questions are currently available.",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load assessment. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadAssessment()
  }, [router, toast, isRefreshDetected])

  useEffect(() => {
    if (!examStarted || timeRemaining <= 0 || questions.length === 0) {
      return
    }

    const timer = setTimeout(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          toast({
            title: "Time's Up!",
            description: "Your assessment has been automatically submitted.",
            variant: "destructive",
            className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
          })
          handleSubmitExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeRemaining, examStarted, questions.length, handleSubmitExam, toast])

  useEffect(() => {
    if (!examStarted && !isLoading && questions.length > 0 && examConfig) {
      // Auto-enter fullscreen for instructions page without asking permission
      const enterInstructionsFullscreen = async () => {
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
        } catch (error) {
          // Silently handle fullscreen errors on instructions page
          console.log("Fullscreen not available for instructions page")
        }
      }

      enterInstructionsFullscreen()
    }
  }, [examStarted, isLoading, questions.length, examConfig])

  useEffect(() => {
    if (isExamTerminated && terminationReason) {
      console.log("[v0] Exam terminated, routing immediately to results")

      setIsRoutingToResults(true)

      // Store result data immediately
      if (studentInfo) {
        const answeredOnly = answers.filter(
          (answer) =>
            (answer.selectedAnswer && answer.selectedAnswer.length > 0) ||
            (answer.textAnswer && answer.textAnswer.trim().length > 0),
        )

        const resultData = {
          score: answeredOnly.length,
          totalQuestions: questions.length,
          percentage: Math.round((answeredOnly.length / questions.length) * 100),
          status: "terminated",
          reason: terminationReason,
          answeredCount: answeredOnly.length,
          studentName: studentInfo.name,
          studentSection: sessionStorage.getItem("studentSection") || "Unknown",
          studentDepartment: sessionStorage.getItem("studentDepartment") || "Unknown",
          studentEmail: sessionStorage.getItem("studentEmail") || "",
          terminationReason: terminationReason,
          tabSwitchCount: tabSwitchCount,
        }

        sessionStorage.setItem("assessmentResult", JSON.stringify(resultData))
        sessionStorage.removeItem("examInProgress")
        sessionStorage.removeItem("examStarted")
      }

      console.log("[v0] Forcing navigation to results page")

      // Try router.push first
      try {
        router.push("/results")
      } catch (error) {
        console.log("[v0] Router.push failed, using window.location")
      }

      // Fallback to window.location after a tiny delay
      setTimeout(() => {
        console.log("[v0] Using window.location.href as fallback")
        window.location.href = "/results"
      }, 100)

      // Submit data in background (non-blocking)
      setTimeout(() => {
        submitTerminatedExam(terminationReason)
      }, 0)
    }
  }, [
    isExamTerminated,
    terminationReason,
    studentInfo,
    answers,
    questions,
    tabSwitchCount,
    submitTerminatedExam,
    router,
  ])

  useEffect(() => {
    // Only block console if not on admin page
    if (isProtectedMode && typeof window !== "undefined" && window.location.pathname !== "/rag/droid") {
      const originalConsole = { ...console }

      // Override console methods to block them
      console.log = () => {}
      console.warn = () => {}
      console.error = () => {}
      console.info = () => {}
      console.debug = () => {}
      console.table = () => {}
      console.group = () => {}
      console.groupEnd = () => {}
      console.clear = () => {}

      return () => {
        // Restore console when protection is disabled
        Object.assign(console, originalConsole)
      }
    }
  }, [isProtectedMode])

  useEffect(() => {
    if (isProtectedMode && !isExamTerminated) {
      const enforceFullscreen = () => {
        if (!document.fullscreenElement) {
          const element = document.documentElement
          if (element.requestFullscreen) {
            element.requestFullscreen().catch(() => {})
          } else if ((element as any).webkitRequestFullscreen) {
            ;(element as any).webkitRequestFullscreen()
          } else if ((element as any).mozRequestFullScreen) {
            ;(element as any).mozRequestFullScreen()
          } else if ((element as any).msRequestFullscreen) {
            ;(element as any).msRequestFullscreen()
          }

          setTimeout(() => {
            if (element.requestFullscreen) {
              element.requestFullscreen().catch(() => {})
            }
          }, 1)
        }
      }

      const fullscreenInterval = setInterval(enforceFullscreen, 1)

      // Additional event listeners for immediate response
      const handleVisibilityChange = () => {
        if (document.hidden && isProtectedMode && !isExamTerminated) {
          setTimeout(enforceFullscreen, 1)
          setTimeout(enforceFullscreen, 5)
        }
      }

      const handleFocusLoss = () => {
        if (isProtectedMode && !isExamTerminated) {
          setTimeout(enforceFullscreen, 1)
          setTimeout(enforceFullscreen, 5)
        }
      }

      const handleResize = () => {
        if (isProtectedMode && !isExamTerminated) {
          setTimeout(enforceFullscreen, 1)
        }
      }

      document.addEventListener("visibilitychange", handleVisibilityChange)
      window.addEventListener("blur", handleFocusLoss)
      window.addEventListener("resize", handleResize)

      return () => {
        clearInterval(fullscreenInterval)
        document.removeEventListener("visibilitychange", handleVisibilityChange)
        window.removeEventListener("blur", handleFocusLoss)
        window.removeEventListener("resize", handleResize)
      }
    }
  }, [isProtectedMode, isExamTerminated])

  const handleAdminExamAccess = () => {
    // Exit fullscreen first
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        ;(document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        ;(document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        ;(document as any).msExitFullscreen()
      }
    }

    router.push("/rag/droid")
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleLockCurrentQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex]
    const currentAnswer = answers.find((ans) => ans.questionId === currentQuestion.id)

    const hasAnswer =
      (currentAnswer?.selectedAnswer && currentAnswer.selectedAnswer.length > 0) ||
      (currentAnswer?.textAnswer && currentAnswer.textAnswer.trim().length > 0)

    if (hasAnswer) {
      setLockedQuestions((prev) => new Set([...prev, currentQuestionIndex]))
      toast({
        title: "Answer Locked",
        description: "Your answer has been locked and will be considered for evaluation.",
        className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
      })
    } else {
      toast({
        title: "No Answer Selected",
        description: "Please select an answer before locking the question.",
        variant: "destructive",
        className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
      })
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const startExam = () => {
    setExamStarted(true)
    setExamStartTime(new Date())
    setIsProtectedMode(true)
    sessionStorage.setItem("examStarted", "true")
    toast({
      title: "Exam Started - Protected Mode Activated",
      description: `You have ${examConfig?.examDurationMinutes} minutes to complete the assessment.`,
    })
  }

  const getAnsweredCount = () =>
    answers.filter(
      (ans) =>
        (ans.selectedAnswer && ans.selectedAnswer.length > 0) || (ans.textAnswer && ans.textAnswer.trim().length > 0),
    ).length

  const getAvailableOptions = (question: Question | undefined) => {
    if (!question) return []
    const options = [
      { key: "A" as const, text: question.optionA },
      { key: "B" as const, text: question.optionB },
      { key: "C" as const, text: question.optionC },
      { key: "D" as const, text: question.optionD },
      { key: "E" as const, text: question.optionE },
    ]
    return options.filter((option) => option.text && option.text.trim() !== "")
  }

  const handleAnswerSelect = (answer: string) => {
    if (lockedQuestions.has(currentQuestionIndex)) {
      toast({
        title: "Question Locked",
        description: "You cannot change answers to locked questions.",
        variant: "destructive",
        className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
      })
      return
    }

    const currentQuestion = questions[currentQuestionIndex]
    const isMultipleChoice = currentQuestion.questionType === "MSQ"

    setAnswers((prev) =>
      prev.map((ans) => {
        if (ans.questionId === currentQuestion.id) {
          if (isMultipleChoice) {
            const currentSelections = ans.selectedAnswer || []
            const isSelected = currentSelections.includes(answer)
            const maxSelections = 4

            if (isSelected) {
              return { ...ans, selectedAnswer: currentSelections.filter((a) => a !== answer) }
            } else if (currentSelections.length < maxSelections) {
              return { ...ans, selectedAnswer: [...currentSelections, answer] }
            }
            return ans
          } else {
            return { ...ans, selectedAnswer: [answer] }
          }
        }
        return ans
      }),
    )
  }

  const handleTextAnswerChange = (value: string) => {
    if (lockedQuestions.has(currentQuestionIndex)) {
      toast({
        title: "Question Locked",
        description: "You cannot change answers to locked questions.",
        variant: "destructive",
        className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
      })
      return
    }

    const currentQuestion = questions[currentQuestionIndex]

    setAnswers((prev) =>
      prev.map((ans) => {
        if (ans.questionId === currentQuestion.id) {
          return { ...ans, textAnswer: value, selectedAnswer: [] }
        }
        return ans
      }),
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const isNATQuestion = currentQuestion?.questionType === "NAT"
  const availableOptions = getAvailableOptions(currentQuestion)

  if (isRoutingToResults) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-blue-300 shadow-lg">
          <CardHeader className="text-center bg-blue-100">
            <div className="h-16 w-16 mx-auto mb-4 animate-spin">
              <div className="h-full w-full border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
            <CardTitle className="text-2xl text-blue-700">Redirecting...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-blue-800 text-center">Taking you to the results page...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isRefreshDetected) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-300 shadow-lg">
          <CardHeader className="text-center bg-red-100">
            <Shield className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-700">Security Violation Detected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-red-200 p-4 rounded-lg border border-red-300">
              <p className="text-red-800 font-medium text-center">Page refresh detected during active examination</p>
            </div>

            <div className="space-y-3 text-sm text-red-700">
              <p>• Your exam session has been terminated for security reasons</p>
              <p>• All cached data has been cleared</p>
              <p>• You cannot retake this examination</p>
              <p>• Contact your administrator if this was an error</p>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-300">
              <p className="text-yellow-800 text-sm text-center">
                <strong>Redirecting to login page in 3 seconds...</strong>
              </p>
            </div>

            <div className="text-center">
              <Button onClick={() => signOut({ callbackUrl: "/auth/signin" })} variant="destructive" className="w-full">
                Return to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!examStarted && !isLoading && questions.length > 0 && examConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-700">Online Assessment</CardTitle>
            <p className="text-gray-600">Welcome, {studentInfo?.name}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg text-blue-900">Assessment Instructions</h3>
              <div className="space-y-2 text-blue-800">
                <p>
                  • Total Questions: <strong>{questions.length}</strong>
                </p>
                <p>
                  • Time Duration: <strong>{examConfig.examDurationMinutes} minutes</strong>
                </p>
                <p>• Lock your answers to ensure they are considered for evaluation</p>
                <p>• Only locked answers will be evaluated for your final score</p>
                <p>• The assessment will auto-submit when time runs out</p>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Important: Once you start, the timer cannot be paused!</p>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={startExam} size="lg" className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                <Play className="h-5 w-5" />
                Start Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading assessment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-orange-700">Assessment Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
            <p className="text-gray-600">No questions are currently available. Please contact your administrator.</p>
            <Button onClick={() => router.push("/")} variant="outline">
              Back to Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isExamTerminated) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-300 shadow-lg">
          <CardHeader className="text-center bg-red-100">
            <Shield className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-700">Exam Terminated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-red-200 p-4 rounded-lg border border-red-300">
              <p className="text-red-800 font-medium text-center">
                {terminationReason === "tab_switch" && "Multiple tab switches detected"}
                {terminationReason === "security_violation" && "Critical security violation detected"}
                {terminationReason === "time_up" && "Time limit exceeded"}
                {terminationReason === "alt_tab_violation" && "Alt+Tab usage detected"}
                {terminationReason === "fullscreen_violation_limit" && "Fullscreen violation limit exceeded"}
              </p>
            </div>

            <div className="space-y-3 text-sm text-red-700">
              <p>• You switched tabs/windows {tabSwitchCount} times (limit: 2)</p>
              <p>• Your exam has been terminated for academic dishonesty</p>
              <p>• Only answered questions have been submitted for marking</p>
              <p>• Status: TERMINATED - CHEATED</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getLockedCount = () => lockedQuestions.size

  return (
    <ProtectedWindow
      enabled={isProtectedMode}
      onViolation={handleSecurityViolation}
      onModeChange={setIsProtectedMode}
      title="Online Assessment - Protected Mode"
      showViolations={true}
      hideExitButton={examStarted}
    >
      <KeyboardBlocker
        enabled={isProtectedMode}
        onViolation={handleSecurityViolation}
        strictMode={true}
        allowedKeys={["Enter", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Backspace", "Delete"]}
        onCriticalViolation={(violation, keyCombo) => {
          console.log("[v0] Critical violation detected:", violation)
          setIsExamTerminated(true)
          setTerminationReason("security_violation")
          setIsProtectedMode(false)

          toast({
            title: "Exam Terminated - Critical Security Violation",
            description: `${violation}. Your exam has been terminated immediately.`,
            variant: "destructive",
            className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
          })
        }}
        onAltTabViolation={(violation, keyCombo) => {
          console.log("[v0] Alt+Tab violation detected:", violation)
          setIsExamTerminated(true)
          setTerminationReason("alt_tab_violation")
          setIsProtectedMode(false)

          toast({
            title: "Exam Terminated - Alt+Tab Detected",
            description: "Alt+Tab usage is strictly prohibited. Your exam has been terminated immediately.",
            variant: "destructive",
            className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
          })
        }}
      />

      <FullscreenController
        enabled={isProtectedMode}
        onFullscreenChange={(isFullscreen) => {
          if (isProtectedMode && !isFullscreen && !isExamTerminated) {
            handleSecurityViolation("Fullscreen mode exited", "Unauthorized exit from fullscreen")
          }
        }}
        onViolation={handleSecurityViolation}
        autoEnter={false}
        preventExit={true}
        showControls={false}
        violationLimit={3}
        onTerminate={() => {
          setIsExamTerminated(true)
          setTerminationReason("fullscreen_violation_limit")
          setIsProtectedMode(false)

          toast({
            title: "Exam Terminated - Fullscreen Violations",
            description: "Maximum fullscreen exit attempts exceeded. Your exam has been terminated.",
            variant: "destructive",
            className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md",
          })
        }}
      />

      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto p-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Online Assessment</h1>
                <p className="text-gray-600">Welcome, {studentInfo?.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSubmitExam}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Submit Assessment
                    </>
                  )}
                </Button>
                <Badge
                  variant="outline"
                  className={`flex items-center gap-2 ${
                    timeRemaining < 300
                      ? "border-red-500 text-red-700 bg-red-50"
                      : timeRemaining < 600
                        ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                        : "border-green-500 text-green-700 bg-green-50"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  {formatTime(timeRemaining)}
                </Badge>
                <Badge variant="secondary">
                  {getLockedCount()} / {questions.length} Locked
                </Badge>
              </div>
            </div>
            <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2 mt-4" />
          </div>
        </div>

        <div className="flex container mx-auto">
          <div className="flex-1 p-6">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {currentQuestion?.marks} Mark{currentQuestion?.marks > 1 ? "s" : ""}
                    </Badge>
                    {lockedQuestions.has(currentQuestionIndex) && (
                      <Badge variant="secondary" className="bg-green-200 text-green-800">
                        🔒 Locked
                      </Badge>
                    )}
                    {isNATQuestion ? (
                      <Badge variant="secondary" className="text-xs">
                        Fill in the blank
                      </Badge>
                    ) : currentQuestion?.questionType === "MSQ" ? (
                      <Badge variant="secondary" className="text-xs">
                        Multiple Select
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Single Choice
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto">
                  <div className="text-lg leading-relaxed space-y-2">
                    <p className="font-semibold text-gray-900 sticky top-0 bg-gray-50 pb-2">
                      {currentQuestionIndex + 1}. {currentQuestion?.question}
                    </p>
                    {!isNATQuestion && (
                      <div className="space-y-2">
                        {availableOptions.map((option) => (
                          <p key={option.key} className="ml-4 py-1">
                            {option.key}) {option.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {isNATQuestion ? (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Your Answer:</label>
                    <input
                      type="text"
                      value={answers.find((a) => a.questionId === currentQuestion?.id)?.textAnswer || ""}
                      onChange={(e) => handleTextAnswerChange(e.target.value)}
                      placeholder="Type your answer here..."
                      disabled={lockedQuestions.has(currentQuestionIndex)}
                      className={`w-full p-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        lockedQuestions.has(currentQuestionIndex) ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableOptions.map((option) => {
                      const isSelected =
                        answers
                          .find((a) => a.questionId === currentQuestion?.id)
                          ?.selectedAnswer?.includes(option.key) || false
                      const isLocked = lockedQuestions.has(currentQuestionIndex)

                      return (
                        <div
                          key={option.key}
                          onClick={() => !isLocked && handleAnswerSelect(option.key)}
                          className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                            isLocked
                              ? "cursor-not-allowed bg-gray-100 border-gray-200"
                              : "cursor-pointer hover:bg-blue-50"
                          } ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                        >
                          <div className="flex items-center">
                            {currentQuestion?.questionType === "MSQ" ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                disabled={isLocked}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            ) : (
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => {}}
                                disabled={isLocked}
                                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                            )}
                          </div>
                          <span className={`font-medium text-lg ${isLocked ? "text-gray-500" : "text-gray-900"}`}>
                            {option.key}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="flex items-center gap-2 px-6 py-2 bg-transparent"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9l-7-7 7-7" />
                </svg>
                Previous
              </Button>

              <div className="flex gap-3">
                <Button
                  onClick={handleLockCurrentQuestion}
                  disabled={lockedQuestions.has(currentQuestionIndex)}
                  variant={lockedQuestions.has(currentQuestionIndex) ? "secondary" : "outline"}
                  className={`flex items-center gap-2 px-6 py-2 ${
                    lockedQuestions.has(currentQuestionIndex)
                      ? "bg-green-100 text-green-800 border-green-300"
                      : "hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  {lockedQuestions.has(currentQuestionIndex) ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 006 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Locked
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      Lock Answer
                    </>
                  )}
                </Button>

                {currentQuestionIndex < questions.length - 1 && (
                  <Button
                    onClick={handleNextQuestion}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                )}

                {currentQuestionIndex === questions.length - 1 && (
                  <Button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to submit your exam? This action cannot be undone.")) {
                        handleSubmitExam()
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Submit Exam
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="w-80 bg-white shadow-sm border-l min-h-screen">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Question Navigation</h3>
              <p className="text-xs text-gray-500 mt-1">Answered questions are locked and cannot be changed</p>
            </div>
            <div className="p-4 h-[calc(100vh-120px)] overflow-y-auto">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, index) => {
                  const hasAnswer =
                    (answers[index]?.selectedAnswer && answers[index].selectedAnswer.length > 0) ||
                    (answers[index]?.textAnswer && answers[index].textAnswer.trim().length > 0)

                  const isLocked = lockedQuestions.has(index)
                  const canNavigate = true

                  return (
                    <button
                      key={index}
                      onClick={() => canNavigate && setCurrentQuestionIndex(index)}
                      disabled={!canNavigate}
                      className={`w-12 h-12 rounded-lg text-sm font-medium transition-all relative ${
                        index === currentQuestionIndex
                          ? "bg-blue-600 text-white shadow-lg"
                          : isLocked
                            ? "bg-green-200 text-green-800 border-2 border-green-400"
                            : hasAnswer
                              ? "bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200"
                              : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                      }`}
                      title={
                        isLocked
                          ? "Question locked for evaluation"
                          : hasAnswer
                            ? "Question has answer (not locked)"
                            : "Question not answered"
                      }
                    >
                      {index + 1}
                      {isLocked && <span className="absolute -top-1 -right-1 text-xs">🔒</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedWindow>
  )
}

export { AssessmentInterface }
export default AssessmentInterface
