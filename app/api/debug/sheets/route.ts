import { NextResponse } from "next/server"
import { getGoogleSheet } from "@/lib/google-sheets"

export async function GET() {
  try {
    console.log("[v0] Debug: Testing Google Sheets connection...")

    // Test environment variables
    const envCheck = {
      hasGoogleCreds: !!process.env.GOOGLE_CREDS,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasServiceEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      questionsSheetId: process.env.QUESTIONS_SHEET_ID || "NOT_SET",
      resultsSheetId: process.env.RESULTS_SHEET_ID || "NOT_SET",
    }

    console.log("[v0] Environment variables:", envCheck)

    // Test Google Sheets connection
    if (process.env.QUESTIONS_SHEET_ID) {
      const doc = await getGoogleSheet(process.env.QUESTIONS_SHEET_ID)

      console.log("[v0] Sheet title:", doc.title)
      console.log("[v0] Sheet count:", doc.sheetCount)

      // Test reading first few rows
      const sheet = doc.sheetsByIndex[0]
      await sheet.loadHeaderRow()
      const rows = await sheet.getRows({ limit: 3 })

      console.log("[v0] Headers:", sheet.headerValues)
      console.log(
        "[v0] First 3 rows data:",
        rows.map((row) => row._rawData),
      )

      return NextResponse.json({
        success: true,
        environment: envCheck,
        sheetTitle: doc.title,
        sheetCount: doc.sheetCount,
        headers: sheet.headerValues,
        sampleData: rows.map((row) => row._rawData),
      })
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: "Google Sheets connection ready but no sheet ID provided",
    })
  } catch (error) {
    console.error("[v0] Debug error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        environment: {
          hasGoogleCreds: !!process.env.GOOGLE_CREDS,
          hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
          hasServiceEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          questionsSheetId: process.env.QUESTIONS_SHEET_ID || "NOT_SET",
          resultsSheetId: process.env.RESULTS_SHEET_ID || "NOT_SET",
        },
      },
      { status: 500 },
    )
  }
}
