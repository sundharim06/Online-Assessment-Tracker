"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Question, ExamConfig } from "@/lib/google-sheets"

interface StudentAnswer {
  questionId: number
  selectedAnswer: string[]
  textAnswer?: string
}

export function AdminExamInterface() {
  const { data: session } = useSession()
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
  const router = useRouter()
  const { toast } = useToast()

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const displayAllAnswers = () => {
    const correctAnswerSummary = questions
      .map((question, index) => {
        const questionNum = index + 1
        let correctAnswer = ""

        if (question.questionType === "NAT") {
          correctAnswer = question.correctAnswer || "N/A"
        } else {
          correctAnswer = question.correctAnswer || "N/A"
        }

        return `${questionNum} ${correctAnswer}`
      })
      .join("...")

    console.clear()
    console.log("🎯 CORRECT ANSWERS:")
    console.log(correctAnswerSummary)
    console.log("📊 Total Questions:", questions.length)
    console.log("⏰ Updated:", new Date().toLocaleTimeString())
  }

  useEffect(() => {
    const originalConsole = window.console

    window.console = {
      ...originalConsole,
      log: originalConsole.log.bind(originalConsole),
      error: originalConsole.error.bind(originalConsole),
      warn: originalConsole.warn.bind(originalConsole),
      info: originalConsole.info.bind(originalConsole),
      debug: originalConsole.debug.bind(originalConsole),
      table: originalConsole.table.bind(originalConsole),
      group: originalConsole.group.bind(originalConsole),
      groupEnd: originalConsole.groupEnd.bind(originalConsole),
    }

    console.log("🔧 ADMIN CONSOLE ACCESS ENABLED")
    console.log("📋 Admin Exam Interface Loaded")

    setStudentInfo({
      id: session?.user?.id || "admin",
      name: session?.user?.name || "Administrator",
    })
    loadQuestions()

    return () => {
      window.console = originalConsole
    }
  }, [session])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (examStarted && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [examStarted, timeRemaining])

  const loadQuestions = async () => {
    try {
      const response = await fetch("/api/admin/questions")
      const data = await response.json()

      if (data.success && data.questions && data.examConfig) {
        setQuestions(data.questions)
        setExamConfig(data.examConfig)
        setTimeRemaining(data.examConfig.examDurationMinutes * 60)
        setAnswers(data.questions.map((q: Question) => ({ questionId: q.id, selectedAnswer: [], textAnswer: "" })))
      }
    } catch (error) {
      console.error("Error loading questions:", error)
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const startExam = () => {
    setExamStarted(true)
    setExamStartTime(new Date())

    toast({
      title: "Assessment Started",
      description: `You have ${examConfig?.examDurationMinutes} minutes to complete the assessment.`,
    })
  }

  const handleAnswerSelect = (optionKey: string) => {
    const currentQuestion = questions[currentQuestionIndex]
    const isMultipleChoice = currentQuestion.questionType === "MSQ"

    if (lockedQuestions.has(currentQuestionIndex)) return

    setAnswers((prev) =>
      prev.map((ans) => {
        if (ans.questionId === currentQuestion.id) {
          let newAnswer
          if (isMultipleChoice) {
            const currentSelections = ans.selectedAnswer || []
            const isSelected = currentSelections.includes(optionKey)

            if (isSelected) {
              newAnswer = { ...ans, selectedAnswer: currentSelections.filter((a) => a !== optionKey) }
            } else {
              newAnswer = { ...ans, selectedAnswer: [...currentSelections, optionKey] }
            }
          } else {
            newAnswer = { ...ans, selectedAnswer: [optionKey] }
          }

          setTimeout(() => displayAllAnswers(), 100)

          return newAnswer
        }
        return ans
      }),
    )

    setAnsweredQuestions((prev) => new Set([...prev, currentQuestionIndex]))
  }

  const handleTextAnswerChange = (value: string) => {
    const currentQuestion = questions[currentQuestionIndex]

    if (lockedQuestions.has(currentQuestionIndex)) return

    setAnswers((prev) =>
      prev.map((ans) => {
        if (ans.questionId === currentQuestion.id) {
          const newAnswer = { ...ans, textAnswer: value, selectedAnswer: [] }

          if (value.trim()) {
            setTimeout(() => displayAllAnswers(), 100)
          }

          return newAnswer
        }
        return ans
      }),
    )

    if (value.trim()) {
      setAnsweredQuestions((prev) => new Set([...prev, currentQuestionIndex]))
    } else {
      setAnsweredQuestions((prev) => {
        const newSet = new Set(prev)
        newSet.delete(currentQuestionIndex)
        return newSet
      })
    }
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

      setTimeout(() => displayAllAnswers(), 100)

      toast({
        title: "Answer Locked",
        description: "Your answer has been locked and will be considered for evaluation.",
        className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
      })
    } else {
      toast({
        title: "No Answer Selected",
        description: "Please select an answer before locking the question.",
        variant: "destructive",
        className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
      })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const lockedQuestionIds = Array.from(lockedQuestions).map((index) => questions[index].id)

      const adminSubmissionId = `ADMIN_${session?.user?.id || "system"}_${Date.now()}`

      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: adminSubmissionId,
          answers: answers,
          lockedQuestionIds: lockedQuestionIds,
          studentName: session?.user?.name || "Administrator",
          studentSection: "ADMIN",
          studentDepartment: "Administration",
          studentEmail: session?.user?.email || "admin@exam.system",
          status: "completed",
          examType: "admin",
          startTime: examStartTime,
          endTime: new Date(),
          isAdminSubmission: true,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        sessionStorage.setItem("studentName", session?.user?.name || "Administrator")

        sessionStorage.setItem(
          "assessmentResult",
          JSON.stringify({
            ...result,
            isAdminExam: true,
            adminMode: true,
          }),
        )

        router.push("/results")
      } else {
        throw new Error(result.message || "Failed to submit assessment")
      }
    } catch (error) {
      console.error("Error submitting exam:", error)
      toast({
        title: "Error",
        description: "Failed to submit exam. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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

  if (!examStarted && !isLoading && questions.length > 0 && examConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-700">Student Assessment</CardTitle>
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

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers.find((ans) => ans.questionId === currentQuestion.id)
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const isMultipleChoice = currentQuestion?.questionType === "MSQ"
  const isNATQuestion = currentQuestion?.questionType === "NAT"
  const availableOptions = getAvailableOptions(currentQuestion)

  const getLockedCount = () => lockedQuestions.size

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Assessment</h1>
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
                {getLockedCount()} / {questions.length} Locked
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
                  {lockedQuestions.has(currentQuestionIndex) && (
                    <Badge variant="secondary" className="bg-green-200 text-green-800">
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
                    disabled={lockedQuestions.has(currentQuestionIndex)}
                    className={`w-full p-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      lockedQuestions.has(currentQuestionIndex) ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {availableOptions.map((option) => {
                    const isSelected = currentAnswer?.selectedAnswer?.includes(option.key) || false
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
                disabled={lockedQuestions.has(currentQuestionIndex)}
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
              >
                {lockedQuestions.has(currentQuestionIndex) ? <>🔒 Locked</> : <>🔒 Lock Answer</>}
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
            <p className="text-xs text-gray-500 mt-1">🔒 = Locked (for evaluation), ✓ = Has answer</p>
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
  )
}
