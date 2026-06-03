"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Info, Loader2, RefreshCw, UploadCloud } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CLASSES, SUBJECTS } from "@/lib/data";
import {
  ExcelPackageHistoryItem,
  convertDocxToExcelZipApi,
  downloadExcelPackageApi,
  fetchExcelPackageHistoryApi,
  fetchTopicsApi,
} from "@/utils/apis";

const MAX_FILE_SIZE_MB = 50;
const HISTORY_PAGE_SIZE = 5;

const saveBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

type TopicOption = {
  _id?: string;
  id?: string;
  name: string;
};

const getTopicValue = (topic: TopicOption) => String(topic._id || topic.id || topic.name || "");

export default function DocxToExcelPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [history, setHistory] = useState<ExcelPackageHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [activeDownload, setActiveDownload] = useState<string | null>(null);

  const subjects = useMemo(
    () => SUBJECTS.filter((subject) => (!classId ? true : subject.classLevels.includes(classId))),
    [classId]
  );

  const selectedTopic = useMemo(
    () => topics.find((topic) => getTopicValue(topic) === topicId),
    [topicId, topics]
  );

  const hasTopicContext = Boolean(classId && subjectId);
  const hasTopics = topics.length > 0;
  const historyTotalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedHistory = useMemo(() => {
    const start = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE;
    return history.slice(start, start + HISTORY_PAGE_SIZE);
  }, [currentHistoryPage, history]);
  const historyStartItem = history.length === 0 ? 0 : (currentHistoryPage - 1) * HISTORY_PAGE_SIZE + 1;
  const historyEndItem = Math.min(currentHistoryPage * HISTORY_PAGE_SIZE, history.length);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await fetchExcelPackageHistoryApi(100);
      setHistory(Array.isArray(result.packages) ? result.packages : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setTopicId("");

    if (!classId || !subjectId) {
      setTopics([]);
      setTopicsLoading(false);
      return;
    }

    let cancelled = false;

    const loadTopics = async () => {
      try {
        setTopicsLoading(true);
        const result: any = await fetchTopicsApi({ classId, subjectId });
        if (!cancelled) {
          setTopics(Array.isArray(result?.topics) ? result.topics : []);
        }
      } catch {
        if (!cancelled) {
          setTopics([]);
        }
      } finally {
        if (!cancelled) {
          setTopicsLoading(false);
        }
      }
    };

    loadTopics();

    return () => {
      cancelled = true;
    };
  }, [classId, subjectId]);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    setHistoryPage(1);
  }, [history.length]);

  const validateFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return "Please upload a DOCX file.";
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `DOCX must be ${MAX_FILE_SIZE_MB} MB or smaller.`;
    }

    return "";
  };

  const handleFile = (file: File | null) => {
    setError("");

    if (!file) {
      setSelectedFile(null);
      setStatus("idle");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setStatus("error");
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setStatus("idle");
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0] || null);
  };

  const generatePackage = async () => {
    if (!selectedFile) {
      setStatus("error");
      setError("Choose a DOCX file first.");
      return;
    }

    if (!classId || !subjectId || !topicId) {
      setStatus("error");
      setError("Select class, subject, and an existing topic before generating the upload package.");
      return;
    }

    try {
      setStatus("uploading");
      setError("");
      const blob = await convertDocxToExcelZipApi(selectedFile, {
        classId,
        subjectId,
        topicId,
        difficulty,
        marks: 1,
        negativeMarks: 0,
      });
      saveBlob(blob, `${classId}_${subjectId}_${selectedTopic?.name || "topic"}_excel_upload_package.zip`);
      setStatus("success");
      loadHistory();
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "DOCX upload package generation failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">DOCX to Excel</h2>
        <p className="text-muted-foreground">
          Convert Word question files into upload-ready Excel templates and image assets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Word to Excel Upload Package</CardTitle>
          <CardDescription>
            Upload a DOCX question file to generate text MCQ, image MCQ, paragraph, image
            subquestion Excel files, image references, and images.zip when images are present.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <select
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value);
                  setSubjectId("");
                }}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select class</option>
                {CLASSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <select
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                disabled={!classId}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select subject</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <select
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                disabled={!hasTopicContext || topicsLoading || !hasTopics}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {topicsLoading
                    ? "Loading topics..."
                    : hasTopicContext
                      ? hasTopics
                        ? "Select topic"
                        : "No topics found"
                      : "Select class and subject"}
                </option>
                {topics.map((topic) => (
                  <option key={getTopicValue(topic)} value={getTopicValue(topic)}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {hasTopicContext && !topicsLoading && !hasTopics && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No topic found</AlertTitle>
              <AlertDescription>
                Add a topic for this class and subject from the Topics page before generating Excel files.
              </AlertDescription>
            </Alert>
          )}

          <div
            className={`flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold">Drop your DOCX here</h3>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Maximum size: {MAX_FILE_SIZE_MB} MB.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0] || null)}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={status === "uploading"}>
              Select DOCX
            </Button>
          </div>

          {selectedFile && (
            <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                onClick={generatePackage}
                disabled={status === "uploading" || !selectedFile || !topicId || !hasTopics}
              >
                {status === "uploading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate Upload Package
                  </>
                )}
              </Button>
            </div>
          )}

          {status === "error" && error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Package generation failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Upload package ready</AlertTitle>
              <AlertDescription>
                The ZIP contains the generated Excel files and image assets.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Previous Upload Packages</CardTitle>
            <CardDescription>Recent DOCX to Excel packages generated from Word and PDF flows.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
            {historyLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Excel packages generated yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {historyStartItem}-{historyEndItem} of {history.length} package(s)
                </span>
                <span>
                  Page {currentHistoryPage} of {historyTotalPages}
                </span>
              </div>

              {paginatedHistory.map((item) => (
                <div
                  key={item.job_id}
                  className="flex flex-col gap-3 rounded-lg border bg-card p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <p className="truncate text-sm font-medium">{item.original_filename}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{item.created_at ? new Date(item.created_at).toLocaleString() : "No date"}</span>
                      <span className="capitalize">{item.status}</span>
                      <span>{item.source_type?.startsWith("pdf") ? "PDF to Excel" : "DOCX to Excel"}</span>
                      {item.topic_id ? <span>Topic: {item.topic_id}</span> : null}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={async () => {
                      const downloadKey = `package:${item.job_id}`;
                      try {
                        setActiveDownload(downloadKey);
                        const blob = await downloadExcelPackageApi(item.job_id);
                        saveBlob(blob, `${item.original_filename.replace(/\.[^.]+$/, "")}-excel-import-files.zip`);
                      } catch (err: any) {
                        setStatus("error");
                        setError(err?.message || "Excel package download failed.");
                      } finally {
                        setActiveDownload(null);
                      }
                    }}
                    disabled={item.status === "failed" || activeDownload === `package:${item.job_id}`}
                  >
                    {activeDownload === `package:${item.job_id}` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {activeDownload === `package:${item.job_id}` ? "Downloading..." : "Download ZIP"}
                  </Button>
                </div>
              ))}

              {historyTotalPages > 1 && (
                <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Use pagination to keep generated packages easy to review.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                      disabled={currentHistoryPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))}
                      disabled={currentHistoryPage >= historyTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
