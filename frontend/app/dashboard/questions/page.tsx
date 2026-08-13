"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  Calendar,
  RotateCcw,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

import { downloadQuestionBankExcelApi, fetchAllQuestionsApi, fetchTopicsApi, getQuestionByIdApi } from "@/utils/apis";
import {
  CLASSES,
  getClassNameById,
  getSubjectNameById,
  SUBJECTS,
} from "@/lib/data";
import { baseURL, debounce } from "@/hooks/common";
import {
  deleteQuestionApi,
  bulkUpdateQuestionsApi,
  bulkDeleteQuestionsApi,
  updateQuestionApi,
  bulkClearQuestionUsageApi,
  rebuildQuestionUsageApi,
} from "@/utils/apis";
import { showConfirm, showInfo } from "@/components/app-dialog-provider";
/* ----------------------------------------
   TYPES
---------------------------------------- */
interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

type EditSubQuestionOption = {
  id: string;
  text: string;
  mediaUrl?: string;
  isCorrect: boolean;
  imageFile?: File | null;
  imagePreviewUrl?: string;
};

type EditSubQuestion = {
  id: string;
  type: Exclude<QuestionType, ""> | string;
  text: string;
  mediaUrl?: string;
  correctAnswer: string;
  marks: string;
  negativeMarks: string;
  options: EditSubQuestionOption[];
  imageFile?: File | null;
  imagePreviewUrl?: string;
};
interface QuestionFilterPayload {
  search?: string;
  classId?: string;
  subjectId?: string;
  topicId?: string;
  type?: string;
  difficulty?: string;
  createdFrom?: string;
  createdTo?: string;
}

type TopicOption = {
  _id?: string;
  id?: string;
  name: string;
  classId: string;
  subjectId: string;
  nameLower?: string;
};

// Common enums
export type QuestionType =
  | "mcq_text"
  | "mcq_image"
  | "paragraph"
  | "image_subquestions"
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

interface IEditOption extends IOption {
  imageFile?: File | null;
  imagePreviewUrl?: string;
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
  usageCount?: number;
  lastUsedAt?: Date | string | null;
  hasOptionMedia?: boolean;
  needsTypeReview?: boolean;
}

