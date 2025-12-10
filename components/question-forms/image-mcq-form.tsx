"use client"

import { useState } from "react"
import { Trash, Upload, ImageIcon, CheckCircle2, Circle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function ImageMCQForm() {
  const [options, setOptions] = useState([
    { id: "1", text: "", image: "", isCorrect: false, showPreview: true },
    { id: "2", text: "", image: "", isCorrect: false, showPreview: true },
    { id: "3", text: "", image: "", isCorrect: false, showPreview: true },
    { id: "4", text: "", image: "", isCorrect: false, showPreview: true },
  ])

  const setCorrectOption = (id: string) => {
    setOptions(options.map((opt) => ({ ...opt, isCorrect: opt.id === id })))
  }

  const updateOption = (id: string, field: string, value: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt)))
  }

  const togglePreview = (id: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, showPreview: !opt.showPreview } : opt)))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Question Text (Optional)</Label>
        <Textarea placeholder="Enter any text accompanying the image..." />
      </div>

      <div className="space-y-2">
        <Label>Question Image</Label>
        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-accent/50 transition-colors cursor-pointer">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs">SVG, PNG, JPG or GIF (max. 800x400px)</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Options (Image & Text Mixed)</Label>
        {options.map((option, index) => (
          <div key={option.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCorrectOption(option.id)}
                  className={cn(
                    "flex-shrink-0 transition-colors hover:text-primary",
                    option.isCorrect ? "text-green-600" : "text-muted-foreground",
                  )}
                >
                  {option.isCorrect ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                </button>
                <span className="font-medium text-sm">Option {index + 1}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash className="h-4 w-4 text-muted-foreground hover:text-red-500" />
              </Button>
            </div>

            {/* Text Input */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Option Text</Label>
              <Input
                placeholder={`Enter text for option ${index + 1}`}
                value={option.text}
                onChange={(e) => updateOption(option.id, "text", e.target.value)}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Option Image</Label>
                {option.image && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => togglePreview(option.id)}>
                    {option.showPreview ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Click to upload image for this option</p>
                </div>
              </div>

              {/* Preview image if uploaded */}
              {option.image && option.showPreview && (
                <div className="mt-2 relative h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={option.image || "/placeholder.svg"}
                    alt={`Option ${index + 1}`}
                    className="max-h-24 max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> Each option can have both text and image. Use text for short answers, images for visual
          options, or combine both for mixed-media questions.
        </p>
      </div>
    </div>
  )
}
