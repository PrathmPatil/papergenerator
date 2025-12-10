"use client"

import { useState } from "react"
import { ChevronRight, Wand2, Save, RefreshCw, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { CLASSES, SUBJECTS, TOPICS } from "@/lib/mock-data"
import type { ClassLevel, Section } from "@/lib/types"
import { cn } from "@/lib/utils"
import { PaperPreview } from "@/components/paper-preview"

// Steps for the wizard
const STEPS = [
  { id: 1, title: "Basic Details" },
  { id: 2, title: "Topic Selection" },
  { id: 3, title: "Configuration" },
  { id: 4, title: "Preview & Export" },
]

export default function GeneratePaperPage() {
  const [currentStep, setCurrentStep] = useState(1)

  // Form State
  const [paperTitle, setPaperTitle] = useState("Unit Test 1")
  const [selectedClass, setSelectedClass] = useState<ClassLevel | "">("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  const [totalMarks, setTotalMarks] = useState(50)
  const [duration, setDuration] = useState(60)
  const [difficultyMix, setDifficultyMix] = useState([30, 50, 20]) // Easy, Medium, Hard %

  // Mock Generated Paper State
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPaper, setGeneratedPaper] = useState<any>(null)

  const filteredSubjects = SUBJECTS.filter((s) => !selectedClass || s.classLevel === selectedClass)
  const filteredTopics = TOPICS.filter((t) => !selectedSubject || t.subjectId === selectedSubject)

  const handleNext = () => {
    if (currentStep === 3) {
      generatePaper()
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const toggleTopic = (topicId: string) => {
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(selectedTopics.filter((id) => id !== topicId))
    } else {
      setSelectedTopics([...selectedTopics, topicId])
    }
  }

  const generatePaper = () => {
    setIsGenerating(true)
    // Simulate generation with realistic structure
    setTimeout(() => {
      const sections: Section[] = [
        {
          id: "eng",
          name: "English [A]",
          marks: 40,
          questionCount: 20,
          marksPerQuestion: 2,
          positiveMarks: 2,
          negativeMarks: -0.5,
          instructions: "Read the passage and answer the following questions.",
        },
        {
          id: "reasoning",
          name: "Reasoning [B]",
          marks: 16,
          questionCount: 8,
          marksPerQuestion: 2,
          positiveMarks: 2,
          negativeMarks: 0,
          instructions: "Solve the following problems.",
        },
        {
          id: "maths",
          name: "Maths [C]",
          marks: 56,
          questionCount: 28,
          marksPerQuestion: 2,
          positiveMarks: 2,
          negativeMarks: -0.5,
          instructions: "Attempt all questions.",
        },
        {
          id: "science",
          name: "Science [D]",
          marks: 48,
          questionCount: 24,
          marksPerQuestion: 2,
          positiveMarks: 2,
          negativeMarks: -1,
          instructions: "Choose the correct answer.",
        },
      ]

      setGeneratedPaper({
        config: {
          title: paperTitle,
          code: `CODE-${Date.now()}`,
          classLevel: selectedClass,
          subjectId: selectedSubject,
          topics: selectedTopics,
          totalMarks,
          durationMinutes: duration,
          sections,
          negativeMarking: true,
          examDate: new Date().toLocaleDateString(),
          instructions: "All questions are compulsory. Negative marking applies.",
        },
        questions: [],
        sectionsBreakdown: [],
      })
      setIsGenerating(false)
      setCurrentStep(4)
    }, 2000)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 h-[calc(100vh-8rem)] flex flex-col">
      {/* Wizard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Generate Paper</h2>
          <p className="text-muted-foreground">Create a structured question paper in minutes.</p>
        </div>
        <div className="flex items-center gap-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  currentStep >= step.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {step.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("mx-2 h-[2px] w-8", currentStep > step.id ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 grid gap-8 lg:grid-cols-3">
        {/* Main Configuration Area */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>Configure the parameters for this step.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Paper Title</Label>
                  <Input
                    value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    placeholder="e.g. Half Yearly Examination 2023"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select
                      value={selectedClass}
                      onValueChange={(v) => {
                        setSelectedClass(v as ClassLevel)
                        setSelectedSubject("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASSES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Total Marks</Label>
                    <Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (Minutes)</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base">Select Topics to Include</Label>
                  <Badge variant="secondary">{selectedTopics.length} Selected</Badge>
                </div>
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  <div className="space-y-4">
                    {filteredTopics.length > 0 ? (
                      filteredTopics.map((topic) => (
                        <div key={topic.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={topic.id}
                            checked={selectedTopics.includes(topic.id)}
                            onCheckedChange={() => toggleTopic(topic.id)}
                          />
                          <label
                            htmlFor={topic.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {topic.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-10">Select a Class and Subject first.</div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>Difficulty Distribution</Label>
                    <span className="text-sm text-muted-foreground">Easy / Medium / Hard</span>
                  </div>
                  <Slider
                    defaultValue={[30, 80]}
                    max={100}
                    step={5}
                    className="py-4"
                    onValueChange={(val) => setDifficultyMix([val[0], val[1] - val[0], 100 - val[1]])}
                  />
                  <div className="flex justify-between text-xs text-center">
                    <div className="w-1/3 p-2 bg-green-100 text-green-800 rounded">{difficultyMix[0]}% Easy</div>
                    <div className="w-1/3 p-2 bg-yellow-100 text-yellow-800 rounded mx-2">
                      {difficultyMix[1]}% Medium
                    </div>
                    <div className="w-1/3 p-2 bg-red-100 text-red-800 rounded">{difficultyMix[2]}% Hard</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Question Types Mix</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between border p-3 rounded-md">
                      <span className="text-sm">MCQ (Text/Image)</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between border p-3 rounded-md">
                      <span className="text-sm">Paragraph Based</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between border p-3 rounded-md">
                      <span className="text-sm">Short Answer</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between border p-3 rounded-md">
                      <span className="text-sm">Long Answer</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && generatedPaper && <PaperPreview config={generatedPaper.config} />}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isGenerating}>
              Back
            </Button>
            {currentStep === 4 ? (
              <div className="flex gap-2">
                <Button variant="outline">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button>
                  <Save className="mr-2 h-4 w-4" /> Save & Export
                </Button>
              </div>
            ) : (
              <Button onClick={handleNext} disabled={isGenerating}>
                {isGenerating ? (
                  <>Generating...</>
                ) : currentStep === 3 ? (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Generate Paper
                  </>
                ) : (
                  <>
                    <ChevronRight className="mr-2 h-4 w-4" /> Next
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Live Summary Sidebar */}
        <Card className="h-fit bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Blueprint Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Title:</span>
              <span className="font-medium text-right">{paperTitle || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Class:</span>
              <span className="font-medium">{selectedClass || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject:</span>
              <span className="font-medium">{filteredSubjects.find((s) => s.id === selectedSubject)?.name || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Marks:</span>
              <span className="font-medium">{totalMarks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Topics:</span>
              <span className="font-medium">{selectedTopics.length} selected</span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>Est. Questions: ~{(totalMarks / 2.5).toFixed(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
