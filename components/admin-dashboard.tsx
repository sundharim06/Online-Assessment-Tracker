"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Download, Users, FileText, BarChart3, Lock, Eye, EyeOff, TrendingUp, Award } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StudentResult {
  student_id: number
  name: string
  roll_number: string
  section: string
  department: string
  total_score: number
  total_questions: number
  percentage: number
  submitted_at: string
}

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [results, setResults] = useState<StudentResult[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleLogin = () => {
    // Simple password authentication (in production, use proper auth)
    if (password === "admin123") {
      setIsAuthenticated(true)
      loadData()
      toast({
        title: "Login Successful",
        description: "Welcome to the admin dashboard",
      })
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid password",
        variant: "destructive",
      })
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load students
      const studentsResponse = await fetch("/api/students/register")
      const studentsData = await studentsResponse.json()

      // Load results
      const resultsResponse = await fetch("/api/assessment/submit")
      const resultsData = await resultsResponse.json()

      setStudents(studentsData.students || [])

      // Combine student info with results
      const combinedResults =
        resultsData.results?.map((result: any) => {
          const student = studentsData.students?.find((s: any) => s.student_id === result.student_id)
          return {
            ...result,
            name: student?.name || "Unknown",
            roll_number: student?.roll_number || "Unknown",
            section: student?.section || "Unknown",
            department: student?.department || "Unknown",
            submitted_at: new Date(result.submitted_at).toLocaleString(),
          }
        }) || []

      setResults(combinedResults)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuestionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", "questions")

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Upload Successful",
          description: "Questions PDF uploaded successfully",
        })
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload file",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      })
    }
  }

  const handleAnswerKeyUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", "answers")

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Upload Successful",
          description: "Answer key PDF uploaded successfully",
        })
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload file",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      })
    }
  }

  const exportToCSV = () => {
    if (results.length === 0) {
      toast({
        title: "No Data",
        description: "No results available to export",
        variant: "destructive",
      })
      return
    }

    const headers = [
      "Name",
      "Roll Number",
      "Section",
      "Department",
      "Score",
      "Total Questions",
      "Percentage",
      "Grade",
      "Submitted At",
    ]
    const csvContent = [
      headers.join(","),
      ...results.map((result) =>
        [
          `"${result.name}"`,
          `"${result.roll_number}"`,
          `"${result.section}"`,
          `"${result.department}"`,
          result.total_score,
          result.total_questions,
          `${result.percentage}%`,
          `"${getGrade(result.percentage)}"`,
          `"${result.submitted_at}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `assessment_results_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Successful",
      description: "Results exported to CSV file",
    })
  }

  const exportDetailedReport = () => {
    if (results.length === 0) {
      toast({
        title: "No Data",
        description: "No results available to export",
        variant: "destructive",
      })
      return
    }

    const analytics = generateAnalytics()
    const reportContent = [
      "ASSESSMENT RESULTS DETAILED REPORT",
      `Generated on: ${new Date().toLocaleString()}`,
      "",
      "SUMMARY STATISTICS:",
      `Total Students Registered: ${students.length}`,
      `Total Assessments Completed: ${results.length}`,
      `Completion Rate: ${students.length > 0 ? Math.round((results.length / students.length) * 100) : 0}%`,
      `Average Score: ${analytics.averageScore}%`,
      `Highest Score: ${analytics.highestScore}%`,
      `Lowest Score: ${analytics.lowestScore}%`,
      "",
      "GRADE DISTRIBUTION:",
      `Excellent (80-100%): ${analytics.gradeDistribution.excellent} students`,
      `Good (60-79%): ${analytics.gradeDistribution.good} students`,
      `Average (40-59%): ${analytics.gradeDistribution.average} students`,
      `Needs Improvement (0-39%): ${analytics.gradeDistribution.poor} students`,
      "",
      "DEPARTMENT WISE PERFORMANCE:",
      ...Object.entries(analytics.departmentStats).map(
        ([dept, stats]: [string, any]) => `${dept}: Avg ${stats.average}% (${stats.count} students)`,
      ),
      "",
      "DETAILED RESULTS:",
      "Name,Roll Number,Section,Department,Score,Total Questions,Percentage,Grade,Submitted At",
      ...results.map((result) =>
        [
          `"${result.name}"`,
          `"${result.roll_number}"`,
          `"${result.section}"`,
          `"${result.department}"`,
          result.total_score,
          result.total_questions,
          `${result.percentage}%`,
          `"${getGrade(result.percentage)}"`,
          `"${result.submitted_at}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `detailed_assessment_report_${new Date().toISOString().split("T")[0]}.txt`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Report Generated",
      description: "Detailed report exported successfully",
    })
  }

  const generateAnalytics = () => {
    if (results.length === 0) {
      return {
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        gradeDistribution: { excellent: 0, good: 0, average: 0, poor: 0 },
        departmentStats: {},
      }
    }

    const scores = results.map((r) => r.percentage)
    const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    const highestScore = Math.max(...scores)
    const lowestScore = Math.min(...scores)

    const gradeDistribution = {
      excellent: results.filter((r) => r.percentage >= 80).length,
      good: results.filter((r) => r.percentage >= 60 && r.percentage < 80).length,
      average: results.filter((r) => r.percentage >= 40 && r.percentage < 60).length,
      poor: results.filter((r) => r.percentage < 40).length,
    }

    const departmentStats: Record<string, { total: number; count: number; average: number }> = {}
    results.forEach((result) => {
      if (!departmentStats[result.department]) {
        departmentStats[result.department] = { total: 0, count: 0, average: 0 }
      }
      departmentStats[result.department].total += result.percentage
      departmentStats[result.department].count += 1
    })

    Object.keys(departmentStats).forEach((dept) => {
      departmentStats[dept].average = Math.round(departmentStats[dept].total / departmentStats[dept].count)
    })

    return {
      averageScore,
      highestScore,
      lowestScore,
      gradeDistribution,
      departmentStats,
    }
  }

  const getGrade = (percentage: number) => {
    if (percentage >= 80) return "Excellent"
    if (percentage >= 60) return "Good"
    if (percentage >= 40) return "Average"
    return "Needs Improvement"
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-purple-600" />
            </div>
            <CardTitle className="text-2xl text-purple-700">Admin Login</CardTitle>
            <CardDescription>Enter the admin password to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
              <p className="text-xs text-gray-500">Default password: admin123</p>
            </div>
            <Button onClick={handleLogin} className="w-full bg-purple-600 hover:bg-purple-700">
              Login to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage assessments and view student results</p>
          </div>
          <Button onClick={() => setIsAuthenticated(false)} variant="outline" className="bg-transparent">
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="results">Student Results</TabsTrigger>
          <TabsTrigger value="students">Registered Students</TabsTrigger>
          <TabsTrigger value="exam">Admin Exam</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{students.length}</div>
                <p className="text-xs text-muted-foreground">Registered students</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Assessments</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.length}</div>
                <p className="text-xs text-muted-foreground">Submitted assessments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {results.length > 0
                    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">Overall performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {students.length > 0 ? Math.round((results.length / students.length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Students completed</p>
              </CardContent>
            </Card>
          </div>

          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                  <CardDescription>Performance breakdown by grade levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Excellent (80-100%)",
                        count: results.filter((r) => r.percentage >= 80).length,
                        color: "bg-green-500",
                      },
                      {
                        label: "Good (60-79%)",
                        count: results.filter((r) => r.percentage >= 60 && r.percentage < 80).length,
                        color: "bg-blue-500",
                      },
                      {
                        label: "Average (40-59%)",
                        count: results.filter((r) => r.percentage >= 40 && r.percentage < 60).length,
                        color: "bg-yellow-500",
                      },
                      {
                        label: "Needs Improvement (0-39%)",
                        count: results.filter((r) => r.percentage < 40).length,
                        color: "bg-red-500",
                      },
                    ].map((grade) => (
                      <div key={grade.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${grade.color}`}></div>
                          <span className="text-sm">{grade.label}</span>
                        </div>
                        <span className="font-medium">{grade.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Performance</CardTitle>
                  <CardDescription>Average scores by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      results.reduce((acc: Record<string, { total: number; count: number }>, result) => {
                        if (!acc[result.department]) {
                          acc[result.department] = { total: 0, count: 0 }
                        }
                        acc[result.department].total += result.percentage
                        acc[result.department].count += 1
                        return acc
                      }, {}),
                    ).map(([dept, stats]) => (
                      <div key={dept} className="flex items-center justify-between">
                        <span className="text-sm">{dept}</span>
                        <Badge variant="outline">
                          {Math.round(stats.total / stats.count)}% ({stats.count})
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Questions PDF
                </CardTitle>
                <CardDescription>Upload a PDF file containing the assessment questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <Label htmlFor="questions-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700">Click to upload</span> or drag and drop
                    </Label>
                    <Input
                      id="questions-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleQuestionUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-2">PDF files only</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Answer Key PDF
                </CardTitle>
                <CardDescription>Upload a PDF file containing the correct answers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <Label htmlFor="answers-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700">Click to upload</span> or drag and drop
                    </Label>
                    <Input
                      id="answers-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleAnswerKeyUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-2">PDF files only</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Student Results</CardTitle>
                  <CardDescription>View and export assessment results</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button onClick={exportDetailedReport} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Detailed Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading results...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No assessment results available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Submitted At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.student_id}>
                          <TableCell className="font-medium">{result.name}</TableCell>
                          <TableCell>{result.roll_number}</TableCell>
                          <TableCell>{result.section}</TableCell>
                          <TableCell>{result.department}</TableCell>
                          <TableCell>
                            {result.total_score}/{result.total_questions}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={result.percentage >= 60 ? "default" : "destructive"}
                              className={
                                result.percentage >= 80
                                  ? "bg-green-100 text-green-800"
                                  : result.percentage >= 60
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                              }
                            >
                              {result.percentage}%
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{getGrade(result.percentage)}</TableCell>
                          <TableCell className="text-sm text-gray-600">{result.submitted_at}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Students</CardTitle>
              <CardDescription>View all registered students</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No students registered yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Registered At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.roll_number}</TableCell>
                          <TableCell>{student.phone_number}</TableCell>
                          <TableCell>{student.section}</TableCell>
                          <TableCell>{student.department}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(student.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exam" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Exam Mode</CardTitle>
              <CardDescription>Take the exam without protection mode and with console access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Features:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• No fullscreen or security restrictions</li>
                    <li>• Console shows correct answers for each question</li>
                    <li>• Real-time answer validation</li>
                    <li>• Perfect for testing and reviewing questions</li>
                  </ul>
                </div>

                <Button onClick={() => window.open("/admin/exam", "_blank")} className="bg-blue-600 hover:bg-blue-700">
                  Open Admin Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
