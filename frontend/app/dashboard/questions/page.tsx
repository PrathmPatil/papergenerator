"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash,
  Download,
  Filter,
  X,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { fetchAllQuestionsApi } from "@/utils/apis";
import {
  CLASSES,
  getClassNameById,
  getSubjectNameById,
  SUBJECTS,
} from "@/lib/data";
import { baseURL, debounce } from "@/hooks/common";
import { deleteQuestionApi, bulkUpdateQuestionsApi, updateQuestionApi } from "@/utils/apis";
/* ----------------------------------------
   TYPES
---------------------------------------- */
interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}
interface QuestionFilterPayload {
  search?: string;
  classId?: string;
  subjectId?: string;
  type?: string;
  difficulty?: string;
}

// Common enums
export type QuestionType =
  | "mcq_text"
  | "paragraph"
  | "short_answer"
  | "true_false"
  | "matching"
  | "long_answer"
  | "";

export type DifficultyLevel = "easy" | "medium" | "hard";

// Media interface
export interface IMedia {
  _id?: string;
  url?: string;
  alt?: string;
  mimeType?: string;
}

// MCQ Option
export interface IOption {
  _id?: string;
  id?: string;
  text?: string; // used when option has text
  mediaUrl?: string; // used when option is an image
  isCorrect?: boolean;
}

// Sub-question (for paragraph questions)
export interface ISubQuestion {
  _id?: string;
  id?: string;
  type?: QuestionType | string;
  text?: string;
  mediaUrl?: string;
  options?: IOption[];
  marks?: number;
  negativeMarks?: number;
  correctAnswer?: any;
}

// Main Question interface
export interface IQuestion {
  _id?: string;

  type: QuestionType;

  classId: string;
  subjectId: string;
  topicId: string;

  text?: string; // question text
  paragraph?: string; // for paragraph type
  media?: IMedia[];

  options?: IOption[]; // for MCQ
  subQuestions?: ISubQuestion[];

  correctAnswer?: any; // short-answer, true/false, matching
  matches?: any; // matching type

  marks?: number;
  negativeMarks?: number;

  difficulty?: DifficultyLevel;

  createdAt?: Date;

  // OCR support
  ocrText?: string;
  ocrConfidence?: number;
  needsReview?: boolean;
}

