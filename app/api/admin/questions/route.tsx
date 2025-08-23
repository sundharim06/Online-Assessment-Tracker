import { NextResponse } from "next/server"
import { fetchQuestions, fetchExamConfig } from "@/lib/google-sheets"

// Custom seeded random function
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId") || Date.now().toString()

    const requiredEnvVars = {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
      QUESTIONS_SHEET_ID: process.env.QUESTIONS_SHEET_ID,
      RESULTS_SHEET_ID: process.env.RESULTS_SHEET_ID,
    }

    const missingVars = []
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        missingVars.push(key)
      }
    }

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required environment variables: ${missingVars.join(", ")}. Please configure these in your Vercel dashboard.`,
        },
        { status: 500 },
      )
    }

    const headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate, private, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      Vary: "*",
      "X-Session-ID": sessionId,
    }

    const [questions, examConfig] = await Promise.all([fetchQuestions(), fetchExamConfig()])

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error:
            "Assessment is currently not available. The administrator has disabled the test by clearing the question sheet.",
        },
        {
          status: 500,
          headers,
        },
      )
    }

    const uniqueQuestions = questions.filter((question, index, self) => {
      if (question.id) {
        return index === self.findIndex((q) => q.id === question.id)
      }
      return index === self.findIndex((q) => q.question.trim().toLowerCase() === question.question.trim().toLowerCase())
    })

    const seenIds = new Set()
    const finalUniqueQuestions = uniqueQuestions.filter((question) => {
      if (question.id && seenIds.has(question.id)) {
        return false
      }
      if (question.id) {
        seenIds.add(question.id)
      }
      return true
    })

    const sessionSeed = sessionId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)

    const shuffled = [...finalUniqueQuestions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(sessionSeed + i) * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const maxQuestions = examConfig?.totalQuestions || shuffled.length
    const selectedQuestions = shuffled.slice(0, Math.min(maxQuestions, shuffled.length))

    const adminQuestions = selectedQuestions.map((question) => ({
      id: question.id,
      question: question.question,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      optionE: question.optionE,
      optionF: question.optionF,
      questionType: question.questionType,
      marks: question.marks,
      correctAnswer: question.correctAnswer, // Include correct answer for admin
      allowMultiple: question.allowMultiple,
      maxSelections: question.maxSelections,
    }))

    return NextResponse.json(
      {
        success: true,
        questions: adminQuestions,
        total: adminQuestions.length,
        examConfig: examConfig,
        sessionId: sessionId,
        uniqueQuestionsFound: finalUniqueQuestions.length,
        duplicatesRemoved: questions.length - finalUniqueQuestions.length,
        isAdminEndpoint: true,
      },
      {
        headers,
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json(
      {
        error: `Failed to fetch admin questions: ${errorMessage}`,
      },
      { status: 500 },
    )
  }
}
