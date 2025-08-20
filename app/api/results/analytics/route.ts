import { NextResponse } from "next/server"
import { readResultsFromExcel } from "@/lib/excel-utils"

export async function GET() {
  try {
    const results = await readResultsFromExcel()

    // Calculate analytics
    const totalResults = results.length
    const averageScore =
      totalResults > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalResults) : 0

    const gradeDistribution = {
      excellent: results.filter((r) => r.percentage >= 80).length,
      good: results.filter((r) => r.percentage >= 60 && r.percentage < 80).length,
      average: results.filter((r) => r.percentage >= 40 && r.percentage < 60).length,
      poor: results.filter((r) => r.percentage < 40).length,
    }

    const departmentStats = results.reduce(
      (acc: Record<string, { total: number; count: number; average: number }>, result) => {
        if (!acc[result.department]) {
          acc[result.department] = { total: 0, count: 0, average: 0 }
        }
        acc[result.department].total += result.percentage
        acc[result.department].count += 1
        acc[result.department].average = Math.round(acc[result.department].total / acc[result.department].count)
        return acc
      },
      {},
    )

    return NextResponse.json({
      success: true,
      analytics: {
        totalResults,
        averageScore,
        gradeDistribution,
        departmentStats,
      },
    })
  } catch (error) {
    console.error("[v0] Analytics error:", error)
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 })
  }
}
