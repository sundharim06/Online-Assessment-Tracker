"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, User, Hash, Building, GraduationCap, Mail, School } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FormData {
  name: string
  rollNumber: string
  institution: string
  department: string
  section: string
}

const INSTITUTION_CONFIG = {
  CITAR: {
    name: "CITAR",
    departments: ["CSE"],
    sections: {
      CSE: ["A", "B", "C"],
    },
  },
  CIT: {
    name: "CIT",
    departments: ["CSE"],
    sections: {
      CSE: ["A", "B", "C", "D"],
    },
  },
} as const

export function StudentRegistrationForm() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState<FormData>({
    name: session?.user?.name || "",
    rollNumber: "",
    institution: "",
    department: "",
    section: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }

      if (field === "institution") {
        newData.department = ""
        newData.section = ""
      } else if (field === "department") {
        newData.section = ""
      }

      return newData
    })
  }

  const getAvailableDepartments = () => {
    if (!formData.institution) return []
    return INSTITUTION_CONFIG[formData.institution as keyof typeof INSTITUTION_CONFIG]?.departments || []
  }

  const getAvailableSections = () => {
    if (!formData.institution || !formData.department) return []
    const institutionConfig = INSTITUTION_CONFIG[formData.institution as keyof typeof INSTITUTION_CONFIG]
    return institutionConfig?.sections[formData.department as keyof typeof institutionConfig.sections] || []
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!session?.user?.email?.endsWith(".cse2023@citchennai.net")) {
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
        sessionStorage.setItem("studentInstitution", formData.institution)
        sessionStorage.setItem("studentSection", formData.section)
        sessionStorage.setItem("studentDepartment", formData.department)
        sessionStorage.setItem("studentEmail", session?.user?.email || "")
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
        <Label htmlFor="institution" className="flex items-center gap-2">
          <School className="h-4 w-4" />
          Institution
        </Label>
        <Select
          value={formData.institution}
          onValueChange={(value) => handleInputChange("institution", value)}
          required
        >
          <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
            <SelectValue placeholder="Select your institution" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CITAR">CITAR</SelectItem>
            <SelectItem value="CIT">CIT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department" className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Department
        </Label>
        <Select
          key={`department-${formData.institution}`}
          value={formData.department}
          onValueChange={(value) => handleInputChange("department", value)}
          required
          disabled={!formData.institution}
        >
          <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
            <SelectValue placeholder={formData.institution ? "Select your department" : "Select institution first"} />
          </SelectTrigger>
          <SelectContent>
            {getAvailableDepartments().map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept === "CSE" ? "Computer Science Engineering" : dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="section" className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          Section
        </Label>
        <Select
          key={`section-${formData.institution}-${formData.department}`}
          value={formData.section}
          onValueChange={(value) => handleInputChange("section", value)}
          required
          disabled={!formData.institution || !formData.department}
        >
          <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
            <SelectValue
              placeholder={
                formData.institution && formData.department
                  ? "Select your section"
                  : "Select institution and department first"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {getAvailableSections().map((section) => (
              <SelectItem key={section} value={section}>
                Section {section}
              </SelectItem>
            ))}
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
