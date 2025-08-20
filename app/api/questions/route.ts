import { NextResponse } from "next/server"
import { fetchQuestions, fetchExamConfig } from "@/lib/google-sheets"

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId") || Date.now().toString()

    console.log(`[v0] Starting questions API request for session: ${sessionId}`)

    const requiredEnvVars = {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
      QUESTIONS_SHEET_ID: process.env.QUESTIONS_SHEET_ID,
      RESULTS_SHEET_ID: process.env.RESULTS_SHEET_ID,
    }

    console.log("[v0] Environment variables check:")
    const missingVars = []
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      console.log(`[v0] ${key}:`, value ? "✓ Set" : "✗ Missing")
      if (!value) {
        missingVars.push(key)
      }
    }

    if (missingVars.length > 0) {
      console.error(`[v0] Missing environment variables: ${missingVars.join(", ")}`)
      return NextResponse.json(
        {
          error: `Missing required environment variables: ${missingVars.join(", ")}. Please configure these in your Vercel dashboard.`,
        },
        { status: 500 },
      )
    }

    console.log("[v0] All environment variables check passed")
    console.log("[v0] Questions Sheet ID:", process.env.QUESTIONS_SHEET_ID)

    const headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate, private, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      Vary: "*",
      "X-Session-ID": sessionId,
    }

    const [questions, examConfig] = await Promise.all([fetchQuestions(), fetchExamConfig()])

    console.log(`[v0] Loaded ${questions.length} questions from Google Sheets`)
    console.log(`[v0] Exam duration: ${examConfig.examDurationMinutes} minutes`)

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

    const sessionSeed = sessionId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    Math.seedrandom = Math.seedrandom || (() => Math.random())

    // Create a seeded random function for this session
    const seededRandom = () => {
      const x = Math.sin(sessionSeed + Date.now()) * 10000
      return x - Math.floor(x)
    }

    // Use seeded randomization for consistent shuffling per session
    const shuffled = [...questions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    console.log(`[v0] Questions shuffled for session ${sessionId} - First question ID: ${shuffled[0]?.id}`)

    return NextResponse.json(
      {
        success: true,
        questions: shuffled,
        total: shuffled.length,
        examConfig: examConfig,
        sessionId: sessionId,
      },
      {
        headers,
      },
    )
  } catch (error) {
    console.error("[v0] Error fetching questions:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json(
      {
        error: `Failed to fetch questions: ${errorMessage}`,
      },
      { status: 500 },
    )
  }
}
