"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Eye, FileText } from "lucide-react"
import type { PaperConfig } from "@/lib/types"

interface PaperPreviewProps {
  config: PaperConfig
}

export function PaperPreview({ config }: PaperPreviewProps) {
  return (
    <div className="space-y-4">
      {/* PDF Print Preview */}
      <div
        className="bg-white text-black shadow-lg rounded border p-8 space-y-6 font-serif"
        style={{ minHeight: "400px" }}
      >
        {/* Header */}
        <div className="border-b border-black pb-4 text-center">
          <h1 className="text-lg font-bold uppercase tracking-wide">{config.title}</h1>
          {config.code && <p className="text-xs mt-1 font-mono">CODE: {config.code}</p>}
          <div className="flex justify-between text-xs mt-3 font-mono">
            <span>Class: {config.classLevel}</span>
            <span>Time: {config.durationMinutes} min</span>
            <span>Max. Marks: {config.totalMarks}</span>
          </div>
          {config.examDate && (
            <p className="text-xs mt-2">
              Date: {config.examDate} {config.examTime && `| Time: ${config.examTime}`}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div>
          <h3 className="font-bold text-xs mb-2 uppercase">INSTRUCTIONS FOR STUDENTS:</h3>
          <ol className="text-xs space-y-1 ml-4 list-decimal">
            <li>All the questions are compulsory.</li>
            <li>Read the instructions carefully given for each question.</li>
            <li>Read the four options carefully and write the correct one in the bracket.</li>
            <li>Use the space given on the last page for rough work.</li>
            {config.negativeMarking && (
              <li>Negative Marking: {config.sections[0]?.negativeMarks || 0} mark(s) for wrong answer.</li>
            )}
          </ol>
        </div>

        {/* Marks Distribution Table */}
        <div>
          <h3 className="font-bold text-xs mb-2">MARKS DISTRIBUTION</h3>
          <table className="w-full text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-2 py-1 text-left">Section</th>
                <th className="border border-black px-2 py-1 text-center">Total Marks</th>
                <th className="border border-black px-2 py-1 text-center">Questions</th>
                <th className="border border-black px-2 py-1 text-center">Positive Marks</th>
                {config.negativeMarking && (
                  <th className="border border-black px-2 py-1 text-center">Negative Marks</th>
                )}
              </tr>
            </thead>
            <tbody>
              {config.sections.map((section) => (
                <tr key={section.id}>
                  <td className="border border-black px-2 py-1">{section.name}</td>
                  <td className="border border-black px-2 py-1 text-center">{section.marks}</td>
                  <td className="border border-black px-2 py-1 text-center">{section.questionCount}</td>
                  <td className="border border-black px-2 py-1 text-center">{section.positiveMarks}</td>
                  {config.negativeMarking && (
                    <td className="border border-black px-2 py-1 text-center">{section.negativeMarks}</td>
                  )}
                </tr>
              ))}
              <tr className="font-bold bg-gray-100">
                <td className="border border-black px-2 py-1">Total</td>
                <td className="border border-black px-2 py-1 text-center">{config.totalMarks}</td>
                <td className="border border-black px-2 py-1 text-center">
                  {config.sections.reduce((sum, s) => sum + s.questionCount, 0)}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {config.sections.reduce((sum, s) => sum + s.positiveMarks, 0)}
                </td>
                {config.negativeMarking && (
                  <td className="border border-black px-2 py-1 text-center">
                    {config.sections.reduce((sum, s) => sum + s.negativeMarks, 0)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sample Section */}
        <div>
          <h3 className="font-bold text-xs mb-2">{config.sections[0]?.name}</h3>
          <p className="text-xs mb-2">{config.sections[0]?.instructions}</p>
          <div className="space-y-2 ml-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-xs">
                <p className="font-bold">
                  {i}. Question {i}?
                </p>
                <p className="ml-4 text-gray-600">(a) Option 1 (b) Option 2 (c) Option 3 (d) Option 4</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Options</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-2 bg-transparent">
            <FileText className="h-4 w-4" />
            Export as PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-2 bg-transparent">
            <FileText className="h-4 w-4" />
            Export as Word
          </Button>
          <Button size="sm" variant="outline" className="gap-2 bg-transparent">
            <Eye className="h-4 w-4" />
            Full Preview
          </Button>
          <Button size="sm" variant="outline" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Download Answer Key
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