/* ----------------------------------------
   COMPONENT
---------------------------------------- */
export default function QuestionBankPage() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterCreatedFrom, setFilterCreatedFrom] = useState("");
  const [filterCreatedTo, setFilterCreatedTo] = useState("");
  const [reviewTextMcqWithImages, setReviewTextMcqWithImages] = useState(false);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const fromDatePickerRef = useRef<HTMLInputElement | null>(null);
  const toDatePickerRef = useRef<HTMLInputElement | null>(null);

  const [selectedQuestion, setSelectedQuestion] = useState<IQuestion | null>(
    null
  );
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkMarks, setBulkMarks] = useState<string>("");
  const [bulkDifficulty, setBulkDifficulty] = useState<
    "unchanged" | DifficultyLevel
  >("unchanged");
  const [bulkTopicId, setBulkTopicId] = useState("unchanged");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isClearingUsage, setIsClearingUsage] = useState(false);
  const [isRebuildingUsage, setIsRebuildingUsage] = useState(false);
  const [editQuestionOpen, setEditQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionParagraph, setEditQuestionParagraph] = useState("");
  const [editQuestionImageFile, setEditQuestionImageFile] = useState<File | null>(null);
  const [editQuestionImagePreviewUrl, setEditQuestionImagePreviewUrl] = useState("");
  const [editQuestionImageUrl, setEditQuestionImageUrl] = useState("");
  const [editOptions, setEditOptions] = useState<IEditOption[]>([]);
  const [editSubQuestions, setEditSubQuestions] = useState<EditSubQuestion[]>([]);
  const [editQuestionAnswer, setEditQuestionAnswer] = useState("");
  const [editMarks, setEditMarks] = useState<string>("");
  const [editDifficulty, setEditDifficulty] = useState<DifficultyLevel>("easy");
  const [editTopicId, setEditTopicId] = useState("");
  const [isUpdatingSingle, setIsUpdatingSingle] = useState(false);
  const [isLoadingEditQuestion, setIsLoadingEditQuestion] = useState(false);

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
    filterTopic,
    filterType,
    filterDifficulty,
    filterCreatedFrom,
    filterCreatedTo,
    reviewTextMcqWithImages,
    currentPage,
    recordsPerPage,
  ]);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        setTopicsLoading(true);
        const res: any = await fetchTopicsApi({
          ...(filterClass !== "all" ? { classId: filterClass } : {}),
          ...(filterSubject !== "all" ? { subjectId: filterSubject } : {}),
        });
        setTopics(Array.isArray(res?.topics) ? res.topics : []);
      } catch (error) {
        console.error("Failed to load topics", error);
        setTopics([]);
      } finally {
        setTopicsLoading(false);
      }
    };

    loadTopics();
  }, [filterClass, filterSubject]);

  useEffect(() => {
    if (filterTopic === "all") return;
    const hasTopic = topics.some((topic) => String(topic._id || topic.id) === filterTopic);
    if (!hasTopic) {
      setFilterTopic("all");
    }
  }, [filterTopic, topics]);

  const getTopicNameById = (topicId?: string) => {
    const rawTopicId = String(topicId || "").trim();
    if (!rawTopicId) return "No topic";

    const normalizeTopicName = (value: string) =>
      String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    const normalizedTopicId = normalizeTopicName(rawTopicId);
    const topic = topics.find((item) => {
      const id = String(item._id || item.id || "");
      return (
        id === rawTopicId ||
        item.name === rawTopicId ||
        item.nameLower === normalizedTopicId ||
        normalizeTopicName(item.name) === normalizedTopicId
      );
    });

    return topic?.name || rawTopicId;
  };

  const isValidDisplayDate = (value: string) =>
    !value.trim() || /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(value.trim());

  const displayDateToIso = (value: string) => {
    const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  };

  const isoDateToDisplay = (value: string) => {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  };

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  };

  const buildQuestionFilterPayload = (overrides: Record<string, any> = {}) => ({
    search: searchDebounce || undefined,
    classId: filterClass !== "all" ? filterClass : undefined,
    subjectId: filterSubject !== "all" ? filterSubject : undefined,
    topicId: filterTopic !== "all" ? filterTopic : undefined,
    type: reviewTextMcqWithImages
      ? "mcq_text"
      : filterType !== "all"
        ? filterType
        : undefined,
    difficulty: filterDifficulty !== "all" ? filterDifficulty : undefined,
    createdFrom: isValidDisplayDate(filterCreatedFrom) ? filterCreatedFrom || undefined : undefined,
    createdTo: isValidDisplayDate(filterCreatedTo) ? filterCreatedTo || undefined : undefined,
    textMcqWithOptionImages: reviewTextMcqWithImages || undefined,
    ...overrides,
  });

  const hasCreatedDateFilter = Boolean(filterCreatedFrom.trim() || filterCreatedTo.trim());

  const saveBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const safeFilePart = (value: string, fallback: string) =>
    String(value || fallback)
      .trim()
      .replace(/[^A-Za-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || fallback;

  const handleDownloadFilteredExcel = async () => {
    const missingFilters =
      hasCreatedDateFilter || reviewTextMcqWithImages
        ? []
        : [
            filterClass === "all" ? "Class" : "",
            filterSubject === "all" ? "Subject" : "",
            filterTopic === "all" ? "Topic" : "",
          ].filter(Boolean);

    if (missingFilters.length > 0) {
      showInfo({
        title: "Select all filters",
        description: `Choose ${missingFilters.join(", ")} before downloading the Excel template.`,
        variant: "destructive",
      });
      return;
    }

    if (!isValidDisplayDate(filterCreatedFrom) || !isValidDisplayDate(filterCreatedTo)) {
      showInfo({
        title: "Invalid date format",
        description: "Use DD/MM/YYYY for From Date and To Date.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloadingExcel(true);
      const blob = await downloadQuestionBankExcelApi(buildQuestionFilterPayload());
      const topicName = getTopicNameById(filterTopic);
      saveBlob(
        blob,
        [
          safeFilePart(filterClass, "class"),
          safeFilePart(filterSubject, "subject"),
          safeFilePart(topicName, "topic"),
          safeFilePart(filterType === "all" ? "all_types" : filterType, "questions"),
          safeFilePart(filterDifficulty === "all" ? "all_difficulties" : filterDifficulty, "difficulty"),
          safeFilePart(filterCreatedFrom || "all_dates", "from"),
          safeFilePart(filterCreatedTo || filterCreatedFrom || "all_dates", "to"),
        ].join("_") + ".xlsx"
      );
    } catch (error: any) {
      console.error("Question Bank Excel download failed", error);
      showInfo({
        title: "Excel download failed",
        description: error?.message || "Unable to download the filtered Excel file.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const addWrappedText = (
    pdf: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    pageHeight: number
  ) => {
    const lines = pdf.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (y > pageHeight - 15) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(line, x, y);
      y += lineHeight;
    });
    return y;
  };

  const handleDownloadFilteredPdf = async () => {
    if (!isValidDisplayDate(filterCreatedFrom) || !isValidDisplayDate(filterCreatedTo)) {
      showInfo({
        title: "Invalid date format",
        description: "Use DD/MM/YYYY for From Date and To Date.",
        variant: "destructive",
      });
      return;
    }

    if (!hasCreatedDateFilter && (filterClass === "all" || filterSubject === "all")) {
      const confirmed = await showConfirm({
        title: "Large PDF export",
        description: "Class or Subject is set to All. This PDF may include many questions. Do you want to continue?",
        confirmText: "Download",
      });
      if (!confirmed) return;
    }

    try {
      setIsDownloadingPdf(true);
      const pdfLimit = Math.max(totalRecords || recordsPerPage || 1000, 1000);
      const res: any = await fetchAllQuestionsApi(
        buildQuestionFilterPayload({ page: 1, limit: pdfLimit })
      );

      if (!res?.success || !Array.isArray(res.questions) || res.questions.length === 0) {
        showInfo({
          title: "No questions found",
          description: "No questions match the selected filters.",
        });
        return;
      }

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const maxWidth = pageWidth - marginX * 2;
      let y = 12;

      const className = filterClass === "all" ? "All Classes" : getClassNameById(filterClass);
      const subjectName =
        filterSubject === "all" ? "All Subjects" : getSubjectNameById(filterSubject);
      const topicName = filterTopic === "all" ? "All Topics" : getTopicNameById(filterTopic);
      const typeName = filterType === "all" ? "All Types" : filterType.replace(/_/g, " ");
      const difficultyName =
        filterDifficulty === "all" ? "All Difficulty" : filterDifficulty;
      const createdDateName = filterCreatedFrom
        ? filterCreatedTo
          ? `${filterCreatedFrom} to ${filterCreatedTo}`
          : filterCreatedFrom
        : filterCreatedTo
          ? `Until ${filterCreatedTo}`
          : "All Dates";

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("Question Bank", marginX, y);
      y += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      y = addWrappedText(pdf, `Class: ${className} | Subject: ${subjectName} | Topic: ${topicName}`, marginX, y, maxWidth, 4, pageHeight);
      y = addWrappedText(pdf, `Type: ${typeName} | Difficulty: ${difficultyName}`, marginX, y, maxWidth, 4, pageHeight);
      y = addWrappedText(pdf, `Created: ${createdDateName}`, marginX, y, maxWidth, 4, pageHeight);
      if (searchDebounce) {
        y = addWrappedText(pdf, `Search: ${searchDebounce}`, marginX, y, maxWidth, 4, pageHeight);
      }
      y = addWrappedText(
        pdf,
        `Total Questions: ${res.questions.length}`,
        marginX,
        y,
        maxWidth,
        4,
        pageHeight
      );
      y += 2;

      const columns = [
        { key: "no", label: "No.", width: 10 },
        { key: "question", label: "Question", width: 142 },
        { key: "options", label: "Options", width: 103 },
        { key: "correct", label: "Correct", width: 22 },
      ];
      const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
      const rowLineHeight = 3.8;
      const cellPadding = 1.6;
      const headerHeight = 8;
      const minRowHeight = 8;
      const pageTop = 12;
      const pageBottom = 10;

      type PdfImage = {
        dataUrl: string;
        width: number;
        height: number;
        label?: string;
      };

      const toPdfText = (value: unknown) =>
        String(value ?? "")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .replace(/\r\n?/g, "\n")
          .replace(/[ \t\f\v]+/g, " ")
          .trim();

      const wrapTextForCell = (value: unknown, width: number) => {
        const maxTextWidth = Math.max(1, width - cellPadding * 2);
        const text = toPdfText(value);
        if (!text) return [""];

        return text
          .split(/\n+/)
          .flatMap((line) => pdf.splitTextToSize(line, maxTextWidth))
          .map((line: string) => String(line || "").trimEnd());
      };

      const drawCellText = (
        lines: string[],
        x: number,
        top: number,
        width: number
      ) => {
        lines.forEach((line, index) => {
          if (!line) return;
          pdf.text(
            line,
            x + cellPadding,
            top + cellPadding + 2.4 + index * rowLineHeight,
            { maxWidth: width - cellPadding * 2 }
          );
        });
      };

      const getOptionText = (option: any, id: string) => {
        if (!option) return "";
        if (typeof option === "string" || typeof option === "number") {
          return String(option);
        }

        const values = [
          option.text,
          option.value,
          option.optionText,
          option.label,
          option.answer,
        ];

        return values.map((value) => String(value || "").trim()).find(Boolean) || "";
      };

      const getMediaSrc = (url?: string) => {
        const value = String(url || "").trim();
        if (!value) return "";
        if (/^data:/i.test(value) || /^https?:\/\//i.test(value)) return value;
        if (baseURL) return `${String(baseURL).replace(/\/$/, "")}${value.startsWith("/") ? "" : "/"}${value}`;
        if (typeof window !== "undefined" && value.startsWith("/")) {
          return `${window.location.origin}${value}`;
        }
        return value;
      };

      const readBlobAsDataUrl = (blob: Blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

      const getImageDimensions = (dataUrl: string) =>
        new Promise<{ width: number; height: number }>((resolve) => {
          const image = new Image();
          image.onload = () => {
            resolve({
              width: image.naturalWidth || image.width || 1,
              height: image.naturalHeight || image.height || 1,
            });
          };
          image.onerror = () => resolve({ width: 1, height: 1 });
          image.src = dataUrl;
        });

      const normalizeImageDataUrlForPdf = (dataUrl: string) =>
        new Promise<string>((resolve) => {
          if (/^data:image\/(?:png|jpe?g)/i.test(dataUrl)) {
            resolve(dataUrl);
            return;
          }

          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth || image.width || 1;
            canvas.height = image.naturalHeight || image.height || 1;
            const context = canvas.getContext("2d");
            if (!context) {
              resolve(dataUrl);
              return;
            }
            context.drawImage(image, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          };
          image.onerror = () => resolve(dataUrl);
          image.src = dataUrl;
        });

      const loadPdfImage = async (url?: string, label?: string): Promise<PdfImage | null> => {
        const src = getMediaSrc(url);
        if (!src) return null;

        try {
          const rawDataUrl = /^data:/i.test(src)
            ? src
            : await fetch(src).then(async (response) => {
                if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
                return readBlobAsDataUrl(await response.blob());
              });
          const dataUrl = await normalizeImageDataUrlForPdf(rawDataUrl);
          const dimensions = await getImageDimensions(dataUrl);
          return { dataUrl, label, ...dimensions };
        } catch (error) {
          console.warn("Question bank PDF image skipped", { src, error });
          return null;
        }
      };

      const getQuestionMedia = (source: any) => {
        const media = Array.isArray(source?.media) ? source.media : [];
        const questionImages = media
          .filter((item: any) => !String(item?.alt || "").toLowerCase().startsWith("option_"))
          .map((item: any) => ({ url: item?.url, label: "" }));

        if (source?.mediaUrl) {
          questionImages.push({ url: source.mediaUrl, label: "" });
        }

        return questionImages;
      };

      const getOptionMedia = (source: any) => {
        const options = Array.isArray(source?.options) ? source.options : [];
        const media = Array.isArray(source?.media) ? source.media : [];

        return (["A", "B", "C", "D"] as const)
          .flatMap((id) => {
            const optionIndex = id.charCodeAt(0) - 65;
            const option =
              options.find((item: any) => String(item?.id || "").trim().toUpperCase() === id) ||
              options[optionIndex];
            const optionMedia = media.find(
              (item: any) => String(item?.alt || "").trim().toLowerCase() === `option_${id.toLowerCase()}`
            );
            const url = option?.mediaUrl || option?.image?.url || option?.url || optionMedia?.url;
            return url ? [{ url, label: id }] : [];
          });
      };

      const loadPdfImages = async (items: { url?: string; label?: string }[]) => {
        const images = await Promise.all(
          items.map((item) => loadPdfImage(item.url, item.label))
        );
        return images.filter(Boolean) as PdfImage[];
      };

      const getPdfImageFormat = (dataUrl: string) => {
        if (/^data:image\/jpe?g/i.test(dataUrl)) return "JPEG";
        return "PNG";
      };

      const getOptionValue = (source: any, id: "A" | "B" | "C" | "D") => {
        const options = Array.isArray(source?.options) ? source.options : [];
        const optionIndex = id.charCodeAt(0) - 65;
        const matchingOption =
          options.find((item: any) => String(item?.id || "").trim().toUpperCase() === id) ||
          options[optionIndex];

        const optionText = getOptionText(matchingOption, id);
        if (optionText) return optionText;

        const fallbackKeys = [
          `option${id}`,
          `option_${id}`,
          `option${id}Text`,
          `option_${id}_text`,
          `option${id.toLowerCase()}`,
          `option_${id.toLowerCase()}`,
        ];

        return (
          fallbackKeys
            .map((key) => String(source?.[key] || "").trim())
            .find(Boolean) || id
        );
      };

      const getCorrectAnswer = (question: IQuestion | ISubQuestion) => {
        const options = Array.isArray(question.options) ? question.options : [];
        const correctOptions = options
          .filter((option) => option.isCorrect)
          .map((option) => String(option.id || "").toUpperCase())
          .filter(Boolean);

        if (correctOptions.length > 0) return correctOptions.join(", ");
        if (question.correctAnswer !== undefined && question.correctAnswer !== null) {
          return String(question.correctAnswer);
        }
        return "";
      };

      const drawTableHeader = () => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);
        let x = marginX;
        columns.forEach((column) => {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(x, y, column.width, headerHeight, "F");
          pdf.rect(x, y, column.width, headerHeight, "S");
          pdf.text(column.label, x + cellPadding, y + 5);
          x += column.width;
        });
        y += headerHeight;
      };

      const ensureSpace = (height: number) => {
        if (y + height <= pageHeight - pageBottom) return;
        pdf.addPage();
        y = pageTop;
        drawTableHeader();
      };

      const drawTopicTitle = (name: string) => {
        ensureSpace(11);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);
        pdf.setFillColor(220, 230, 242);
        pdf.rect(marginX, y, tableWidth, 7, "F");
        pdf.text(`Topic: ${name}`, marginX + 2, y + 4.8);
        y += 7;
        drawTableHeader();
      };

      const drawQuestionRow = (row: {
        no: string;
        question: string;
        options: string;
        correct: string;
        questionImages?: PdfImage[];
        optionImages?: PdfImage[];
      }) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);

        const cellValues = [row.no, row.question, row.options, row.correct];
        const wrappedCells = cellValues.map((value, index) =>
          wrapTextForCell(value, columns[index].width)
        );
        const totalLines = Math.max(...wrappedCells.map((lines) => lines.length), 1);
        let lineOffset = 0;
        const hasImages = Boolean(row.questionImages?.length || row.optionImages?.length);

        const getImageLayoutHeight = (
          images: PdfImage[] = [],
          width: number,
          maxImageHeight: number
        ) => {
          if (images.length === 0) return 0;

          const columnsPerRow = images.length === 1 ? 1 : 2;
          const gap = 2;
          const labelHeight = 3.4;
          const slotWidth = (width - cellPadding * 2 - gap * (columnsPerRow - 1)) / columnsPerRow;
          const rowHeights: number[] = [];

          images.forEach((image, index) => {
            const scale = Math.min(slotWidth / image.width, maxImageHeight / image.height, 1);
            const renderedHeight = Math.max(6, image.height * scale);
            const itemHeight = renderedHeight + (image.label ? labelHeight : 0);
            const rowIndex = Math.floor(index / columnsPerRow);
            rowHeights[rowIndex] = Math.max(rowHeights[rowIndex] || 0, itemHeight);
          });

          return rowHeights.reduce((sum, height) => sum + height, 0) + gap * Math.max(0, rowHeights.length - 1);
        };

        const drawImagesInCell = (
          images: PdfImage[] = [],
          x: number,
          top: number,
          width: number,
          maxImageHeight: number
        ) => {
          if (images.length === 0) return;

          const columnsPerRow = images.length === 1 ? 1 : 2;
          const gap = 2;
          const labelHeight = 3.4;
          const slotWidth = (width - cellPadding * 2 - gap * (columnsPerRow - 1)) / columnsPerRow;
          const rowHeights: number[] = [];
          const layouts = images.map((image, index) => {
            const scale = Math.min(slotWidth / image.width, maxImageHeight / image.height, 1);
            const renderedWidth = Math.max(6, image.width * scale);
            const renderedHeight = Math.max(6, image.height * scale);
            const itemHeight = renderedHeight + (image.label ? labelHeight : 0);
            const rowIndex = Math.floor(index / columnsPerRow);
            rowHeights[rowIndex] = Math.max(rowHeights[rowIndex] || 0, itemHeight);
            return { image, index, renderedWidth, renderedHeight, rowIndex };
          });

          layouts.forEach((layout) => {
            const colIndex = layout.index % columnsPerRow;
            const rowTop =
              top +
              rowHeights.slice(0, layout.rowIndex).reduce((sum, height) => sum + height + gap, 0);
            const slotX = x + cellPadding + colIndex * (slotWidth + gap);

            let imageTop = rowTop;
            if (layout.image.label) {
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(6.6);
              pdf.text(`${layout.image.label})`, slotX, rowTop + 2.5);
              imageTop += labelHeight;
            }

            pdf.addImage(
              layout.image.dataUrl,
              getPdfImageFormat(layout.image.dataUrl),
              slotX,
              imageTop,
              layout.renderedWidth,
              layout.renderedHeight
            );
          });
        };

        if (hasImages) {
          const textHeights = wrappedCells.map((lines) =>
            Math.max(minRowHeight, lines.length * rowLineHeight + cellPadding * 2 + 1.2)
          );
          const questionTextHeight =
            wrappedCells[1].filter(Boolean).length * rowLineHeight + 1.2;
          const optionTextHeight =
            wrappedCells[2].filter(Boolean).length * rowLineHeight + 1.2;
          const questionImageHeight = getImageLayoutHeight(
            row.questionImages,
            columns[1].width,
            45
          );
          const optionImageHeight = getImageLayoutHeight(row.optionImages, columns[2].width, 28);
          const questionCellHeight =
            cellPadding * 2 + questionTextHeight + (questionImageHeight ? 2 + questionImageHeight : 0);
          const optionCellHeight =
            cellPadding * 2 + optionTextHeight + (optionImageHeight ? 2 + optionImageHeight : 0);
          const rowHeight = Math.max(
            minRowHeight,
            textHeights[0],
            questionCellHeight,
            optionCellHeight,
            textHeights[3]
          );

          ensureSpace(rowHeight);

          let x = marginX;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          wrappedCells.forEach((lines, index) => {
            pdf.rect(x, y, columns[index].width, rowHeight);
            drawCellText(lines, x, y, columns[index].width);
            x += columns[index].width;
          });

          drawImagesInCell(
            row.questionImages,
            marginX + columns[0].width,
            y + cellPadding + questionTextHeight + 2,
            columns[1].width,
            45
          );
          drawImagesInCell(
            row.optionImages,
            marginX + columns[0].width + columns[1].width,
            y + cellPadding + optionTextHeight + 2,
            columns[2].width,
            28
          );

          y += rowHeight;
          return;
        }

        while (lineOffset < totalLines) {
          const availableHeight = pageHeight - pageBottom - y;
          if (availableHeight < minRowHeight + headerHeight) {
            pdf.addPage();
            y = pageTop;
            drawTableHeader();
          }

          const linesPerPage = Math.max(
            1,
            Math.floor((pageHeight - pageBottom - y - cellPadding * 2 - 1.2) / rowLineHeight)
          );
          const lineLimit = Math.min(linesPerPage, totalLines - lineOffset);
          const cellChunks = wrappedCells.map((lines) =>
            lines.slice(lineOffset, lineOffset + lineLimit)
          );
          const chunkLines = Math.max(...cellChunks.map((lines) => lines.length), 1);
          const rowHeight = Math.max(
            minRowHeight,
            chunkLines * rowLineHeight + cellPadding * 2 + 1.2
          );

          let x = marginX;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          cellChunks.forEach((lines, index) => {
            pdf.rect(x, y, columns[index].width, rowHeight);
            drawCellText(lines, x, y, columns[index].width);
            x += columns[index].width;
          });

          y += rowHeight;
          lineOffset += lineLimit;

          if (lineOffset < totalLines) {
            pdf.addPage();
            y = pageTop;
            drawTableHeader();
          }
        }
      };

      const getOptionsText = (source: any) =>
        (["A", "B", "C", "D"] as const)
          .map((id) => {
            const value = getOptionValue(source, id);
            return value && value !== id ? `${id}) ${value}` : "";
          })
          .filter(Boolean)
          .join("\n");

      const getQuestionPdfText = (
        question: IQuestion,
        subQuestion?: ISubQuestion,
        subQuestionNumber?: string,
        includeSharedParagraph = true
      ) => {
        const parts = [
          includeSharedParagraph ? String(question.text || "").trim() : "",
          includeSharedParagraph ? String(question.paragraph || "").trim() : "",
          subQuestion
            ? `Sub-question: ${String(subQuestion.text || "Untitled").trim()}`
            : "",
        ].filter(Boolean);

        return parts.join("\n\n");
      };

      const groupedQuestions = new Map<string, IQuestion[]>();
      res.questions.forEach((question: IQuestion) => {
        const groupName = getTopicNameById(question.topicId);
        if (!groupedQuestions.has(groupName)) {
          groupedQuestions.set(groupName, []);
        }
        groupedQuestions.get(groupName)!.push(question);
      });

      for (const [groupTopicName, topicQuestions] of groupedQuestions) {
        if (y > pageHeight - 28) {
          pdf.addPage();
          y = 12;
        }
        drawTopicTitle(groupTopicName);

        let topicQuestionNumber = 1;
        for (const question of topicQuestions) {
          if (Array.isArray(question.subQuestions) && question.subQuestions.length > 0) {
            const hasParagraphText = Boolean(String(question.paragraph || "").trim());

            for (const [subIndex, subQuestion] of question.subQuestions.entries()) {
              const subQuestionNumber = `${topicQuestionNumber}.${subIndex + 1}`;
              const includeSharedParagraph = !hasParagraphText || subIndex === 0;
              const questionImages = await loadPdfImages([
                ...(subIndex === 0 ? getQuestionMedia(question) : []),
                ...getQuestionMedia(subQuestion),
              ]);
              const optionImages = await loadPdfImages(getOptionMedia(subQuestion));

              drawQuestionRow({
                no: subQuestionNumber,
                question: getQuestionPdfText(
                  question,
                  subQuestion,
                  subQuestionNumber,
                  includeSharedParagraph
                ),
                options: getOptionsText(subQuestion),
                correct: getCorrectAnswer(subQuestion),
                questionImages,
                optionImages,
              });
            }
            topicQuestionNumber += 1;
            continue;
          }

          const questionImages = await loadPdfImages(getQuestionMedia(question));
          const optionImages = await loadPdfImages(getOptionMedia(question));

          drawQuestionRow({
            no: String(topicQuestionNumber),
            question: getQuestionPdfText(question) || "Untitled question",
            options: getOptionsText(question),
            correct: getCorrectAnswer(question),
            questionImages,
            optionImages,
          });
          topicQuestionNumber += 1;
        }

        y += 3;
      }

      const safeName = [
        className,
        subjectName,
        topicName,
        filterCreatedFrom || "all-dates",
        filterCreatedTo || filterCreatedFrom || "all-dates",
      ]
        .join("-")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
      pdf.save(`question-bank-${safeName || "report"}.pdf`);
    } catch (error) {
      console.error("Question bank PDF export failed", error);
      showInfo({
        title: "PDF download failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const fetchQuestions = async () => {
    setIsLoading(true);

    const payload = {
      ...buildQuestionFilterPayload(),
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
        setTotalRecords(0);
        setTotalPages(0);
        setSelectedQuestionIds([]);
        showInfo({
          title: "Could not load questions",
          description: res.message || "Please refresh and try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Fetch failed", err);
      setQuestions([]);
      setTotalRecords(0);
      setTotalPages(0);
      showInfo({
        title: "Could not load questions",
        description: "The request timed out or failed. Please try again.",
        variant: "destructive",
      });
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
  const handleView = async (q: IQuestion) => {
    const questionId = String(q._id || "").trim();
    setSelectedQuestion(q);
    setViewModalOpen(true);

    if (!questionId) return;

    try {
      const res: any = await getQuestionByIdApi(questionId);
      if (res?.success && res?.question) {
        setSelectedQuestion(res.question);
      }
    } catch (error) {
      console.error("Failed to load full question details", error);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      setIsDeleting(true);
      const res: any = await deleteQuestionApi(deletingId);

      if (res?.success) {
        // ✅ remove from UI also (fast update)
        setQuestions((prev) => prev.filter((q) => q._id !== deletingId));
        setDeletingId(null);
        toast({
          variant: "destructive",
          title: "Question deleted",
          description: "1 question removed from the list.",
        });

        // ✅ optional: reload from backend (best)
        // fetchQuestions();  // or whatever your function is named
      } else {
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: res?.message || "Unable to delete the question.",
        });
      }
    } catch (error: any) {
      console.error("Delete failed:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Unable to delete the question right now.",
      });
    } finally {
      setIsDeleting(false);
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
    "image_subquestions",
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
    setFilterTopic("all");
    setFilterType("all");
    setFilterDifficulty("all");
    setFilterCreatedFrom("");
    setFilterCreatedTo("");
    setReviewTextMcqWithImages(false);
  };

  const debouncedSetSearchTerm = useMemo(
    () =>
      debounce((value: string) => {
        setSearchDebounce(value);
      }, 1000),
    []
  );

  const getDisplayMediaSrc = (url?: string) => {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^(data:|https?:\/\/|blob:)/i.test(value)) return value;
    return `${baseURL || ""}${value.startsWith("/") ? "" : "/"}${value}`;
  };

  const getQuestionImageUrl = (q: IQuestion) => {
    const questionImage = q.media?.find(
      (item) => !String(item.alt || "").toLowerCase().startsWith("option_")
    );
    return (q as any).mediaUrl || questionImage?.url || "";
  };

  const getOptionImageUrl = (q: IQuestion, option: IOption, index: number) => {
    const optionId = String(option.id || String.fromCharCode(65 + index)).trim();
    const optionIdLower = optionId.toLowerCase();
    const optionImage = q.media?.find(
      (item) => {
        const alt = String(item.alt || "").trim().toLowerCase();
        return (
          alt === `option_${optionIdLower}` ||
          alt === `option${optionIdLower}` ||
          alt === optionIdLower
        );
      }
    );
    return (
      option.mediaUrl ||
      (option as any).image?.url ||
      (option as any).url ||
      optionImage?.url ||
      ""
    );
  };

  const getSubQuestionImageUrl = (q: IQuestion, subQuestionId: string, subQuestion?: ISubQuestion) => {
    const subIdLower = String(subQuestionId).trim().toLowerCase();
    const subQuestionImage = q.media?.find(
      (item) => {
        const alt = String(item.alt || "").trim().toLowerCase();
        return (
          alt === `subquestion_${subIdLower}` ||
          alt === subIdLower
        );
      }
    );
    return (
      subQuestion?.mediaUrl ||
      (subQuestion as any).url ||
      subQuestionImage?.url ||
      ""
    );
  };

  const getSubOptionImageUrl = (q: IQuestion, subQuestionId: string, option: IOption, index: number) => {
    const optionId = String(option.id || String.fromCharCode(65 + index)).trim();
    const optionIdLower = optionId.toLowerCase();
    const subIdLower = String(subQuestionId).trim().toLowerCase();

    const subOptionImage = q.media?.find(
      (item) => {
        const alt = String(item.alt || "").trim().toLowerCase();
        return (
          alt === `suboption_${subIdLower}_${optionIdLower}` ||
          alt === `suboption_${subIdLower}${optionIdLower}` ||
          alt === `${subIdLower}_option_${optionIdLower}` ||
          alt === `${subIdLower}_${optionIdLower}`
        );
      }
    );

    return (
      option.mediaUrl ||
      (option as any).image?.url ||
      (option as any).url ||
      subOptionImage?.url ||
      ""
    );
  };

  const isGroupedQuestionType = (type?: QuestionType | string) =>
    type === "paragraph" || type === "image_subquestions";

  const isSimpleAnswerQuestionType = (type?: QuestionType | string) =>
    type === "short_answer" || type === "long_answer" || type === "true_false";

  const createEmptyEditSubQuestion = (q: IQuestion, index: number, subQuestion?: ISubQuestion): EditSubQuestion => {
    const optionIds = ["A", "B", "C", "D"];
    const options = Array.isArray(subQuestion?.options) && subQuestion.options.length > 0
      ? subQuestion.options.map((option, optionIndex) => ({
          id: String(option.id || optionIds[optionIndex] || String(optionIndex + 1)),
          text: String(option.text || ""),
          mediaUrl: getSubOptionImageUrl(q, subQuestion?.id || `SQ${index + 1}`, option, optionIndex),
          isCorrect: Boolean(option.isCorrect),
          imageFile: null,
          imagePreviewUrl: "",
        }))
      : optionIds.map((optionId) => ({
          id: optionId,
          text: "",
          mediaUrl: "",
          isCorrect: false,
          imageFile: null,
          imagePreviewUrl: "",
        }));

    return {
      id: String(subQuestion?.id || `SQ${index + 1}`),
      type: (subQuestion?.type || "mcq_text") as EditSubQuestion["type"],
      text: String(subQuestion?.text || ""),
      mediaUrl: getSubQuestionImageUrl(q, subQuestion?.id || `SQ${index + 1}`, subQuestion),
      correctAnswer: String(subQuestion?.correctAnswer ?? ""),
      marks: String(subQuestion?.marks ?? 1),
      negativeMarks: String(subQuestion?.negativeMarks ?? 0),
      options,
      imageFile: null,
      imagePreviewUrl: "",
    };
  };

  const resetEditPreviewUrls = () => {
    if (editQuestionImagePreviewUrl) {
      URL.revokeObjectURL(editQuestionImagePreviewUrl);
    }

    editSubQuestions.forEach((subQuestion) => {
      if (subQuestion.imagePreviewUrl) {
        URL.revokeObjectURL(subQuestion.imagePreviewUrl);
      }
      subQuestion.options.forEach((option) => {
        if (option.imagePreviewUrl) {
          URL.revokeObjectURL(option.imagePreviewUrl);
        }
      });
    });

    editOptions.forEach((option) => {
      if (option.imagePreviewUrl) {
        URL.revokeObjectURL(option.imagePreviewUrl);
      }
    });
  };

  const populateEditQuestionState = (q: IQuestion) => {
    resetEditPreviewUrls();

    setEditingQuestion(q);
    setEditQuestionText(String(q.text ?? ""));
    setEditQuestionParagraph(String(q.paragraph ?? ""));
    setEditQuestionImageFile(null);
    setEditQuestionImagePreviewUrl("");
    setEditQuestionImageUrl(getQuestionImageUrl(q));
    setEditOptions(
      Array.isArray(q.options)
        ? q.options.map((option, index) => ({
            ...option,
            id: option.id || String.fromCharCode(65 + index),
            text: option.text || "",
            mediaUrl: getOptionImageUrl(q, option, index),
            imageFile: null,
            imagePreviewUrl: "",
            isCorrect: Boolean(option.isCorrect),
          }))
        : []
    );
    setEditSubQuestions(
      Array.isArray(q.subQuestions)
        ? q.subQuestions.map((subQuestion, index) => createEmptyEditSubQuestion(q, index, subQuestion))
        : []
    );
    setEditQuestionAnswer(String(q.correctAnswer ?? ""));
    setEditMarks(String(q.marks ?? ""));
    setEditDifficulty((q.difficulty as DifficultyLevel) || "easy");
    const topicId = String(q.topicId || "");
    const normalizedTopicId = topicId.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const topic = topics.find((item) => {
      const id = String(item._id || item.id || "");
      return (
        id === topicId ||
        item.name === topicId ||
        item.nameLower === normalizedTopicId ||
        String(item.name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedTopicId
      );
    });
    setEditTopicId(String(topic?._id || topic?.id || topicId));
  };

  const handleOpenEditModal = async (q: IQuestion) => {
    if (!q._id) {
      showInfo({ title: "Missing question", description: "Question id is missing.", variant: "destructive" });
      return;
    }

    try {
      setIsLoadingEditQuestion(true);
      const res: any = await getQuestionByIdApi(q._id);
      if (!res?.success || !res?.question) {
        showInfo({ title: "Load failed", description: res?.message || "Unable to load question details.", variant: "destructive" });
        return;
      }

      populateEditQuestionState(res.question as IQuestion);
      setEditQuestionOpen(true);
    } catch (error) {
      console.error("Failed to load question for editing", error);
      showInfo({ title: "Load failed", description: "Unable to load question details.", variant: "destructive" });
    } finally {
      setIsLoadingEditQuestion(false);
    }
  };

  const handleEditOptionTextChange = (optionIndex: number, text: string) => {
    setEditOptions((prev) =>
      prev.map((option, index) =>
        index === optionIndex
          ? {
              ...option,
              text,
              ...(text.trim()
                ? { mediaUrl: "", imageFile: null, imagePreviewUrl: "" }
                : {}),
            }
          : option
      )
    );
  };

  const handleEditSubQuestionImageChange = (subQuestionIndex: number, file?: File | null) => {
    if (!file) return;

    updateEditSubQuestion(subQuestionIndex, (subQuestion) => {
      if (subQuestion.imagePreviewUrl) {
        URL.revokeObjectURL(subQuestion.imagePreviewUrl);
      }

      return {
        ...subQuestion,
        mediaUrl: "",
        imageFile: file,
        imagePreviewUrl: URL.createObjectURL(file),
      };
    });
  };

  const handleEditSubQuestionRemoveImage = (subQuestionIndex: number) => {
    updateEditSubQuestion(subQuestionIndex, (subQuestion) => {
      if (subQuestion.imagePreviewUrl) {
        URL.revokeObjectURL(subQuestion.imagePreviewUrl);
      }

      return {
        ...subQuestion,
        mediaUrl: "",
        imageFile: null,
        imagePreviewUrl: "",
      };
    });
  };

  const handleEditSubQuestionUseExistingImage = (subQuestionIndex: number) => {
    updateEditSubQuestion(subQuestionIndex, (subQuestion) => {
      if (subQuestion.imagePreviewUrl) {
        URL.revokeObjectURL(subQuestion.imagePreviewUrl);
      }

      return {
        ...subQuestion,
        imageFile: null,
        imagePreviewUrl: "",
      };
    });
  };

  const handleEditSubQuestionOptionTextChange = (subQuestionIndex: number, optionIndex: number, text: string) => {
    updateEditSubQuestionOption(subQuestionIndex, optionIndex, (option) => ({
      ...option,
      text,
      ...(text.trim() ? { mediaUrl: "", imageFile: null, imagePreviewUrl: "" } : {}),
    }));
  };

  const handleEditSubQuestionOptionImageChange = (
    subQuestionIndex: number,
    optionIndex: number,
    file?: File | null
  ) => {
    if (!file) return;

    updateEditSubQuestionOption(subQuestionIndex, optionIndex, (option) => {
      if (option.imagePreviewUrl) {
        URL.revokeObjectURL(option.imagePreviewUrl);
      }

      return {
        ...option,
        text: "",
        mediaUrl: "",
        imageFile: file,
        imagePreviewUrl: URL.createObjectURL(file),
      };
    });
  };

  const handleEditSubQuestionOptionRemoveImage = (subQuestionIndex: number, optionIndex: number) => {
    updateEditSubQuestionOption(subQuestionIndex, optionIndex, (option) => {
      if (option.imagePreviewUrl) {
        URL.revokeObjectURL(option.imagePreviewUrl);
      }

      return {
        ...option,
        mediaUrl: "",
        imageFile: null,
        imagePreviewUrl: "",
      };
    });
  };

  const handleEditSubQuestionOptionUseText = (subQuestionIndex: number, optionIndex: number) => {
    handleEditSubQuestionOptionRemoveImage(subQuestionIndex, optionIndex);
  };

  const handleEditQuestionImageChange = (file?: File | null) => {
    if (!file) return;
    if (editQuestionImagePreviewUrl) {
      URL.revokeObjectURL(editQuestionImagePreviewUrl);
    }
    setEditQuestionImageFile(file);
    setEditQuestionImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleEditOptionImageChange = (optionIndex: number, file?: File | null) => {
    if (!file) return;
    setEditOptions((prev) =>
      prev.map((option, index) => {
        if (index !== optionIndex) return option;
        if (option.imagePreviewUrl) {
          URL.revokeObjectURL(option.imagePreviewUrl);
        }
        return {
          ...option,
          text: "",
          mediaUrl: "",
          imageFile: file,
          imagePreviewUrl: URL.createObjectURL(file),
        };
      })
    );
  };

  const handleEditOptionUseText = (optionIndex: number) => {
    setEditOptions((prev) =>
      prev.map((option, index) => {
        if (index !== optionIndex) return option;
        if (option.imagePreviewUrl) {
          URL.revokeObjectURL(option.imagePreviewUrl);
        }
        return {
          ...option,
          mediaUrl: "",
          imageFile: null,
          imagePreviewUrl: "",
        };
      })
    );
  };

  const handleEditOptionRemoveImage = (optionIndex: number) => {
    setEditOptions((prev) =>
      prev.map((option, index) => {
        if (index !== optionIndex) return option;
        if (option.imagePreviewUrl) {
          URL.revokeObjectURL(option.imagePreviewUrl);
        }
        return {
          ...option,
          mediaUrl: "",
          imageFile: null,
          imagePreviewUrl: "",
        };
      })
    );
  };

  const handleEditCorrectOptionChange = (optionIndex: number) => {
    setEditOptions((prev) =>
      prev.map((option, index) => ({
        ...option,
        isCorrect: index === optionIndex,
      }))
    );
  };

  const addEditSubQuestion = () => {
    setEditSubQuestions((prev) => [...prev, createEmptyEditSubQuestion(editingQuestion || ({} as any), prev.length)]);
  };

  const removeEditSubQuestion = (index: number) => {
    setEditSubQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)));
  };

  const updateEditSubQuestion = (index: number, updater: (subQuestion: EditSubQuestion) => EditSubQuestion) => {
    setEditSubQuestions((prev) => prev.map((subQuestion, itemIndex) => (itemIndex === index ? updater(subQuestion) : subQuestion)));
  };

  const updateEditSubQuestionField = (index: number, field: keyof EditSubQuestion, value: string) => {
    updateEditSubQuestion(index, (subQuestion) => ({ ...subQuestion, [field]: value }));
  };

  const updateEditSubQuestionType = (index: number, type: EditSubQuestion["type"]) => {
    updateEditSubQuestion(index, (subQuestion) => ({
      ...subQuestion,
      type,
      correctAnswer: type === "mcq_text" ? subQuestion.correctAnswer : subQuestion.correctAnswer,
      options:
        type === "mcq_text"
          ? subQuestion.options.length > 0
            ? subQuestion.options
            : ["A", "B", "C", "D"].map((optionId) => ({ id: optionId, text: "", mediaUrl: "", isCorrect: false }))
          : subQuestion.options,
    }));
  };

  const updateEditSubQuestionOption = (
    subQuestionIndex: number,
    optionIndex: number,
    updater: (option: EditSubQuestionOption) => EditSubQuestionOption
  ) => {
    updateEditSubQuestion(subQuestionIndex, (subQuestion) => ({
      ...subQuestion,
      options: subQuestion.options.map((option, index) => (index === optionIndex ? updater(option) : option)),
    }));
  };

  const addEditSubQuestionOption = (subQuestionIndex: number) => {
    updateEditSubQuestion(subQuestionIndex, (subQuestion) => {
      const nextId = String.fromCharCode(65 + subQuestion.options.length);
      return {
        ...subQuestion,
        options: [...subQuestion.options, { id: nextId, text: "", mediaUrl: "", isCorrect: false }],
      };
    });
  };

  const removeEditSubQuestionOption = (subQuestionIndex: number, optionIndex: number) => {
    updateEditSubQuestion(subQuestionIndex, (subQuestion) => {
      if (subQuestion.options.length <= 2) return subQuestion;
      return {
        ...subQuestion,
        options: subQuestion.options.filter((_, index) => index !== optionIndex),
      };
    });
  };

  const markEditSubQuestionCorrectOption = (subQuestionIndex: number, optionIndex: number) => {
    updateEditSubQuestion(subQuestionIndex, (subQuestion) => ({
      ...subQuestion,
      options: subQuestion.options.map((option, index) => ({
        ...option,
        isCorrect: index === optionIndex,
      })),
      correctAnswer: subQuestion.options[optionIndex]?.id || "",
    }));
  };

  const handleUpdateSingleQuestion = async () => {
    if (!editingQuestion?._id) {
      showInfo({ title: "Missing question", description: "Question id is missing.", variant: "destructive" });
      return;
    }

    const parsedMarks = Number(editMarks);
    if (!Number.isFinite(parsedMarks) || parsedMarks < 0) {
      showInfo({ title: "Invalid marks", description: "Marks must be a valid non-negative number.", variant: "destructive" });
      return;
    }

    const trimmedQuestionText = editQuestionText.trim();
    if (!trimmedQuestionText) {
      showInfo({ title: "Question text required", description: "Question text is required.", variant: "destructive" });
      return;
    }

    const questionType = editingQuestion.type;
    const normalizedQuestionParagraph = editQuestionParagraph.trim();

    if (questionType === "paragraph" && !normalizedQuestionParagraph) {
      showInfo({ title: "Paragraph required", description: "Paragraph text is required for paragraph questions.", variant: "destructive" });
      return;
    }

    const shouldUpdateOptions = editOptions.length > 0;
    const normalizedOptions = editOptions.map((option, index) => ({
      id: option.id || String.fromCharCode(65 + index),
      text: option.imageFile ? "" : String(option.text || "").trim(),
      mediaUrl: option.imageFile ? "" : option.mediaUrl || "",
      isCorrect: Boolean(option.isCorrect),
    }));

    if (
      shouldUpdateOptions &&
      normalizedOptions.some((option, index) => {
        const hasText = Boolean(String(option.text || "").trim());
        const hasImage = Boolean(option.mediaUrl);
        const hasPendingImageUpload = Boolean(editOptions[index]?.imageFile);
        return !hasText && !hasImage && !hasPendingImageUpload;
      })
    ) {
      showInfo({ title: "Invalid options", description: "Each option must have text or an image.", variant: "destructive" });
      return;
    }

    const selectedCorrectOption = normalizedOptions.find((option) => option.isCorrect);
    if (shouldUpdateOptions && !selectedCorrectOption) {
      showInfo({ title: "Correct option required", description: "Please select the correct option.", variant: "destructive" });
      return;
    }

    if (isGroupedQuestionType(questionType) && editSubQuestions.length === 0) {
      showInfo({ title: "Sub-questions required", description: "Add at least one sub-question.", variant: "destructive" });
      return;
    }

    const serializedSubQuestions = editSubQuestions.map((subQuestion, index) => {
      const normalizedType = (subQuestion.type || "mcq_text") as EditSubQuestion["type"];
      const normalizedSubOptions = (subQuestion.options || []).map((option, optionIndex) => ({
        id: option.id || String.fromCharCode(65 + optionIndex),
        text: String(option.text || "").trim(),
        mediaUrl: option.mediaUrl || "",
        isCorrect: Boolean(option.isCorrect),
      }));
      const correctOption = normalizedSubOptions.find((option) => option.isCorrect);

      return {
        id: subQuestion.id || `SQ${index + 1}`,
        type: normalizedType,
        text: String(subQuestion.text || "").trim(),
        mediaUrl: subQuestion.imageFile ? "" : subQuestion.mediaUrl || "",
        options: normalizedType === "mcq_text" ? normalizedSubOptions : [],
        correctAnswer:
          normalizedType === "mcq_text"
            ? correctOption?.id || ""
            : String(subQuestion.correctAnswer || "").trim(),
        marks: Number(subQuestion.marks) || 0,
        negativeMarks: Number(subQuestion.negativeMarks) || 0,
      };
    });

    const simpleAnswerPayload = isSimpleAnswerQuestionType(questionType)
      ? { correctAnswer: editQuestionAnswer.trim() }
      : {};

    const groupedQuestionPayload = isGroupedQuestionType(questionType)
      ? {
          paragraph: questionType === "paragraph" ? normalizedQuestionParagraph : undefined,
          subQuestions: serializedSubQuestions,
        }
      : {};

    try {
      setIsUpdatingSingle(true);
      const updatePayload = {
        text: trimmedQuestionText,
        ...(shouldUpdateOptions
          ? {
              options: normalizedOptions,
              correctAnswer: selectedCorrectOption?.id,
            }
          : {}),
        marks: parsedMarks,
        difficulty: editDifficulty,
        topicId: editTopicId,
        ...simpleAnswerPayload,
        ...groupedQuestionPayload,
      };

      const hasReplacementImages =
        Boolean(editQuestionImageFile) ||
        editOptions.some((option) => option.imageFile) ||
        editSubQuestions.some(
          (subQuestion) =>
            Boolean(subQuestion.imageFile) ||
            subQuestion.options.some((option) => option.imageFile)
        );
      let updateRequest: typeof updatePayload | FormData = updatePayload;

      if (hasReplacementImages) {
        const formData = new FormData();
        formData.append("payload", JSON.stringify(updatePayload));
        if (editQuestionImageFile) {
          formData.append("media", editQuestionImageFile);
        }
        editOptions.forEach((option, index) => {
          if (option.imageFile) {
            const optionId = option.id || String.fromCharCode(65 + index);
            formData.append("media", option.imageFile, `option_${optionId}`);
          }
        });
        editSubQuestions.forEach((subQuestion, subQuestionIndex) => {
          const subQuestionId = subQuestion.id || `SQ${subQuestionIndex + 1}`;
          if (subQuestion.imageFile) {
            formData.append("media", subQuestion.imageFile, `subquestion_${subQuestionId}`);
          }
          subQuestion.options.forEach((option, optionIndex) => {
            if (!option.imageFile) return;
            const optionId = option.id || String.fromCharCode(65 + optionIndex);
            formData.append("media", option.imageFile, `suboption_${subQuestionId}_${optionId}`);
          });
        });
        updateRequest = formData;
      }

      const res: any = await updateQuestionApi(editingQuestion._id, updateRequest);

      if (!res?.success) {
        showInfo({ title: "Update failed", description: res?.message || "Failed to update question.", variant: "destructive" });
        return;
      }

      setQuestions((prev) =>
        prev.map((q) =>
          q._id === editingQuestion._id
            ? {
                ...q,
                ...(res?.question || {}),
              }
            : q
        )
      );

      setEditQuestionOpen(false);
      setEditingQuestion(null);
      if (editQuestionImagePreviewUrl) {
        URL.revokeObjectURL(editQuestionImagePreviewUrl);
      }
      editOptions.forEach((option) => {
        if (option.imagePreviewUrl) URL.revokeObjectURL(option.imagePreviewUrl);
      });
    } catch (error) {
      console.error("Single question update failed", error);
      showInfo({ title: "Update failed", description: "Failed to update question.", variant: "destructive" });
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
    setBulkTopicId("unchanged");
  };

  const handleOpenBulkEdit = () => {
    if (selectedQuestionIds.length === 0) {
      showInfo({ title: "No questions selected", description: "Please select at least one question.", variant: "destructive" });
      return;
    }
    resetBulkForm();
    setBulkEditOpen(true);
  };

  const handleBulkConvertToImageMcq = async () => {
    if (selectedQuestionIds.length === 0) {
      showInfo({
        title: "No questions selected",
        description: "Select questions to convert to Image MCQ.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Convert ${selectedQuestionIds.length} selected question(s) from Text MCQ to Image MCQ?\n\nReview each question first. This only changes the type.`
    );
    if (!confirmed) return;

    try {
      setIsBulkUpdating(true);
      const res: any = await bulkUpdateQuestionsApi({
        ids: selectedQuestionIds,
        type: "mcq_image",
      });

      if (!res?.success) {
        showInfo({
          title: "Convert failed",
          description: res?.message || "Could not update question type.",
          variant: "destructive",
        });
        return;
      }

      showInfo({
        title: "Converted",
        description: `${res.modifiedCount || selectedQuestionIds.length} question(s) set to mcq_image.`,
      });
      setSelectedQuestionIds([]);
      await fetchQuestions();
    } catch (error) {
      console.error("Convert to image MCQ failed", error);
      showInfo({
        title: "Convert failed",
        description: "Check console/network and try again.",
        variant: "destructive",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestionIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No questions selected",
        description: "Please select at least one question.",
      });
      return;
    }

    const confirmed = await showConfirm({
      title: "Delete selected questions?",
      description: `Delete ${selectedQuestionIds.length} selected question${selectedQuestionIds.length === 1 ? "" : "s"}?`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      setIsBulkDeleting(true);
      const res: any = await bulkDeleteQuestionsApi({ ids: selectedQuestionIds });

      if (!res?.success) {
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: res?.message || "Unable to delete the selected questions.",
        });
        return;
      }

      setSelectedQuestionIds([]);
      toast({
        variant: "destructive",
        title: "Questions deleted",
        description: `${res?.deletedCount ?? selectedQuestionIds.length} question${(res?.deletedCount ?? selectedQuestionIds.length) === 1 ? "" : "s"} removed from the list.`,
      });
      await fetchQuestions();
    } catch (error: any) {
      console.error("Bulk delete failed", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Unable to delete the selected questions right now.",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkClearUsage = async () => {
    if (selectedQuestionIds.length === 0) {
      showInfo({ title: "No questions selected", description: "Please select at least one question.", variant: "destructive" });
      return;
    }

    const confirmed = await showConfirm({
      title: "Clear usage tags?",
      description: `Reset used count for ${selectedQuestionIds.length} selected question${selectedQuestionIds.length === 1 ? "" : "s"}?`,
      confirmText: "Clear Usage",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      setIsClearingUsage(true);
      const res: any = await bulkClearQuestionUsageApi({ ids: selectedQuestionIds });

      if (!res?.success) {
        showInfo({ title: "Clear usage failed", description: res?.message || "Unable to clear usage tags.", variant: "destructive" });
        return;
      }

      setQuestions((prev) =>
        prev.map((q) =>
          q._id && selectedQuestionIds.includes(q._id)
            ? { ...q, usageCount: 0, lastUsedAt: null }
            : q
        )
      );
      setSelectedQuestionIds([]);
      showInfo({
        title: "Usage tags cleared",
        description: `${res?.modifiedCount ?? selectedQuestionIds.length} question${(res?.modifiedCount ?? selectedQuestionIds.length) === 1 ? "" : "s"} reset.`,
      });
    } catch (error) {
      console.error("Clear usage failed", error);
      showInfo({ title: "Clear usage failed", description: "Unable to clear usage tags right now.", variant: "destructive" });
    } finally {
      setIsClearingUsage(false);
    }
  };

  const handleRebuildUsage = async () => {
    const confirmed = await showConfirm({
      title: "Rebuild usage tags?",
      description: "This will recalculate used counts from all saved papers and overwrite existing usage tags.",
      confirmText: "Rebuild",
    });

    if (!confirmed) return;

    try {
      setIsRebuildingUsage(true);
      const res: any = await rebuildQuestionUsageApi();

      if (!res?.success) {
        showInfo({ title: "Rebuild failed", description: res?.message || "Unable to rebuild usage tags.", variant: "destructive" });
        return;
      }

      showInfo({
        title: "Usage tags rebuilt",
        description: `${res?.questionCount ?? 0} question${(res?.questionCount ?? 0) === 1 ? "" : "s"} updated from ${res?.paperCount ?? 0} paper${(res?.paperCount ?? 0) === 1 ? "" : "s"}.`,
      });
      await fetchQuestions();
    } catch (error) {
      console.error("Rebuild usage failed", error);
      showInfo({ title: "Rebuild failed", description: "Unable to rebuild usage tags right now.", variant: "destructive" });
    } finally {
      setIsRebuildingUsage(false);
    }
  };

  const handleBulkUpdate = async () => {
    const parsedMarks = bulkMarks.trim() === "" ? undefined : Number(bulkMarks);
    const nextDifficulty = bulkDifficulty === "unchanged" ? undefined : bulkDifficulty;
    const nextTopicId = bulkTopicId === "unchanged" ? undefined : bulkTopicId === "none" ? "" : bulkTopicId;

    if (parsedMarks === undefined && !nextDifficulty && nextTopicId === undefined) {
      showInfo({ title: "Nothing to update", description: "Please set marks, difficulty, and/or topic to update.", variant: "destructive" });
      return;
    }

    if (parsedMarks !== undefined && (!Number.isFinite(parsedMarks) || parsedMarks < 0)) {
      showInfo({ title: "Invalid marks", description: "Marks must be a valid non-negative number.", variant: "destructive" });
      return;
    }

    try {
      setIsBulkUpdating(true);
      const payload: {
        ids: string[];
        marks?: number;
        difficulty?: DifficultyLevel;
        topicId?: string;
      } = {
        ids: selectedQuestionIds,
      };

      if (parsedMarks !== undefined) payload.marks = parsedMarks;
      if (nextDifficulty) payload.difficulty = nextDifficulty;
      if (nextTopicId !== undefined) payload.topicId = nextTopicId;

      const res = await bulkUpdateQuestionsApi(payload);

      if (!res?.success) {
        showInfo({ title: "Bulk update failed", description: res?.message || "Bulk update failed.", variant: "destructive" });
        return;
      }

      setQuestions((prev) =>
        prev.map((q) => {
          if (!q._id || !selectedQuestionIds.includes(q._id)) return q;
          return {
            ...q,
            marks: parsedMarks !== undefined ? parsedMarks : q.marks,
            difficulty: nextDifficulty || q.difficulty,
            topicId: nextTopicId !== undefined ? nextTopicId : q.topicId,
            ...(nextTopicId
              ? {
                  classId:
                    topics.find((topic) => String(topic._id || topic.id) === nextTopicId)?.classId ||
                    q.classId,
                  subjectId:
                    topics.find((topic) => String(topic._id || topic.id) === nextTopicId)?.subjectId ||
                    q.subjectId,
                }
              : {}),
          };
        })
      );

      setSelectedQuestionIds([]);
      setBulkEditOpen(false);
      resetBulkForm();
    } catch (error: any) {
      console.error("Bulk update failed", error);
      showInfo({ title: "Bulk update failed", description: "Check console/network and try again.", variant: "destructive" });
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadFilteredPdf}
            disabled={isDownloadingPdf || isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloadingPdf ? "Preparing..." : "Download PDF"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadFilteredExcel}
            disabled={isDownloadingExcel || isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloadingExcel ? "Preparing..." : "Download Excel"}
          </Button>
          <Button
            variant="outline"
            onClick={handleRebuildUsage}
            disabled={isRebuildingUsage || isLoading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {isRebuildingUsage ? "Rebuilding..." : "Rebuild Usage"}
          </Button>
          <Link href="/dashboard/questions/new">
            <Button className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </Link>
        </div>
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
        <CardContent className="grid md:grid-cols-4 lg:grid-cols-8 gap-3">
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
            <Select
              value={filterClass}
              onValueChange={(value) => {
                setFilterClass(value);
                setFilterTopic("all");
              }}
            >
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
            <Select
              value={filterSubject}
              onValueChange={(value) => {
                setFilterSubject(value);
                setFilterTopic("all");
              }}
            >
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
            <h3>Topic</h3>
            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={String(topic._id || topic.id)} value={String(topic._id || topic.id)}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {topicsLoading && (
              <p className="mt-1 text-xs text-muted-foreground">Loading topics...</p>
            )}
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
          <div>
            <h3>From Date</h3>
            <div className="relative flex items-center gap-2">
              <Input
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                value={filterCreatedFrom}
                onChange={(e) => setFilterCreatedFrom(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => openDatePicker(fromDatePickerRef.current)}
                aria-label="Choose from date"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <input
                ref={fromDatePickerRef}
                type="date"
                className="absolute right-0 top-0 h-0 w-0 opacity-0"
                tabIndex={-1}
                value={displayDateToIso(filterCreatedFrom)}
                onChange={(e) => setFilterCreatedFrom(isoDateToDisplay(e.target.value))}
              />
            </div>
          </div>
          <div>
            <h3>To Date</h3>
            <div className="relative flex items-center gap-2">
              <Input
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                value={filterCreatedTo}
                onChange={(e) => setFilterCreatedTo(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => openDatePicker(toDatePickerRef.current)}
                aria-label="Choose to date"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <input
                ref={toDatePickerRef}
                type="date"
                className="absolute right-0 top-0 h-0 w-0 opacity-0"
                tabIndex={-1}
                value={displayDateToIso(filterCreatedTo)}
                min={displayDateToIso(filterCreatedFrom) || undefined}
                onChange={(e) => setFilterCreatedTo(isoDateToDisplay(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={reviewTextMcqWithImages ? "border-amber-300 bg-amber-50/40" : undefined}>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Review: Text MCQ with option images</p>
            <p className="text-xs text-muted-foreground">
              Finds questions saved as <span className="font-medium">mcq_text</span> that also have
              option images. Open each one, then convert to Image MCQ or delete.
            </p>
          </div>
          <Button
            type="button"
            variant={reviewTextMcqWithImages ? "default" : "outline"}
            onClick={() => {
              setReviewTextMcqWithImages((prev) => !prev);
              setFilterType("mcq_text");
              setCurrentPage(1);
            }}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            {reviewTextMcqWithImages ? "Review ON" : "Show mismatches"}
          </Button>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <div className="px-6 pt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {selectedQuestionIds.length} selected
            {reviewTextMcqWithImages ? ` · reviewing mismatches (${totalRecords})` : ""}
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              onClick={handleBulkConvertToImageMcq}
              disabled={selectedQuestionIds.length === 0 || isBulkUpdating || isBulkDeleting || isClearingUsage}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Convert to Image MCQ
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenBulkEdit}
              disabled={selectedQuestionIds.length === 0 || isBulkDeleting || isClearingUsage}
            >
              <Edit className="mr-2 h-4 w-4" /> Bulk Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleBulkClearUsage}
              disabled={selectedQuestionIds.length === 0 || isBulkUpdating || isBulkDeleting || isClearingUsage}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {isClearingUsage ? "Clearing..." : "Clear Usage"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={selectedQuestionIds.length === 0 || isBulkUpdating || isBulkDeleting || isClearingUsage}
            >
              <Trash className="mr-2 h-4 w-4" /> Delete Selected
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-center">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[...Array(9)].map((_, i) => (
                      <TableHead key={i}>
                        <div className="skeleton h-4 w-full" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {[...Array(10)].map((_, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {[...Array(9)].map((_, colIndex) => (
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
                    <TableHead>Topic</TableHead>
                    <TableHead>Usage</TableHead>
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
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline">
                              {q.type.replace("_", " ")}
                            </Badge>
                            {(q.needsTypeReview || (reviewTextMcqWithImages && q.hasOptionMedia)) && (
                              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                                Image options
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getClassNameById(q.classId)}</TableCell>
                        <TableCell>
                          {getSubjectNameById(q?.subjectId)}
                        </TableCell>
                        <TableCell>{getTopicNameById(q.topicId)}</TableCell>
                        <TableCell>
                          <Badge variant={Number(q.usageCount || 0) > 0 ? "destructive" : "outline"}>
                            {Number(q.usageCount || 0) > 0
                              ? `Used ${Number(q.usageCount || 0)}x`
                              : "Unused"}
                          </Badge>
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
                                aria-label="Delete question"
                                title="Delete question"
                                onClick={() => {
                                  if (!questionId) return;
                                  handleDelete(String(questionId));
                                }}
                              >
                                <Trash className="h-4 w-4" />
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
                    <TableHead colSpan={10} className="text-right">
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
                <p>Topic: {getTopicNameById(selectedQuestion.topicId)}</p>
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
                  {selectedQuestion.media && selectedQuestion.media.length > 0 ? (
                    selectedQuestion.media
                      ?.filter((m) => !m.alt?.toLowerCase().startsWith("option_"))
                      .map((img) => (
                        <img
                          key={img._id || img.url || "question-media"}
                          src={/^(data:|https?:\/\/)/.test(String(img.url || "")) ? img.url : `${baseURL || ""}${img.url || ""}`}
                          alt={img.alt}
                          className="max-h-40 rounded border"
                        />
                      ))
                  ) : (
                    getQuestionImageUrl(selectedQuestion) && (
                      <img
                        src={getDisplayMediaSrc(getQuestionImageUrl(selectedQuestion))}
                        alt="Question"
                        className="max-h-40 rounded border"
                      />
                    )
                  )}
                </div>
              </div>

              {/* ================= OPTIONS ================= */}
              {selectedOptions.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {selectedOptions.map((option, index) => {
                    const optionKey = option._id || option.id || option.text || "option";
                    const optionImageUrl = getOptionImageUrl(selectedQuestion, option, index);

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
                        {optionImageUrl && (
                          <img
                            src={getDisplayMediaSrc(optionImageUrl)}
                            alt={`Option ${index + 1}`}
                            className="max-h-24 rounded border"
                          />
                        )}

                        {/* OPTION TEXT */}
                        {option.text && (
                          <span className="text-sm">{option.text}</span>
                        )}

                        {!option.text && !optionImageUrl && (
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

              {/* ================= PARAGRAPH / IMAGE SUB QUESTIONS ================= */}
              {(selectedQuestion.type === "paragraph" ||
                selectedQuestion.type === "image_subquestions") && (
                <div className="mt-6 rounded bg-muted/20 p-4">
                  <h3 className="font-semibold mb-2">
                    {selectedQuestion.type === "paragraph"
                      ? "Paragraph"
                      : "Instruction"}
                  </h3>
                  <p>{selectedQuestion.paragraph || selectedQuestion.text}</p>
                  {selectedQuestion.type === "image_subquestions" && getQuestionImageUrl(selectedQuestion) && (
                    <div className="mt-3 overflow-hidden rounded border bg-background p-2 max-w-2xl">
                      <img
                        src={getDisplayMediaSrc(getQuestionImageUrl(selectedQuestion))}
                        alt="Instruction Image"
                        className="max-h-80 rounded object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ================= SUB QUESTIONS ================= */}
              {selectedSubQuestions.length > 0 && (
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

                        {getSubQuestionImageUrl(selectedQuestion, sq.id || `SQ${index + 1}`, sq) && (
                          <div className="overflow-hidden rounded border bg-background p-2">
                            <img
                              src={getDisplayMediaSrc(getSubQuestionImageUrl(selectedQuestion, sq.id || `SQ${index + 1}`, sq))}
                              alt={sq.text || `Sub-question ${index + 1}`}
                              className="max-h-56 w-full rounded object-contain"
                            />
                          </div>
                        )}

                        {/* SUB MCQ */}
                        {(sq.type === "mcq_text" || sq.type === "mcq_image" || sq.type === "mcq") && (sq.options || []).length > 0 && (
                          <ul className="space-y-2">
                            {(sq.options || []).map((opt, optIndex) => {
                              const subOptionImageUrl = getDisplayMediaSrc(
                                getSubOptionImageUrl(selectedQuestion, sq.id || `SQ${index + 1}`, opt, optIndex)
                              );

                              return (
                                <li
                                  key={opt._id || opt.id || `opt-${optIndex}`}
                                  className="flex items-center gap-3"
                                >
                                  <input
                                    type="radio"
                                    disabled
                                    checked={opt.isCorrect}
                                  />
                                  {subOptionImageUrl ? (
                                    <>
                                      <img
                                        src={subOptionImageUrl}
                                        alt={`Option ${optIndex + 1}`}
                                        className="max-h-20 rounded border"
                                      />
                                      {opt.text && <span className="text-sm">{opt.text}</span>}
                                    </>
                                  ) : (
                                    <span>{opt.text}</span>
                                  )}
                                </li>
                              );
                            })}
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
            <DialogTitle>Bulk Edit</DialogTitle>
            <DialogDescription>
              Update marks, difficulty, and/or topic for {selectedQuestionIds.length} selected questions.
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

            <div>
              <label className="text-sm font-medium">Topic (optional)</label>
              <Select value={bulkTopicId} onValueChange={setBulkTopicId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Keep existing</SelectItem>
                  <SelectItem value="none">No topic</SelectItem>
                  {topics.map((topic) => (
                    <SelectItem key={String(topic._id || topic.id)} value={String(topic._id || topic.id)}>
                      {topic.name} ({getClassNameById(topic.classId)}, {getSubjectNameById(topic.subjectId)})
                    </SelectItem>
                  ))}
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
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Edit the question text, topic, marks, difficulty, and type-specific content for the selected question.
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-4">
            {isLoadingEditQuestion && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                Loading question details...
              </div>
            )}

            <div className="min-w-0">
              <label className="text-sm font-medium">{isGroupedQuestionType(editingQuestion?.type) || isSimpleAnswerQuestionType(editingQuestion?.type) ? "Instruction / Question Text" : "Question Text"}</label>
              <Textarea
                value={editQuestionText}
                onChange={(e) => setEditQuestionText(e.target.value)}
                placeholder={isGroupedQuestionType(editingQuestion?.type) ? "Enter the instruction for this question set" : "Enter question text"}
                className="min-h-[120px] break-words"
              />
            </div>

            {editingQuestion?.type === "paragraph" && (
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium">Paragraph / Passage</label>
                <Textarea
                  value={editQuestionParagraph}
                  onChange={(e) => setEditQuestionParagraph(e.target.value)}
                  placeholder="Enter the full paragraph or passage"
                  className="min-h-[180px] break-words"
                />
              </div>
            )}

            {(editingQuestion?.type === "mcq_image" || editingQuestion?.type === "image_subquestions" || editQuestionImageUrl || editQuestionImagePreviewUrl) && (
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium">Question Image</label>
                {(editQuestionImagePreviewUrl || editQuestionImageUrl) ? (
                  <div className="flex min-w-0 flex-col items-start gap-3 rounded-md border p-3 sm:flex-row">
                    <img
                      src={editQuestionImagePreviewUrl || getDisplayMediaSrc(editQuestionImageUrl)}
                      alt="Question"
                      className="max-h-36 w-full max-w-[220px] rounded border object-contain"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="break-words text-xs text-muted-foreground">
                        {editQuestionImageFile ? editQuestionImageFile.name : "Current question image"}
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        className="min-w-0"
                        onChange={(e) => handleEditQuestionImageChange(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept="image/*"
                    className="min-w-0"
                    onChange={(e) => handleEditQuestionImageChange(e.target.files?.[0] || null)}
                  />
                )}
              </div>
            )}

            {isSimpleAnswerQuestionType(editingQuestion?.type) && (
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium">Correct Answer</label>
                <Textarea
                  value={editQuestionAnswer}
                  onChange={(e) => setEditQuestionAnswer(e.target.value)}
                  placeholder="Enter the expected answer"
                  className="min-h-[100px] break-words"
                />
              </div>
            )}

            {isGroupedQuestionType(editingQuestion?.type) && (
              <div className="min-w-0 space-y-3 rounded-md border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">Sub-Questions</label>
                  <Button type="button" variant="outline" size="sm" onClick={addEditSubQuestion}>
                    <Plus className="mr-2 h-4 w-4" /> Add Sub-Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {editSubQuestions.map((subQuestion, subQuestionIndex) => (
                    <div key={`${subQuestion.id}-${subQuestionIndex}`} className="rounded-md border bg-background p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">Sub-Question {subQuestionIndex + 1}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEditSubQuestion(subQuestionIndex)}
                          disabled={editSubQuestions.length <= 1}
                        >
                          <Trash className="mr-2 h-4 w-4 text-red-500" /> Remove
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium">Type</label>
                          <Select
                            value={subQuestion.type}
                            onValueChange={(value) => updateEditSubQuestionType(subQuestionIndex, value as EditSubQuestion["type"])}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mcq_text">MCQ</SelectItem>
                              <SelectItem value="short_answer">Short Answer</SelectItem>
                              <SelectItem value="long_answer">Long Answer</SelectItem>
                              <SelectItem value="true_false">True / False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium">Marks</label>
                          <Input
                            type="number"
                            min={0}
                            value={subQuestion.marks}
                            onChange={(e) => updateEditSubQuestionField(subQuestionIndex, "marks", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Negative Marks</label>
                          <Input
                            type="number"
                            min={0}
                            value={subQuestion.negativeMarks}
                            onChange={(e) => updateEditSubQuestionField(subQuestionIndex, "negativeMarks", e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Question Text</label>
                        <Textarea
                          value={subQuestion.text}
                          onChange={(e) => updateEditSubQuestionField(subQuestionIndex, "text", e.target.value)}
                          className="min-h-[100px] break-words"
                          placeholder="Enter sub-question text"
                        />
                      </div>

                      {editingQuestion?.type === "image_subquestions" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Sub-Question Image</label>
                          {(subQuestion.imagePreviewUrl || subQuestion.mediaUrl) ? (
                            <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start">
                              <img
                                src={subQuestion.imagePreviewUrl || getDisplayMediaSrc(subQuestion.mediaUrl)}
                                alt={subQuestion.text || `Sub-question ${subQuestionIndex + 1}`}
                                className="max-h-36 w-full max-w-[220px] rounded border object-contain"
                              />
                              <div className="space-y-3">
                                <p className="break-words text-xs text-muted-foreground">
                                  {subQuestion.imageFile ? subQuestion.imageFile.name : "Current sub-question image"}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-auto whitespace-normal text-left"
                                    onClick={() => handleEditSubQuestionRemoveImage(subQuestionIndex)}
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Remove image
                                  </Button>
                                  <label
                                    htmlFor={`edit-subquestion-image-${subQuestion.id || subQuestionIndex}`}
                                    className="inline-flex min-h-9 cursor-pointer items-center justify-center whitespace-normal rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                  >
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    Replace image
                                  </label>
                                  <Input
                                    id={`edit-subquestion-image-${subQuestion.id || subQuestionIndex}`}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => handleEditSubQuestionImageChange(subQuestionIndex, e.target.files?.[0] || null)}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-auto whitespace-normal text-left"
                                    onClick={() => handleEditSubQuestionUseExistingImage(subQuestionIndex)}
                                  >
                                    Keep current image
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleEditSubQuestionImageChange(subQuestionIndex, e.target.files?.[0] || null)}
                            />
                          )}
                        </div>
                      )}

                      {subQuestion.type === "mcq_text" ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-medium">Options</label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addEditSubQuestionOption(subQuestionIndex)}>
                              <Plus className="mr-2 h-4 w-4" /> Add Option
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {subQuestion.options.map((option, optionIndex) => (
                              <div key={`${subQuestion.id}-${option.id}-${optionIndex}`} className="grid gap-2 rounded-md border p-3">
                                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                                  <Checkbox
                                    checked={Boolean(option.isCorrect)}
                                    onCheckedChange={() => markEditSubQuestionCorrectOption(subQuestionIndex, optionIndex)}
                                    aria-label={`Mark option ${option.id} as correct`}
                                  />
                                  <Input
                                    value={option.text}
                                    onChange={(e) => handleEditSubQuestionOptionTextChange(subQuestionIndex, optionIndex, e.target.value)}
                                    placeholder={`Option ${option.id}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeEditSubQuestionOption(subQuestionIndex, optionIndex)}
                                    disabled={subQuestion.options.length <= 2}
                                  >
                                    <Trash className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>

                                {(option.imagePreviewUrl || option.mediaUrl) ? (
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                    <img
                                      src={option.imagePreviewUrl || getDisplayMediaSrc(option.mediaUrl)}
                                      alt={`Option ${option.id}`}
                                      className="h-24 w-full max-w-[180px] rounded border object-contain"
                                    />
                                    <div className="space-y-2">
                                      <p className="break-words text-xs text-muted-foreground">
                                        {option.imageFile ? option.imageFile.name : "Current option image"}
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-auto whitespace-normal text-left"
                                          onClick={() => handleEditSubQuestionOptionRemoveImage(subQuestionIndex, optionIndex)}
                                        >
                                          <Trash className="mr-2 h-4 w-4" />
                                          Remove image
                                        </Button>
                                        <label
                                          htmlFor={`edit-subquestion-option-image-${subQuestion.id || subQuestionIndex}-${option.id || optionIndex}`}
                                          className="inline-flex min-h-9 cursor-pointer items-center justify-center whitespace-normal rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                        >
                                          <ImageIcon className="mr-2 h-4 w-4" />
                                          Replace image
                                        </label>
                                        <Input
                                          id={`edit-subquestion-option-image-${subQuestion.id || subQuestionIndex}-${option.id || optionIndex}`}
                                          type="file"
                                          accept="image/*"
                                          className="sr-only"
                                          onChange={(e) => handleEditSubQuestionOptionImageChange(subQuestionIndex, optionIndex, e.target.files?.[0] || null)}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-auto whitespace-normal text-left"
                                          onClick={() => handleEditSubQuestionOptionUseText(subQuestionIndex, optionIndex)}
                                        >
                                          Replace with text
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex min-w-0 items-center gap-2">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    <Input
                                      id={`edit-subquestion-option-image-${subQuestion.id || subQuestionIndex}-${option.id || optionIndex}`}
                                      type="file"
                                      accept="image/*"
                                      className="min-w-0"
                                      onChange={(e) => handleEditSubQuestionOptionImageChange(subQuestionIndex, optionIndex, e.target.files?.[0] || null)}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-medium">Correct Answer</label>
                          <Input
                            value={subQuestion.correctAnswer}
                            onChange={(e) => updateEditSubQuestionField(subQuestionIndex, "correctAnswer", e.target.value)}
                            placeholder="Enter the answer"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editOptions.length > 0 && (
              <div className="min-w-0 space-y-3">
                <label className="text-sm font-medium">Options</label>
                {editOptions.map((option, index) => (
                  <div
                    key={`${option.id || index}-${index}`}
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3"
                  >
                    <Checkbox
                      checked={Boolean(option.isCorrect)}
                      onCheckedChange={() => handleEditCorrectOptionChange(index)}
                      aria-label={`Mark option ${option.id || index + 1} as correct`}
                    />
                    <div className="min-w-0 space-y-2">
                      <Input
                        value={option.text || ""}
                        onChange={(e) => handleEditOptionTextChange(index, e.target.value)}
                        placeholder={`Option ${option.id || index + 1} text`}
                        disabled={Boolean(option.mediaUrl || option.imageFile)}
                        className="min-w-0"
                      />
                      {(option.imagePreviewUrl || option.mediaUrl) && (
                        <div className="flex min-w-0 flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center">
                          <img
                            src={option.imagePreviewUrl || getDisplayMediaSrc(option.mediaUrl)}
                            alt={`Option ${option.id || index + 1}`}
                            className="h-24 w-full max-w-full rounded border object-contain sm:w-32"
                          />
                          <div className="min-w-0 flex-1 space-y-3">
                            <p className="break-words text-xs text-muted-foreground">
                              {option.imageFile ? option.imageFile.name : "Current option image"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-auto whitespace-normal text-left"
                                onClick={() => handleEditOptionRemoveImage(index)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Remove image
                              </Button>
                              <label
                                htmlFor={`edit-option-image-${option.id || index}`}
                                className="inline-flex min-h-9 cursor-pointer items-center justify-center whitespace-normal rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                              >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Replace image
                              </label>
                              <Input
                                id={`edit-option-image-${option.id || index}`}
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => handleEditOptionImageChange(index, e.target.files?.[0] || null)}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-auto whitespace-normal text-left"
                                onClick={() => handleEditOptionUseText(index)}
                              >
                                Replace with text
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      {!(option.imagePreviewUrl || option.mediaUrl) && (
                        <div className="flex min-w-0 items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`edit-option-image-${option.id || index}`}
                            type="file"
                            accept="image/*"
                            className="min-w-0"
                            onChange={(e) => handleEditOptionImageChange(index, e.target.files?.[0] || null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Topic</label>
              <Select value={editTopicId || "none"} onValueChange={(value) => setEditTopicId(value === "none" ? "" : value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No topic</SelectItem>
                  {topics.map((topic) => (
                    <SelectItem key={String(topic._id || topic.id)} value={String(topic._id || topic.id)}>
                      {topic.name} ({getClassNameById(topic.classId)}, {getSubjectNameById(topic.subjectId)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
