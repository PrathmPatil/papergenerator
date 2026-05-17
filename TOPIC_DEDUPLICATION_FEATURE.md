# Topic Deduplication & Paper Generation Enhancement

## Feature Overview

This feature ensures that when uploading question files with the same topic name but different questions, the system:
- ✅ Does NOT create a new topic
- ✅ Only saves the new questions to the existing topic
- ✅ Provides clear topic selection dropdowns in paper generation and edit flows

## How It Works

### Backend (Already Implemented)

The backend uses the `ensureTopicId` function in `routes/questions.js` which:

1. **Checks for Existing Topics**: Searches for topics by name (case-insensitive) using the `nameLower` field
   ```javascript
   const existing = await Topic.findOne({
     classId,
     subjectId,
     nameLower, // case-insensitive search
   });
   ```

2. **Returns Existing Topic**: If found, returns the existing topic's ID
   ```javascript
   if (existing) {
     return existing._id.toString();
   }
   ```

3. **Creates New Topic Only if Needed**: Creates a new topic only if one doesn't exist
   ```javascript
   const created = await Topic.create({
     name: rawValue,
     nameLower,
     classId,
     subjectId,
   });
   ```

4. **Handles Conflicts**: Gracefully handles race conditions where two uploads might create the same topic simultaneously

### Topic Model

The Topic model uses a compound unique index for case-insensitive uniqueness:

```javascript
TopicSchema.index(
  { classId: 1, subjectId: 1, nameLower: 1 },
  { unique: true }
);
```

This ensures that within a specific class and subject, topic names are unique (regardless of case).

## Upload Process

When uploading questions via Excel/bulk upload:

1. **Parse File**: Extract questions from Excel file
2. **Process Topics**: For each question, call `ensureTopicId(classId, subjectId, topicName)`
3. **Reuse Existing**: If a topic with the same name exists → use its ID
4. **Create New**: If topic doesn't exist → create it automatically
5. **Insert Questions**: Save all questions (new and existing topics) in one batch

### Example Upload Flow

```
Scenario: Upload Math file with "Algebra" topic (already exists in DB)
├─ File contains 50 questions with topic="Algebra"
├─ Backend searches for "Algebra" in Math subject
├─ Finds existing "Algebra" topic (ID: 507f1f77bcf86cd799439011)
├─ Uses that ID for all 50 questions
├─ Insert questions with topicId: 507f1f77bcf86cd799439011
└─ ✓ No duplicate topic created
```

## Paper Generation & Edit Flow Enhancements

### Components Added

#### 1. TopicSelector Component
Location: `frontend/components/topic-selector.tsx`

Features:
- Dropdown-style topic selection
- Multi-select support (configurable)
- Add new topics on-the-fly
- Shows selected topics as badges
- Subject-filtered topic list

**Usage:**
```tsx
<TopicSelector
  topics={availableTopics}
  selectedTopics={selectedTopics}
  onTopicsChange={setSelectedTopics}
  subjectId={activeSubject}
  isLoading={topicLoading}
  onAddTopic={handleAddTopic}
/>
```

#### 2. StepNavigation Component
Location: `frontend/components/step-navigation.tsx`

Features:
- Clear "Next Step" and "Back" buttons
- Loading state support
- Customizable labels
- Optional back/next buttons

**Usage:**
```tsx
<StepNavigation
  onNext={() => setCurrentStep(currentStep + 1)}
  onBack={() => setCurrentStep(currentStep - 1)}
  nextDisabled={currentStep === TOTAL_STEPS}
  nextLabel="Go to Configuration"
/>
```

### Paper Generation Flow (Step 2: Topic Selection)

**Current Implementation:**
- Topics shown in scrollable checklist with subject tabs
- Already functional and preventing duplicates

**Enhancement Path (Optional):**
- Can replace with TopicSelector component for cleaner UI
- Add "Next Step" button for clearer navigation

### Paper Edit Flow

**Same as Paper Generation:**
- Topics can be modified in Step 2
- All changes respect duplicate prevention

