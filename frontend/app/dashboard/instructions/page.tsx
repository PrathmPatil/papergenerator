"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Download, FileSpreadsheet, Tags, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadFile } from "@/hooks/common";
import { CLASSES, SUBJECTS } from "@/lib/data";
import { formatScientificText } from "@/lib/scientific-text";
import { ScientificText } from "@/components/scientific-text";

const SECTIONS = [
  { id: "formulas", label: "Formulas" },
  { id: "italic-g", label: "Italic g" },
  { id: "excel-rules", label: "Excel rules" },
  { id: "samples", label: "Sample files" },
  { id: "question-types", label: "Question types" },
  { id: "topics", label: "Topics" },
  { id: "converters", label: "PDF & DOCX" },
  { id: "question-bank", label: "Question bank" },
  { id: "papers", label: "Papers & OMR" },
  { id: "users", label: "Users" },
  { id: "checklist", label: "Checklist" },
];

const FORMULA_SAMPLES = [
  { excel: "CO2", note: "Plain digits after the element" },
  { excel: "H2O", note: "Plain digits after the element" },
  { excel: "Al2(SO4)3", note: "Parentheses and counts" },
  { excel: "C6H12O6", note: "Glucose-style formula" },
  { excel: "Ca2+", note: "Ion charge" },
  { excel: "10^-9", note: "Scientific power" },
  { excel: "6.023 x 10^23", note: "Avogadro-style value" },
  { excel: "22 g CO2 and 18 g H2O", note: "Formulas inside a sentence" },
  { excel: "H_{2}O", note: "Brace markup when auto-convert is not enough" },
  { excel: "Al_{2}(SO_{4})_{3}", note: "Brace markup for nested counts" },
  { excel: "10^{-9}", note: "Brace markup for powers" },
  { excel: "*g*", note: "Times italic g (gravity). Type *g*" },
];

const SAMPLE_FILES = [
  {
    title: "Text MCQ",
    file: "/sample_file/mcq_text_questions_upload_template.xlsx",
    name: "mcq_text_questions_upload_template.xlsx",
    use: "Text question + text options. No diagram needed.",
  },
  {
    title: "Chemistry formulas sample",
    file: "/sample_file/mcq_text_chemistry_formulas_sample.xlsx",
    name: "mcq_text_chemistry_formulas_sample.xlsx",
    use: "Same Text MCQ columns, with CO2, H2O, Al2(SO4)3, and 10^-9 examples.",
  },
  {
    title: "Image MCQ",
    file: "/sample_file/mcq_image_questions_template.xlsx",
    name: "mcq_image_questions_template.xlsx",
    use: "One question, optional question image, optional option images. Upload Excel + ZIP.",
  },
  {
    title: "Image + sub-questions",
    file: "/sample_file/mcq_image_bulk_upload_template.xlsx",
    name: "mcq_image_bulk_upload_template.xlsx",
    use: "One diagram with several sub-questions. Keep the same question_group_id.",
  },
  {
    title: "Image ZIP sample",
    file: "/sample_file/mcq_image_bulk_upload_images.zip",
    name: "mcq_image_bulk_upload_images.zip",
    use: "Image filenames inside the ZIP must match the Excel image columns.",
  },
  {
    title: "Short / long answer",
    file: "/sample_file/text_answer_questions_upload_template.xlsx",
    name: "text_answer_questions_upload_template.xlsx",
    use: "Written answers. type = short_answer or long_answer.",
  },
  {
    title: "Paragraph / passage",
    file: "/sample_file/paragraph_questions_upload_template.xlsx",
    name: "paragraph_questions_upload_template.xlsx",
    use: "One passage with multiple sub-questions. Keep the same paragraph_group_id.",
  },
];

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-6 text-xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

function NoteList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-5">
      {children}
    </pre>
  );
}

