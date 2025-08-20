import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, rollNumber, phoneNumber, section, department } = body

    // Validate required fields
    if (!name || !rollNumber || !phoneNumber || !section || !department) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // This simplifies the registration process since Google Sheets doesn't need separate student storage

    console.log("[v0] Student registered:", { name, rollNumber, section, department })

    return NextResponse.json({
      success: true,
      studentId: rollNumber, // Use roll number as ID
      message: "Registration successful",
    })
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
