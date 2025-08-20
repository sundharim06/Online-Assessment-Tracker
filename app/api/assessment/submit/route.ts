import { type NextRequest, NextResponse } from "next/server"
import { fetchQuestions, updateStudentScore } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, answers } = body

    if (!studentId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 })
    }

    // Get student info from session (stored during registration)
    const studentName = body.studentName || "Unknown Student"
    const studentSection = body.studentSection || "Unknown"
    const studentDepartment = body.studentDepartment || "Unknown"
    const studentEmail = body.studentEmail || sessionStorage.getItem("studentEmail")

    const questions = await fetchQuestions()

    let totalScore = 0
    let correctAnswers = 0
    let wrongAnswers = 0
    const totalQuestions = answers.length

    const totalPossibleMarks = questions.reduce((sum, question) => sum + (question.marks || 1), 0)

    const reviewData: any[] = []

    // Process each answer
    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.questionId)

      if (!question) continue

      let isCorrect = false
      let studentAnswerText = ""

      if (question.questionType === "NAT") {
        // For NAT questions, compare text answers
        const correctAnswer = question.correctAnswer?.toLowerCase().trim()
        const studentAnswer = answer.textAnswer?.toLowerCase().trim()
        isCorrect = correctAnswer === studentAnswer
        studentAnswerText = answer.textAnswer || "No answer provided"
      } else {
        // For MCQ and MSQ questions, handle correct answers that may be comma-separated
        const correctAnswersArray = question.correctAnswer?.split(",").map((a) => a.trim().toUpperCase()) || []
        const studentAnswersArray = (answer.selectedAnswer || []).map((a: string) => a.trim().toUpperCase())

        console.log("[v0] Question", question.id, "- Correct:", correctAnswersArray, "Student:", studentAnswersArray)

        // Check if student selected answers match correct answers exactly
        if (correctAnswersArray.length === 1) {
          // Single correct answer (MCQ)
          isCorrect = studentAnswersArray.length === 1 && studentAnswersArray[0] === correctAnswersArray[0]
        } else {
          // Multiple correct answers (MSQ) - must match exactly
          isCorrect =
            correctAnswersArray.length === studentAnswersArray.length &&
            correctAnswersArray.every((ans) => studentAnswersArray.includes(ans)) &&
            studentAnswersArray.every((ans) => correctAnswersArray.includes(ans))
        }

        studentAnswerText = studentAnswersArray.join(", ") || "No answer provided"
      }

      if (isCorrect) {
        totalScore += question.marks || 1
        correctAnswers++
        console.log("[v0] Question", question.id, "marked as CORRECT")
      } else {
        wrongAnswers++
        console.log("[v0] Question", question.id, "marked as WRONG")
        reviewData.push({
          questionNumber: questions.indexOf(question) + 1,
          question: question.question,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          optionE: question.optionE,
          optionF: question.optionF,
          studentAnswer: studentAnswerText,
          correctAnswer: question.correctAnswer,
          questionType: question.questionType,
          marks: question.marks || 1,
          isCorrect: false,
        })
      }
    }

    const percentage = totalPossibleMarks > 0 ? Math.round((totalScore / totalPossibleMarks) * 100) : 0

    if (studentEmail) {
      await updateStudentScore(studentEmail, {
        score: totalScore,
        totalQuestions,
        percentage: `${percentage}%`,
        status: "Completed",
      })
    }

    console.log("[v0] Assessment submitted and score updated in Google Sheets")

    return NextResponse.json({
      success: true,
      result: {
        totalScore,
        totalMarks: totalPossibleMarks,
        correctAnswers,
        wrongAnswers,
        submittedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        reviewData,
      },
    })
  } catch (error) {
    console.error("[v0] Assessment submission error:", error)
    return NextResponse.json({ error: "Failed to submit assessment" }, { status: 500 })
  }
}
