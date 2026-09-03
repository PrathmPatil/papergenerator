"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Edit, FileSpreadsheet, Plus, Search, Trash, Upload, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CLASSES, getClassNameById, getSubjectNameById, SUBJECTS } from "@/lib/data";
import {
  bulkUploadTopicsApi,
  createTopicApi,
  deleteTopicApi,
  fetchTopicsApi,
  updateTopicApi,
} from "@/utils/apis";
import { showConfirm, showInfo } from "@/components/app-dialog-provider";
import { LoadingPanel } from "@/components/loading";

type TopicRow = {
  _id?: string;
  id?: string;
  name: string;
  classId: string;
  subjectId: string;
  questionCount?: number;
};

type BulkUploadSummary = {
  importedCount?: number;
  skippedCount?: number;
  skipped?: Array<{ row: number; name: string; classId?: string; subjectId?: string; reason: string }>;
  errors?: Array<{ row: number; message: string }>;
};

const ALL = "all";
const DEFAULT_RECORDS_PER_PAGE = 10;

export default function TopicsPage() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);

  const [filterClass, setFilterClass] = useState(ALL);
  const [filterSubject, setFilterSubject] = useState(ALL);
  const [filterSearch, setFilterSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(DEFAULT_RECORDS_PER_PAGE);

  const [newClassId, setNewClassId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadSummary, setBulkUploadSummary] = useState<BulkUploadSummary | null>(null);
  const [bulkInputKey, setBulkInputKey] = useState(0);

  const [editingTopic, setEditingTopic] = useState<TopicRow | null>(null);
  const [editClassId, setEditClassId] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editTopicName, setEditTopicName] = useState("");

  const addSubjects = useMemo(
    () =>
      SUBJECTS.filter((subject) =>
        !newClassId ? true : subject.classLevels.includes(newClassId)
      ),
    [newClassId]
  );

  const filterSubjects = useMemo(
    () =>
      SUBJECTS.filter((subject) =>
        filterClass === ALL ? true : subject.classLevels.includes(filterClass)
      ),
    [filterClass]
  );

  const editSubjects = useMemo(
    () =>
      SUBJECTS.filter((subject) =>
        !editClassId ? true : subject.classLevels.includes(editClassId)
      ),
    [editClassId]
  );

  const totalPages = Math.max(1, Math.ceil(topics.length / recordsPerPage));
  const paginatedTopics = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return topics.slice(start, start + recordsPerPage);
  }, [currentPage, recordsPerPage, topics]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const res: any = await fetchTopicsApi({
        ...(filterClass !== ALL ? { classId: filterClass } : {}),
        ...(filterSubject !== ALL ? { subjectId: filterSubject } : {}),
        ...(filterSearch.trim() ? { search: filterSearch.trim() } : {}),
      });

      setTopics(Array.isArray(res?.topics) ? res.topics : []);
    } catch (error) {
      console.error("Failed to load topics", error);
      toast({
        variant: "destructive",
        title: "Failed to load topics",
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadTopics();
  }, [filterClass, filterSubject]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadTopics();
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const res: any = await fetchTopicsApi({
        ...(filterClass !== ALL ? { classId: filterClass } : {}),
        ...(filterSubject !== ALL ? { subjectId: filterSubject } : {}),
        ...(filterSearch.trim() ? { search: filterSearch.trim() } : {}),
      });

      const exportTopics: TopicRow[] = Array.isArray(res?.topics) ? res.topics : topics;
      if (exportTopics.length === 0) {
        showInfo({
          title: "No topics found",
          description: "No topics match the selected filters.",
        });
        return;
      }

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 12;
      const pageTop = 14;
      const pageBottom = 12;
      const tableWidth = pageWidth - marginX * 2;
      let y = pageTop;

      const className = filterClass === ALL ? "All Classes" : getClassNameById(filterClass);
      const subjectName = filterSubject === ALL ? "All Subjects" : getSubjectNameById(filterSubject);
      const searchName = filterSearch.trim() || "All Topics";

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("Topics", marginX, y);
      y += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);

      const addWrappedText = (text: string, maxWidth: number) => {
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach((line: string) => {
          if (y > pageHeight - pageBottom) {
            pdf.addPage();
            y = pageTop;
          }
          pdf.text(line, marginX, y);
          y += 4;
        });
      };

      addWrappedText(`Class: ${className} | Subject: ${subjectName} | Search: ${searchName}`, tableWidth);
      addWrappedText(`Total Topics: ${exportTopics.length}`, tableWidth);
      y += 2;

      const columns = [
        { label: "No.", width: 12 },
        { label: "Class", width: 36 },
        { label: "Subject", width: 44 },
        { label: "Topic", width: 78 },
        { label: "Questions", width: 16 },
      ];
      const cellPadding = 1.6;
      const headerHeight = 8;
      const rowLineHeight = 4;
      const minRowHeight = 8;

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
        const text = toPdfText(value);
        if (!text) return [""];

        return text
          .split(/\n+/)
          .flatMap((line) => pdf.splitTextToSize(line, Math.max(1, width - cellPadding * 2)))
          .map((line: string) => String(line || "").trimEnd());
      };

      const drawCellText = (lines: string[], x: number, top: number, width: number) => {
        lines.forEach((line, index) => {
          if (!line) return;
          pdf.text(line, x + cellPadding, top + cellPadding + 2.6 + index * rowLineHeight, {
            maxWidth: width - cellPadding * 2,
          });
        });
      };

      const drawTableHeader = () => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setDrawColor(0, 0, 0);
        pdf.setTextColor(0, 0, 0);
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

      const drawTopicRow = (topic: TopicRow, index: number) => {
        const values = [
          String(index + 1),
          getClassNameById(topic.classId),
          getSubjectNameById(topic.subjectId),
          topic.name,
          String(topic.questionCount || 0),
        ];
        const wrappedCells = values.map((value, cellIndex) =>
          wrapTextForCell(value, columns[cellIndex].width)
        );
        const maxLines = Math.max(...wrappedCells.map((lines) => lines.length), 1);
        const rowHeight = Math.max(minRowHeight, maxLines * rowLineHeight + cellPadding * 2 + 1.4);

        ensureSpace(rowHeight);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setDrawColor(0, 0, 0);
        pdf.setTextColor(0, 0, 0);

        let x = marginX;
        wrappedCells.forEach((lines, cellIndex) => {
          pdf.rect(x, y, columns[cellIndex].width, rowHeight);
          drawCellText(lines, x, y, columns[cellIndex].width);
          x += columns[cellIndex].width;
        });

        y += rowHeight;
      };

      drawTableHeader();
      exportTopics.forEach((topic, index) => drawTopicRow(topic, index));

      const safeName = [className, subjectName, searchName]
        .join("-")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
      pdf.save(`topics-${safeName || "report"}.pdf`);
    } catch (error) {
      console.error("Topics PDF export failed", error);
      showInfo({
        title: "PDF download failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadSampleFile = async () => {
    try {
      setIsDownloadingSample(true);

      const sampleRows = [
        { class: "Class 8", subject: "Science", topic: "Force and Pressure" },
        { class: "Class 8", subject: "Science", topic: "Friction" },
        { class: "Class 9", subject: "Mathematics", topic: "Polynomials" },
        { class: "Class 10", subject: "English", topic: "Grammar" },
        { class: "Class 7", subject: "History", topic: "Medieval India" },
      ];

      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(sampleRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Topics");

      const workbookArray = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([workbookArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "topics-bulk-upload-sample.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Sample file download failed", error);
      toast({
        variant: "destructive",
        title: "Sample file download failed",
        description: "Please try again.",
      });
    } finally {
      setIsDownloadingSample(false);
    }
  };

  const handleAddTopic = async () => {
    const topicName = newTopicName.trim();

    if (!newClassId || !newSubjectId || !topicName) {
      toast({
        variant: "destructive",
        title: "Topic details required",
        description: "Select class, select subject, then enter the topic name.",
      });
      return;
    }

    try {
      setSaving(true);
      const res: any = await createTopicApi({
        classId: newClassId,
        subjectId: newSubjectId,
        name: topicName,
      });

      if (!res?.topic) {
        throw new Error(res?.message || "Unable to add topic");
      }

      setNewTopicName("");
      toast({
        title: res?.existed ? "Topic already exists" : "Topic added",
        description: `${topicName} is available for upload and paper generation.`,
      });
      await loadTopics();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to add topic",
        description: error?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetBulkUpload = () => {
    setBulkFile(null);
    setBulkInputKey((value) => value + 1);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast({
        variant: "destructive",
        title: "Bulk upload details required",
        description: "Select an Excel file before uploading.",
      });
      return;
    }

    const isExcelFile =
      /\.xlsx?$/i.test(bulkFile.name) ||
      [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ].includes(bulkFile.type);

    if (!isExcelFile) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Upload a valid .xlsx or .xls Excel file.",
      });
      return;
    }

    try {
      setBulkUploading(true);
      setBulkUploadSummary(null);

      const formData = new FormData();
      formData.append("file", bulkFile);

      const res: any = await bulkUploadTopicsApi(formData);

      if (!res?.success) {
        setBulkUploadSummary({
          errors: Array.isArray(res?.errors) ? res.errors : [],
          skipped: Array.isArray(res?.skipped) ? res.skipped : [],
          skippedCount: res?.skippedCount || 0,
          importedCount: res?.importedCount || 0,
        });
        throw new Error(res?.message || "Bulk upload failed");
      }

      setBulkUploadSummary({
        importedCount: res?.importedCount || 0,
        skippedCount: res?.skippedCount || 0,
        skipped: Array.isArray(res?.skipped) ? res.skipped : [],
      });
      toast({
        title: "Topics uploaded",
        description: res?.message || "Bulk topic upload completed.",
      });
      resetBulkUpload();
      await loadTopics();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Bulk upload failed",
        description: error?.message || "Please fix the Excel file and try again.",
      });
    } finally {
      setBulkUploading(false);
    }
  };

  const openEdit = (topic: TopicRow) => {
    setEditingTopic(topic);
    setEditClassId(topic.classId);
    setEditSubjectId(topic.subjectId);
    setEditTopicName(topic.name);
  };

  const handleUpdateTopic = async () => {
    if (!editingTopic) return;

    const id = editingTopic._id || editingTopic.id;
    const topicName = editTopicName.trim();

    if (!id || !editClassId || !editSubjectId || !topicName) {
      toast({
        variant: "destructive",
        title: "Topic details required",
        description: "Class, subject, and topic name are required.",
      });
      return;
    }

    try {
      setSaving(true);
      const res: any = await updateTopicApi(id, {
        classId: editClassId,
        subjectId: editSubjectId,
        name: topicName,
      });

      if (!res?.topic) {
        throw new Error(res?.message || "Unable to update topic");
      }

      setEditingTopic(null);
      toast({
        title: res?.merged ? "Topics merged" : "Topic updated",
        description: res?.merged
          ? `${res?.movedQuestionCount || 0} question(s) moved to the existing topic.`
          : `${res?.movedQuestionCount || 0} question(s) updated with the topic class and subject.`,
      });
      await loadTopics();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update topic",
        description: error?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async (topic: TopicRow) => {
    const id = topic._id || topic.id;
    if (!id) return;

    const confirmed = await showConfirm({
      title: "Delete topic?",
      description: `Delete topic "${topic.name}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      const res: any = await deleteTopicApi(id);

      if (!res?.success) {
        throw new Error(res?.message || "Unable to delete topic");
      }

      toast({ title: "Topic deleted", description: `${topic.name} was removed.` });
      await loadTopics();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete topic",
        description: error?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Topics</h2>
          <p className="text-muted-foreground">
            Manage approved topic names for Excel uploads and paper generation.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleDownloadSampleFile}
            disabled={isDownloadingSample}
            className="gap-2 md:mt-1"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isDownloadingSample ? "Preparing..." : "Download Sample Excel"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={loading || isDownloadingPdf}
            className="gap-2 md:mt-1"
          >
            <Download className="h-4 w-4" />
            {isDownloadingPdf ? "Preparing..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[1fr_1fr_1.4fr_auto]">
        <div className="space-y-2">
          <Label>Class</Label>
          <Select
            value={filterClass}
            onValueChange={(value) => {
              setFilterClass(value);
              setFilterSubject(ALL);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All classes</SelectItem>
              {CLASSES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All subjects</SelectItem>
              {filterSubjects.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Topic name</Label>
          <Input
            value={filterSearch}
            onChange={(event) => setFilterSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
            placeholder="Search topic"
          />
        </div>

        <div className="flex items-end">
          <Button onClick={handleSearch} className="w-full gap-2 md:w-auto">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[1fr_1fr_1.4fr_auto]">
        <div className="space-y-2">
          <Label>Class</Label>
          <Select
            value={newClassId}
            onValueChange={(value) => {
              setNewClassId(value);
              setNewSubjectId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {CLASSES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={newSubjectId} onValueChange={setNewSubjectId} disabled={!newClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {addSubjects.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Topic name</Label>
          <Input
            value={newTopicName}
            onChange={(event) => setNewTopicName(event.target.value)}
            disabled={!newClassId || !newSubjectId}
            placeholder="Enter topic name"
          />
        </div>

        <div className="flex items-end">
          <Button onClick={handleAddTopic} disabled={saving} className="w-full gap-2 md:w-auto">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[1.8fr_auto]">
        <div className="space-y-2">
          <Label>Excel file</Label>
          <Input
            key={bulkInputKey}
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => {
              setBulkFile(event.target.files?.[0] || null);
              setBulkUploadSummary(null);
            }}
            disabled={bulkUploading}
          />
          <p className="text-xs text-muted-foreground">
            Excel should contain one topic per row with columns for <strong>class</strong>,{" "}
            <strong>subject</strong>, and <strong>topic</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Supported headers: <strong>class</strong>/<strong>classId</strong>/<strong>standard</strong>,
            <strong> subject</strong>/<strong>subjectId</strong>, and{" "}
            <strong>topic</strong>/<strong>topicName</strong>/<strong>name</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Validation checks class, subject, topic name, duplicates in file, duplicates already
            in the system, and topic name length. Mixed classes and subjects are allowed in one file.
          </p>
        </div>

        <div className="flex items-end">
          <Button
            onClick={handleBulkUpload}
            disabled={bulkUploading}
            className="w-full gap-2 md:w-auto"
          >
            <Upload className="h-4 w-4" />
            {bulkUploading ? "Uploading..." : "Upload Excel"}
          </Button>
        </div>
      </div>

      {bulkUploadSummary && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-base font-semibold">Bulk upload summary</h3>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p>Imported: {bulkUploadSummary.importedCount || 0}</p>
            <p>Skipped existing: {bulkUploadSummary.skippedCount || 0}</p>
            <p>Validation errors: {bulkUploadSummary.errors?.length || 0}</p>
          </div>

          {bulkUploadSummary.errors && bulkUploadSummary.errors.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-destructive">Validation errors</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {bulkUploadSummary.errors.slice(0, 15).map((item, index) => (
                  <li key={`${item.row}-${index}`}>
                    Row {item.row}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bulkUploadSummary.skipped && bulkUploadSummary.skipped.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Skipped existing topics</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {bulkUploadSummary.skipped.slice(0, 15).map((item, index) => (
                  <li key={`${item.row}-${item.name}-${index}`}>
                    Row {item.row}: {item.name}
                    {item.classId || item.subjectId
                      ? ` [${item.classId || "?"} / ${item.subjectId || "?"}]`
                      : ""}
                    {" "}({item.reason})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead className="text-right">Questions</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <LoadingPanel label="Loading topics..." icon={Tags} size="md" />
                </TableCell>
              </TableRow>
            ) : topics.length > 0 ? (
              paginatedTopics.map((topic) => (
                <TableRow key={topic._id || topic.id}>
                  <TableCell>{getClassNameById(topic.classId)}</TableCell>
                  <TableCell>{getSubjectNameById(topic.subjectId)}</TableCell>
                  <TableCell className="font-medium">{topic.name}</TableCell>
                  <TableCell className="text-right">{topic.questionCount || 0}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEdit(topic)}
                        aria-label="Edit topic"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteTopic(topic)}
                        aria-label="Delete topic"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No topics found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {topics.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableHead colSpan={5}>
                  <div className="flex w-full flex-col gap-3 p-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * recordsPerPage + 1}-
                      {Math.min(currentPage * recordsPerPage, topics.length)} of {topics.length}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((page) => page - 1)}
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
                        onClick={() => setCurrentPage((page) => page + 1)}
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
                          <SelectItem value="5">5 per page</SelectItem>
                          <SelectItem value="10">10 per page</SelectItem>
                          <SelectItem value="20">20 per page</SelectItem>
                          <SelectItem value="50">50 per page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TableHead>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <Dialog open={Boolean(editingTopic)} onOpenChange={(open) => !open && setEditingTopic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={editClassId}
                onValueChange={(value) => {
                  setEditClassId(value);
                  setEditSubjectId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={editSubjectId} onValueChange={setEditSubjectId} disabled={!editClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {editSubjects.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic name</Label>
              <Input value={editTopicName} onChange={(event) => setEditTopicName(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTopic(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTopic} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
