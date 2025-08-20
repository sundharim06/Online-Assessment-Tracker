import * as XLSX from "xlsx"
import { writeFile, readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

export interface QuestionRow {
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: "A" | "B" | "C" | "D"
  mark: number
}

export interface StudentResultRow {
  rollNumber: string
  name: string
  section: string
  department: string
  phoneNumber: string
  totalScore: number
  totalQuestions: number
  percentage: number
  submittedAt: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const QUESTIONS_FILE = path.join(DATA_DIR, "questions.xlsx")
const RESULTS_FILE = path.join(DATA_DIR, "results.xlsx")
const STUDENTS_FILE = path.join(DATA_DIR, "students.xlsx")

// Ensure data directory exists
export async function ensureDataDirectory() {
  const { mkdir } = await import("fs/promises")
  try {
    await mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

// Read questions from Excel file
export async function readQuestionsFromExcel(): Promise<QuestionRow[]> {
  try {
    if (!existsSync(QUESTIONS_FILE)) {
      return []
    }

    const fileBuffer = await readFile(QUESTIONS_FILE)
    const workbook = XLSX.read(fileBuffer, { type: "buffer" })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

    return jsonData.map((row, index) => ({
      questionText: row["Question"] || row["question"] || "",
      optionA: row["Option A"] || row["optionA"] || "",
      optionB: row["Option B"] || row["optionB"] || "",
      optionC: row["Option C"] || row["optionC"] || "",
      optionD: row["Option D"] || row["optionD"] || "",
      correctAnswer: (row["Correct Answer"] || row["correctAnswer"] || "A") as "A" | "B" | "C" | "D",
      mark: Number(row["Mark"] || row["mark"] || 1),
    }))
  } catch (error) {
    console.error("[v0] Error reading questions from Excel:", error)
    return []
  }
}

// Write questions to Excel file
export async function writeQuestionsToExcel(questions: QuestionRow[]) {
  try {
    await ensureDataDirectory()

    const worksheet = XLSX.utils.json_to_sheet(
      questions.map((q) => ({
        Question: q.questionText,
        "Option A": q.optionA,
        "Option B": q.optionB,
        "Option C": q.optionC,
        "Option D": q.optionD,
        "Correct Answer": q.correctAnswer,
        Mark: q.mark,
      })),
    )

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions")

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    await writeFile(QUESTIONS_FILE, buffer)
  } catch (error) {
    console.error("[v0] Error writing questions to Excel:", error)
    throw error
  }
}

// Read students from Excel file
export async function readStudentsFromExcel() {
  try {
    if (!existsSync(STUDENTS_FILE)) {
      return []
    }

    const fileBuffer = await readFile(STUDENTS_FILE)
    const workbook = XLSX.read(fileBuffer, { type: "buffer" })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    return jsonData.map((row: any) => ({
      rollNumber: row["Roll Number"] || row["rollNumber"] || "",
      name: row["Name"] || row["name"] || "",
      section: row["Section"] || row["section"] || "",
      department: row["Department"] || row["department"] || "",
      phoneNumber: row["Phone Number"] || row["phoneNumber"] || "",
      createdAt: row["Created At"] || row["createdAt"] || new Date().toISOString(),
    }))
  } catch (error) {
    console.error("[v0] Error reading students from Excel:", error)
    return []
  }
}

// Write student to Excel file
export async function writeStudentToExcel(student: any) {
  try {
    await ensureDataDirectory()

    const existingStudents = await readStudentsFromExcel()
    const updatedStudents = [
      ...existingStudents,
      {
        "Roll Number": student.rollNumber,
        Name: student.name,
        Section: student.section,
        Department: student.department,
        "Phone Number": student.phoneNumber,
        "Created At": new Date().toISOString(),
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(updatedStudents)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students")

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    await writeFile(STUDENTS_FILE, buffer)
  } catch (error) {
    console.error("[v0] Error writing student to Excel:", error)
    throw error
  }
}

// Read results from Excel file
export async function readResultsFromExcel(): Promise<StudentResultRow[]> {
  try {
    if (!existsSync(RESULTS_FILE)) {
      return []
    }

    const fileBuffer = await readFile(RESULTS_FILE)
    const workbook = XLSX.read(fileBuffer, { type: "buffer" })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    return jsonData.map((row: any) => ({
      rollNumber: row["Roll Number"] || row["rollNumber"] || "",
      name: row["Name"] || row["name"] || "",
      section: row["Section"] || row["section"] || "",
      department: row["Department"] || row["department"] || "",
      phoneNumber: row["Phone Number"] || row["phoneNumber"] || "",
      totalScore: Number(row["Total Score"] || row["totalScore"] || 0),
      totalQuestions: Number(row["Total Questions"] || row["totalQuestions"] || 0),
      percentage: Number(row["Percentage"] || row["percentage"] || 0),
      submittedAt: row["Submitted At"] || row["submittedAt"] || "",
    }))
  } catch (error) {
    console.error("[v0] Error reading results from Excel:", error)
    return []
  }
}

// Write result to Excel file
export async function writeResultToExcel(result: StudentResultRow) {
  try {
    await ensureDataDirectory()

    const existingResults = await readResultsFromExcel()

    // Remove existing result for same student if exists
    const filteredResults = existingResults.filter((r) => r.rollNumber !== result.rollNumber)

    const updatedResults = [
      ...filteredResults,
      {
        "Roll Number": result.rollNumber,
        Name: result.name,
        Section: result.section,
        Department: result.department,
        "Phone Number": result.phoneNumber,
        "Total Score": result.totalScore,
        "Total Questions": result.totalQuestions,
        Percentage: result.percentage,
        "Submitted At": result.submittedAt,
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(updatedResults)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results")

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    await writeFile(RESULTS_FILE, buffer)
  } catch (error) {
    console.error("[v0] Error writing result to Excel:", error)
    throw error
  }
}

// Generate sample Excel files
export async function generateSampleFiles() {
  await ensureDataDirectory()

  // Sample questions
  const sampleQuestions: QuestionRow[] = [
    {
      questionText: "What is the capital of France?",
      optionA: "London",
      optionB: "Berlin",
      optionC: "Paris",
      optionD: "Madrid",
      correctAnswer: "C",
      mark: 1,
    },
    {
      questionText: "Which programming language is known for web development?",
      optionA: "Python",
      optionB: "JavaScript",
      optionC: "C++",
      optionD: "Java",
      correctAnswer: "B",
      mark: 1,
    },
  ]

  await writeQuestionsToExcel(sampleQuestions)
  console.log("[v0] Sample questions file created at:", QUESTIONS_FILE)
}
