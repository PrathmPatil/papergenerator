# Question Upload Template Guide

Use this guide when you have mixed questions in a PDF/DOCX and need to separate them into the correct Excel upload files.

## Common Rules

Every Excel row must include:

- `classId`: class value used in the system, for example `class_5`, `class_8`, `class_10`
- `subjectId`: subject value used in the system, for example `science`, `maths`, `english`
- `topicId`: topic name or existing topic identifier. For converted PDFs, use the PDF filename as the topic name, for example `Plants`
- `difficulty`: `easy`, `medium`, or `hard`
- `marks`: positive mark value, for example `1`, `2`, `5`
- `negativeMarks`: negative mark value, for example `0`, `0.25`, `1`
- `correctAnswer`: use `A`, `B`, `C`, or `D` for MCQ questions

If you do not know the correct answer, set it to `A` first and review it later.

Do not rename columns. Do not change column order. Do not delete required columns.

## 1. Text MCQ Questions

Template file:

```text
mcq_text_questions_upload_template.xlsx
```

Use this file for normal text-only MCQ questions.

Use it when the question has:

- Only text question
- Text options
- No diagram or image required to understand the question
- One correct option

Columns:

```text
classId
subjectId
topicId
type
difficulty
marks
negativeMarks
text
optionA
optionB
optionC
optionD
correctAnswer
```

Important values:

```text
type = mcq_text
correctAnswer = A/B/C/D
```

Example:

```text
classId: class_5
subjectId: science
topicId: Plants
type: mcq_text
difficulty: easy
marks: 1
negativeMarks: 0
text: Which part of the plant makes food?
optionA: Root
optionB: Stem
optionC: Leaf
optionD: Flower
correctAnswer: C
```

## 2. MCQ Image Questions

Template file:

```text
mcq_image_questions_template.xlsx
```

Use this file when one question depends on an image, diagram, chart, figure, or visual option.

Use it when the question has:

- A diagram in the question
- Image-based option
- Chart/graph-based MCQ
- Visual puzzle
- One image question with one answer

Columns:

```text
classId
subjectId
topicId
type
difficulty
marks
negativeMarks
questionText
questionImage
optionAText
optionAImage
optionBText
optionBImage
optionCText
optionCImage
optionDText
optionDImage
correctAnswer
```

Important values:

```text
type = mcq_image
questionImage = image file name from uploaded ZIP
optionAImage/optionBImage/etc = image file name if option is an image
```

Example with question image:

```text
classId: class_5
subjectId: science
topicId: Plants
type: mcq_image
difficulty: easy
marks: 1
negativeMarks: 0
questionText: Identify the part marked X in the diagram.
questionImage: plant_diagram_1.png
optionAText: Root
optionAImage:
optionBText: Stem
optionBImage:
optionCText: Leaf
optionCImage:
optionDText: Flower
optionDImage:
correctAnswer: C
```

Example with image options:

```text
questionText: Which image shows a leaf?
questionImage:
optionAText:
optionAImage: option_a_root.png
optionBText:
optionBImage: option_b_leaf.png
optionCText:
optionCImage: option_c_flower.png
optionDText:
optionDImage: option_d_seed.png
correctAnswer: B
```

Upload requirement:

Along with this Excel, upload a ZIP file containing all referenced images.

## 3. Text Answer Questions

Template file:

```text
text_answer_questions_upload_template.xlsx
```

Use this file for text questions that do not have MCQ options.

Use it when the question has:

- A short written answer
- A long written answer
- A model answer or answer key in text form

Columns:

```text
classId
subjectId
topicId
type
difficulty
marks
negativeMarks
text
correctAnswer
```

Important values:

```text
type = short_answer or long_answer
correctAnswer = optional expected answer, model answer, or answer key
```

For short answer and long answer rows, `correctAnswer` can be left blank.

Example short answer:

```text
classId: class_5
subjectId: science
topicId: Plants
type: short_answer
difficulty: easy
marks: 2
negativeMarks: 0
text: Name the process by which plants make food.
correctAnswer: Photosynthesis
```

Example long answer:

```text
classId: class_8
subjectId: science
topicId: Cell Structure
type: long_answer
difficulty: medium
marks: 5
negativeMarks: 0
text: Explain the functions of the nucleus, mitochondria, and cell membrane.
correctAnswer: The nucleus controls cell activities, mitochondria release energy, and the cell membrane controls movement of substances in and out of the cell.
```

## 4. Paragraph Questions

Template file:

