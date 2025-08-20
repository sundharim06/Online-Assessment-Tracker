import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

// Initialize Google Sheets client
export async function getGoogleSheet(spreadsheetId: string) {
  try {
    console.log("[v0] Starting Google Sheets connection with individual env vars...")

    // Check all required environment variables
    const requiredEnvVars = {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
    }

    console.log("[v0] Environment variables check:")
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      console.log(`[v0] ${key}:`, value ? "✓ Set" : "✗ Missing")
      if (!value) {
        throw new Error(`Missing required environment variable: ${key}`)
      }
    }

    if (!spreadsheetId) {
      throw new Error("Missing spreadsheet ID")
    }

    // Format private key properly
    const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n")

    console.log("[v0] Creating JWT with email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    console.log("[v0] Connecting to spreadsheet:", spreadsheetId)
    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth)
    await doc.loadInfo()

    console.log("[v0] Successfully connected to:", doc.title)
    return doc
  } catch (error) {
    console.error("[v0] Google Sheets connection error:", error)
    throw error
  }
}

// Question interface
export interface Question {
  id: number
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string
  optionF?: string
  correctAnswer: string
  marks: number
  allowMultiple?: boolean
  maxSelections?: number
  questionType?: "MCQ" | "NAT" | "MSQ"
}

// Student interface
export interface Student {
  name: string
  rollNumber: string
  phoneNumber: string
  section: string
  department: string
}

// Result interface
export interface Result {
  name: string
  rollNumber: string
  section: string
  department: string
  score: number
  totalQuestions: number
  submittedAt: string
}

export interface ExamConfig {
  examDurationMinutes: number
  totalQuestions: number
}

// Fetch questions from Google Sheets
export async function fetchQuestions(): Promise<Question[]> {
  try {
    console.log(
      "[v0] Environment check for QUESTIONS_SHEET_ID:",
      process.env.QUESTIONS_SHEET_ID ? "✓ Set" : "✗ Missing",
    )

    if (!process.env.QUESTIONS_SHEET_ID) {
      throw new Error("QUESTIONS_SHEET_ID environment variable is not set")
    }

    console.log("[v0] Fetching questions from sheet ID:", process.env.QUESTIONS_SHEET_ID)
    const doc = await getGoogleSheet(process.env.QUESTIONS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0]

    console.log("[v0] Sheet title:", sheet.title)
    console.log("[v0] Loading rows...")
    const rows = await sheet.getRows()
    console.log("[v0] Total rows found:", rows.length)

    if (rows.length === 0) {
      throw new Error("No questions found in the spreadsheet. Please check your sheet has data.")
    }

    if (rows.length > 0) {
      console.log("[v0] First row data sample:")
      console.log("[v0] Question:", rows[0].get("Question"))
      console.log("[v0] Option A:", rows[0].get("Option A"))
      console.log("[v0] Correct Answer:", rows[0].get("Correct Answer"))
    }

    return rows.map((row, index) => {
      const questionType = (row.get("Question Type") || "MCQ").toUpperCase() as "MCQ" | "NAT" | "MSQ"
      const maxSelection = Number.parseInt(row.get("Max Selection") || "1")

      return {
        id: index + 1,
        question: row.get("Question") || "",
        optionA: row.get("Option A") || "",
        optionB: row.get("Option B") || "",
        optionC: row.get("Option C") || "",
        optionD: row.get("Option D") || "",
        optionE: row.get("Option E") || "",
        optionF: row.get("Option F") || "",
        correctAnswer: row.get("Correct Answer") || "",
        marks: Number.parseInt(row.get("Marks") || "1"),
        allowMultiple: maxSelection > 1,
        maxSelections: maxSelection,
        questionType: questionType,
      }
    })
  } catch (error) {
    console.error("[v0] Error fetching questions:", error)
    throw error
  }
}

// Fetch exam config from Google Sheets
export async function fetchExamConfig(): Promise<ExamConfig> {
  try {
    if (!process.env.QUESTIONS_SHEET_ID) {
      throw new Error("QUESTIONS_SHEET_ID environment variable is not set")
    }

    console.log("[v0] Fetching exam config from sheet ID:", process.env.QUESTIONS_SHEET_ID)
    const doc = await getGoogleSheet(process.env.QUESTIONS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0] // First sheet

    const rows = await sheet.getRows()

    const rawDuration = rows[1]?.get("Exam Duration")
    console.log("[v0] Raw exam duration value from L2:", rawDuration)
    console.log("[v0] Type of raw duration:", typeof rawDuration)

    let examDurationMinutes = 60 // Default fallback
    if (rawDuration !== undefined && rawDuration !== null && rawDuration !== "") {
      const parsed = Number.parseInt(String(rawDuration).trim())
      if (!isNaN(parsed) && parsed > 0) {
        examDurationMinutes = parsed
      }
    }

    console.log("[v0] Final parsed exam duration:", examDurationMinutes, "minutes")

    return {
      examDurationMinutes,
      totalQuestions: rows.length,
    }
  } catch (error) {
    console.error("[v0] Error fetching exam config:", error)
    console.log("[v0] Using default 60 minutes due to error")
    return {
      examDurationMinutes: 60,
      totalQuestions: 0,
    }
  }
}

function formatIndianTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

// Save result to Google Sheets
export async function saveResult(result: Result): Promise<void> {
  try {
    console.log("[v0] Environment check for RESULTS_SHEET_ID:", process.env.RESULTS_SHEET_ID ? "✓ Set" : "✗ Missing")

    if (!process.env.RESULTS_SHEET_ID) {
      throw new Error("RESULTS_SHEET_ID environment variable is not set")
    }

    console.log("[v0] Saving result for:", result.rollNumber)
    const doc = await getGoogleSheet(process.env.RESULTS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0]

    const indianTime = formatIndianTime(new Date(result.submittedAt))

    await sheet.addRow({
      Name: result.name,
      "Roll Number": result.rollNumber,
      Section: result.section,
      Department: result.department,
      Score: result.score,
      "Total Questions": result.totalQuestions,
      "Submitted At": indianTime,
    })

    console.log("[v0] Successfully saved result with Indian time:", indianTime)
  } catch (error) {
    console.error("[v0] Error saving result:", error)
    throw new Error("Failed to save result to Google Sheets")
  }
}

// Get all results from Google Sheets
export async function getAllResults(): Promise<Result[]> {
  try {
    const doc = await getGoogleSheet(process.env.RESULTS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0]
    const rows = await sheet.getRows()

    return rows.map((row) => ({
      name: row.get("Name") || "",
      rollNumber: row.get("Roll Number") || "",
      section: row.get("Section") || "",
      department: row.get("Department") || "",
      score: Number.parseInt(row.get("Score") || "0"),
      totalQuestions: Number.parseInt(row.get("Total Questions") || "0"),
      submittedAt: row.get("Submitted At") || "",
    }))
  } catch (error) {
    console.error("[v0] Error fetching results:", error)
    throw new Error("Failed to fetch results from Google Sheets")
  }
}
