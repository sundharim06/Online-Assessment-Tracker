"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AdminExamInterface } from "@/components/admin-exam-interface"

export default function AdminExamPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  const handleLogin = () => {
    if (password === "ennakuterla") {
      setIsAuthenticated(true)
      toast({
        title: "Admin Access Granted",
        description: "You can now take the exam with console access",
      })
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid admin password",
        variant: "destructive",
      })
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-blue-700">Admin Exam Access</CardTitle>
            <CardDescription>Enter admin password to access the exam without protection mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">Console access enabled for answer viewing</p>
            </div>
            <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700">
              Access Admin Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <AdminExamInterface />
}
