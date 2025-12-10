"use client"

import { useState, useMemo } from "react"
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash, Download, Filter } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CLASSES, SUBJECTS, ALL_MOCK_QUESTIONS } from "@/lib/mock-data"

export default function QuestionBankPage() {
  const [filterClass, setFilterClass] = useState<string>("all")
  const [filterSubject, setFilterSubject] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [questions, setQuestions] = useState(ALL_MOCK_QUESTIONS)

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesClass = filterClass !== "all" ? q.classLevel === filterClass : true
      const matchesSubject = filterSubject !== "all" ? q.subjectId === filterSubject : true
      const matchesType = filterType !== "all" ? q.type === filterType : true
      const matchesDifficulty = filterDifficulty !== "all" ? q.difficulty === filterDifficulty : true
      const matchesSearch =
        q.type === "paragraph"
          ? q.paragraphText.toLowerCase().includes(searchTerm.toLowerCase())
          : "questionText" in q
            ? q.questionText.toLowerCase().includes(searchTerm.toLowerCase())
            : true
      return matchesClass && matchesSubject && matchesType && matchesDifficulty && matchesSearch
    })
  }, [questions, filterClass, filterSubject, filterType, filterDifficulty, searchTerm])

  const stats = useMemo(() => {
    const total = questions.length
    const byType = {} as Record<string, number>
    const byDifficulty = { easy: 0, medium: 0, hard: 0 }
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    questions.forEach((q) => {
      byType[q.type] = (byType[q.type] || 0) + 1
      byDifficulty[q.difficulty]++
    })

    return { total, byType, byDifficulty, totalMarks }
  }, [questions])

  const handleView = (question: any) => {
    setSelectedQuestion(question)
    setViewModalOpen(true)
  }

  const handleEdit = (question: any) => {
    console.log("[v0] Edit question:", question.id)
    // In a real app, navigate to edit page or open edit modal
  }

  const handleExport = (question: any) => {
    const content =
      question.type === "paragraph"
        ? `${question.paragraphText}\n\nQuestions:\n${question.subQuestions?.map((q: any) => `${q.questionText}`).join("\n")}`
        : "questionText" in question
          ? question.questionText
          : "Question details"

    const element = document.createElement("a")
    const file = new Blob([content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `question-${question.id}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    console.log("[v0] Exported question:", question.id)
  }

  const handleDelete = (questionId: string) => {
    setDeletingId(questionId)
  }

  const confirmDelete = () => {
    if (deletingId) {
      setQuestions(questions.filter((q) => q.id !== deletingId))
      setDeletingId(null)
      console.log("[v0] Deleted question:", deletingId)
    }
  }

  const questionTypes = ["mcq_text", "mcq_image", "paragraph", "true_false", "short_answer", "matching"]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Question Bank</h2>
          <p className="text-muted-foreground">Manage and organize your repository of questions.</p>
        </div>
        <Link href="/dashboard/questions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add New Question
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Questions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.totalMarks}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Marks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.byDifficulty.easy}</div>
              <p className="text-sm text-muted-foreground mt-1">Easy Questions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.byDifficulty.medium + stats.byDifficulty.hard}</div>
              <p className="text-sm text-muted-foreground mt-1">Medium/Hard</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters & Search
            </CardTitle>
            {(filterClass !== "all" ||
              filterSubject !== "all" ||
              filterType !== "all" ||
              filterDifficulty !== "all" ||
              searchTerm) && (
              <button
                onClick={() => {
                  setFilterClass("all")
                  setFilterSubject("all")
                  setFilterType("all")
                  setFilterDifficulty("all")
                  setSearchTerm("")
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search text..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {SUBJECTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Question Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {questionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace("_", " ").toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Questions ({filteredQuestions.length} of {stats.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Question</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[80px]">Class</TableHead>
                  <TableHead className="w-[80px]">Subject</TableHead>
                  <TableHead className="w-[60px]">Marks</TableHead>
                  <TableHead className="w-[70px]">Difficulty</TableHead>
                  <TableHead className="text-right w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="text-muted-foreground">No questions found matching your filters.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions.map((question) => {
                    const subject = SUBJECTS.find((s) => s.id === question.subjectId)
                    const questionText =
                      question.type === "paragraph"
                        ? (question as any).paragraphText.substring(0, 60) + "..."
                        : "questionText" in question
                          ? (question as any).questionText.substring(0, 60) + "..."
                          : "View Details"

                    return (
                      <TableRow key={question.id}>
                        <TableCell className="font-medium truncate">{questionText}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {question.type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{question.classLevel}</TableCell>
                        <TableCell className="text-sm">{subject?.name || "N/A"}</TableCell>
                        <TableCell className="text-sm font-semibold">{question.marks}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              question.difficulty === "easy"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : question.difficulty === "medium"
                                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                  : "bg-red-100 text-red-800 hover:bg-red-100"
                            }
                          >
                            {question.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleView(question)}>
                                <Eye className="mr-2 h-4 w-4" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(question)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(question)}>
                                <Download className="mr-2 h-4 w-4" /> Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer"
                                onClick={() => handleDelete(question.id)}
                              >
                                <Trash className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Question:</h3>
                <p className="text-sm bg-muted p-3 rounded">
                  {selectedQuestion.type === "paragraph"
                    ? selectedQuestion.paragraphText
                    : "questionText" in selectedQuestion
                      ? selectedQuestion.questionText
                      : "N/A"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Class:</span> {selectedQuestion.classLevel}
                </div>
                <div>
                  <span className="font-semibold">Type:</span> {selectedQuestion.type.replace(/_/g, " ")}
                </div>
                <div>
                  <span className="font-semibold">Marks:</span> {selectedQuestion.marks}
                </div>
                <div>
                  <span className="font-semibold">Difficulty:</span> {selectedQuestion.difficulty}
                </div>
              </div>
              {selectedQuestion.type === "mcq_text" && "options" in selectedQuestion && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Options:</h3>
                  <ul className="space-y-2">
                    {selectedQuestion.options.map((opt: any, idx: number) => (
                      <li key={opt.id} className="text-sm p-2 bg-muted rounded flex items-center gap-2">
                        <input type="radio" disabled checked={opt.isCorrect} />
                        {opt.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this question? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
