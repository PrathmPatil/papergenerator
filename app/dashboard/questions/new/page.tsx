"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CLASSES, SUBJECTS, TOPICS } from "@/lib/mock-data"
import type { ClassLevel } from "@/lib/types"

// Sub-components for different form types
import { MCQForm } from "@/components/question-forms/mcq-form"
import { ParagraphForm } from "@/components/question-forms/paragraph-form"
import { ImageMCQForm } from "@/components/question-forms/image-mcq-form"

export default function CreateQuestionPage() {
  const router = useRouter()
  const [selectedClass, setSelectedClass] = useState<ClassLevel | "">("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedTopic, setSelectedTopic] = useState("")
  const [questionType, setQuestionType] = useState("mcq_text")
  const [difficulty, setDifficulty] = useState("medium")
  const [marks, setMarks] = useState(1)

  const filteredSubjects = SUBJECTS.filter((s) => !selectedClass || s.classLevel === selectedClass)
  const filteredTopics = TOPICS.filter((t) => !selectedSubject || t.subjectId === selectedSubject)

  const handleSave = () => {
    // Logic to save question would go here
    console.log("Saving question...")
    router.push("/dashboard/questions")
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/questions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create New Question</h2>
          <p className="text-muted-foreground">Add a question to the master database.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Meta Data */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Classification</CardTitle>
            <CardDescription>Categorize this question</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Class Level</Label>
              <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v as ClassLevel)}>
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

            <div className="space-y-2">
              <Label>Topic</Label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Topic" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTopics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Difficulty</Label>
              <RadioGroup defaultValue="medium" value={difficulty} onValueChange={setDifficulty} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="easy" id="easy" />
                  <Label htmlFor="easy">Easy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hard" id="hard" />
                  <Label htmlFor="hard">Hard</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Marks</Label>
              <Input type="number" value={marks} onChange={(e) => setMarks(Number(e.target.value))} min={1} />
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Question Content */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Question Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={questionType} onValueChange={setQuestionType} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="mcq_text">Text MCQ</TabsTrigger>
                <TabsTrigger value="mcq_image">Image MCQ</TabsTrigger>
                <TabsTrigger value="paragraph">Paragraph</TabsTrigger>
              </TabsList>

              <TabsContent value="mcq_text">
                <MCQForm />
              </TabsContent>

              <TabsContent value="mcq_image">
                <ImageMCQForm />
              </TabsContent>

              <TabsContent value="paragraph">
                <ParagraphForm />
              </TabsContent>
            </Tabs>

            <div className="mt-8 flex justify-end gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Question</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