export default function InstructionsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructions</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            All upload rules, sample files, class/subject IDs, formula markup, and paper notes in one place.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            downloadFile("/sample_file/QUESTION_UPLOAD_TEMPLATE_GUIDE.md", "QUESTION_UPLOAD_TEMPLATE_GUIDE.md")
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Download full guide
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                {section.label}
              </Badge>
            </a>
          ))}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionTitle id="formulas">Subscripts and superscripts</SectionTitle>
        <Card>
          <CardHeader>
            <CardTitle>How to type chemistry and powers in Excel</CardTitle>
            <CardDescription>
              Excel stores CO2 and H2O as plain text. PaperGenerator converts them when you upload and when they are shown.
              You do not need Excel subscript font formatting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-4 text-sm leading-6">
              <p>
                If auto-convert is not enough, use braces:{" "}
                <code className="rounded bg-background px-1 py-0.5">H_{"{2}"}O</code>,{" "}
                <code className="rounded bg-background px-1 py-0.5">Al_{"{2}"}(SO_{"{4}"})_{"{3}"}</code>,{" "}
                <code className="rounded bg-background px-1 py-0.5">10^{"{-9}"}</code>.
              </p>
              <p className="mt-2">
                After conversion they display as{" "}
                <span className="font-medium text-foreground">
                  {formatScientificText("CO2")}, {formatScientificText("H2O")},{" "}
                  {formatScientificText("Al2(SO4)3")}, {formatScientificText("10^-9")}.
                </span>
              </p>
              <p className="mt-2">
                For the printed italic gravity letter, see{" "}
                <a href="#italic-g" className="font-medium underline">
                  Italic g
                </a>
                .
              </p>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Write in Excel</th>
                    <th className="px-3 py-2 font-medium">Shown in UI / paper</th>
                    <th className="px-3 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {FORMULA_SAMPLES.map((row) => (
                    <tr key={row.excel} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.excel}</td>
                      <td className="px-3 py-2 font-medium"><ScientificText value={row.excel} /></td>
                      <td className="px-3 py-2 text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <NoteList
              items={[
                "Keep digits next to the element: CO2, not C O 2.",
                "This works in question text, options, paragraphs, and sub-questions.",
                "Existing questions already in the bank are formatted on screen even if they were saved as CO2.",
                "Ordinary words and plain numbers are left unchanged, for example 342 u.",
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle id="italic-g">How to write italic g</SectionTitle>
        <Card>
          <CardHeader>
            <CardTitle>Printed Times italic g (gravity)</CardTitle>
            <CardDescription>
              A normal keyboard g does not match the exam booklet. Wrap the letter in stars so the paper uses Times italic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-4 text-sm leading-6">
              <p>
                Type <code className="rounded bg-background px-1 py-0.5">*g*</code> in the question, option, paragraph, or Excel cell.
              </p>
              <p className="mt-2">
                You can also type <code className="rounded bg-background px-1 py-0.5">&lt;i&gt;g&lt;/i&gt;</code>.
              </p>
              <p className="mt-2">
                Do not type a plain <code className="rounded bg-background px-1 py-0.5">g</code> if you need the printed look. Plain g stays a normal letter (also used for gram).
              </p>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">What you type</th>
                    <th className="px-3 py-2 font-medium">What is shown</th>
                    <th className="px-3 py-2 font-medium">Use for</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">g</td>
                    <td className="px-3 py-2 font-medium">g</td>
                    <td className="px-3 py-2 text-muted-foreground">Normal letter or gram, for example 22 g CO2</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">*g*</td>
                    <td className="px-3 py-2 font-medium">
                      <ScientificText value="*g*" />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">Acceleration due to gravity, same as the printed booklet</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">&lt;i&gt;g&lt;/i&gt;</td>
                    <td className="px-3 py-2 font-medium">
                      <ScientificText value="<i>g</i>" />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">Same italic g, HTML form</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">The value of *g* is 9.8 m/s^2</td>
                    <td className="px-3 py-2 font-medium">
                      <ScientificText value="The value of *g* is 9.8 m/s^2" />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">Full sentence in a question or option</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">*F* = m*g*</td>
                    <td className="px-3 py-2 font-medium">
                      <ScientificText value="*F* = m*g*" />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">Any letter can be italic the same way</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <NoteList
              items={[
                "Put stars immediately around the letter: *g* not * g *.",
                "Works in Add Question, Excel upload, options, and paper preview / PDF / Word.",
                "Gram stays as a normal g: type 22 g, not 22 *g*.",
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle id="excel-rules">Common Excel rules</SectionTitle>
        <Card>
          <CardContent className="space-y-4 p-6">
            <NoteList
              items={[
                "Do not rename columns. Do not change column order. Do not delete required columns.",
                "classId examples: class_5, class_8, class_10, jkg, skg.",
                "subjectId examples: science, maths, english, chemistry, physics.",
                "topicId is the topic name or an existing topic id. Create the topic first if it is new.",
                "difficulty must be easy, medium, or hard.",
                "marks must be greater than 0. The add-question form defaults to 4.",
                "MCQ correctAnswer must be A, B, C, D, or E. If you do not know it yet, put A and review later.",
                "Short answer and long answer can leave correctAnswer blank.",
                "Use .xlsx or .xls. Image question types also need a ZIP of images.",
              ]}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Class IDs</p>
                <div className="flex flex-wrap gap-1.5">
                  {CLASSES.map((item) => (
                    <Badge key={item.id} variant="secondary">
                      {item.id}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Subject IDs</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.map((item) => (
                    <Badge key={item.id} variant="secondary">
                      {item.id}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle id="samples">Sample files</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {SAMPLE_FILES.map((sample) => (
            <Card key={sample.file}>
              <CardHeader>
                <CardTitle className="text-base">{sample.title}</CardTitle>
                <CardDescription>{sample.use}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => downloadFile(sample.file, sample.name)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle id="question-types">Question types and examples</SectionTitle>

        <Card>
          <CardHeader>
            <CardTitle>1. Text MCQ</CardTitle>
            <CardDescription>type = mcq_text. At least two options. Option E is optional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock>
{`classId, subjectId, topicId, type, difficulty, marks, negativeMarks, text, optionA, optionB, optionC, optionD, correctAnswer

class_9, chemistry, Atoms and Molecules, mcq_text, easy, 1, 0, Which pair contains equal numbers of molecules?, 22 g CO2 and 18 g H2O, 44 g CO2 and 18 g H2O, 32 g O2 and 44 g CO2, 2 g H2 and 32 g O2, B`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Image MCQ</CardTitle>
            <CardDescription>type = mcq_image. Excel + ZIP. Image names must match files in the ZIP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock>
{`questionText: Identify the part marked X in the diagram.
questionImage: plant_diagram_1.png
optionAText: Root
optionBText: Stem
optionCText: Leaf
optionDText: Flower
correctAnswer: C`}
            </CodeBlock>
            <p className="text-sm text-muted-foreground">
              Do not put both option text and an option image on the same option. Use one or the other.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Short / long answer</CardTitle>
            <CardDescription>type = short_answer or long_answer. correctAnswer is optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock>
{`type: short_answer
text: Name the process by which plants make food.
correctAnswer: Photosynthesis`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Paragraph / passage</CardTitle>
            <CardDescription>
              question_type = paragraph. Same paragraph_group_id for every sub-question of that passage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock>
{`question_type: paragraph
paragraph_group_id: P1
instruction_text: Read the passage and answer the questions.
paragraph: Plants are living things. They need air, water, and sunlight to grow.
sub_question_id: 1
sub_question_type: mcq
sub_question_text: What do plants need to grow?
option_A: Air, water, and sunlight
correct_answer: A`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Image with sub-questions</CardTitle>
            <CardDescription>
              type = image_subquestions. Same question_group_id and questionImage for the group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock>
{`type: image_subquestions
question_group_id: IMG1
questionImage: plant_lifecycle.png
instructionText: Observe the image and answer the following questions.
subQuestionId: 1
subQuestionText: What stage comes after seed?
correctAnswer: A`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to split a mixed PDF / DOCX</CardTitle>
          </CardHeader>
          <CardContent>
            <NoteList
              items={[
                "Text question + text options only → Text MCQ template",
                "Single diagram / chart / visual MCQ → Image MCQ template",
                "One image with several questions → Image + sub-questions template",
                "Passage + related questions → Paragraph template",
                "Written answer → Short / long answer template",
                "PDF filename can be used as the topic name, for example 1. Plants.pdf → Plants",
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle id="topics">Topics</SectionTitle>
        <Card>
          <CardContent className="space-y-3 p-6">
            <NoteList
              items={[
                "Create topics from Topics before uploading questions that use a new topic name.",
                "If Excel has a new topic, upload stops until that topic is added, then upload again.",
                "Topic bulk Excel columns: class, subject, topic. Example: Class 8, Science, Force and Pressure.",
                "Topics are unique per class + subject + name.",
              ]}
            />
            <Button asChild variant="outline">
              <Link href="/dashboard/topics">
                <Tags className="mr-2 h-4 w-4" />
                Open Topics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle id="converters">PDF Converter and DOCX to Excel</SectionTitle>
        <Card>
          <CardContent className="space-y-3 p-6">
            <NoteList
              items={[
                "PDF Converter accepts PDF files up to 50 MB.",
                "After conversion you can download DOCX, page images, and Excel packages.",
                "DOCX to Excel also has a 50 MB limit. Choose class, subject, topic, and difficulty before converting.",
                "Converted Excel still needs a review: set type, options, and correctAnswer before Question Bank upload.",
                "Use the PDF filename as the topic when a matching topic does not already exist.",
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/pdf-converter">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  PDF Converter
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/docx-to-excel">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  DOCX to Excel
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle id="question-bank">Question Bank</SectionTitle>
        <Card>
          <CardContent className="p-6">
            <NoteList
              items={[
                "Filter by class, subject, topic, type, difficulty, and created date.",
                "Mark as used tags questions that already appeared in a paper.",
                "Clear Usage removes those tags from selected questions.",
                "Show mismatches finds mcq_text questions that also have option images so you can convert them to Image MCQ.",
                "Bulk Edit can update marks, difficulty, or topic for selected rows.",
                "Delete asks for confirmation. Deleted questions are removed from the live bank.",
                "Export downloads the current filtered set using the same Excel columns as upload.",
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle id="papers">Papers and OMR</SectionTitle>
        <Card>
          <CardContent className="p-6">
            <NoteList
              items={[
                "Paper Generator builds sections by subject, topic, marks, and question type.",
                "OMR sheets are generated at print time from the paper. No stored OMR template files are required.",
                "The OMR title uses the paper class, for example OMR SHEET Class 9. It does not say 9th to 10th.",
                "Roll number column count is set in Preview Settings (1 to 4, default 3).",
                "A, B, C, D bubbles print once at the start of each OMR column.",
                "The OMR header uses the current academic year (April–March).",
                "Download OMR as PDF or Word from the paper screen.",
                "Students can open assigned papers from My Papers.",
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle id="users">Users and Settings</SectionTitle>
        <Card>
          <CardContent className="p-6">
            <NoteList
              items={[
                "Roles: master, administrative, teacher, student.",
                "Master, administrative, and teacher can manage questions, topics, papers, converters, and users.",
                "Students see My Papers, Papers, and Settings.",
                "New users get a role default password: Administrative@123, Teacher@123, Student@123. Change it from Settings or Set Password.",
                "Login email is trimmed and is not case-sensitive.",
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle id="checklist">Final review checklist</SectionTitle>
        <Card>
          <CardContent className="p-6">
            <NoteList
              items={[
                "Every row has classId, subjectId, and topicId.",
                "type or question_type is correct for that template.",
                "MCQ rows have options A–D and a correctAnswer of A/B/C/D/E.",
                "Formulas are written as CO2, H2O, Al2(SO4)3, or with braces when needed.",
                "Italic gravity g is written as *g*, not a plain g.",
                "Image filenames exactly match files inside the ZIP.",
                "Paragraph rows share paragraph_group_id. Image sub-questions share question_group_id.",
                "New topics were added from Topics before upload.",
                "No required cell is empty and no column was renamed.",
              ]}
            />
            <div className="mt-4">
              <Button asChild>
                <Link href="/dashboard/questions/new">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Go to Add Question
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
