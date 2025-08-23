"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Home } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Question {
  id: number
  question: string
  options: string[]
  correct_answer: string
  marks: number
}

export function AdminExamInterface() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(3600) // 60 minutes
  const [isLoading, setIsLoading] = useState(true)
  const [examStarted, setExamStarted] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
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
        console.log(
          "[v0] ADMIN MODE: All Questions with Answers:",
          data.questions.map((q: Question) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correct_answer,
            marks: q.marks,
          })),
        )
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
      description: "Check console for answers. No protection mode active.",
    })
    if (questions.length > 0) {
      console.log("[v0] ADMIN MODE: Current Question Answer:", {
        questionId: questions[0].id,
        question: questions[0].question,
        correctAnswer: questions[0].correct_answer,
      })
    }
  }

  const handleAnswerChange = (value: string) => {
    const currentQuestion = questions[currentQuestionIndex]
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))

    console.log("[v0] ADMIN MODE: Answer Selected:", {
      questionId: currentQuestion.id,
      selectedAnswer: value,
      correctAnswer: currentQuestion.correct_answer,
      isCorrect: value === currentQuestion.correct_answer,
    })
  }

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
    const question = questions[index]
    console.log("[v0] ADMIN MODE: Question Navigation:", {
      questionId: question.id,
      question: question.question,
      correctAnswer: question.correct_answer,
      currentAnswer: answers[question.id] || "Not answered",
    })
  }

  const handleSubmit = async () => {
    try {
      const score = calculateScore()
      console.log("[v0] ADMIN MODE: Final Score:", {
        totalScore: score,
        totalQuestions: questions.length,
        percentage: Math.round((score / questions.reduce((sum, q) => sum + q.marks, 0)) * 100),
        answers: answers,
      })

      toast({
        title: "Admin Exam Completed",
        description: `Score: ${score}/${questions.reduce((sum, q) => sum + q.marks, 0)} - Check console for details`,
      })

      // Redirect to admin dashboard instead of results
      router.push("/admin")
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
      const userAnswer = answers[question.id]
      if (userAnswer === question.correct_answer) {
        return score + question.marks
      }
      return score
    }, 0)
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
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                ADMIN MODE
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
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-gray-800 leading-relaxed">{currentQuestion.question}</div>

              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={handleAnswerChange}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

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
                {questions.map((_, index) => (
                  <Button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    variant={currentQuestionIndex === index ? "default" : "outline"}
                    size="sm"
                    className={`h-8 w-8 p-0 ${
                      answers[questions[index].id]
                        ? currentQuestionIndex === index
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-green-100 text-green-800 border-green-300"
                        : ""
                    }`}
                  >
                    {index + 1}
                  </Button>
                ))}
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
                  {Object.keys(answers).length}/{questions.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining:</span>
                <span className="font-semibold">{questions.length - Object.keys(answers).length}</span>
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
