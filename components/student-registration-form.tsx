"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, User, Phone, Hash, Building, GraduationCap, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FormData {
  name: string
  rollNumber: string
  phoneNumber: string
  section: string
  department: string
}

export function StudentRegistrationForm() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState<FormData>({
    name: session?.user?.name || "",
    rollNumber: "",
    phoneNumber: "",
    section: "",
    department: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!session?.user?.email?.endsWith("@citchennai.net")) {
        toast({
          title: "Access Denied",
          description: "Only @citchennai.net email addresses are allowed.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const registrationData = {
        ...formData,
        email: session?.user?.email,
        oauthId: session?.user?.id,
        profileImage: session?.user?.image,
      }

      const response = await fetch("/api/students/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Registration Successful!",
          description: "You have been registered. Redirecting to assessment...",
        })

        sessionStorage.setItem("studentId", result.studentId.toString())
        sessionStorage.setItem("studentName", formData.name)
        sessionStorage.setItem("studentSection", formData.section)
        sessionStorage.setItem("studentDepartment", formData.department)
        sessionStorage.setItem("studentEmail", session?.user?.email || "")
        sessionStorage.setItem("studentPhone", formData.phoneNumber)
        sessionStorage.setItem("registrationComplete", "true")
        sessionStorage.setItem("examStarted", "true")

        setTimeout(() => {
          router.push("/assessment")
        }, 1000)
      } else {
        if (response.status === 409) {
          toast({
            title: "Already Registered",
            description: "You have already completed the assessment and cannot attempt it again.",
            variant: "destructive",
          })
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else {
          toast({
            title: "Registration Failed",
            description: result.error || "Please try again",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = Object.values(formData).every((value) => value.trim() !== "")

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          value={session?.user?.email || ""}
          disabled
          className="bg-gray-50 text-gray-600"
        />
        <p className="text-xs text-gray-500">This is your authenticated email address</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Full Name
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          required
          className="transition-all focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rollNumber" className="flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Roll Number
        </Label>
        <Input
          id="rollNumber"
          type="text"
          placeholder="Enter your roll number"
          value={formData.rollNumber}
          onChange={(e) => handleInputChange("rollNumber", e.target.value.toUpperCase())}
          required
          className="transition-all focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Phone Number
        </Label>
        <Input
          id="phoneNumber"
          type="tel"
          placeholder="Enter your phone number"
          value={formData.phoneNumber}
          onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
          required
          className="transition-all focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="section" className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          Section
        </Label>
        <Select onValueChange={(value) => handleInputChange("section", value)} required>
          <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
            <SelectValue placeholder="Select your section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A">Section A</SelectItem>
            <SelectItem value="B">Section B</SelectItem>
            <SelectItem value="C">Section C</SelectItem>
            <SelectItem value="D">Section D</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department" className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Department
        </Label>
        <Select onValueChange={(value) => handleInputChange("department", value)} required>
          <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
            <SelectValue placeholder="Select your department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Computer Science">Computer Science</SelectItem>
            <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
            <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
            <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
            <SelectItem value="Electronics and Communication">Electronics and Communication</SelectItem>
            <SelectItem value="Information Technology">Information Technology</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
        <p className="text-xs text-yellow-800">
          <strong>Important:</strong> You can only attempt this assessment once. Make sure all your details are correct
          before proceeding.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
        disabled={!isFormValid || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Registering...
          </>
        ) : (
          "Register & Start Assessment"
        )}
      </Button>
    </form>
  )
}
