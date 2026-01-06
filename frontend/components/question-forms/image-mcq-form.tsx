"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ImageMCQForm({ onChange }: { onChange: Function }) {
  const [text, setText] = useState("")
  const [questionImage, setQuestionImage] = useState<File | null>(null)

  const [options, setOptions] = useState([
    { id: "A", text: "", image: null, isCorrect: false, showPreview: true },
    { id: "B", text: "", image: null, isCorrect: false, showPreview: true },
    { id: "C", text: "", image: null, isCorrect: false, showPreview: true },
    { id: "D", text: "", image: null, isCorrect: false, showPreview: true },
  ])

  /* -----------------------------
     Notify Parent on Change
  ----------------------------- */
  useEffect(() => {
    onChange({
      text,
      questionImage,
      options,
    })
  }, [text, questionImage, options])

  const setCorrectOption = (id: string) => {
    setOptions(opts =>
      opts.map(o => ({ ...o, isCorrect: o.id === id }))
    )
  }

  const updateOption = (id: string, key: string, value: any) => {
    setOptions(opts =>
      opts.map(o => (o.id === id ? { ...o, [key]: value } : o))
    )
  }

  return (
    <div className="space-y-6">

      {/* Question Text */}
      <div>
        <Label>Question Text</Label>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>

      {/* Question Image */}
      <div>
        <Label>Question Image</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={e => setQuestionImage(e.target.files?.[0] || null)}
        />
        {questionImage && (
          <img
            src={URL.createObjectURL(questionImage)}
            className="h-48 object-contain mt-2"
          />
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <Label>Options</Label>

        {options.map((opt, i) => (
          <div key={opt.id} className="border p-4 rounded-lg space-y-2">

            <div className="flex items-center gap-2">
              <button onClick={() => setCorrectOption(opt.id)}>
                {opt.isCorrect ? (
                  <CheckCircle2 className="text-green-600" />
                ) : (
                  <Circle />
                )}
              </button>
              <span>Option {opt.id}</span>
            </div>

            <Input
              placeholder="Option text (optional)"
              value={opt.text}
              onChange={e => updateOption(opt.id, "text", e.target.value)}
            />

            <Input
              type="file"
              accept="image/*"
              onChange={e =>
                updateOption(opt.id, "image", e.target.files?.[0] || null)
              }
            />

            {opt.image && opt.showPreview && (
              <img
                src={URL.createObjectURL(opt.image)}
                className="h-24 object-contain"
              />
            )}

            {opt.image && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  updateOption(opt.id, "showPreview", !opt.showPreview)
                }
              >
                {opt.showPreview ? <EyeOff /> : <Eye />}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
