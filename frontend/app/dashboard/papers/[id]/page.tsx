"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Download, Edit, Printer, Share2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { fetchPaperByIdApi } from "@/utils/apis"
import { baseURL } from "@/hooks/common"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PaperPreview, exportAsPDF, printPaper } from "@/components/paper-preview"
import { exportPaperPdfApi } from "@/utils/apis"

/* ---------------- TYPES ---------------- */

interface Option {
  id: string
  text?: string
  mediaUrl?: string
}

interface QuestionSnapshot {
  questionId: string
  type: string
  text: string
  media?: { url: string }[]
  options?: Option[]
  marks: number
  negativeMarks: number
}

interface Section {
  id: string
  name: string
  marks: number
  questions: string[]
}

interface Paper {
  _id: string
  title: string
  classId: string
  totalMarks: number
  durationMinutes: number
  sections: Section[]
  questionsSnapshot: QuestionSnapshot[]
  createdAt: string
}

// Convert paper data to PaperConfig format for PaperPreview
const convertToPaperConfig = (paper: Paper) => {
  return {
    id: paper._id,
    title: paper.title,
    code: paper._id.slice(-6), // Generate a code from ID
    classLevel: paper.classId,
    durationMinutes: paper.durationMinutes,
    totalMarks: paper.totalMarks,
    sections: paper.sections.map((section, index) => ({
      id: section.id,
      name: section.name,
      marks: section.marks,
      questions: paper.questionsSnapshot
        .filter(q => section.questions.includes(q.questionId))
        .map((q, qIndex) => ({
          questionId: q.questionId,
          text: q.text,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          options: q.options || [],
          media: q.media || []
        }))
    }))
  }
}

/* ---------------- COMPONENT ---------------- */

export default function PaperDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const paperId = params?.id as string

  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)

  const downloadPDF = async () => {
    try {
      const res: any = await exportPaperPdfApi(paperId);

      const blob = res.date; // your apiClient returns data directly, so blob is here

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const safeName = (paper?.title || "paper").replace(/[^a-z0-9]/gi, "_");
      a.download = `${safeName}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed. Check Network/Console.");
    }
  };

  // Handle PDF export using the PaperPreview component's function
  const handleExportPDF = async () => {
    if (!paper) return;
    const paperConfig = convertToPaperConfig(paper);
    await exportAsPDF(paperConfig);
  };

  // Handle Print using the PaperPreview component's function
  const handlePrint = () => {
    printPaper();
  };

  /* ---------------- FETCH PAPER ---------------- */

  useEffect(() => {
    if (!paperId) return

    const fetchPaper = async () => {
      try {
        const res = await fetchPaperByIdApi(paperId)
        if (res?.success) {
          setPaper(res.paper)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPaper()
  }, [paperId])

  /* ---------------- HELPERS ---------------- */

  const getQuestionsBySection = (section: Section) => {
    const ids = new Set(section.questions.map((id) => id.toString()));

    return (
      paper?.questionsSnapshot.filter((q) =>
        ids.has(q.questionId?.toString())
      ) || []
    );
  };

  /* ---------------- STATES ---------------- */

  if (loading) {
    return <div className="p-6 text-center">Loading paper...</div>
  }

  if (!paper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-2xl font-bold">Paper not found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">{paper.title}</h2>
            <p className="text-muted-foreground">
              Duration: {paper.durationMinutes} minutes | Total Marks: {paper.totalMarks}
            </p>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push(`/dashboard/papers/edit/${paperId}`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </Button>
        
        <Button onClick={handleExportPDF}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
        
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </div>

      {/* PAPER PREVIEW COMPONENT */}
      {paper && (
        <PaperPreview config={convertToPaperConfig(paper)} />
      )}

      {/* SUBJECT-WISE QUESTIONS */}
      <Card>
        <CardHeader>
          <CardTitle>Questions by Subject</CardTitle>
          <CardDescription>Subject-wise question breakdown</CardDescription>
        </CardHeader>

        <CardContent>
          <Accordion type="multiple" className="space-y-4">

            {paper.sections.map((section) => {
              const sectionQuestions = getQuestionsBySection(section)

              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex gap-3 items-center">
                      {section.name}
                      <Badge variant="secondary">
                        {sectionQuestions.length} Questions
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="space-y-4 pt-4">

                    {sectionQuestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No questions added for this subject.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sectionQuestions.map((q, index) => (
                          <div
                            key={q.questionId}
                            className="border rounded-md p-4 bg-muted/30"
                          >
                            {/* QUESTION HEADER */}
                            <div className="flex justify-between items-start">
                              <p className="font-medium">
                                Q{index + 1}. {q.text}
                              </p>
                              <Badge variant="outline">
                                {q.marks} Mark{q.marks > 1 ? "s" : ""}
                              </Badge>
                            </div>

                            {/* IMAGE */}
                            {q.media?.length > 0 && (
                              <div className="mt-3 flex gap-3">
                                {q.media.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={baseURL + img.url}
                                    alt="question"
                                    className="max-h-32 rounded border"
                                  />
                                ))}
                              </div>
                            )}

                            {/* OPTIONS */}
                            {q.options?.length > 0 && (
                              <div className="mt-3 ml-4 space-y-2 grid grid-cols-4">
                                {q.options.map((opt) => (
                                  <div key={opt.id} className="text-sm flex gap-2">
                                    <span className="font-semibold">({opt.id})</span>
                                    <span>{opt.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  </AccordionContent>
                </AccordionItem>
              )
            })}

          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}