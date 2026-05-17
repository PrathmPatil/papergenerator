# Subject Display Issue - Fixed

## Problem Summary
When uploading questions through the image + subquestion Excel format:
- Frontend displayed "Unknown Subject" 
- Database stored the correct subject name
- Issue: Subject IDs from Excel were not being consistently normalized

## Root Cause Analysis
1. **Backend Issue**: The `normalizeSubjectId()` function didn't handle all subject name variations (e.g., "Physics", "Chemistry", "Bio", "Phys", etc.)
2. **Middleware Issue**: The `normalizeImageQuestion` middleware didn't normalize the subjectId from the request payload
3. **Bulk Upload Issue**: The `create-bulk-upload` endpoint didn't normalize subject IDs
4. **Frontend Issue**: The `normalizeSubjectId()` function returned raw input instead of normalized value when no match was found

## Solution Implemented

### 1. Backend - Enhanced Subject Normalization (`backend/routes/questions.js`)
✅ Added comprehensive `normalizeSubjectId()` function with support for:
- Full names: "Mathematics", "Physics", "Chemistry", "Biology", etc.
- Abbreviations: "Math", "Phys", "Chem", "Bio", "Sci", "Eng", etc.
- Variants: "Math10", "Science10", "General Knowledge", etc.
- Always returns normalized ID (never raw input)

### 2. Backend - Middleware Update (`backend/middleware/normalizeImageQuestion.middleware.js`)
✅ Added normalization function and now normalizes `subjectId` in the payload:
```javascript
subjectId: normalizeSubjectId(payload.subjectId), // Normalize subject ID
```

### 3. Backend - Bulk Upload Fix (`backend/routes/questions.js`)
✅ Updated `create-bulk-upload` endpoint to normalize subject IDs:
```javascript
subjectId: normalizeSubjectId(question.subjectId), // Normalize subject ID
```

### 4. Frontend - Enhanced Aliases (`frontend/lib/data.ts`)
✅ Updated `SUBJECT_ALIASES` with comprehensive mappings including:
- All abbreviations (math→maths, phys→physics, bio→biology, etc.)
- All variants (math10→maths, sci→science, etc.)

✅ Improved `normalizeSubjectId()` logic:
- Checks exact match in SUBJECTS array first
- Checks lowercase version
- Always returns normalized value (never raw input)

## Subject ID Mapping Reference

| Input | Normalized ID | Display Name |
|-------|------|---|
| Mathematics / Math / Maths | maths | Mathematics |
| Physics / Phys / Phy | physics | Physics |
| Chemistry / Chem | chemistry | Chemistry |
| Biology / Bio / Biol | biology | Biology |
| Science / Sci / Sci10 | science | Science |
| English / Eng / Eng10 | english | English |
| General Knowledge / GK | gk | General Knowledge |
| Reasoning / Logical Reasoning | reasoning | Reasoning |
| Geography / Geo | geography | Geography |
| History / Hist | history | History |
| Civics / Civic | civics | Civics |

## Impact
- ✅ All new uploads will have correctly normalized subject IDs
- ✅ Frontend will correctly display subject names (no more "Unknown Subject")
- ✅ Subject consistency across the entire project
- ✅ Supports multiple input formats and abbreviations

## Migration Note
Existing questions with non-normalized subject IDs will continue to work if they match the standard subject IDs. If there are questions with incorrect subject IDs (e.g., "Unknown Physics"), they may need a one-time database migration to correct the subject IDs.

## Testing Checklist
- [ ] Upload questions with "Physics" in Excel → should display as "Physics" in question bank
- [ ] Upload questions with "Bio" in Excel → should display as "Biology" in question bank
- [ ] Upload questions with "Chemistry" in Excel → should display as "Chemistry" in question bank
- [ ] Upload questions with abbreviations (Phys, Chem, etc.) → should display correctly
- [ ] Filter by subject in question bank → should work correctly
- [ ] Create question via UI form → subject should be normalized

## Files Modified
1. `backend/routes/questions.js` - Enhanced normalizeSubjectId() + create-bulk-upload endpoint
2. `backend/middleware/normalizeImageQuestion.middleware.js` - Added normalization function and middleware call
3. `frontend/lib/data.ts` - Enhanced SUBJECT_ALIASES + improved normalizeSubjectId logic
