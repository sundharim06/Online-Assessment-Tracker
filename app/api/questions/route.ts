import { NextResponse } from "next/server"
import { fetchQuestions, fetchExamConfig } from "@/lib/google-sheets"

export async function GET() {
  try {
    console.log("[v0] Starting questions API request...")

    if (!process.env.GOOGLE_CREDS) {
      console.error("[v0] GOOGLE_CREDS environment variable is missing")
      return NextResponse.json(
        {
          error: "Google Sheets credentials not configured. Please add GOOGLE_CREDS environment variable.",
        },
        { status: 500 },
      )
    }

    if (!process.env.QUESTIONS_SHEET_ID) {
      console.error("[v0] QUESTIONS_SHEET_ID environment variable is missing")
      return NextResponse.json(
        {
          error: "Questions sheet ID not configured. Please add QUESTIONS_SHEET_ID environment variable.",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Environment variables check passed")
    console.log("[v0] Questions Sheet ID:", process.env.QUESTIONS_SHEET_ID)

    const [questions, examConfig] = await Promise.all([fetchQuestions(), fetchExamConfig()])

    console.log(`[v0] Loaded ${questions.length} questions from Google Sheets`)
    console.log(`[v0] Exam duration: ${examConfig.examDurationMinutes} minutes`)

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error: "No questions found in the spreadsheet. Please check your Google Sheets data.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      questions: questions,
      total: questions.length,
      examConfig: examConfig,
    })
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
