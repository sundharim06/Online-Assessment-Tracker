import { StudentRegistrationForm } from "@/components/student-registration-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Online Assessment System</h1>
          <p className="text-gray-600">Register to begin your test</p>
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
  )
}
