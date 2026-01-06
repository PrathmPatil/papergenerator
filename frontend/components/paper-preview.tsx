"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText } from "lucide-react";
import type { PaperConfig } from "@/lib/types";
import html2pdf from "html2pdf.js"

interface PaperPreviewProps {
  config: PaperConfig;
}

export function PaperPreview({ config }: PaperPreviewProps) {
  console.log(config);
  return (
    <div className="space-y-4">
      {/* PDF Print Preview */}
      <div
        className="bg-white text-black shadow-lg rounded border p-8 space-y-6 font-serif"
        style={{ minHeight: "400px" }}
        id="paper-preview"
      >
        {/* Header */}
        <div className="border-b border-black pb-4 text-center">
          <h1 className="text-lg font-bold uppercase tracking-wide">
            {config.title}
          </h1>
          {config.code && (
            <p className="text-xs mt-1 font-mono">CODE: {config.code}</p>
          )}
          <div className="flex justify-between text-xs mt-3 font-mono">
            <span>Class: {config.classLevel}</span>
            <span>Time: {config.durationMinutes} min</span>
            <span>Max. Marks: {config.totalMarks}</span>
          </div>
          {config.examDate && (
            <p className="text-xs mt-2">
              Date: {config.examDate}{" "}
              {config.examTime && `| Time: ${config.examTime}`}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div>
          <h3 className="font-bold text-xs mb-2 uppercase">
            INSTRUCTIONS FOR STUDENTS:
          </h3>
          <ol className="text-xs space-y-1 ml-4 list-decimal">
            <li>All the questions are compulsory.</li>
            <li>Read the instructions carefully given for each question.</li>
            <li>
              Read the four options carefully and write the correct one in the
              bracket.
            </li>
            <li>Use the space given on the last page for rough work.</li>
            {config.negativeMarking && (
              <li>
                Negative Marking: {config.sections[0]?.negativeMarks || 0}{" "}
                mark(s) for wrong answer.
              </li>
            )}
          </ol>
        </div>

        {/* Marks Distribution Table */}
        <div>
          <h3 className="font-bold text-xs mb-2">MARKS DISTRIBUTION</h3>
          <table className="w-full text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-2 py-1 text-left">
                  Section
                </th>
                <th className="border border-black px-2 py-1 text-center">
                  Total Marks
                </th>
                <th className="border border-black px-2 py-1 text-center">
                  Questions
                </th>
                <th className="border border-black px-2 py-1 text-center">
                  Positive Marks
                </th>
                {config.negativeMarking && (
                  <th className="border border-black px-2 py-1 text-center">
                    Negative Marks
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {config.sections.map((section) => (
                <tr key={section.id}>
                  <td className="border border-black px-2 py-1">
                    {section.name}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">
                    {section.marks}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">
                    {section.questionCount}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">
                    {section.positiveMarks}
                  </td>
                  {config.negativeMarking && (
                    <td className="border border-black px-2 py-1 text-center">
                      {section.negativeMarks}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="font-bold bg-gray-100">
                <td className="border border-black px-2 py-1">Total</td>
                <td className="border border-black px-2 py-1 text-center">
                  {config.totalMarks}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {config.sections.reduce((sum, s) => sum + s.questionCount, 0)}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {config.sections.reduce((sum, s) => sum + s.positiveMarks, 0)}
                </td>
                {config.negativeMarking && (
                  <td className="border border-black px-2 py-1 text-center">
                    {config.sections.reduce(
                      (sum, s) => sum + s.negativeMarks,
                      0
                    )}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sections & Questions */}
        {config.sections.map((section, sectionIndex) => (
          <div key={section.id} className="space-y-3">
            <h3 className="font-bold text-xs uppercase">
              Section {sectionIndex + 1}: {section.name}
            </h3>

            {section.instructions && (
              <p className="text-xs italic">{section.instructions}</p>
            )}

            <div className="space-y-3 ml-2">
              {section.questions && section.questions.length > 0 ? (
                section.questions.map((q: any, qIndex: number) => (
                  <div key={q.questionId} className="text-xs">
                    {/* Question text */}
                    <p className="font-bold">
                      {qIndex + 1}. {q.text}
                    </p>

                    {/* Question image (if any) */}
                    {q.media && q.media.length > 0 && (
                      <div className="my-2">
                        <img
                          src={q.media[0].url}
                          alt="question"
                          className="max-h-40 border"
                        />
                      </div>
                    )}

                    {/* Options */}
                    {q.options && q.options.length > 0 && (
                      <div className="ml-4 text-gray-700 space-y-1 flex space-x-2">
                        {q.options.map((opt: any) => (
                          <p key={opt.id}>
                            ({opt.id}) {opt.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic">
                  No questions in this section.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Options</CardTitle>
        </CardHeader>

        <CardContent className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={handleExportPDF}
          >
            <FileText className="h-4 w-4" />
            Export as PDF
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={handleExportWord}
          >
            <FileText className="h-4 w-4" />
            Export as Word
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={handleFullPreview}
          >
            <Eye className="h-4 w-4" />
            Full Preview
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={handleDownloadAnswerKey}
          >
            <Download className="h-4 w-4" />
            Download Answer Key
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================
   EXPORT AS PDF
============================ */
const handleExportPDF = async () => {
  const element = document.getElementById("paper-preview")
  if (!element) return

  const options = {
    margin: 10,
    filename: `${config.title}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }

  await html2pdf().set(options).from(element).save()
}

/* ============================
   EXPORT AS WORD (.docx)
============================ */
const handleExportWord = () => {
  const element = document.getElementById("paper-preview")
  if (!element) return

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `

  const blob = new Blob([html], {
    type: "application/msword",
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${config.title}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ============================
   FULL PREVIEW (PRINT VIEW)
============================ */
const handleFullPreview = () => {
  const element = document.getElementById("paper-preview")
  if (!element) return

  const win = window.open("", "_blank")
  if (!win) return

  win.document.write(`
    <html>
      <head>
        <title>${config.title}</title>
        <style>
          body { font-family: serif; padding: 20px; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `)

  win.document.close()
  win.focus()
}

/* ============================
   DOWNLOAD ANSWER KEY (TXT)
============================ */
const handleDownloadAnswerKey = () => {
  let content = `ANSWER KEY\n\n${config.title}\n\n`

  config.sections.forEach((section, sIndex) => {
    content += `SECTION ${sIndex + 1}: ${section.name}\n`

    section.questions.forEach((q: any, qIndex: number) => {
      const correctOption =
        q.options?.find((o: any) => o.isCorrect)?.id || "N/A"

      content += `${qIndex + 1}. ${correctOption}\n`
    })

    content += `\n`
  })

  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = `${config.title}_answer_key.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
