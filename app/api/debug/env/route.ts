export async function GET() {
  try {
    const envVars = {
      // NextAuth Environment Variables
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT_SET",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "NOT_SET",

      // Google OAuth Variables
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "NOT_SET",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "NOT_SET",

      // Google Sheets API Variables
      GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || "NOT_SET",
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? "SET" : "NOT_SET",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "NOT_SET",

      // Sheet IDs
      QUESTIONS_SHEET_ID: process.env.QUESTIONS_SHEET_ID || "NOT_SET",
      RESULTS_SHEET_ID: process.env.RESULTS_SHEET_ID || "NOT_SET",

      // Node Environment
      NODE_ENV: process.env.NODE_ENV || "NOT_SET",
      VERCEL_ENV: process.env.VERCEL_ENV || "NOT_SET",
    }

    // Check for critical missing variables
    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => value === "NOT_SET")
      .map(([key]) => key)

    const response = {
      status: missingVars.length === 0 ? "SUCCESS" : "WARNING",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      missingVariables: missingVars,
      environmentVariables: envVars,
      summary: {
        total: Object.keys(envVars).length,
        configured: Object.keys(envVars).length - missingVars.length,
        missing: missingVars.length,
      },
    }

    return Response.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[DEBUG] Environment check failed:", error)

    return Response.json(
      {
        status: "ERROR",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to check environment variables",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
