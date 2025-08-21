import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"

// Initialize Google Sheets client
export async function getGoogleSheet(spreadsheetId: string) {
  try {
    const requiredEnvVars = {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
    }

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        throw new Error(`Missing required environment variable: ${key}`)
      }
    }

    if (!spreadsheetId) {
      throw new Error("Missing spreadsheet ID")
    }

    const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n")

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth)
    await doc.loadInfo()

    return doc
  } catch (error) {
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
  phoneNumber: string
  section: string
  department: string
  email: string
  score: number
  totalQuestions: number
  percentage: string
  submittedAt: string
  status: string
  oauthProvider?: string
  profileImage?: string
}

export interface ExamConfig {
  examDurationMinutes: number
  totalQuestions: number
}

// Fetch questions from Google Sheets
export async function fetchQuestions(): Promise<Question[]> {
  try {
    if (!process.env.QUESTIONS_SHEET_ID) {
      throw new Error("QUESTIONS_SHEET_ID environment variable is not set")
    }

    const doc = await getGoogleSheet(process.env.QUESTIONS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0]

    const rows = await sheet.getRows()

    if (rows.length === 0) {
      throw new Error("No questions found in the spreadsheet. Please check your sheet has data.")
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
    throw error
  }
}

export async function fetchExamConfig(): Promise<ExamConfig> {
  try {
    if (!process.env.QUESTIONS_SHEET_ID) {
      throw new Error("QUESTIONS_SHEET_ID environment variable is not set")
    }

    const doc = await getGoogleSheet(process.env.QUESTIONS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0]

    const rows = await sheet.getRows()

    const rawDuration = rows[1]?.get("Exam Duration")

    let examDurationMinutes = 45
    if (rawDuration !== undefined && rawDuration !== null && rawDuration !== "") {
      const parsed = Number.parseInt(String(rawDuration).trim())
      if (!isNaN(parsed) && parsed > 0) {
        examDurationMinutes = parsed
      }
    }

    return {
      examDurationMinutes,
      totalQuestions: rows.length,
    }
  } catch (error) {
    return {
      examDurationMinutes: 45,
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
    if (!process.env.RESULTS_SHEET_ID) {
      throw new Error("RESULTS_SHEET_ID environment variable is not set")
    }

    const doc = await getGoogleSheet(process.env.RESULTS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0]

    const indianTime = formatIndianTime(new Date(result.submittedAt))

    await sheet.addRow({
      Name: result.name,
      "Roll Number": result.rollNumber,
      "Phone Number": result.phoneNumber,
      Section: result.section,
      Department: result.department,
      Email: result.email,
      Score: result.score,
      "Total Questions": result.totalQuestions,
      Percentage: result.percentage,
      "Submitted At": indianTime,
      Status: result.status,
      "OAuth Provider": result.oauthProvider || "Google",
      "Profile Image": result.profileImage || "",
    })
  } catch (error) {
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
      phoneNumber: row.get("Phone Number") || "",
      section: row.get("Section") || "",
      department: row.get("Department") || "",
      email: row.get("Email") || "",
      score: Number.parseInt(row.get("Score") || "0"),
      totalQuestions: Number.parseInt(row.get("Total Questions") || "0"),
      percentage: row.get("Percentage") || "0%",
      submittedAt: row.get("Submitted At") || "",
      status: row.get("Status") || "Completed",
      oauthProvider: row.get("OAuth Provider") || "",
      profileImage: row.get("Profile Image") || "",
    }))
  } catch (error) {
    throw new Error("Failed to fetch results from Google Sheets")
  }
}

export async function checkStudentExists(email: string): Promise<boolean> {
  try {
    if (!process.env.RESULTS_SHEET_ID) {
      throw new Error("RESULTS_SHEET_ID environment variable is not set")
    }

    const doc = await getGoogleSheet(process.env.RESULTS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0]
    const rows = await sheet.getRows()

    const exists = rows.some((row) => row.get("Email") === email)
    return exists
  } catch (error) {
    return false
  }
}

export async function saveInitialRegistration(studentData: {
  name: string
  rollNumber: string
  phoneNumber: string
  section: string
  department: string
  email: string
  oauthProvider: string
  profileImage: string
}): Promise<void> {
  try {
    if (!process.env.RESULTS_SHEET_ID) {
      throw new Error("RESULTS_SHEET_ID environment variable is not set")
    }

    const doc = await getGoogleSheet(process.env.RESULTS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0]

    const indianTime = formatIndianTime(new Date())

    await sheet.addRow({
      Name: studentData.name,
      "Roll Number": studentData.rollNumber,
      "Phone Number": studentData.phoneNumber,
      Section: studentData.section,
      Department: studentData.department,
      Email: studentData.email,
      Score: 0,
      "Total Questions": 0,
      Percentage: "0%",
      "Submitted At": indianTime,
      Status: "Registered",
      "OAuth Provider": studentData.oauthProvider,
      "Profile Image": studentData.profileImage,
    })
  } catch (error) {
    throw new Error("Failed to save initial registration")
  }
}

export async function updateStudentScore(
  email: string,
  scoreData: {
    score: number
    totalQuestions: number
    percentage: string
    status: string
  },
): Promise<void> {
  try {
    if (!process.env.RESULTS_SHEET_ID) {
      throw new Error("RESULTS_SHEET_ID environment variable is not set")
    }

    const doc = await getGoogleSheet(process.env.RESULTS_SHEET_ID!)
    const sheet = doc.sheetsByIndex[0]
    const rows = await sheet.getRows()

    const studentRow = rows.find((row) => {
      const rowEmail = row.get("Email")
      if (!rowEmail) return false

      const normalizedRowEmail = rowEmail.toString().trim().toLowerCase()
      const normalizedSearchEmail = email.toString().trim().toLowerCase()

      return normalizedRowEmail === normalizedSearchEmail
    })

    if (!studentRow) {
      throw new Error(`Student with email "${email}" not found in results sheet`)
    }

    const indianTime = formatIndianTime(new Date())

    studentRow.set("Score", scoreData.score.toString())
    studentRow.set("Total Questions", scoreData.totalQuestions.toString())
    studentRow.set("Percentage", scoreData.percentage)
    studentRow.set("Submitted At", indianTime)
    studentRow.set("Status", scoreData.status)

    await studentRow.save()
  } catch (error) {
    throw new Error(`Failed to update student score: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
