import { type NextRequest, NextResponse } from "next/server"
import { writeQuestionsToExcel, type QuestionRow } from "@/lib/excel-utils"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (
      file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
      file.type !== "application/vnd.ms-excel"
    ) {
      return NextResponse.json({ error: "Only Excel files (.xlsx, .xls) are allowed" }, { status: 400 })
    }

    if (type === "questions") {
      // Process questions Excel file
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const questions: QuestionRow[] = jsonData.map((row) => ({
        questionText: row["Question"] || row["question"] || "",
        optionA: row["Option A"] || row["optionA"] || "",
        optionB: row["Option B"] || row["optionB"] || "",
        optionC: row["Option C"] || row["optionC"] || "",
        optionD: row["Option D"] || row["optionD"] || "",
        correctAnswer: (row["Correct Answer"] || row["correctAnswer"] || "A") as "A" | "B" | "C" | "D",
        mark: Number(row["Mark"] || row["mark"] || 1),
      }))

      await writeQuestionsToExcel(questions)

      console.log(`[v0] Questions Excel uploaded and processed: ${questions.length} questions`)

      return NextResponse.json({
        success: true,
        message: `Questions Excel uploaded successfully. ${questions.length} questions processed.`,
        filename: file.name,
        questionsCount: questions.length,
      })
    }

    return NextResponse.json({ error: "Invalid upload type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Failed to process Excel file" }, { status: 500 })
  }
}
