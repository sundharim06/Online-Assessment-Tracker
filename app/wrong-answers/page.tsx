"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XCircle, CheckCircle, ArrowLeft, AlertTriangle } from "lucide-react"

interface ReviewQuestion {
  questionNumber: number
  question: string
  optionA?: string
  optionB?: string
  optionC?: string
  optionD?: string
  optionE?: string
  optionF?: string
  studentAnswer: string
  correctAnswer: string
  questionType: string
  marks: number
  isCorrect: boolean
}

interface ReviewData {
  wrongAnswers: ReviewQuestion[]
  studentName: string
}

export default function WrongAnswersPage() {
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const router = useRouter()

  useEffect(() => {
    const reviewDataString = sessionStorage.getItem("reviewData")
    const studentName = sessionStorage.getItem("studentName")

    if (!reviewDataString || !studentName) {
      router.push("/")
      return
    }

    const allReviewData = JSON.parse(reviewDataString)
    // Filter to show only wrong answers
    const wrongAnswersOnly = allReviewData.filter((question: ReviewQuestion) => !question.isCorrect)

    setReviewData({
      wrongAnswers: wrongAnswersOnly,
      studentName,
    })
  }, [router])

  if (!reviewData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-red-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button onClick={() => router.push("/results")} variant="outline" className="mb-4 flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold text-red-800">Wrong Answers</h1>
          </div>
          <p className="text-red-700">Review the questions you answered incorrectly, {reviewData.studentName}</p>
        </div>

        {reviewData.wrongAnswers.length === 0 ? (
          <Card className="text-center p-8 bg-green-50 border-green-200">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Perfect Score!</h2>
            <p className="text-green-600">You answered all questions correctly. Great job!</p>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-700" />
                <span className="font-semibold text-red-900">
                  {reviewData.wrongAnswers.length} Incorrect Answer{reviewData.wrongAnswers.length > 1 ? "s" : ""} -
                  Focus on these for improvement
                </span>
              </div>
            </div>

            {reviewData.wrongAnswers.map((question, index) => (
              <Card key={index} className="border-l-4 border-l-red-600 bg-white shadow-md">
                <CardHeader className="bg-red-50">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg text-red-800">Question {question.questionNumber}</CardTitle>
                    <Badge variant="destructive" className="text-red-100 bg-red-600">
                      -{question.marks} Mark{question.marks > 1 ? "s" : ""} Lost
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="font-medium text-gray-900 mb-3">{question.question}</p>

                    {question.questionType !== "NAT" && (
                      <div className="space-y-1 text-sm text-gray-700">
                        {question.optionA && <p>A) {question.optionA}</p>}
                        {question.optionB && <p>B) {question.optionB}</p>}
                        {question.optionC && <p>C) {question.optionC}</p>}
                        {question.optionD && <p>D) {question.optionD}</p>}
                        {question.optionE && <p>E) {question.optionE}</p>}
                        {question.optionF && <p>F) {question.optionF}</p>}
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-5 w-5 text-red-700" />
                        <span className="font-bold text-red-900">Your Wrong Answer</span>
                      </div>
                      <p className="text-red-800 font-semibold text-lg">
                        {question.studentAnswer || "No answer provided"}
                      </p>
                    </div>

                    <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-700" />
                        <span className="font-bold text-green-900">Correct Answer</span>
                      </div>
                      <p className="text-green-800 font-semibold text-lg">{question.correctAnswer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="text-center mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Study Tip</h3>
              <p className="text-blue-700">
                Review these {reviewData.wrongAnswers.length} questions carefully. Understanding why these answers are
                correct will help you improve for future assessments.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
