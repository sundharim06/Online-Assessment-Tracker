"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { StudentRegistrationForm } from "@/components/student-registration-form"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex justify-between items-center p-4">
        <h1 className="text-2xl font-bold text-gray-900">Assessment System</h1>
        <UserNav />
      </div>

      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {session.user?.name}!</h2>
            <p className="text-gray-600">Complete your registration to begin the assessment</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-blue-700">Student Registration</CardTitle>
              <CardDescription>Please fill in your details to access the assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <StudentRegistrationForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
