"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Play, Shield } from "lucide-react"
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

export function AssessmentInterface() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<StudentAnswer[]>([])
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studentInfo, setStudentInfo] = useState<{ id: string; name: string } | null>(null)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())
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
  const router = useRouter()
  const { toast } = useToast()

  const submitTerminatedExam = useCallback(
    async (reason: string) => {
      if (!studentInfo) return

      setIsSubmitting(true)
      sessionStorage.removeItem("examInProgress")
      sessionStorage.removeItem("examStarted")

      try {
        const answeredOnly = answers.filter(
          (answer) =>
            (answer.selectedAnswer && answer.selectedAnswer.length > 0) ||
            (answer.textAnswer && answer.textAnswer.trim().length > 0),
        )

        const lockedQuestionIds = Array.from(answeredQuestions)
          .map((index) => questions[index]?.id)
          .filter(Boolean)

        const response = await fetch("/api/assessment/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: Number.parseInt(studentInfo.id),
            answers: answeredOnly, // Submit only answered questions
            lockedQuestionIds, // Send locked question IDs for evaluation
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

        if (response.ok) {
          sessionStorage.setItem(
            "assessmentResult",
            JSON.stringify({
              ...result,
              status: "terminated",
              reason: reason,
              answeredCount: answeredOnly.length,
              totalQuestions: questions.length,
            }),
          )

          setTimeout(() => {
            router.push("/results")
          }, 3000)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to submit terminated exam.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [studentInfo, answers, router, toast, tabSwitchCount, questions.length],
  )

  const handleSecurityViolation = useCallback(
    (violation: string, details?: string) => {
      const violationMessage = details ? `${violation}: ${details}` : violation
      setSecurityViolations((prev) => [...prev, violationMessage])
      setViolationCount((prev) => prev + 1)

      // Track tab switches specifically
      if (violation.includes("tab") || violation.includes("window") || violation.includes("focus")) {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1

          if (newCount >= 2) {
            setIsExamTerminated(true)
            setTerminationReason("cheated")
            setIsProtectedMode(false)

            toast({
              title: "Exam Terminated - Cheating Detected",
              description: "You have switched tabs/windows 2 times. Your exam has been terminated for cheating.",
              variant: "destructive",
            })

            // Submit only answered questions with terminated status
            submitTerminatedExam("cheated")
            return newCount
          } else {
            toast({
              title: `Tab Switch Warning (${newCount}/2)`,
              description: "One more tab switch will terminate your exam permanently.",
              variant: "destructive",
            })
            return newCount
          }
        })
      }

      toast({
        title: "Security Violation",
        description: violationMessage,
        variant: "destructive",
      })

      if (violationCount >= 3) {
        toast({
          title: "Exam Terminated - Multiple Security Violations",
          description: "Too many security violations detected. Your exam has been terminated.",
          variant: "destructive",
        })

        setIsExamTerminated(true)
        setTerminationReason("security_violation")
        setIsProtectedMode(false)
        submitTerminatedExam("security_violation")
      }
    },
    [violationCount, toast, submitTerminatedExam],
  )

  const handleSubmit = useCallback(async () => {
    if (!studentInfo) return

    setIsSubmitting(true)
    setIsProtectedMode(false)
    sessionStorage.removeItem("examInProgress")
    sessionStorage.removeItem("examStarted")

    try {
      const lockedQuestionIds = Array.from(answeredQuestions)
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
  }, [studentInfo, answers, router, toast])

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
          })
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeRemaining, examStarted, questions.length, handleSubmit, toast])

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
    if (isProtectedMode) {
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!examStarted && event.shiftKey && event.altKey && event.key === "Y") {
        event.preventDefault()
        setShowAdminAccess(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [examStarted])

  useEffect(() => {
    if (isProtectedMode && !isExamTerminated) {
      const enforceFullscreen = () => {
        if (!document.fullscreenElement) {
          // Immediately attempt to re-enter fullscreen
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
        }
      }

      // Continuous fullscreen monitoring - check every 100ms
      const fullscreenInterval = setInterval(enforceFullscreen, 100)

      // Additional event listeners for immediate response
      const handleVisibilityChange = () => {
        if (document.hidden && isProtectedMode && !isExamTerminated) {
          setTimeout(enforceFullscreen, 10)
        }
      }

      const handleFocusLoss = () => {
        if (isProtectedMode && !isExamTerminated) {
          setTimeout(enforceFullscreen, 10)
        }
      }

      const handleResize = () => {
        if (isProtectedMode && !isExamTerminated) {
          setTimeout(enforceFullscreen, 10)
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

    // Navigate to admin exam
    router.push("/admin/exam")
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
      setAnsweredQuestions((prev) => new Set([...prev, currentQuestionIndex]))
      toast({
        title: "Question Locked",
        description: "Your answer has been locked and cannot be changed.",
      })
    } else {
      toast({
        title: "No Answer Selected",
        description: "Please select an answer before locking the question.",
        variant: "destructive",
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

  const getAvailableOptions = (question: Question) => {
    const options = [
      { key: "A" as const, text: question.optionA },
      { key: "B" as const, text: question.optionB },
      { key: "C" as const, text: question.optionC },
      { key: "D" as const, text: question.optionD },
      { key: "E" as const, text: question.optionE },
      { key: "F" as const, text: question.optionF },
    ]

    return options.filter((option) => option.text && option.text.trim() !== "")
  }

  const handleAnswerSelect = (answer: "A" | "B" | "C" | "D" | "E" | "F") => {
    if (answeredQuestions.has(currentQuestionIndex)) {
      toast({
        title: "Question Locked",
        description: "You cannot change answers to previously completed questions.",
        variant: "destructive",
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
    if (answeredQuestions.has(currentQuestionIndex)) {
      toast({
        title: "Question Locked",
        description: "You cannot change answers to previously completed questions.",
        variant: "destructive",
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
              <h3 className="font-semibold text-lg text-blue-900">Exam Instructions</h3>
              <div className="space-y-2 text-blue-800">
                <p>
                  • Total Questions: <strong>{questions.length}</strong>
                </p>
                <p>
                  • Time Duration: <strong>{examConfig.examDurationMinutes} minutes</strong>
                </p>
                <p>• Once you move to the next question, you cannot go back to change your answer</p>
                <p>• Make sure to answer each question before proceeding</p>
                <p>• The exam will auto-submit when time runs out</p>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <Shield className="h-5 w-5" />
                <p className="font-medium">Protected Exam Environment</p>
              </div>
              <div className="space-y-1 text-sm text-red-700">
                <p>
                  • <strong>Complete protection mode will be activated</strong> when you start the exam
                </p>
                <p>
                  • <strong>All keyboard shortcuts will be disabled</strong>
                </p>
                <p>
                  • <strong>Right-click and text selection will be blocked</strong>
                </p>
                <p>
                  • <strong>Window switching (Alt+Tab) will be prevented</strong>
                </p>
                <p>• Page refresh will terminate your exam session permanently</p>
                <p>• Multiple security violations will result in automatic termination</p>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">
                  Important: Once you start, the timer cannot be paused and complete protection mode will activate!
                </p>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={startExam} size="lg" className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                <Play className="h-5 w-5" />
                Start Protected Assessment
              </Button>
            </div>
          </CardContent>
        </Card>

        {showAdminAccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md border-blue-300 shadow-2xl">
              <CardHeader className="bg-blue-50 border-b border-blue-200">
                <CardTitle className="text-xl text-blue-800">Instructor Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <p className="text-gray-700">Access the non-protected exam mode with console answers visible?</p>

                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> This will exit fullscreen and allow console access with answer keys.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleAdminExamAccess} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Access Non-Protected Exam
                  </Button>
                  <Button onClick={() => setShowAdminAccess(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
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

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers.find((ans) => ans.questionId === currentQuestion.id)
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const isMultipleChoice = currentQuestion?.questionType === "MSQ"
  const isNATQuestion = currentQuestion?.questionType === "NAT"
  const availableOptions = getAvailableOptions(currentQuestion)

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
              <p className="text-red-800 font-medium text-center">Cheating Detected - Tab Switching Limit Exceeded</p>
            </div>

            <div className="space-y-3 text-sm text-red-700">
              <p>• You switched tabs/windows {tabSwitchCount} times (limit: 2)</p>
              <p>• Your exam has been terminated for academic dishonesty</p>
              <p>• Only answered questions have been submitted for marking</p>
              <p>• Status: TERMINATED - CHEATED</p>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-300">
              <p className="text-yellow-800 text-sm text-center">
                <strong>Redirecting to results page...</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
          setIsExamTerminated(true)
          setTerminationReason("security_violation")
          setIsProtectedMode(false)

          toast({
            title: "Exam Terminated - Critical Security Violation",
            description: `${violation}. Your exam has been terminated immediately.`,
            variant: "destructive",
          })

          submitTerminatedExam("security_violation")
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
        onTerminate={() => submitTerminatedExam("security_violation")}
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
                  onClick={handleSubmit}
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
                  {getAnsweredCount()} / {questions.length} Answered
                </Badge>
              </div>
            </div>
            <Progress value={progress} className="h-2 mt-4" />
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
                      {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? "s" : ""}
                    </Badge>
                    {answeredQuestions.has(currentQuestionIndex) && (
                      <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                        🔒 Locked
                      </Badge>
                    )}
                    {isNATQuestion ? (
                      <Badge variant="secondary" className="text-xs">
                        Fill in the blank
                      </Badge>
                    ) : isMultipleChoice ? (
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
                {/* ... existing question content ... */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="text-lg leading-relaxed space-y-2">
                    <p className="font-semibold text-gray-900">
                      {currentQuestionIndex + 1}. {currentQuestion.question}
                    </p>
                    {!isNATQuestion && (
                      <>
                        {availableOptions.map((option) => (
                          <p key={option.key} className="ml-4">
                            {option.key}) {option.text}
                          </p>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {isNATQuestion ? (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Your Answer:</label>
                    <input
                      type="text"
                      value={currentAnswer?.textAnswer || ""}
                      onChange={(e) => handleTextAnswerChange(e.target.value)}
                      placeholder="Type your answer here..."
                      disabled={answeredQuestions.has(currentQuestionIndex)}
                      className={`w-full p-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        answeredQuestions.has(currentQuestionIndex) ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableOptions.map((option) => {
                      const isSelected = currentAnswer?.selectedAnswer?.includes(option.key) || false
                      const isLocked = answeredQuestions.has(currentQuestionIndex)

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
                            {isMultipleChoice ? (
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

            <div className="flex justify-between">
              <Button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={handleLockCurrentQuestion}
                  disabled={answeredQuestions.has(currentQuestionIndex)}
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent"
                >
                  {answeredQuestions.has(currentQuestionIndex) ? <>🔒 Locked</> : <>🔒 Lock Answer</>}
                </Button>

                {currentQuestionIndex < questions.length - 1 && (
                  <Button onClick={handleNextQuestion} className="flex items-center gap-2">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="w-80 bg-white shadow-sm border-l min-h-screen">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Question Navigation</h3>
              <p className="text-xs text-gray-500 mt-1">🔒 = Locked (answered), ✓ = Current answer</p>
            </div>
            <div className="p-4 h-[calc(100vh-120px)] overflow-y-auto">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, index) => {
                  const hasAnswer =
                    (answers[index]?.selectedAnswer && answers[index].selectedAnswer.length > 0) ||
                    (answers[index]?.textAnswer && answers[index].textAnswer.trim().length > 0)

                  const isLocked = answeredQuestions.has(index)
                  const canNavigate = true // Allow navigation to any question

                  return (
                    <button
                      key={index}
                      onClick={() => canNavigate && setCurrentQuestionIndex(index)}
                      disabled={!canNavigate}
                      className={`w-12 h-12 rounded-lg text-sm font-medium transition-all relative ${
                        index === currentQuestionIndex
                          ? "bg-blue-600 text-white shadow-lg"
                          : isLocked
                            ? "bg-gray-300 text-gray-600 border-2 border-gray-400"
                            : hasAnswer
                              ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                      }`}
                      title={
                        isLocked
                          ? "Question answered and locked"
                          : hasAnswer
                            ? "Question has current answer"
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
