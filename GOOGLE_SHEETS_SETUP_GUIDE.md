# Google Sheets API Setup Guide for Online Assessment System

## Overview
This guide will help you set up Google Sheets API integration for the online assessment system. The system uses two Google Sheets:
1. **Questions Sheet** - Contains assessment questions and answers
2. **Results Sheet** - Stores student results and scores

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## Step 2: Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: `assessment-system-service`
   - Description: `Service account for online assessment system`
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

## Step 3: Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Select "JSON" format
5. Download the JSON file (keep it secure!)

## Step 4: Create Google Sheets

### Questions Sheet
1. Create a new Google Sheet
2. Name it "Assessment Questions"
3. Set up columns in the first row:
   - A1: `Question`
   - B1: `Option A`
   - C1: `Option B`
   - D1: `Option C`
   - E1: `Option D`
   - F1: `Correct Answer`
   - G1: `Marks`

### Results Sheet
1. Create another Google Sheet
2. Name it "Assessment Results"
3. Set up columns in the first row:
   - A1: `Name`
   - B1: `Roll Number`
   - C1: `Section`
   - D1: `Department`
   - E1: `Score`
   - F1: `Total Questions`
   - G1: `Submitted At`

## Step 5: Share Sheets with Service Account

1. Open each Google Sheet
2. Click "Share" button
3. Add the service account email (from the JSON file)
4. Give "Editor" permissions
5. Uncheck "Notify people"
6. Click "Share"

## Step 6: Get Sheet IDs

1. Open each Google Sheet
2. Copy the Sheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Copy the `SHEET_ID` part

## Step 7: Environment Variables

Add these environment variables to your Vercel project:

\`\`\`env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
QUESTIONS_SHEET_ID=your_questions_sheet_id
RESULTS_SHEET_ID=your_results_sheet_id
\`\`\`

**Important Notes:**
- The `GOOGLE_PRIVATE_KEY` should include the full private key with `\n` for line breaks
- Get these values from the downloaded JSON file
- In Vercel, you can add these in Project Settings > Environment Variables

## Step 8: Sample Data Format

### Questions Sheet Example:
| Question | Option A | Option B | Option C | Option D | Correct Answer | Marks |
|----------|----------|----------|----------|----------|----------------|-------|
| What is 2+2? | 3 | 4 | 5 | 6 | B | 1 |
| Capital of France? | London | Berlin | Paris | Madrid | C | 1 |

### Results Sheet (Auto-populated):
| Name | Roll Number | Section | Department | Score | Total Questions | Submitted At |
|------|-------------|---------|------------|-------|-----------------|--------------|
| John Doe | CS001 | A | Computer Science | 8 | 10 | 2024-01-15T10:30:00Z |

## Step 9: Deploy to Vercel

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add the environment variables in Vercel dashboard
4. Deploy the application

## Troubleshooting

### Common Issues:

1. **"Service account not found"**
   - Verify the service account email is correct
   - Check if the service account has access to the sheets

2. **"Insufficient permissions"**
   - Make sure the service account has "Editor" access to both sheets
   - Verify the Google Sheets API is enabled

3. **"Private key error"**
   - Ensure the private key includes proper line breaks (`\n`)
   - Check that the entire key is copied including headers and footers

4. **"Sheet not found"**
   - Verify the sheet IDs are correct
   - Make sure the sheets are shared with the service account

### Testing the Setup:

1. Add sample questions to your Questions Sheet
2. Run the application locally with `npm run dev`
3. Complete a test assessment
4. Check if results appear in the Results Sheet

## Security Best Practices

1. **Never commit** the service account JSON file to your repository
2. Use environment variables for all sensitive data
3. Regularly rotate service account keys
4. Monitor sheet access logs
5. Use specific permissions (Editor only for necessary sheets)

## Support

If you encounter issues:
1. Check the Vercel deployment logs
2. Verify all environment variables are set correctly
3. Test the Google Sheets API connection
4. Ensure proper sheet formatting and permissions

For additional help, refer to:
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
