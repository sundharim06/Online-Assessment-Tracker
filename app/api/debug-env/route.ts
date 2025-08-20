import { NextResponse } from "next/server"

export async function GET() {
  try {
    const envCheck = {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "✓ Set" : "✗ Missing",
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY
        ? "✓ Set (length: " + process.env.GOOGLE_PRIVATE_KEY.length + ")"
        : "✗ Missing",
      GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID ? "✓ Set" : "✗ Missing",
      QUESTIONS_SHEET_ID: process.env.QUESTIONS_SHEET_ID ? "✓ Set: " + process.env.QUESTIONS_SHEET_ID : "✗ Missing",
      RESULTS_SHEET_ID: process.env.RESULTS_SHEET_ID ? "✓ Set: " + process.env.RESULTS_SHEET_ID : "✗ Missing",
    }

    return NextResponse.json({
      status: "Environment Variables Check",
      variables: envCheck,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check environment variables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
