import { NextResponse } from "next/server"

export async function GET() {
  const envStatus = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: {
      exists: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      value: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.substring(0, 20) + "..."
        : "NOT SET",
    },
    GOOGLE_PRIVATE_KEY: {
      exists: !!process.env.GOOGLE_PRIVATE_KEY,
      value: process.env.GOOGLE_PRIVATE_KEY
        ? "PRIVATE KEY SET (length: " + process.env.GOOGLE_PRIVATE_KEY.length + ")"
        : "NOT SET",
    },
    GOOGLE_PROJECT_ID: {
      exists: !!process.env.GOOGLE_PROJECT_ID,
      value: process.env.GOOGLE_PROJECT_ID || "NOT SET",
    },
    QUESTIONS_SHEET_ID: {
      exists: !!process.env.QUESTIONS_SHEET_ID,
      value: process.env.QUESTIONS_SHEET_ID || "NOT SET",
    },
    RESULTS_SHEET_ID: {
      exists: !!process.env.RESULTS_SHEET_ID,
      value: process.env.RESULTS_SHEET_ID || "NOT SET",
    },
  }

  const allSet = Object.values(envStatus).every((env) => env.exists)

  return NextResponse.json({
    allEnvironmentVariablesSet: allSet,
    environmentVariables: envStatus,
    timestamp: new Date().toISOString(),
  })
}
