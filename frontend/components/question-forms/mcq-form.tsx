"use client"

import { useEffect, useState } from "react"
import { Plus, Trash, CheckCircle2, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function MCQForm({onChange}:any) {
  const [text, setQuestionText] = useState("")
  const [options, setOptions] = useState([
    { id: "A", text: "", isCorrect: false },
    { id: "B", text: "", isCorrect: false },
    { id: "C", text: "", isCorrect: false },
    { id: "D", text: "", isCorrect: false },
  ])

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)))
  }

  const setCorrectOption = (id: string) => {
    setOptions(options.map((opt) => ({ ...opt, isCorrect: opt.id === id })))
  }

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: "", isCorrect: false }])
  }

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter((opt) => opt.id !== id))
    }
  }

  useEffect(() => {
    console.log(text, options);
    onChange({
      type: "mcq_text",
      text,
      options: options.map((opt) => ({ id: opt.id.toString(), text: opt.text, isCorrect: opt.isCorrect })),
    })
  }, [text, options])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Question Text</Label>
        <Textarea placeholder="Enter the question here..." className="min-h-[100px]" onChange={(e) => setQuestionText(e.target.value)} />
      </div>

      <div className="space-y-4">
        <Label>Options (Select the correct answer)</Label>
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-3">
            <button
              onClick={() => setCorrectOption(option.id)}
              className={cn(
                "flex-shrink-0 transition-colors hover:text-primary",
                option.isCorrect ? "text-green-600" : "text-muted-foreground",
              )}
            >
              {option.isCorrect ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
            </button>
            <div className="flex-1">
              <Input
                value={option.text}
                onChange={(e) => handleOptionChange(option.id, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className={option.isCorrect ? "border-green-500 ring-1 ring-green-500" : ""}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeOption(option.id)} disabled={options.length <= 2}>
              <Trash className="h-4 w-4 text-muted-foreground hover:text-red-500" />
            </Button>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addOption} className="mt-2 bg-transparent">
          <Plus className="mr-2 h-4 w-4" /> Add Option
        </Button>
      </div>
    </div>
  )
}
