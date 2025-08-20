import { type NextRequest, NextResponse } from "next/server"
import { checkStudentExists } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const exists = await checkStudentExists(email)

    if (exists) {
      return NextResponse.json(
        {
          error: "Student already registered",
        },
        { status: 409 },
      )
    }

    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error("[v0] Check registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