```text
paragraph_questions_upload_template.xlsx
```

Use this file for comprehension/passage based questions.

Use it when:

- One paragraph/passage is followed by multiple questions
- Questions depend on the paragraph text
- The passage should be stored once and linked to sub-questions

Columns:

```text
classId
subjectId
topicId
difficulty
question_type
paragraph_group_id
instruction_text
paragraph
sub_question_id
sub_question_type
sub_question_text
option_A
option_B
option_C
option_D
correct_answer
marks
negative_marks
```

Important values:

```text
question_type = paragraph
paragraph_group_id = same value for all questions of the same passage, for example P1
sub_question_id = 1, 2, 3...
sub_question_type = mcq, true_false, or short_answer
```

Example:

```text
classId: class_5
subjectId: english
topicId: Reading Comprehension
difficulty: easy
question_type: paragraph
paragraph_group_id: P1
instruction_text: Read the passage and answer the questions.
paragraph: Plants are living things. They need air, water, and sunlight to grow. Leaves help plants make food.
sub_question_id: 1
sub_question_type: mcq
sub_question_text: What do plants need to grow?
option_A: Air, water, and sunlight
option_B: Stones only
option_C: Plastic
option_D: Sand only
correct_answer: A
marks: 1
negative_marks: 0
```

For the second question from the same paragraph:

```text
paragraph_group_id: P1
paragraph: same paragraph text
sub_question_id: 2
sub_question_text: Which part helps plants make food?
option_A: Root
option_B: Leaf
option_C: Flower
option_D: Seed
correct_answer: B
```

## 5. Image Subquestions

Template file:

```text
mcq_image_bulk_upload_template.xlsx
```

Use this file when one image has multiple sub-questions.

Use it when:

- A single diagram/chart/image is shown
- Multiple questions are asked from that same image
- Parent image must be linked with child/sub-questions

Columns:

```text
classId
subjectId
topicId
type
question_group_id
questionImage
instructionText
subQuestionId
subQuestionText
optionAText
optionBText
optionCText
optionDText
correctAnswer
marks
negativeMarks
difficulty
```

Important values:

```text
type = image_subquestions
question_group_id = same value for all sub-questions from the same image, for example IMG1
questionImage = same image filename for the group
```

Example:

```text
classId: class_5
subjectId: science
topicId: Plants
type: image_subquestions
question_group_id: IMG1
questionImage: plant_lifecycle.png
instructionText: Observe the image and answer the following questions.
subQuestionId: 1
subQuestionText: What stage comes after seed?
optionAText: Seedling
optionBText: Flower
optionCText: Fruit
optionDText: Leaf
correctAnswer: A
marks: 1
negativeMarks: 0
difficulty: easy
```

For another sub-question from the same image:

```text
question_group_id: IMG1
questionImage: plant_lifecycle.png
subQuestionId: 2
subQuestionText: Which stage shows flowering?
optionAText: Seed
optionBText: Seedling
optionCText: Flowering plant
optionDText: Fruit
correctAnswer: C
```

Upload requirement:

Along with this Excel, upload a ZIP file containing all referenced images.

## Mixed Document Segregation Rules

When reading a mixed PDF/DOCX, separate questions like this:

Text-only MCQ:

```text
Question + text options only
=> mcq_text_questions_upload_template.xlsx
```

Diagram/chart/image question:

```text
Single visual question
=> mcq_image_questions_template.xlsx
```

Passage/comprehension:

```text
Paragraph + related questions
=> paragraph_questions_upload_template.xlsx
```

One image with multiple questions:

```text
Parent image + multiple sub-questions
=> mcq_image_bulk_upload_template.xlsx
```

Short/long answer:

```text
Question + written answer key
=> text_answer_questions_upload_template.xlsx
```

## PDF Filename To Topic Rule

Use the PDF filename as `topicId` or topic name.

Examples:

```text
1. Plants.pdf      => Plants
02-Motion.pdf      => Motion
Chapter_3 Light.pdf => Chapter 3 Light
```

## Final Review Checklist

Before uploading:

- All rows have `classId`, `subjectId`, and `topicId`
- `type` or `question_type` is correct
- All MCQ rows have options A, B, C, and D
- `correctAnswer` is filled for MCQ rows; it can be blank for short answer and long answer rows
- Image filenames exactly match files inside the uploaded ZIP
- Paragraph questions use the same `paragraph_group_id` for the same passage
- Image subquestions use the same `question_group_id` for the same image
- No column name has been changed
- No required cell is empty
