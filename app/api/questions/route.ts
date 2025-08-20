import { NextResponse } from "next/server"
import { fetchQuestions, fetchExamConfig } from "@/lib/google-sheets"

export async function GET() {
  try {
    const [questions, examConfig] = await Promise.all([fetchQuestions(), fetchExamConfig()])

    console.log(`[v0] Loaded ${questions.length} questions from Google Sheets`)
    console.log(`[v0] Exam duration: ${examConfig.examDurationMinutes} minutes`)

    return NextResponse.json({
      success: true,
      questions: questions,
      total: questions.length,
      examConfig: examConfig, // Include exam configuration in response
    })
  } catch (error) {
    console.error("[v0] Error fetching questions:", error)
    return NextResponse.json({ error: "Failed to fetch questions from Google Sheets" }, { status: 500 })
  }
}
