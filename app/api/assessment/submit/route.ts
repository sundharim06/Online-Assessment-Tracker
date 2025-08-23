import { type NextRequest, NextResponse } from "next/server"
import { fetchQuestions, updateStudentScore } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, answers, lockedQuestionIds, status, terminationReason, tabSwitchCount, examType } = body

    if (!studentId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 })
    }

    // Get student info from session (stored during registration)
    const studentName = body.studentName || "Unknown Student"
    const studentSection = body.studentSection || "Unknown"
    const studentDepartment = body.studentDepartment || "Unknown"
    const studentEmail = body.studentEmail

    const questions = await fetchQuestions()

    let totalScore = 0
    let correctAnswers = 0
    let wrongAnswers = 0

    const lockedQuestionIdsSet = new Set(lockedQuestionIds || [])
    const answersToEvaluate = answers.filter(
      (answer) => lockedQuestionIdsSet.size === 0 || lockedQuestionIdsSet.has(answer.questionId),
    )

    const totalQuestions = answersToEvaluate.length

    const totalPossibleMarksForEntireExam = questions.reduce((sum, question) => {
      return sum + (question.marks || 1)
    }, 0)

    const totalPossibleMarks = answersToEvaluate.reduce((sum, answer) => {
      const question = questions.find((q) => q.id === answer.questionId)
      return sum + (question?.marks || 1)
    }, 0)

    const reviewData: any[] = []

    for (const answer of answersToEvaluate) {
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
      } else {
        wrongAnswers++
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
          questionType: question.questionType,
          marks: question.marks || 1,
          isCorrect: false,
        })
      }
    }

    const percentage =
      totalPossibleMarksForEntireExam > 0 ? Math.round((totalScore / totalPossibleMarksForEntireExam) * 100) : 0

    let examStatus = ""
    if (examType === "admin") {
      examStatus = "ADMIN EXAM - COMPLETED"
    } else if (status === "terminated") {
      examStatus =
        terminationReason === "cheated"
          ? "TERMINATED - CHEATED"
          : terminationReason === "security_violation"
            ? "TERMINATED - SECURITY VIOLATION"
            : "TERMINATED"
    } else {
      examStatus = "COMPLETED"
    }

    const shouldUpdateSheet =
      examType !== "admin" || (examType === "admin" && studentEmail && studentEmail !== "admin@exam.system")

    if (studentEmail && shouldUpdateSheet) {
      try {
        const updateData = {
          score: totalScore,
          totalQuestions,
          percentage: `${percentage}%`,
          status: examStatus,
          ...(status === "terminated" && {
            terminationReason: terminationReason || "unknown",
            tabSwitchCount: tabSwitchCount || 0,
            answeredQuestions: totalQuestions,
            totalAvailableQuestions: questions.length,
            partialCompletion: `${totalQuestions}/${questions.length} questions answered`,
          }),
          ...(examType === "admin" && {
            examType: "ADMIN",
            adminNote: "Admin test exam - results recorded for review",
          }),
        }

        await updateStudentScore(studentEmail, updateData)

        return NextResponse.json({
          success: true,
          sheetUpdated: true,
          result: {
            totalScore,
            totalMarks: totalPossibleMarksForEntireExam,
            correctAnswers,
            wrongAnswers,
            submittedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            reviewData,
            status: examStatus,
            terminationReason: terminationReason || null,
            tabSwitchCount: tabSwitchCount || 0,
            answeredQuestions: totalQuestions,
            totalAvailableQuestions: questions.length,
            lockedQuestions: totalQuestions,
            marksFromAnsweredQuestions: totalPossibleMarks,
            totalExamMarks: totalPossibleMarksForEntireExam,
            evaluationNote:
              lockedQuestionIdsSet.size > 0
                ? "Only locked questions were evaluated"
                : "All submitted questions were evaluated",
            isAdminExam: examType === "admin",
          },
        })
      } catch (sheetError) {
        console.error("[v0] Sheet update error:", sheetError)
        return NextResponse.json({
          success: true,
          sheetUpdated: false,
          sheetError: sheetError instanceof Error ? sheetError.message : "Sheet update failed",
          result: {
            totalScore,
            totalMarks: totalPossibleMarksForEntireExam,
            correctAnswers,
            wrongAnswers,
            submittedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            reviewData,
            status: examStatus,
            terminationReason: terminationReason || null,
            tabSwitchCount: tabSwitchCount || 0,
            answeredQuestions: totalQuestions,
            totalAvailableQuestions: questions.length,
            lockedQuestions: totalQuestions,
            marksFromAnsweredQuestions: totalPossibleMarks,
            totalExamMarks: totalPossibleMarksForEntireExam,
            evaluationNote:
              lockedQuestionIdsSet.size > 0
                ? "Only locked questions were evaluated"
                : "All submitted questions were evaluated",
            isAdminExam: examType === "admin",
          },
        })
      }
    } else {
      return NextResponse.json({
        success: true,
        sheetUpdated: false,
        sheetError: examType === "admin" ? "Admin exam - sheet update skipped" : "No student email provided",
        result: {
          totalScore,
          totalMarks: totalPossibleMarksForEntireExam,
          correctAnswers,
          wrongAnswers,
          submittedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          reviewData,
          status: examStatus,
          terminationReason: terminationReason || null,
          tabSwitchCount: tabSwitchCount || 0,
          answeredQuestions: totalQuestions,
          totalAvailableQuestions: questions.length,
          lockedQuestions: totalQuestions,
          marksFromAnsweredQuestions: totalPossibleMarks,
          totalExamMarks: totalPossibleMarksForEntireExam,
          evaluationNote:
            lockedQuestionIdsSet.size > 0
              ? "Only locked questions were evaluated"
              : "All submitted questions were evaluated",
          isAdminExam: examType === "admin",
        },
      })
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit assessment" }, { status: 500 })
  }
}
