"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Home } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Question {
  id: number
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string
  optionF?: string
  correctAnswer: string
  marks: number
  questionType: string
}

interface StudentAnswer {
  questionId: number
  selectedAnswer: string[]
  textAnswer?: string
}

export function AdminExamInterface() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<StudentAnswer[]>([])
  const [timeLeft, setTimeLeft] = useState(3600) // 60 minutes
  const [isLoading, setIsLoading] = useState(true)
  const [examStarted, setExamStarted] = useState(false)
  const [studentInfo, setStudentInfo] = useState<{ id: string; name: string } | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const originalConsole = { ...console }

    // Restore full console functionality
    Object.assign(console, originalConsole)

    // Set student info for admin exam
    setStudentInfo({ id: "admin", name: "Administrator" })

    loadQuestions()
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (examStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [examStarted, timeLeft])

  const loadQuestions = async () => {
    try {
      const response = await fetch("/api/questions")
      const data = await response.json()

      if (data.success && data.questions) {
        setQuestions(data.questions)
        setAnswers(data.questions.map((q: Question) => ({ questionId: q.id, selectedAnswer: [], textAnswer: "" })))

        console.log("[v0] ADMIN EXAM MODE: All Questions with Correct Answers:")
        data.questions.forEach((q: Question, index: number) => {
          const options = [
            { key: "A", text: q.optionA },
            { key: "B", text: q.optionB },
            { key: "C", text: q.optionC },
            { key: "D", text: q.optionD },
            { key: "E", text: q.optionE },
            { key: "F", text: q.optionF },
          ].filter((opt) => opt.text && opt.text.trim() !== "")

          console.log(`Question ${index + 1}:`, {
            id: q.id,
            question: q.question,
            type: q.questionType,
            marks: q.marks,
            options: options,
            correctAnswer: q.correctAnswer,
            correctAnswerText: options.find((opt) => opt.key === q.correctAnswer)?.text || q.correctAnswer,
          })
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to load questions",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error loading questions:", error)
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startExam = () => {
    setExamStarted(true)
    toast({
      title: "Admin Exam Started",
      description: "Console access enabled. Check console for all answers.",
    })
    if (questions.length > 0) {
      const currentQuestion = questions[0]
      console.log("[v0] ADMIN MODE: Starting with Question 1:")
      console.log({
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        correctAnswer: currentQuestion.correctAnswer,
        type: currentQuestion.questionType,
        marks: currentQuestion.marks,
      })
    }
  }

  const handleAnswerChange = (value: string) => {
    const currentQuestion = questions[currentQuestionIndex]
    const isMultipleChoice = currentQuestion.questionType === "MSQ"

    setAnswers((prev) =>
      prev.map((ans) => {
        if (ans.questionId === currentQuestion.id) {
          if (isMultipleChoice) {
            const currentSelections = ans.selectedAnswer || []
            const isSelected = currentSelections.includes(value)

            if (isSelected) {
              return { ...ans, selectedAnswer: currentSelections.filter((a) => a !== value) }
            } else {
              return { ...ans, selectedAnswer: [...currentSelections, value] }
            }
          } else {
            return { ...ans, selectedAnswer: [value] }
          }
        }
        return ans
      }),
    )

    console.log("[v0] ADMIN MODE: Answer Selected:", {
      questionId: currentQuestion.id,
      questionNumber: currentQuestionIndex + 1,
      selectedAnswer: value,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect: value === currentQuestion.correctAnswer,
      questionType: currentQuestion.questionType,
      marks: currentQuestion.marks,
    })
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

    console.log("[v0] ADMIN MODE: Text Answer:", {
      questionId: currentQuestion.id,
      questionNumber: currentQuestionIndex + 1,
      textAnswer: value,
      correctAnswer: currentQuestion.correctAnswer,
      questionType: currentQuestion.questionType,
    })
  }

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
    const question = questions[index]

    console.log("[v0] ADMIN MODE: Navigated to Question:", {
      questionNumber: index + 1,
      questionId: question.id,
      question: question.question,
      correctAnswer: question.correctAnswer,
      questionType: question.questionType,
      marks: question.marks,
      currentAnswer:
        answers.find((a) => a.questionId === question.id)?.selectedAnswer ||
        answers.find((a) => a.questionId === question.id)?.textAnswer ||
        "Not answered",
    })
  }

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: `ADMIN_${Date.now()}`, // Unique admin ID
          answers: answers,
          lockedQuestionIds: questions.map((q) => q.id), // All questions considered locked for admin
          studentName: "Administrator",
          studentSection: "ADMIN",
          studentDepartment: "Administration",
          studentEmail: "admin@exam.system",
          status: "completed",
          examType: "admin", // Mark as admin exam
        }),
      })

      const result = await response.json()

      if (response.ok) {
        const score = calculateScore()
        console.log("[v0] ADMIN MODE: Final Exam Results:", {
          totalScore: score,
          totalPossibleMarks: questions.reduce((sum, q) => sum + q.marks, 0),
          totalQuestions: questions.length,
          percentage: Math.round((score / questions.reduce((sum, q) => sum + q.marks, 0)) * 100),
          detailedAnswers: questions.map((q, index) => {
            const userAnswer = answers.find((a) => a.questionId === q.id)
            const selectedAnswer = userAnswer?.selectedAnswer?.[0] || userAnswer?.textAnswer || "Not answered"
            return {
              questionNumber: index + 1,
              question: q.question,
              correctAnswer: q.correctAnswer,
              userAnswer: selectedAnswer,
              isCorrect: selectedAnswer === q.correctAnswer,
              marks: q.marks,
              earnedMarks: selectedAnswer === q.correctAnswer ? q.marks : 0,
            }
          }),
        })

        toast({
          title: "Admin Exam Completed",
          description: `Score: ${score}/${questions.reduce((sum, q) => sum + q.marks, 0)} - Check console for detailed results`,
        })

        // Store result for admin results page
        sessionStorage.setItem(
          "assessmentResult",
          JSON.stringify({
            ...result,
            isAdminExam: true,
          }),
        )

        // Redirect to results page
        router.push("/results")
      } else {
        throw new Error(result.message || "Failed to submit exam")
      }
    } catch (error) {
      console.error("[v0] Error submitting admin exam:", error)
      toast({
        title: "Error",
        description: "Failed to submit exam",
        variant: "destructive",
      })
    }
  }

  const calculateScore = () => {
    return questions.reduce((score, question) => {
      const userAnswer = answers.find((a) => a.questionId === question.id)
      const selectedAnswer = userAnswer?.selectedAnswer?.[0] || userAnswer?.textAnswer
      if (selectedAnswer === question.correctAnswer) {
        return score + question.marks
      }
      return score
    }, 0)
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin exam...</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>No Questions Available</CardTitle>
            <CardDescription>Please upload questions first</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/admin")} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Back to Admin Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-700">Admin Exam Mode</CardTitle>
            <CardDescription>No protection mode - Console access enabled for answer viewing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Admin Features:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• No fullscreen or keyboard restrictions</li>
                <li>• Console shows correct answers for each question</li>
                <li>• All questions and answers logged on start</li>
                <li>• Answer validation shown in real-time</li>
                <li>• Results saved to normal exam database</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Console Instructions:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Press F12 to open Developer Console</li>
                <li>• All correct answers will be displayed</li>
                <li>• Real-time answer validation available</li>
                <li>• Perfect for testing and question review</li>
              </ul>
            </div>

            <div className="text-center space-y-4">
              <div className="flex justify-center items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Duration: 60 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Questions: {questions.length}</span>
                </div>
              </div>

              <Button onClick={startExam} className="bg-blue-600 hover:bg-blue-700">
                Start Admin Exam
              </Button>

              <Button onClick={() => router.push("/admin")} variant="outline" className="ml-4">
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                ADMIN MODE - CONSOLE ENABLED
              </Badge>
              <span className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className={timeLeft < 300 ? "text-red-600 font-semibold" : "text-gray-600"}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <Button onClick={handleSubmit} variant="outline" size="sm">
                Submit Exam
              </Button>
            </div>
          </div>

          <div className="mt-2">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Panel */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  Question {currentQuestionIndex + 1}
                  <Badge variant="secondary" className="ml-2">
                    {currentQuestion.marks} {currentQuestion.marks === 1 ? "mark" : "marks"}
                  </Badge>
                  {isNATQuestion ? (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Fill in the blank
                    </Badge>
                  ) : isMultipleChoice ? (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Multiple Select
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Single Choice
                    </Badge>
                  )}
                </CardTitle>
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

              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-green-800 text-sm">
                  <strong>Console Hint:</strong> Check browser console (F12) for the correct answer to this question.
                </p>
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
                        onClick={() => handleAnswerChange(option.key)}
                        className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer hover:bg-blue-50 ${
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
                        <span className="font-medium text-lg text-gray-900">{option.key}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <Button
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Question Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, index) => {
                  const hasAnswer =
                    answers[index]?.selectedAnswer?.length > 0 ||
                    (answers[index]?.textAnswer && answers[index].textAnswer.trim().length > 0)

                  return (
                    <Button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      variant={currentQuestionIndex === index ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${
                        hasAnswer
                          ? currentQuestionIndex === index
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-green-100 text-green-800 border-green-300"
                          : ""
                      }`}
                    >
                      {index + 1}
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Progress Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Answered:</span>
                <span className="font-semibold">
                  {
                    answers.filter(
                      (a) => a.selectedAnswer.length > 0 || (a.textAnswer && a.textAnswer.trim().length > 0),
                    ).length
                  }
                  /{questions.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining:</span>
                <span className="font-semibold">
                  {questions.length -
                    answers.filter(
                      (a) => a.selectedAnswer.length > 0 || (a.textAnswer && a.textAnswer.trim().length > 0),
                    ).length}
                </span>
              </div>
              <div className="pt-2">
                <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700">
                  Submit Admin Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
