# Paragraph Questions Excel Template - Testing Guide

## Summary of Changes

### 1. **Frontend Parser Updated** ✅
- **File**: `frontend/hooks/common.ts`
- **Change**: `buildSubQuestion()` function now accepts multiple sub_question_type values:
  - `"mcq"`, `"mcq_text"`, `"mcq_image"` → all normalize to `type: "mcq_text"`
  - `"true_false"` → stores as `type: "true_false"`
  - `"short_answer"` → stores as `type: "short_answer"`
- **Type Safety**: Input is normalized with `String(sub_question_type || "").trim().toLowerCase()` before type checks
- **Result**: Parser now accepts Excel files with `sub_question_type` values like "mcq", "mcq_text", or "mcq_image" without throwing "not supported" error

### 2. **Excel Template Regenerated** ✅
- **File**: `frontend/public/sample_file/paragraph_questions_upload_template.xlsx`
- **Structure**: 18 columns with proper ordering:
  ```
  classId | subjectId | topicId | difficulty | question_type | paragraph_group_id | 
  instruction_text | paragraph | sub_question_id | sub_question_type | sub_question_text | 
  option_A | option_B | option_C | option_D | correct_answer | marks | negative_marks
  ```
- **Sample Data**: 5 rows showing 2 complete paragraph examples:
  - **Paragraph 1**: "Water Cycle" with 3 sub-questions (MCQ, true/false, MCQ)
  - **Paragraph 2**: "Industrial Revolution" with 2 sub-questions (MCQ, short_answer)
- **Formatting**: Professional Excel with frozen header row, bold white text on blue background, auto-fitted columns

---

## Step-by-Step Testing Instructions

### Step 1: Download Template
1. Navigate to: **Dashboard → Questions → Create New**
2. Select **"Paragraph"** tab
3. Check **"File Upload"** toggle
4. Click **"Sample File"** button
5. File `paragraph_questions_upload_template.xlsx` will download to your computer

### Step 2: Review Template Structure
Open the downloaded Excel file and verify:
- ✅ Header row is frozen (blue background)
- ✅ Contains all 18 columns in correct order
- ✅ Sample data shows proper paragraph grouping with `paragraph_group_id`
- ✅ Sub-question types are shown as: "mcq", "true_false", "short_answer"

### Step 3: Prepare Your Test Data
Option A - Use existing sample data:
- Leave the 5 sample rows as-is for testing

Option B - Add your own paragraph:
1. Copy one complete paragraph group (rows 2-4 for Water Cycle)
2. Modify the column values:
   - `classId`, `subjectId`, `topicId`: Match your existing classification
   - `instruction_text`: Your instruction (e.g., "Read the following passage...")
   - `paragraph`: Your paragraph text
   - `sub_question_*` columns: Your sub-questions and options
3. Keep `paragraph_group_id` the same for rows belonging to same paragraph
4. Keep `question_type` as `"paragraph"` for all rows
5. **Important**: Each row must have ALL metadata values (classId, subjectId, etc.) - don't leave them empty

### Step 4: Upload the Excel File
1. In Dashboard → Questions → Create New
2. Select **"Paragraph"** tab
3. Ensure **"File Upload"** toggle is ON
4. Click on file upload area
5. Select your modified Excel file
6. Review the parsed rows (they should appear in the form)
7. Click **"Submit"** button

### Step 5: Verify Upload Success
Expected behavior:
- ✅ No "subquestion type is not supported" error
- ✅ Success message: "Uploaded X paragraph question(s) with Y sub-question(s)"
- ✅ Questions appear in Question Bank with sub-questions intact

### Step 6: Generate Paper and Test Exports
1. Navigate to **Dashboard → Papers → Create New**
2. Select your newly created paragraph questions
3. Generate a paper including these questions
4. Test all export formats:
   - **Preview**: Sub-questions should display with images (if any)
   - **PDF**: Download and verify sub-question text and images render
   - **Word**: Download and verify formatting and images
   - **Excel**: Download and verify data structure
   - **Print**: Verify layout before printing

---

## Accepted Sub-Question Types

Your Excel file can use ANY of these values for `sub_question_type`:

| Excel Value | Maps To | Behavior |
|------------|---------|----------|
| `mcq` | `mcq_text` | MCQ with text options |
| `mcq_text` | `mcq_text` | MCQ with text options |
| `mcq_image` | `mcq_text` | MCQ with text options (note: image option handling requires different setup) |
| `true_false` | `true_false` | True/False question with 2 predefined options |
| `short_answer` | `short_answer` | Short answer question (no MCQ options needed) |

---

## Excel Column Reference

