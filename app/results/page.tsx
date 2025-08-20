"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Trophy, FileText } from "lucide-react"

interface AssessmentResult {
  totalScore: number
  totalMarks: number
  correctAnswers: number
  wrongAnswers: number
  submittedAt: string
  reviewData?: any // Assuming reviewData is an object or array
}

export default function ResultsPage() {
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [studentName, setStudentName] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    const resultData = sessionStorage.getItem("assessmentResult")
    const name = sessionStorage.getItem("studentName")

    if (!resultData || !name) {
      router.push("/")
      return
    }

    const parsedResult = JSON.parse(resultData)
    setResult(parsedResult.result)
    setStudentName(name)

    if (parsedResult.result.reviewData) {
      sessionStorage.setItem("reviewData", JSON.stringify(parsedResult.result.reviewData))
    }
  }, [router])

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">Assessment Complete!</CardTitle>
          <p className="text-gray-600">Congratulations, {studentName}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {result.totalScore}/{result.totalMarks}
              </div>
              <div className="text-sm text-gray-600">Total Marks</div>
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
                onClick={() => router.push("/wrong-answers")}
                variant="destructive"
                className="w-full mb-2 flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                View Wrong Answers ({result.wrongAnswers})
              </Button>
            )}
            <Button onClick={() => window.print()} variant="outline" className="w-full">
              Print Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