/* ----------------------------------------
   COMPONENT
---------------------------------------- */
export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  const [selectedQuestion, setSelectedQuestion] = useState<IQuestion | null>(
    null
  );
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkMarks, setBulkMarks] = useState<string>("");
  const [bulkDifficulty, setBulkDifficulty] = useState<
    "unchanged" | DifficultyLevel
  >("unchanged");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [editQuestionOpen, setEditQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(null);
  const [editMarks, setEditMarks] = useState<string>("");
  const [editDifficulty, setEditDifficulty] = useState<DifficultyLevel>("easy");
  const [isUpdatingSingle, setIsUpdatingSingle] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(Number(value));
    setCurrentPage(1); // reset to first page
  };

  /* ----------------------------------------
     FETCH QUESTIONS
  ---------------------------------------- */
  useEffect(() => {
    fetchQuestions();
  }, [
    searchDebounce,
    filterClass,
    filterSubject,
    filterType,
    filterDifficulty,
    currentPage,
    recordsPerPage,
  ]);

  const fetchQuestions = async () => {
    setIsLoading(true);

    const payload = {
      search: searchDebounce || undefined,
      classId: filterClass !== "all" ? filterClass : undefined,
      subjectId: filterSubject !== "all" ? filterSubject : undefined,
      type: filterType !== "all" ? filterType : undefined,
      difficulty: filterDifficulty !== "all" ? filterDifficulty : undefined,
      page: currentPage,
      limit: recordsPerPage,
    };

    try {
      const res: any = await fetchAllQuestionsApi(payload);

      if (res.success) {
        const safeTotalRecords =
          typeof res.totalRecords === "number" ? res.totalRecords : 0;
        const safeTotalPages =
          typeof res.totalPages === "number" ? res.totalPages : 0;

        setQuestions(res.questions);
        setTotalRecords(safeTotalRecords);
        setTotalPages(safeTotalPages);
        setSelectedQuestionIds((prev) =>
          prev.filter((id) => res.questions.some((q: IQuestion) => q._id === id))
        );
      } else {
        setQuestions([]);
        setSelectedQuestionIds([]);
      }
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ----------------------------------------
     STATS
  ---------------------------------------- */
  const stats = useMemo(() => {
    const total = questions.length;
    const totalMarks = questions.reduce((sum, q) => {
      const marks = Number(q.marks);
      return !isNaN(marks) ? sum + marks : sum;
    }, 0);
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };

    questions.forEach((q) => {
      if (
        q.difficulty &&
        (q.difficulty === "easy" ||
          q.difficulty === "medium" ||
          q.difficulty === "hard")
      ) {
        byDifficulty[q.difficulty]++;
      }
    });

    return { total, totalMarks, byDifficulty };
  }, [questions]);

  /* ----------------------------------------
     ACTIONS
  ---------------------------------------- */
  const handleView = (q: IQuestion) => {
    setSelectedQuestion(q);
    setViewModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
  if (!deletingId) return;

  try {
    const res: any = await deleteQuestionApi(deletingId);

    if (res?.success) {
      // ✅ remove from UI also (fast update)
      setQuestions((prev) => prev.filter((q) => q._id !== deletingId));
      setDeletingId(null);

      // ✅ optional: reload from backend (best)
      // fetchQuestions();  // or whatever your function is named
    } else {
      alert(res?.message || "Delete failed");
    }
  } catch (error: any) {
    console.error("Delete failed:", error);
    alert("Delete failed. Check console/network.");
  }
};

  const handleExport = (q: IQuestion) => {
    const element = document.createElement("a");
    const file = new Blob([String(q.text ?? "")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `question-${q._id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const questionTypes = [
    "mcq_text",
    "mcq_image",
    "true_false",
    "short_answer",
    "paragraph",
    "long_answer"
  ];

  /* ----------------------------------------
     UI
  ---------------------------------------- */

  const clearFilters = () => {
    setSearchTerm("");
    setSearchDebounce("");
    setFilterClass("all");
    setFilterSubject("all");
    setFilterType("all");
    setFilterDifficulty("all");
  };

  const debouncedSetSearchTerm = useMemo(
    () =>
      debounce((value: string) => {
        setSearchDebounce(value);
      }, 1000),
    []
  );

  const handleOpenEditModal = (q: IQuestion) => {
    setEditingQuestion(q);
    setEditMarks(String(q.marks ?? ""));
    setEditDifficulty((q.difficulty as DifficultyLevel) || "easy");
    setEditQuestionOpen(true);
  };

  const handleUpdateSingleQuestion = async () => {
    if (!editingQuestion?._id) {
      alert("Question id is missing.");
      return;
    }

    const parsedMarks = Number(editMarks);
    if (!Number.isFinite(parsedMarks) || parsedMarks < 0) {
      alert("Marks must be a valid non-negative number.");
      return;
    }

    try {
      setIsUpdatingSingle(true);
      const res: any = await updateQuestionApi(editingQuestion._id, {
        marks: parsedMarks,
        difficulty: editDifficulty,
      });

      if (!res?.success) {
        alert(res?.message || "Failed to update question.");
        return;
      }

      setQuestions((prev) =>
        prev.map((q) =>
          q._id === editingQuestion._id
            ? { ...q, marks: parsedMarks, difficulty: editDifficulty }
            : q
        )
      );

      setEditQuestionOpen(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error("Single question update failed", error);
      alert("Failed to update question.");
    } finally {
      setIsUpdatingSingle(false);
    }
  };

  const allVisibleSelected =
    questions.length > 0 &&
    questions.every((q) => q._id && selectedQuestionIds.includes(q._id));

  const toggleQuestionSelection = (id?: string) => {
    if (!id) return;

    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedQuestionIds((prev) =>
        prev.filter((id) => !questions.some((q) => q._id === id))
      );
      return;
    }

    setSelectedQuestionIds((prev) => {
      const set = new Set(prev);
      questions.forEach((q) => {
        if (q._id) set.add(q._id);
      });
      return Array.from(set);
    });
  };

  const resetBulkForm = () => {
    setBulkMarks("");
    setBulkDifficulty("unchanged");
  };

  const handleOpenBulkEdit = () => {
    if (selectedQuestionIds.length === 0) {
      alert("Please select at least one question.");
      return;
    }
    resetBulkForm();
    setBulkEditOpen(true);
  };

  const handleBulkUpdate = async () => {
    const parsedMarks = bulkMarks.trim() === "" ? undefined : Number(bulkMarks);
    const nextDifficulty = bulkDifficulty === "unchanged" ? undefined : bulkDifficulty;

    if (parsedMarks === undefined && !nextDifficulty) {
      alert("Please set marks and/or difficulty to update.");
      return;
    }

    if (parsedMarks !== undefined && (!Number.isFinite(parsedMarks) || parsedMarks < 0)) {
      alert("Marks must be a valid non-negative number.");
      return;
    }

    try {
      setIsBulkUpdating(true);
      const payload: {
        ids: string[];
        marks?: number;
        difficulty?: DifficultyLevel;
      } = {
        ids: selectedQuestionIds,
      };

      if (parsedMarks !== undefined) payload.marks = parsedMarks;
      if (nextDifficulty) payload.difficulty = nextDifficulty;

      const res = await bulkUpdateQuestionsApi(payload);

      if (!res?.success) {
        alert(res?.message || "Bulk update failed.");
        return;
      }

      setQuestions((prev) =>
        prev.map((q) => {
          if (!q._id || !selectedQuestionIds.includes(q._id)) return q;
          return {
            ...q,
            marks: parsedMarks !== undefined ? parsedMarks : q.marks,
            difficulty: nextDifficulty || q.difficulty,
          };
        })
      );

      setSelectedQuestionIds([]);
      setBulkEditOpen(false);
      resetBulkForm();
    } catch (error: any) {
      console.error("Bulk update failed", error);
      alert("Bulk update failed. Check console/network.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Question Bank</h2>
          <p className="text-muted-foreground">Manage and organize questions</p>
        </div>
        <Link href="/dashboard/questions/new">
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
        </Link>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard label="Total Questions" value={totalRecords} />
         <StatCard label="Records Per Page" value={recordsPerPage} />
        <StatCard label="Total Pages" value={totalPages} />
       {/*} <StatCard
          label="Medium / Hard"
          value={stats.byDifficulty.medium + stats.byDifficulty.hard}
        /> */}
      </div>

      {/* FILTERS */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex gap-2 items-center">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
          <CardTitle
            className="flex gap-2 items-center cursor-pointer"
            onClick={clearFilters}
          >
            <X className="h-4 w-4" /> clear filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-3">
          <div>
            <h3>search</h3>
            <Input
              placeholder="Search question..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                debouncedSetSearchTerm(e.target.value);
              }}
            />
          </div>
          <div>
            <h3>Class</h3>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent className="w-full">
                <SelectItem value="all">All</SelectItem>
                {CLASSES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <h3>Subject</h3>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <h3>Type</h3>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {questionTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <h3>Difficulty</h3>
            <Select
              value={filterDifficulty}
              onValueChange={setFilterDifficulty}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <div className="px-6 pt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {selectedQuestionIds.length} selected
          </p>
          <Button
            variant="outline"
            onClick={handleOpenBulkEdit}
            disabled={selectedQuestionIds.length === 0}
          >
            <Edit className="mr-2 h-4 w-4" /> Bulk Edit Marks & Difficulty
          </Button>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-center">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[...Array(6)].map((_, i) => (
                      <TableHead key={i}>
                        <div className="skeleton h-4 w-full" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {[...Array(10)].map((_, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {[...Array(6)].map((_, colIndex) => (
                        <TableCell key={colIndex}>
                          <div className="skeleton h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-4 text-center">No questions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleSelectAllVisible}
                        aria-label="Select all questions in current page"
                      />
                    </TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q) => {
                    const questionId: string = String(q._id || "");
                    return (
                      <TableRow key={questionId || `${q.text}-${q.createdAt || "row"}`}>
                        <TableCell>
                          <Checkbox
                            checked={!!questionId && selectedQuestionIds.includes(questionId)}
                            onCheckedChange={() => toggleQuestionSelection(questionId)}
                            aria-label={`Select question ${questionId}`}
                          />
                        </TableCell>
                        <TableCell className="truncate max-w-xs">
                          {q.text}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {q.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{getClassNameById(q.classId)}</TableCell>
                        <TableCell>
                          {getSubjectNameById(q?.subjectId)}
                        </TableCell>
                        <TableCell>{q.marks}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              q.difficulty === "easy"
                                ? "bg-green-100 text-green-800"
                                : q.difficulty === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {q.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(q)}>
                                <Eye className="mr-2 h-4 w-4" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEditModal(q)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(q)}>
                                <Download className="mr-2 h-4 w-4" /> Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (!questionId) return;
                                  handleDelete(String(questionId));
                                }}
                              >
                                <Trash className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableHead colSpan={8} className="text-right">
                      <div className="w-full flex items-center justify-between p-4">
                        <span className="text-sm text-muted-foreground">
                          Showing {(currentPage - 1) * recordsPerPage + 1}–
                          {Math.min(currentPage * recordsPerPage, totalRecords)}{" "}
                          of {totalRecords}
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                          >
                            Previous
                          </Button>

                          <span className="text-sm">
                            Page {currentPage} of {totalPages}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                          >
                            Next
                          </Button>

                          <Select
                            value={recordsPerPage.toString()}
                            onValueChange={handleRecordsPerPageChange}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableFooter>
              </Table>
              {/* add the pagination and record per page button also */}
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIEW MODAL */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-8xl min-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>

          {selectedQuestion && (
            <>
              {(() => {
                const selectedOptions = selectedQuestion.options || [];
                const selectedSubQuestions = selectedQuestion.subQuestions || [];
                return (
                  <>
              {/* ================= META INFO ================= */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <p>Type: {selectedQuestion.type}</p>
                <p>Class: {getClassNameById(selectedQuestion.classId)}</p>
                <p>Subject: {getSubjectNameById(selectedQuestion.subjectId)}</p>
                <p>Marks: {selectedQuestion.marks}</p>
                <p>Difficulty: {selectedQuestion.difficulty}</p>
              </div>

              {/* ================= QUESTION ================= */}
              <div className="space-y-3">
                <p className="font-medium">
                  <b>Question:</b> {selectedQuestion.text}
                </p>

                {/* QUESTION IMAGES */}
                <div className="flex flex-wrap gap-3">
                  {selectedQuestion.media
                    ?.filter((m) => !m.alt?.toLowerCase().startsWith("option_"))
                    .map((img) => (
                      <img
                        key={img._id || img.url || "question-media"}
                        src={`${baseURL || ""}${img.url || ""}`}
                        alt={img.alt}
                        className="max-h-40 rounded border"
                      />
                    ))}
                </div>
              </div>

              {/* ================= OPTIONS ================= */}
              {selectedOptions.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {selectedOptions.map((option) => {
                    const optionKey = option._id || option.id || option.text || "option";
                    const optionIdLower = String(option.id || "").toLowerCase();
                    const optionImage = selectedQuestion.media?.find(
                      (m) =>
                        m.alt?.toLowerCase() ===
                        `option_${optionIdLower}`
                    );

                    return (
                      <li
                        key={optionKey}
                        className={`flex items-center gap-4 rounded-md border p-3 ${
                          option.isCorrect ? "border-green-500 bg-green-50" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          disabled
                          checked={option.isCorrect}
                        />

                        {/* OPTION IMAGE */}
                        {optionImage && (
                          <img
                            src={`${baseURL || ""}${optionImage.url || ""}`}
                            alt={optionImage.alt}
                            className="max-h-24 rounded border"
                          />
                        )}

                        {/* OPTION TEXT */}
                        {option.text && (
                          <span className="text-sm">{option.text}</span>
                        )}

                        {!option.text && !optionImage && (
                          <span className="italic text-sm text-muted-foreground">
                            No option content
                          </span>
                        )}

                        {option.isCorrect && (
                          <span className="ml-auto text-xs rounded bg-green-100 px-2 py-1 text-green-700">
                            Correct
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* ================= PARAGRAPH TYPE ================= */}
              {selectedQuestion.type === "paragraph" && (
                <div className="mt-6 rounded bg-muted/20 p-4">
                  <h3 className="font-semibold mb-2">Paragraph</h3>
                  <p>{selectedQuestion.paragraph}</p>
                </div>
              )}

              {/* ================= SUB QUESTIONS ================= */}
              {selectedQuestion.type === "paragraph" &&
                selectedSubQuestions.length > 0 && (
                  <div className="mt-6 space-y-5">
                    <h3 className="text-lg font-semibold">Sub-Questions</h3>

                    {selectedSubQuestions.map((sq, index) => (
                      <div
                        key={sq._id || sq.id || `sub-${index}`}
                        className="rounded-lg border bg-muted/20 p-4 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-medium">
                            {index + 1}. {sq.text || "Untitled"}
                          </p>
                          <span className="text-xs text-muted-foreground capitalize">
                            {String(sq.type || "").replace("_", " ")} | Marks: {sq.marks}
                          </span>
                        </div>

                        {/* SUB MCQ */}
                        {sq.type === "mcq_text" && (sq.options || []).length > 0 && (
                          <ul className="space-y-2">
                            {(sq.options || []).map((opt, optIndex) => (
                              <li
                                key={opt._id || opt.id || `opt-${optIndex}`}
                                className="flex items-center gap-3"
                              >
                                <input
                                  type="radio"
                                  disabled
                                  checked={opt.isCorrect}
                                />
                                {opt.mediaUrl ? (
                                  <img
                                    src={baseURL+opt.mediaUrl}
                                    alt="Option"
                                    className="max-h-20 rounded border"
                                  />
                                ) : (
                                  <span>{opt.text}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* SHORT / TRUE FALSE */}
                        {(sq.type === "short_answer" ||
                          sq.type === "true_false") && (
                          <div className="text-sm">
                            <span className="font-medium">Correct Answer:</span>{" "}
                            <span className="italic text-muted-foreground">
                              {String(sq.correctAnswer ?? "N/A")}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                  </>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* BULK EDIT MODAL */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Questions</DialogTitle>
            <DialogDescription>
              Update marks and/or difficulty for {selectedQuestionIds.length} selected questions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Marks (optional)</label>
              <Input
                type="number"
                min={0}
                value={bulkMarks}
                onChange={(e) => setBulkMarks(e.target.value)}
                placeholder="Leave blank to keep existing marks"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Difficulty (optional)</label>
              <Select
                value={bulkDifficulty}
                onValueChange={(value: "unchanged" | DifficultyLevel) => setBulkDifficulty(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Keep existing</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkEditOpen(false)}
                disabled={isBulkUpdating}
              >
                Cancel
              </Button>
              <Button onClick={handleBulkUpdate} disabled={isBulkUpdating}>
                {isBulkUpdating ? "Updating..." : "Update Selected"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SINGLE EDIT MODAL */}
      <Dialog open={editQuestionOpen} onOpenChange={setEditQuestionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Edit marks and difficulty for selected question.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Marks</label>
              <Input
                type="number"
                min={0}
                value={editMarks}
                onChange={(e) => setEditMarks(e.target.value)}
                placeholder="Enter marks"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Difficulty</label>
              <Select
                value={editDifficulty}
                onValueChange={(value: DifficultyLevel) => setEditDifficulty(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditQuestionOpen(false)}
                disabled={isUpdatingSingle}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateSingleQuestion} disabled={isUpdatingSingle}>
                {isUpdatingSingle ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------------------
   SMALL STAT CARD
---------------------------------------- */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