| Column | Required | Example | Notes |
|--------|----------|---------|-------|
| classId | ✅ Yes | "10" | Must match class in database |
| subjectId | ✅ Yes | "mathematics" | Must match subject in database |
| topicId | ✅ Yes | "algebra" | Can be created on-the-fly if new |
| difficulty | ✅ Yes | "easy", "medium", "hard" | One of these three values |
| question_type | ✅ Yes | "paragraph" | Must be "paragraph" for all rows |
| paragraph_group_id | ✅ Yes | "P1", "water_cycle", "group1" | Group rows of same paragraph. Can be any string |
| instruction_text | ✅ Yes | "Read the passage..." | Instruction for the paragraph block |
| paragraph | ✅ Yes (once per group) | "Water evaporates..." | The actual paragraph text |
| sub_question_id | ✅ Yes | "SQ1", "Q1.1", etc | Unique ID per sub-question. Can be any string |
| sub_question_type | ✅ Yes | "mcq", "true_false", "short_answer" | One of the accepted types |
| sub_question_text | ✅ Yes | "What is evaporation?" | The sub-question text |
| option_A, option_B, option_C, option_D | Conditional | "Boiling", "Melting", "Freezing", "Condensing" | Required only for MCQ/true_false types |
| correct_answer | Conditional | "A", "B", "C", "D", "true", "false" | Required only for MCQ/true_false/short_answer |
| marks | ✅ Yes | "1", "2", "4" | Points for correct answer |
| negative_marks | ✅ Yes | "0", "0.5", "1" | Points deducted for wrong answer |

---

## Troubleshooting

### Error: "subquestion type is not supported"
- ❌ **OLD BEHAVIOR** (should not occur anymore)
- ✅ **NEW FIX**: Parser now accepts "mcq", "mcq_text", "mcq_image" values
- **Action**: Ensure you're using the latest code with the parser fix applied

### Error: "Paragraph question must have sub-questions"
- **Cause**: No sub-question rows found for the paragraph
- **Fix**: Ensure you have at least one row per paragraph with `sub_question_type` filled

### Questions not appearing after upload
- **Cause 1**: classId or subjectId don't exist in database
  - **Fix**: Verify these values match exactly (case-sensitive) with database
- **Cause 2**: Duplicate questions detected
  - **Fix**: Check that your paragraph text + sub-question text combination is unique
- **Cause 3**: Upload failed silently
  - **Action**: Check browser console (F12 → Console tab) for detailed error messages

### Sub-questions visible in Question Bank but not in Paper Generation
- **Cause**: Paper generation UI might need refresh
- **Fix**: Clear browser cache (Ctrl+Shift+Delete) and try again

---

## Expected Workflow

```
1. Download Template
     ↓
2. Fill in your paragraphs & sub-questions (following Excel structure)
     ↓
3. Upload Excel file
     ↓
4. Parser normalizes sub_question_type values
     ↓
5. Backend stores questions with nested sub-questions
     ↓
6. Questions appear in Question Bank
     ↓
7. Select questions in Paper Generation
     ↓
8. Sub-questions display with expand/collapse toggle
     ↓
9. Export to PDF/Word/Excel/Print
     ↓
10. Verify sub-questions and images render correctly
```

---

## Code Changes Reference

### Frontend Parser (`frontend/hooks/common.ts`)
```typescript
const buildSubQuestion = (row: ExcelParagraphRow, index: number) => {
  const normalizedSubQuestionType = String(row.sub_question_type || "")
    .trim()
    .toLowerCase();

  // Accept multiple MCQ variants
  if (normalizedSubQuestionType === "mcq" || 
      normalizedSubQuestionType === "mcq_text" || 
      normalizedSubQuestionType === "mcq_image") {
    // Process as MCQ, store as type: "mcq_text"
    return { type: "mcq_text", /* ... */ };
  }
  
  // Handle other types...
};
```

### Template Location
- **Path**: `frontend/public/sample_file/paragraph_questions_upload_template.xlsx`
- **Download URL**: Accessible from Dashboard → Questions → Create New → Paragraph → Sample File button

---

## Next Steps After Testing

If testing succeeds:
1. ✅ Share this guide with your team
2. ✅ All paragraph questions can now be uploaded via Excel
3. ✅ Sub-questions will automatically display in paper generation
4. ✅ All export formats (PDF, Word, Excel) now support sub-question rendering

If issues occur:
1. Check the error message in the success/error alert
2. Review browser console (F12 → Console tab) for stack traces
3. Verify Excel column names match exactly (case-sensitive)
4. Ensure classId/subjectId exist in your database

---

## File Locations for Reference
- Template: `/frontend/public/sample_file/paragraph_questions_upload_template.xlsx`
- Upload Handler: `/frontend/app/dashboard/questions/new/page.tsx` (line ~758)
- Parser Function: `/frontend/hooks/common.ts` (buildSubQuestion function)
- API Endpoint: `POST /api/questions/create-bulk-upload` (backend)
