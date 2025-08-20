import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Testing environment variables...")

    const checks = {
      GOOGLE_CREDS: !!process.env.GOOGLE_CREDS,
      QUESTIONS_SHEET_ID: !!process.env.QUESTIONS_SHEET_ID,
      RESULTS_SHEET_ID: !!process.env.RESULTS_SHEET_ID,
    }

    console.log("[v0] Environment variable checks:", checks)

    // Test Google Creds parsing
    let credsParsed = false
    let credsError = null

    if (process.env.GOOGLE_CREDS) {
      try {
        const creds = JSON.parse(process.env.GOOGLE_CREDS)
        credsParsed = !!(creds.client_email && creds.private_key)
      } catch (e) {
        credsError = e instanceof Error ? e.message : "JSON parse error"
      }
    }

    return NextResponse.json({
      environmentVariables: checks,
      googleCredsValid: credsParsed,
      googleCredsError: credsError,
      questionsSheetId: process.env.QUESTIONS_SHEET_ID || "Not set",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Test connection error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
