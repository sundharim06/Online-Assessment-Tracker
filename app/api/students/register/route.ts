import { type NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { checkStudentExists, saveInitialRegistration } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (!session.user?.email?.endsWith("@citchennai.net")) {
      return NextResponse.json(
        {
          error: "Access denied. Only @citchennai.net email addresses are allowed.",
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { name, rollNumber, institution, section, department } = body

    if (!name || !rollNumber || !institution || !section || !department) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const studentExists = await checkStudentExists(session.user.email)
    if (studentExists) {
      return NextResponse.json(
        {
          error: "You have already registered and cannot attempt the assessment again.",
        },
        { status: 409 },
      )
    }

    await saveInitialRegistration({
      name,
      rollNumber,
      institution,
      section,
      department,
      email: session.user.email,
      oauthProvider: "Google",
      profileImage: session.user.image || "",
    })

    return NextResponse.json({
      success: true,
      studentId: rollNumber,
      message: "Registration successful",
      userInfo: {
        name,
        email: session.user.email,
        profileImage: session.user.image,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
