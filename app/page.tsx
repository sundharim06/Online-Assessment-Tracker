"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { StudentRegistrationForm } from "@/components/student-registration-form"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "loading") {
      const timer = setTimeout(() => {
        setLoadingTimeout(true)
      }, 3000) // Reduced timeout to 3 seconds for faster error detection

      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
    }
  }, [status])

  if (status === "loading" && loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
            <CardDescription>Unable to load authentication. Please try signing in again.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push("/auth/signin")} className="w-full">
              Go to Sign In
            </Button>
            <Button onClick={() => window.location.reload()} className="w-full" variant="outline">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/auth/signin")} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
