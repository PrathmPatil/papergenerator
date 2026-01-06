"use client"

import { useEffect, useState } from "react"
import { Plus, Trash, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { MCQForm } from "./mcq-form"

/* ================= TYPES ================= */

type Option = {
  id: string
  text?: string
  mediaUrl?: string
  isCorrect?: boolean
}

type FinalSubQuestion = {
  id: string
  type: string
  text: string
  mediaUrl?: string
  options?: Option[]
  correctAnswer?: string | boolean
  marks: number
  negativeMarks: number
}

type UISubQuestion = {
  id: number
  isOpen: boolean
  data?: any
}

type ParagraphData = {
  text: string
  paragraph: string
  subQuestions: FinalSubQuestion[]
}

type ParagraphFormProps = {
  onChange: React.Dispatch<React.SetStateAction<ParagraphData>>
}

/* ================= COMPONENT ================= */

export function ParagraphForm({ onChange }: ParagraphFormProps) {
  const [text, setText] = useState("")
  const [paragraph, setParagraph] = useState("")
  const [subQuestions, setSubQuestions] = useState<UISubQuestion[]>([
    { id: Date.now(), isOpen: true },
  ])

  /* ================= FORMAT DATA ================= */

  useEffect(() => {
    const formattedSubQuestions: FinalSubQuestion[] = subQuestions
      .map((q, index) => {
        if (!q.data) return null

        const sqId = `SQ${index + 1}`
        const d = q.data

        if (d.type === "mcq_text") {
          const correct = d.options?.find((o: any) => o.isCorrect)

          return {
            id: sqId,
            type: "mcq_text",
            text: d.text || "",
            options: d.options?.map((o: any) => ({
              id: o.id,
              text: o.text,
              mediaUrl: o.mediaUrl,
              isCorrect: o.id === correct?.id,
            })),
            correctAnswer: correct?.id,
            marks: d.marks ?? 1,
            negativeMarks: d.negativeMarks ?? 0,
          }
        }

        if (d.type === "true_false") {
          return {
            id: sqId,
            type: "true_false",
            text: d.text,
            correctAnswer: d.correctAnswer,
            marks: d.marks ?? 1,
            negativeMarks: d.negativeMarks ?? 0,
          }
        }

        if (d.type === "short_answer") {
          return {
            id: sqId,
            type: "short_answer",
            text: d.text,
            correctAnswer: d.correctAnswer,
            marks: d.marks ?? 2,
            negativeMarks: d.negativeMarks ?? 0,
          }
        }

        return null
      })
      .filter(Boolean) as FinalSubQuestion[]

    onChange({
      text,
      paragraph,
      subQuestions: formattedSubQuestions,
    })
  }, [text, paragraph, subQuestions, onChange])

  /* ================= UI HANDLERS ================= */

  const addSubQuestion = () => {
    setSubQuestions((prev) => [
      ...prev,
      { id: Date.now(), isOpen: true },
    ])
  }

  const toggleQuestion = (id: number) => {
    setSubQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, isOpen: !q.isOpen } : q
      )
    )
  }

  const removeQuestion = (id: number) => {
    if (subQuestions.length <= 1) return
    setSubQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const updateSubQuestionData = (id: number, data: any) => {
    console.log("Updating sub-question", id, data);
    setSubQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, data } : q
      )
    )
  }
  console.log("Sub-questions state:", subQuestions);
  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <div>
        <Label>Instruction Text</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div>
        <Label>Paragraph</Label>
        <Textarea
          value={paragraph}
          onChange={(e) => setParagraph(e.target.value)}
          className="min-h-[180px]"
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between">
          <Label>Sub-Questions</Label>
          <Button size="sm" variant="outline" onClick={addSubQuestion}>
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </div>

        {subQuestions.map((q, index) => (
          <Card key={q.id}>
            <div className="flex justify-between p-4 border-b">
              <span>Question {index + 1}</span>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleQuestion(q.id)}
                >
                  {q.isOpen ? <ChevronUp /> : <ChevronDown />}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={subQuestions.length <= 1}
                  onClick={() => removeQuestion(q.id)}
                >
                  <Trash className="text-red-500" />
                </Button>
              </div>
            </div>

            {/* ✅ KEEP COMPONENT MOUNTED */}
            <CardContent className={q.isOpen ? "block" : "hidden"}>
              <MCQForm
                value={q.data}
                onChange={(data: any) =>
                  updateSubQuestionData(q.id, data)
                }
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
