"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, ChevronRight, CheckCircle, AlertCircle, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
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
  const router = useRouter()
  const { toast } = useToast()

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
    const currentQuestion = questions[currentQuestionIndex]
    const correctAnswersArray = currentQuestion.correctAnswer?.split(",").map((a) => a.trim()) || []
    const isMultipleChoice =
      correctAnswersArray.length > 1 || currentQuestion.questionType === "MSQ" || currentQuestion.maxSelections > 1

    console.log(
      "[v0] Question",
      currentQuestion.id,
      "allows multiple:",
      isMultipleChoice,
      "max selections:",
      currentQuestion.maxSelections,
    )

    setAnswers((prev) =>
      prev.map((ans) => {
        if (ans.questionId === currentQuestion.id) {
          if (isMultipleChoice) {
            const currentSelections = ans.selectedAnswer || []
            const isSelected = currentSelections.includes(answer)
            const maxSelections = currentQuestion.maxSelections || correctAnswersArray.length

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

  const handleNextQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex]
    const currentAnswer = answers.find((ans) => ans.questionId === currentQuestion.id)

    const hasAnswer =
      (currentAnswer?.selectedAnswer && currentAnswer.selectedAnswer.length > 0) ||
      (currentAnswer?.textAnswer && currentAnswer.textAnswer.trim().length > 0)

    if (!hasAnswer) {
      toast({
        title: "Answer Required",
        description: "Please select an answer before proceeding to the next question.",
        variant: "destructive",
      })
      return
    }

    setAnsweredQuestions((prev) => new Set([...prev, currentQuestionIndex]))

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleSubmit = async () => {
    if (!studentInfo) return

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: Number.parseInt(studentInfo.id),
          answers: answers,
          studentName: studentInfo.name,
          studentSection: sessionStorage.getItem("studentSection") || "Unknown",
          studentDepartment: sessionStorage.getItem("studentDepartment") || "Unknown",
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
  }

  useEffect(() => {
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

        console.log("[v0] Fetching questions from API...")
        const response = await fetch(`/api/questions?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        })
        const data = await response.json()

        console.log("[v0] Full API response:", JSON.stringify(data, null, 2))
        console.log("[v0] Exam config received:", data.examConfig)
        console.log("[v0] Exam duration from API:", data.examConfig?.examDurationMinutes)
        console.log("[v0] Type of duration:", typeof data.examConfig?.examDurationMinutes)

        if (response.ok && data.questions.length > 0) {
          setQuestions(data.questions)
          setExamConfig(data.examConfig)

          const durationMinutes = data.examConfig?.examDurationMinutes || 60
          const durationInSeconds = durationMinutes * 60

          console.log("[v0] Duration from L2 cell:", durationMinutes, "minutes")
          console.log("[v0] Converting to seconds:", durationInSeconds, "seconds")
          console.log("[v0] Setting timeRemaining state to:", durationInSeconds)

          setTimeRemaining(durationInSeconds)

          // Verify the state was set correctly
          setTimeout(() => {
            console.log("[v0] Timer state after setting:", timeRemaining)
          }, 100)

          setAnswers(data.questions.map((q: Question) => ({ questionId: q.id, selectedAnswer: [], textAnswer: "" })))
        } else {
          toast({
            title: "Assessment Not Available",
            description: "The test has been disabled by the administrator. No questions are currently available.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("[v0] Error loading assessment:", error)
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
  }, [router, toast])

  useEffect(() => {
    if (timeRemaining > 0 && examStarted && questions.length > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0 && examStarted) {
      toast({
        title: "Time's Up!",
        description: "Your assessment has been automatically submitted.",
        variant: "destructive",
      })
      handleSubmit()
    }
  }, [timeRemaining, examStarted, questions.length])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const startExam = () => {
    console.log("[v0] Starting exam with duration:", examConfig?.examDurationMinutes, "minutes")
    console.log("[v0] Current timeRemaining when starting:", timeRemaining)
    setExamStarted(true)
    setExamStartTime(new Date())
    toast({
      title: "Exam Started",
      description: `You have ${examConfig?.examDurationMinutes} minutes to complete the assessment.`,
    })
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
  const correctAnswersArray = currentQuestion?.correctAnswer?.split(",").map((a) => a.trim()) || []
  const isMultipleChoice =
    correctAnswersArray.length > 1 || currentQuestion?.questionType === "MSQ" || currentQuestion?.maxSelections > 1
  const isNATQuestion = currentQuestion?.questionType === "NAT"
  const availableOptions = getAvailableOptions(currentQuestion)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Online Assessment</h1>
              <p className="text-gray-600">Welcome, {studentInfo?.name}</p>
            </div>
            <div className="flex items-center gap-4">
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
                  {isNATQuestion ? (
                    <Badge variant="secondary" className="text-xs">
                      Fill in the blank
                    </Badge>
                  ) : isMultipleChoice ? (
                    <Badge variant="secondary" className="text-xs">
                      Multiple Select - Choose {correctAnswersArray.length} options
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
                    className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {availableOptions.map((option) => {
                    const isSelected = currentAnswer?.selectedAnswer?.includes(option.key) || false

                    return (
                      <div
                        key={option.key}
                        onClick={() => handleAnswerSelect(option.key)}
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-blue-50 ${
                          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center">
                          {isMultipleChoice ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          ) : (
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                          )}
                        </div>
                        <span className="font-medium text-gray-900 text-lg">{option.key}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            {currentQuestionIndex === questions.length - 1 ? (
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
            ) : (
              <Button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
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

                const isLocked = answeredQuestions.has(index)
                const canNavigate = index <= currentQuestionIndex && !isLocked

                return (
                  <button
                    key={index}
                    onClick={() => (canNavigate ? setCurrentQuestionIndex(index) : null)}
                    disabled={!canNavigate}
                    className={`w-12 h-12 rounded-lg text-sm font-medium transition-all ${
                      index === currentQuestionIndex
                        ? "bg-blue-600 text-white shadow-lg"
                        : isLocked
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : hasAnswer
                            ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                            : index < currentQuestionIndex
                              ? "bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                    title={isLocked ? "Question locked - cannot be changed" : `Question ${index + 1}`}
                  >
                    {index + 1}
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
