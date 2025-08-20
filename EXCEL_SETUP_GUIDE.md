# Excel-Based Online Assessment System Setup Guide

## Overview
This system uses Excel files instead of a database to store questions, student data, and results. All data is managed through Excel files stored locally.

## Setup Steps

### 1. Install Dependencies
\`\`\`bash
npm install xlsx
\`\`\`

### 2. Create Data Directory Structure
The system will automatically create a `data` folder in your project root with these files:
- `questions.xlsx` - Contains all assessment questions
- `students.xlsx` - Stores registered student information
- `results.xlsx` - Stores assessment results and scores

### 3. Excel File Formats

#### Questions Excel Format (`questions.xlsx`)
| Column | Description | Example |
|--------|-------------|---------|
| Question | The question text | "What is the capital of France?" |
| Option A | First option | "London" |
| Option B | Second option | "Berlin" |
| Option C | Third option | "Paris" |
| Option D | Fourth option | "Madrid" |
| Correct Answer | Correct option (A, B, C, or D) | "C" |
| Mark | Points for correct answer | 1 |

#### Students Excel Format (`students.xlsx`)
| Column | Description | Example |
|--------|-------------|---------|
| Roll Number | Unique student identifier | "CS001" |
| Name | Student full name | "John Doe" |
| Section | Class section | "A" |
| Department | Academic department | "Computer Science" |
| Phone Number | Contact number | "1234567890" |
| Created At | Registration timestamp | "2024-01-15T10:30:00Z" |

#### Results Excel Format (`results.xlsx`)
| Column | Description | Example |
|--------|-------------|---------|
| Roll Number | Student identifier | "CS001" |
| Name | Student name | "John Doe" |
| Section | Student section | "A" |
| Department | Student department | "Computer Science" |
| Phone Number | Contact number | "1234567890" |
| Total Score | Points earned | 8 |
| Total Questions | Number of questions | 10 |
| Percentage | Score percentage | 80.00 |
| Submitted At | Submission timestamp | "2024-01-15T11:45:00Z" |

### 4. Generate Sample Files
Run this command to create sample Excel files:
\`\`\`bash
npm run generate-samples
\`\`\`

### 5. Admin Panel Usage

#### Uploading Questions
1. Go to `/admin` page
2. Enter admin password (default: "admin123")
3. Click "Upload Questions Excel"
4. Select your questions Excel file
5. System will process and store questions

#### Viewing Results
- All student results are automatically saved to `results.xlsx`
- View results in the admin panel
- Export functionality downloads the Excel file directly

### 6. Student Workflow
1. **Registration**: Students register at `/` - data saved to `students.xlsx`
2. **Assessment**: Take test at `/assessment` - questions loaded from `questions.xlsx`
3. **Results**: View scores at `/results` - results saved to `results.xlsx`

### 7. File Management

#### Backup Strategy
- Regularly backup the `data` folder
- Keep copies of your questions Excel files
- Export results periodically

#### Updating Questions
1. Modify your questions Excel file
2. Re-upload through admin panel
3. New questions replace existing ones

#### Data Location
All Excel files are stored in: `[project-root]/data/`

### 8. Deployment Considerations

#### Local Development
- Files stored in local `data` directory
- Perfect for testing and small-scale use

#### Production Deployment
- Consider using cloud storage for Excel files
- Implement file backup strategies
- Monitor disk space usage

### 9. Troubleshooting

#### Common Issues
1. **Excel file not found**: Ensure files exist in `data` directory
2. **Invalid format**: Check column names match exactly
3. **Permission errors**: Ensure write permissions on `data` directory

#### File Validation
- Questions must have all required columns
- Correct Answer must be A, B, C, or D
- Mark must be a number

### 10. Advanced Features

#### Custom Scoring
- Modify `mark` column for different point values
- System automatically calculates total scores

#### Multiple Assessments
- Create different question files for different tests
- Upload as needed through admin panel

#### Data Analysis
- Open `results.xlsx` in Excel for advanced analysis
- Create charts and pivot tables
- Export to other formats as needed

## Security Notes
- Admin password should be changed in production
- Protect the `data` directory from unauthorized access
- Regular backups are essential

## Support
For issues or questions, check the troubleshooting section or review the Excel file formats.
\`\`\`

\`\`\`typescriptreact file="lib/firebase.ts" isDeleted="true"
...deleted...
