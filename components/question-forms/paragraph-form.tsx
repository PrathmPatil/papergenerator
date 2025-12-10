"use client"

import { useState } from "react"
import { Plus, Trash, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { MCQForm } from "./mcq-form"

export function ParagraphForm() {
  const [subQuestions, setSubQuestions] = useState([{ id: 1, isOpen: true }])

  const addSubQuestion = () => {
    setSubQuestions([...subQuestions, { id: Date.now(), isOpen: true }])
  }

  const toggleQuestion = (id: number) => {
    setSubQuestions(subQuestions.map((q) => (q.id === id ? { ...q, isOpen: !q.isOpen } : q)))
  }

  const removeQuestion = (id: number) => {
    if (subQuestions.length > 1) {
      setSubQuestions(subQuestions.filter((q) => q.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Passage / Paragraph Text</Label>
        <Textarea
          placeholder="Enter the main paragraph or comprehension passage here..."
          className="min-h-[200px] font-serif text-lg leading-relaxed"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Sub-Questions</Label>
          <Button variant="outline" size="sm" onClick={addSubQuestion}>
            <Plus className="mr-2 h-4 w-4" /> Add Sub-Question
          </Button>
        </div>

        <div className="space-y-4">
          {subQuestions.map((q, index) => (
            <Card key={q.id}>
              <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
                <div className="flex items-center gap-2 font-medium">
                  <span>Question {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleQuestion(q.id)}>
                    {q.isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(q.id)}
                    disabled={subQuestions.length <= 1}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              {q.isOpen && (
                <CardContent className="p-4 pt-6">
                  <MCQForm />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
