"use client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RECENT_PAPERS, SAMPLE_PAPER, ALL_MOCK_QUESTIONS } from "@/lib/mock-data"
import { ArrowLeft, Download, Printer, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PaperDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const paper = RECENT_PAPERS.find((p) => p.id === params.id)

  if (!paper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-2xl font-bold">Paper not found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{paper.title}</h2>
            <p className="text-muted-foreground">Generated on {paper.date}</p>
          </div>
        </div>
        <div
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
            paper.status === "Generated"
              ? "bg-green-100 text-green-800"
              : paper.status === "Draft"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-blue-100 text-blue-800",
          )}
        >
          {paper.status}
        </div>
      </div>

      <div className="flex gap-2">
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Word
        </Button>
        <Button variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paper Preview</CardTitle>
          <CardDescription>Professional exam paper format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-8 bg-white space-y-6">
            <div className="text-center border-b pb-4">
              <h3 className="text-2xl font-bold">{SAMPLE_PAPER.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Code: {SAMPLE_PAPER.code} | Class: {SAMPLE_PAPER.class} | Date: {SAMPLE_PAPER.date}
              </p>
              <p className="text-sm text-muted-foreground">Duration: {SAMPLE_PAPER.duration}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Total Marks:</strong> {SAMPLE_PAPER.totalMarks}
              </div>
              <div>
                <strong>Negative Marking:</strong> {SAMPLE_PAPER.negativeMarks}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-3">Instructions</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {SAMPLE_PAPER.instructions.map((instruction, idx) => (
                  <li key={idx}>{instruction}</li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-3">Marks Distribution</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                {SAMPLE_PAPER.sections.map((section) => (
                  <div key={section.id} className="border rounded p-3">
                    <p className="font-semibold">{section.name}</p>
                    <p className="text-muted-foreground">Questions: {section.questions.length}</p>
                    <p className="text-muted-foreground">Marks: {section.marks}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-4">All Questions</h4>
              <div className="space-y-6">
                {SAMPLE_PAPER.sections.map((section) => (
                  <div key={section.id} className="border-l-4 border-blue-500 pl-4">
                    <h5 className="font-semibold text-blue-700 mb-3">
                      {section.name} Section - {section.marks} Marks
                    </h5>
                    <div className="space-y-3">
                      {section.questions.map((question, qIdx) => {
                        // Find the full question object from ALL_MOCK_QUESTIONS
                        const fullQuestion = ALL_MOCK_QUESTIONS.find((q) => q.id === question.id)

                        return (
                          <div key={qIdx} className="bg-muted/50 rounded p-3 text-sm">
                            <div className="flex justify-between items-start">
                              <p className="font-semibold">
                                Q{qIdx + 1}: {question.text}
                              </p>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {question.marks} mark{question.marks > 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* MCQ Questions */}
                            {fullQuestion?.type === "mcq_text" && "options" in fullQuestion && (
                              <div className="mt-2 space-y-1 ml-4">
                                {fullQuestion.options.map((option) => (
                                  <div key={option.id} className="text-xs">
                                    <span className="font-semibold">({option.id}):</span> {option.text}
                                    {option.isCorrect && <span className="ml-1 text-green-700 font-bold">✓</span>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Paragraph Questions */}
                            {fullQuestion?.type === "paragraph" && "paragraphText" in fullQuestion && (
                              <div className="mt-2 ml-4">
                                <p className="text-xs italic mb-2 p-2 bg-yellow-50 rounded">
                                  {fullQuestion.paragraphText}
                                </p>
                                {"subQuestions" in fullQuestion && (
                                  <div className="space-y-2 ml-2">
                                    <p className="text-xs font-semibold">Sub-questions:</p>
                                    {fullQuestion.subQuestions.map((subQ, subIdx) => (
                                      <div key={subQ.id} className="text-xs bg-white p-2 rounded border">
                                        <p className="font-semibold">
                                          Q{qIdx}.{subIdx + 1}: {subQ.questionText || subQ.text}
                                        </p>
                                        {subQ.type === "mcq_text" && "options" in subQ && (
                                          <div className="mt-1 space-y-1 ml-3">
                                            {subQ.options.map((opt) => (
                                              <div key={opt.id} className="text-xs">
                                                <span className="font-semibold">({opt.id}):</span> {opt.text}
                                                {opt.isCorrect && (
                                                  <span className="ml-1 text-green-700 font-bold">✓</span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* True/False Questions */}
                            {fullQuestion?.type === "true_false" && "correctAnswer" in fullQuestion && (
                              <div className="mt-2 ml-4 space-y-1 text-xs">
                                <div>(A) True</div>
                                <div>(B) False</div>
                                <div className="text-green-700 font-bold">
                                  Correct Answer: {fullQuestion.correctAnswer ? "True" : "False"}
                                </div>
                              </div>
                            )}

                            {/* Matching Questions */}
                            {fullQuestion?.type === "matching" && "options" in fullQuestion && (
                              <div className="mt-2 ml-4">
                                <div className="text-xs font-semibold mb-1">Options:</div>
                                <div className="text-xs space-y-1">
                                  {fullQuestion.options.map((opt) => (
                                    <div key={opt.id}>
                                      {opt.id}. {opt.text}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Short Answer Questions */}
                            {fullQuestion?.type === "short_answer" && "correctAnswer" in fullQuestion && (
                              <div className="mt-2 ml-4 text-xs">
                                <p className="text-muted-foreground">Answer: {fullQuestion.correctAnswer}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
