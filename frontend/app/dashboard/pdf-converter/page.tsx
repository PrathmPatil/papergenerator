"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  ImageIcon,
  Info,
  Loader2,
  RefreshCw,
  UploadCloud,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  PdfConversionImageListResponse,
  PdfConversionResponse,
  convertPdfToDocxApi,
  convertPdfConversionToExcelZipApi,
  downloadPdfConversionDocxApi,
  downloadPdfConversionImageApi,
  downloadPdfConversionImagesZipApi,
  downloadPdfConversionPdfApi,
  fetchPdfConversionImagesApi,
  fetchPdfConversionsApi,
  fetchTopicsApi,
} from "@/utils/apis";
import { CLASSES, SUBJECTS } from "@/lib/data";

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

const getSafeFileName = (fileName = "converted") =>
  fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "_") || "converted";

export default function PdfConverterPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conversion, setConversion] = useState<PdfConversionResponse | null>(null);
  const [history, setHistory] = useState<PdfConversionResponse[]>([]);
  const [images, setImages] = useState<PdfConversionImageListResponse["images"]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [activeDownload, setActiveDownload] = useState<string | null>(null);
  const [pdfExcelClassId, setPdfExcelClassId] = useState("");
  const [pdfExcelSubjectId, setPdfExcelSubjectId] = useState("");
  const [pdfExcelTopicId, setPdfExcelTopicId] = useState("");
  const [pdfExcelTopics, setPdfExcelTopics] = useState<TopicOption[]>([]);
  const [pdfExcelTopicsLoading, setPdfExcelTopicsLoading] = useState(false);
  const [pdfExcelDifficulty, setPdfExcelDifficulty] = useState("medium");
  const [pdfExcelStatus, setPdfExcelStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [pdfExcelError, setPdfExcelError] = useState("");

  const convertedBaseName = useMemo(
    () => getSafeFileName(conversion?.original_filename || selectedFile?.name || "converted"),
    [conversion?.original_filename, selectedFile?.name]
  );

  const historyDates = useMemo(
    () =>
      Array.from(
        new Set(
          history
            .map((item) => (item.created_at ? item.created_at.slice(0, 10) : ""))
            .filter(Boolean)
        )
      ),
    [history]
  );

  const filteredHistory = useMemo(() => {
    if (!selectedHistoryDate) return history;
    return history.filter((item) => item.created_at?.startsWith(selectedHistoryDate));
  }, [history, selectedHistoryDate]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedHistory = useMemo(() => {
    const start = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE;
    return filteredHistory.slice(start, start + HISTORY_PAGE_SIZE);
  }, [currentHistoryPage, filteredHistory]);
  const historyStartItem = filteredHistory.length === 0 ? 0 : (currentHistoryPage - 1) * HISTORY_PAGE_SIZE + 1;
  const historyEndItem = Math.min(currentHistoryPage * HISTORY_PAGE_SIZE, filteredHistory.length);

  const pdfExcelSubjects = useMemo(
    () =>
      SUBJECTS.filter((subject) =>
        !pdfExcelClassId ? true : subject.classLevels.includes(pdfExcelClassId)
      ),
    [pdfExcelClassId]
  );

  const selectedPdfExcelTopic = useMemo(
    () => pdfExcelTopics.find((topic) => getTopicValue(topic) === pdfExcelTopicId),
    [pdfExcelTopicId, pdfExcelTopics]
  );

  const hasPdfExcelTopicContext = Boolean(pdfExcelClassId && pdfExcelSubjectId);
  const hasPdfExcelTopics = pdfExcelTopics.length > 0;

  const validateFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return "Please upload a PDF file.";
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `PDF must be ${MAX_FILE_SIZE_MB} MB or smaller.`;
    }

    return "";
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const result = await fetchPdfConversionsApi(100);
      setHistory(Array.isArray(result.conversions) ? result.conversions : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedHistoryDate, history.length]);

  useEffect(() => {
    setPdfExcelTopicId("");

    if (!pdfExcelClassId || !pdfExcelSubjectId) {
      setPdfExcelTopics([]);
      setPdfExcelTopicsLoading(false);
      return;
    }

    let cancelled = false;

    const loadTopics = async () => {
      try {
        setPdfExcelTopicsLoading(true);
        const result: any = await fetchTopicsApi({
          classId: pdfExcelClassId,
          subjectId: pdfExcelSubjectId,
        });
        if (!cancelled) {
          setPdfExcelTopics(Array.isArray(result?.topics) ? result.topics : []);
        }
      } catch {
        if (!cancelled) {
          setPdfExcelTopics([]);
        }
      } finally {
        if (!cancelled) {
          setPdfExcelTopicsLoading(false);
        }
      }
    };

    loadTopics();

    return () => {
      cancelled = true;
    };
  }, [pdfExcelClassId, pdfExcelSubjectId]);

  const handleFile = (file: File | null) => {
    setConversion(null);
    setImages([]);
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

  const handleConvert = async () => {
    if (!selectedFile) {
      setStatus("error");
      setError("Choose a PDF file first.");
      return;
    }

    setStatus("uploading");
    setError("");
    setConversion(null);
    setImages([]);

    try {
      const result = await convertPdfToDocxApi(selectedFile);

      if (!result?.job_id || result?.status === "failed") {
        setStatus("error");
        setError(result?.error || "PDF conversion failed.");
        return;
      }

      setConversion(result);
      setStatus("success");
      loadHistory();

      try {
        const imageResult = await fetchPdfConversionImagesApi(result.job_id);
        setImages(Array.isArray(imageResult.images) ? imageResult.images : []);
      } catch {
        setImages([]);
      }
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "PDF conversion service is unavailable.");
    }
  };

  const downloadDocx = async () => {
    if (!conversion?.job_id) return;
    const downloadKey = `docx:${conversion.job_id}`;
    try {
      setActiveDownload(downloadKey);
      const blob = await downloadPdfConversionDocxApi(conversion.job_id);
      saveBlob(blob, `${convertedBaseName}.docx`);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "DOCX download failed.");
    } finally {
      setActiveDownload(null);
    }
  };

  const downloadOriginalPdf = async () => {
    if (!conversion?.job_id) return;
    const downloadKey = `pdf:${conversion.job_id}`;
    try {
      setActiveDownload(downloadKey);
      const blob = await downloadPdfConversionPdfApi(conversion.job_id);
      saveBlob(blob, conversion.original_filename || `${convertedBaseName}.pdf`);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "PDF download failed.");
    } finally {
      setActiveDownload(null);
    }
  };

  const downloadImage = async (imageName: string) => {
    if (!conversion?.job_id) return;
    const downloadKey = `image:${conversion.job_id}:${imageName}`;
    try {
      setActiveDownload(downloadKey);
      const blob = await downloadPdfConversionImageApi(conversion.job_id, imageName);
      saveBlob(blob, imageName);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Image download failed.");
    } finally {
      setActiveDownload(null);
    }
  };

  const downloadImagesZip = async () => {
    if (!conversion?.job_id) return;
    const downloadKey = `images-zip:${conversion.job_id}`;
    try {
      setActiveDownload(downloadKey);
      const blob = await downloadPdfConversionImagesZipApi(conversion.job_id);
      saveBlob(blob, `${convertedBaseName}-images.zip`);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Images ZIP download failed.");
    } finally {
      setActiveDownload(null);
    }
  };

  const generatePdfExcelPackage = async () => {
    if (!selectedFile && !conversion?.job_id) {
      setPdfExcelStatus("error");
      setPdfExcelError("Choose a PDF file or open a previous PDF conversion first.");
      return;
    }

    if (!pdfExcelClassId || !pdfExcelSubjectId || !pdfExcelTopicId) {
      setPdfExcelStatus("error");
      setPdfExcelError("Select class, subject, and an existing topic before generating the Excel package.");
      return;
    }

    try {
      setPdfExcelStatus("uploading");
      setPdfExcelError("");
      let conversionJobId = conversion?.job_id || "";

      if (!conversionJobId && selectedFile) {
        setStatus("uploading");
        const converted = await convertPdfToDocxApi(selectedFile);

        if (!converted?.job_id || converted?.status === "failed") {
          setStatus("error");
          throw new Error(converted?.error || "PDF to DOCX conversion failed.");
        }

        conversionJobId = converted.job_id;
        setConversion(converted);
        setStatus("success");
        loadHistory();

        try {
          const imageResult = await fetchPdfConversionImagesApi(converted.job_id);
          setImages(Array.isArray(imageResult.images) ? imageResult.images : []);
        } catch {
          setImages([]);
        }
      }

      const blob = await convertPdfConversionToExcelZipApi(conversionJobId, {
        classId: pdfExcelClassId,
        subjectId: pdfExcelSubjectId,
        topicId: pdfExcelTopicId,
        difficulty: pdfExcelDifficulty,
        marks: 1,
        negativeMarks: 0,
      });
      saveBlob(blob, `${pdfExcelClassId}_${pdfExcelSubjectId}_${selectedPdfExcelTopic?.name || "topic"}_pdf_excel_package.zip`);
      setPdfExcelStatus("success");
    } catch (err: any) {
      setPdfExcelStatus("error");
      setPdfExcelError(err?.message || "PDF Excel package generation failed.");
    }
  };

  const openHistoryItem = async (item: PdfConversionResponse) => {
    setConversion(item);
    setSelectedFile(null);
    setStatus(item.status === "failed" ? "error" : "success");
    setError(item.error || "");

    if (item.status !== "failed") {
      try {
        const imageResult = await fetchPdfConversionImagesApi(item.job_id);
        setImages(Array.isArray(imageResult.images) ? imageResult.images : []);
      } catch {
        setImages([]);
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0] || null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
        <h2 className="text-3xl font-bold tracking-tight">PDF Converter</h2>
        <p className="text-muted-foreground">
            Convert uploaded PDFs into DOCX files and download extracted image assets.
        </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>
              Select a PDF file to generate a DOCX version and extract embedded images.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition-colors ${
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
              <h3 className="text-base font-semibold">Drop your PDF here</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                or browse from your computer. Maximum size: {MAX_FILE_SIZE_MB} MB.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0] || null)}
              />
              <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={status === "uploading"}>
                Select PDF
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
                <Button className="sm:w-auto" onClick={handleConvert} disabled={status === "uploading"}>
                  {status === "uploading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    "Convert to DOCX"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Current conversion state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "idle" && (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                Select a PDF to begin conversion.
              </div>
            )}

            {status === "uploading" && (
              <div className="space-y-3">
                <Progress value={65} />
                <p className="text-sm text-muted-foreground">
                  Uploading and converting. Large PDFs can take a little while.
                </p>
              </div>
            )}

            {status === "error" && error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Conversion failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {status === "success" && conversion && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Conversion completed</AlertTitle>
                <AlertDescription>{conversion.original_filename}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PDF Question Bank Excel Package</CardTitle>
          <CardDescription>
            Uses the generated DOCX from PDF conversion, then runs the same upload package
            generator as the working Word to Excel flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <select
                value={pdfExcelClassId}
                onChange={(event) => {
                  setPdfExcelClassId(event.target.value);
                  setPdfExcelSubjectId("");
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
                value={pdfExcelSubjectId}
                onChange={(event) => setPdfExcelSubjectId(event.target.value)}
                disabled={!pdfExcelClassId}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select subject</option>
                {pdfExcelSubjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <select
                value={pdfExcelTopicId}
                onChange={(event) => setPdfExcelTopicId(event.target.value)}
                disabled={!hasPdfExcelTopicContext || pdfExcelTopicsLoading || !hasPdfExcelTopics}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {pdfExcelTopicsLoading
                    ? "Loading topics..."
                    : hasPdfExcelTopicContext
                      ? hasPdfExcelTopics
                        ? "Select topic"
                        : "No topics found"
                      : "Select class and subject"}
                </option>
                {pdfExcelTopics.map((topic) => (
                  <option key={getTopicValue(topic)} value={getTopicValue(topic)}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <select
                value={pdfExcelDifficulty}
                onChange={(event) => setPdfExcelDifficulty(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {hasPdfExcelTopicContext && !pdfExcelTopicsLoading && !hasPdfExcelTopics && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No topic found</AlertTitle>
              <AlertDescription>
                Add a topic for this class and subject from the Topics page before generating Excel files.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {selectedFile ? selectedFile.name : "Select a PDF above to generate upload-ready Excel files"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Convert to DOCX first or select a previous conversion; the Excel package is generated from that DOCX.
                </p>
              </div>
            </div>
            <Button
              onClick={generatePdfExcelPackage}
              disabled={
                pdfExcelStatus === "uploading" ||
                (!selectedFile && !conversion?.job_id) ||
                !pdfExcelTopicId ||
                !hasPdfExcelTopics
              }
            >
              {pdfExcelStatus === "uploading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate PDF Excel Package
                </>
              )}
            </Button>
          </div>

          {pdfExcelStatus === "error" && pdfExcelError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>PDF Excel generation failed</AlertTitle>
              <AlertDescription>{pdfExcelError}</AlertDescription>
            </Alert>
          )}

          {pdfExcelStatus === "success" && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>PDF Excel package ready</AlertTitle>
              <AlertDescription>
                The ZIP contains the generated Excel files and includes images.zip for extracted diagrams.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {conversion && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion Result</CardTitle>
            <CardDescription>Download the generated document and extracted assets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button onClick={downloadDocx} disabled={activeDownload === `docx:${conversion.job_id}`}>
                {activeDownload === `docx:${conversion.job_id}` ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {activeDownload === `docx:${conversion.job_id}` ? "Downloading..." : "Download DOCX"}
              </Button>
              <Button
                variant="outline"
                onClick={downloadOriginalPdf}
                disabled={activeDownload === `pdf:${conversion.job_id}`}
              >
                {activeDownload === `pdf:${conversion.job_id}` ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {activeDownload === `pdf:${conversion.job_id}` ? "Downloading..." : "Download Original PDF"}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const downloadKey = `refresh-images:${conversion.job_id}`;
                  try {
                    setActiveDownload(downloadKey);
                    const res = await fetchPdfConversionImagesApi(conversion.job_id);
                    setImages(res.images || []);
                  } finally {
                    setActiveDownload(null);
                  }
                }}
                disabled={activeDownload === `refresh-images:${conversion.job_id}`}
              >
                {activeDownload === `refresh-images:${conversion.job_id}` ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="mr-2 h-4 w-4" />
                )}
                {activeDownload === `refresh-images:${conversion.job_id}` ? "Refreshing..." : "Refresh Images"}
              </Button>
              <Button
                variant="outline"
                onClick={downloadImagesZip}
                disabled={images.length === 0 || activeDownload === `images-zip:${conversion.job_id}`}
              >
                {activeDownload === `images-zip:${conversion.job_id}` ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {activeDownload === `images-zip:${conversion.job_id}` ? "Downloading..." : "Download Images ZIP"}
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="grid gap-2 md:grid-cols-3">
                <p>
                  <span className="font-medium">Status:</span> {conversion.status}
                </p>
                <p className="truncate">
                  <span className="font-medium">Original:</span> {conversion.original_filename}
                </p>
                <p className="truncate">
                  <span className="font-medium">Job ID:</span>{" "}
                  <span className="font-mono">{conversion.job_id}</span>
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">Extracted Images</h3>
              {images.length === 0 ? (
                <p className="text-sm text-muted-foreground">No extracted images were returned for this PDF.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {images.map((image) => (
                    <div key={image.name} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ImageIcon className="h-5 w-5 shrink-0 text-primary" />
                        <span className="truncate text-sm font-medium">{image.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadImage(image.name)}
                        disabled={activeDownload === `image:${conversion.job_id}:${image.name}`}
                      >
                        {activeDownload === `image:${conversion.job_id}:${image.name}` && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {activeDownload === `image:${conversion.job_id}:${image.name}` ? "Downloading..." : "Download"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Previous Uploads</CardTitle>
            <CardDescription>Recent PDF conversion jobs.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedHistoryDate}
              onChange={(event) => {
                setSelectedHistoryDate(event.target.value);
                setHistoryPage(1);
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All days</option>
              {historyDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString()}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
              {historyLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No uploads found for the selected day.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {historyStartItem}-{historyEndItem} of {filteredHistory.length} upload(s)
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
                      <span>{item.files?.images?.length || 0} image(s)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openHistoryItem(item)}>
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const downloadKey = `history-docx:${item.job_id}`;
                        try {
                          setActiveDownload(downloadKey);
                          const blob = await downloadPdfConversionDocxApi(item.job_id);
                          saveBlob(blob, `${getSafeFileName(item.original_filename)}.docx`);
                        } catch (err: any) {
                          setStatus("error");
                          setError(err?.message || "DOCX download failed.");
                        } finally {
                          setActiveDownload(null);
                        }
                      }}
                      disabled={item.status === "failed" || activeDownload === `history-docx:${item.job_id}`}
                    >
                      {activeDownload === `history-docx:${item.job_id}` && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {activeDownload === `history-docx:${item.job_id}` ? "Downloading..." : "DOCX"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const downloadKey = `history-images-zip:${item.job_id}`;
                        try {
                          setActiveDownload(downloadKey);
                          const blob = await downloadPdfConversionImagesZipApi(item.job_id);
                          saveBlob(blob, `${getSafeFileName(item.original_filename)}-images.zip`);
                        } catch (err: any) {
                          setStatus("error");
                          setError(err?.message || "Images ZIP download failed.");
                        } finally {
                          setActiveDownload(null);
                        }
                      }}
                      disabled={
                        item.status === "failed" ||
                        (item.files?.images?.length || 0) === 0 ||
                        activeDownload === `history-images-zip:${item.job_id}`
                      }
                    >
                      {activeDownload === `history-images-zip:${item.job_id}` && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {activeDownload === `history-images-zip:${item.job_id}` ? "Downloading..." : "Images ZIP"}
                    </Button>
                  </div>
                </div>
              ))}

              {historyTotalPages > 1 && (
                <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Use pagination to keep old uploads easy to scan.
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
