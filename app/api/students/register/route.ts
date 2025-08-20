import { type NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { name, rollNumber, phoneNumber, section, department, email, oauthId, profileImage } = body

    // Validate required fields
    if (!name || !rollNumber || !phoneNumber || !section || !department) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    console.log("[v0] Student registered:", {
      name,
      rollNumber,
      section,
      department,
      email,
      oauthId,
      profileImage,
    })

    return NextResponse.json({
      success: true,
      studentId: rollNumber,
      message: "Registration successful",
      userInfo: {
        name,
        email,
        profileImage,
      },
    })
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
