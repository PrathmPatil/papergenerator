"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Edit, Plus, Search, Trash } from "lucide-react";

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
import { createTopicApi, deleteTopicApi, fetchTopicsApi, updateTopicApi } from "@/utils/apis";
import { showConfirm, showInfo } from "@/components/app-dialog-provider";

type TopicRow = {
  _id?: string;
  id?: string;
  name: string;
  classId: string;
  subjectId: string;
  questionCount?: number;
};

const ALL = "all";
const DEFAULT_RECORDS_PER_PAGE = 10;

export default function TopicsPage() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const [filterClass, setFilterClass] = useState(ALL);
  const [filterSubject, setFilterSubject] = useState(ALL);
  const [filterSearch, setFilterSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(DEFAULT_RECORDS_PER_PAGE);

  const [newClassId, setNewClassId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTopicName, setNewTopicName] = useState("");

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
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Loading topics...
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