## Testing the Feature

### Test Case 1: Upload Duplicate Topic
```
1. Go to Questions > New > Create Question
2. Select MCQ (Text) tab
3. Upload Excel file with "Geometry" topic
4. Upload another Excel file with "Geometry" topic (different questions)
5. Verify: Both question sets assigned to same "Geometry" topic (no duplicate)
```

### Test Case 2: Topic Name Variations
```
1. Upload file with topic "Algebra"
2. Upload file with topic "ALGEBRA" (uppercase)
3. Verify: Both use same topic (case-insensitive matching)
```

### Test Case 3: Paper Generation
```
1. Go to Generate > Step 1: Basic Details (select class/subject)
2. Go to Step 2: Topic Selection
3. Verify: All topics (whether from different uploads) listed once
4. Select topics and continue
5. Verify: Paper generation uses correct topic IDs
```

## Database Schema

### Topic Model
```javascript
{
  name: String,              // Original case (e.g., "Algebra")
  nameLower: String,         // Lowercase (e.g., "algebra")
  classId: String,           // Class reference
  subjectId: String,         // Subject reference
  createdAt: Date,
  updatedAt: Date,
  timestamps: true
}

// Unique Index
{ classId: 1, subjectId: 1, nameLower: 1 } - unique
```

### Question Model
```javascript
{
  // ... other fields
  topicId: String,           // References Topic._id
  classId: String,
  subjectId: String,
  // ... other fields
}
```

## API Endpoints

### 1. POST /api/topics
Creates or returns existing topic (idempotent)

**Request:**
```json
{
  "name": "Algebra",
  "classId": "class_10",
  "subjectId": "maths"
}
```

**Response (New Topic):**
```json
{
  "topic": { "_id": "...", "name": "Algebra", ... },
  "existed": false
}
```

**Response (Existing Topic):**
```json
{
  "topic": { "_id": "507f1f77bcf86cd799439011", "name": "Algebra", ... },
  "existed": true
}
```

### 2. POST /api/questions/create-bulk-upload
Uploads multiple questions, automatically manages topics

**Request:**
```json
[
  {
    "classId": "class_10",
    "subjectId": "maths",
    "topicId": "Algebra",      // or topicName
    "type": "mcq_text",
    "text": "Question text...",
    // ... other fields
  },
  // ... more questions
]
```

**Response:**
```json
{
  "success": true,
  "createdCount": 48,        // New questions created
  "duplicateCount": 2,       // Duplicate questions skipped
  "skippedCount": 2,
  "subQuestionCount": 15
}
```

## Features Roadmap

### ✅ Completed
- [x] Backend topic deduplication (case-insensitive)
- [x] Bulk upload with automatic topic reuse
- [x] Topic selection UI (checkboxes)
- [x] Add new topics on-the-fly
- [x] Paper generation with topic filtering

### 🎯 Next Enhancements (Optional)
- [ ] Replace topic checkboxes with TopicSelector component
- [ ] Add advanced topic filters (by difficulty, question count)
- [ ] Topic management UI (rename, merge, delete)
- [ ] Topic statistics (question count per topic)
- [ ] Topic templates

## Troubleshooting

### Issue: Duplicate topics created despite upload
**Solution:**
- Check database for topics with same name but different case
- Run: `db.topics.find({ subjectId: "maths", nameLower: "algebra" })`
- Ensure `nameLower` index exists

### Issue: Topics not appearing in selection
**Solution:**
- Verify class and subject IDs match between upload and generation
- Check that questions were successfully created
- Query: `db.questions.findOne({ classId: "class_10", subjectId: "maths" })`

### Issue: Can't add new topic during generation
**Solution:**
- Ensure topic name is not empty
- Check that classId and subjectId are selected
- Look for validation error messages

## Related Documentation

- [Question Upload Guide](../../PARAGRAPH_TEMPLATE_TESTING_GUIDE.md)
- [Subject Normalization](../../SUBJECT_NORMALIZATION_FIX.md)
- [API Documentation](../swagger.js)
