import { NextResponse } from "next/server"
import { fetchQuestions, fetchExamConfig } from "@/lib/google-sheets"

// Custom seeded random function
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Optimized duplicate removal function
function removeDuplicates(questions: any[]) {
  const seenIds = new Set()
  const seenQuestions = new Set()

  return questions.filter((question) => {
    // Check by ID first if available
    if (question.id) {
      if (seenIds.has(question.id)) {
        return false
      }
      seenIds.add(question.id)
      return true
    }

    // Fallback to question text comparison
    const normalizedQuestion = question.question.trim().toLowerCase()
    if (seenQuestions.has(normalizedQuestion)) {
      return false
    }
    seenQuestions.add(normalizedQuestion)
    return true
  })
}

// Optimized Fisher-Yates shuffle with seeded random
function shuffleWithSeed(array: any[], seed: number) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
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

    const uniqueQuestions = removeDuplicates(questions)

    const sessionSeed = sessionId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const shuffled = shuffleWithSeed(uniqueQuestions, sessionSeed)

    const maxQuestions = examConfig?.totalQuestions || shuffled.length
    const selectedQuestions = shuffled.slice(0, Math.min(maxQuestions, shuffled.length))

    const secureQuestions = selectedQuestions.map((question) => ({
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
      // correctAnswer is intentionally excluded for security
      // maxSelections is derived from questionType on frontend
    }))

    return NextResponse.json(
      {
        success: true,
        questions: secureQuestions,
        total: secureQuestions.length,
        examConfig: examConfig,
        sessionId: sessionId,
        uniqueQuestionsFound: uniqueQuestions.length,
        duplicatesRemoved: questions.length - uniqueQuestions.length,
      },
      {
        headers,
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json(
      {
        error: `Failed to fetch questions: ${errorMessage}`,
      },
      { status: 500 },
    )
  }
}
