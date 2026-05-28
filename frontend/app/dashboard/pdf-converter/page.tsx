"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  RefreshCw,
  UploadCloud,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PdfConversionImageListResponse,
  PdfConversionResponse,
  convertPdfToDocxApi,
  downloadPdfConversionDocxApi,
  downloadPdfConversionImageApi,
  downloadPdfConversionImagesZipApi,
  downloadPdfConversionPdfApi,
  fetchPdfConversionImagesApi,
  fetchPdfConversionsApi,
} from "@/utils/apis";

const MAX_FILE_SIZE_MB = 50;

const saveBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

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
      const result = await fetchPdfConversionsApi(25);
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
    try {
      const blob = await downloadPdfConversionDocxApi(conversion.job_id);
      saveBlob(blob, `${convertedBaseName}.docx`);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "DOCX download failed.");
    }
  };

  const downloadOriginalPdf = async () => {
    if (!conversion?.job_id) return;
    try {
      const blob = await downloadPdfConversionPdfApi(conversion.job_id);
      saveBlob(blob, conversion.original_filename || `${convertedBaseName}.pdf`);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "PDF download failed.");
    }
  };

  const downloadImage = async (imageName: string) => {
    if (!conversion?.job_id) return;
    try {
      const blob = await downloadPdfConversionImageApi(conversion.job_id, imageName);
      saveBlob(blob, imageName);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Image download failed.");
    }
  };

  const downloadImagesZip = async () => {
    if (!conversion?.job_id) return;
    try {
      const blob = await downloadPdfConversionImagesZipApi(conversion.job_id);
      saveBlob(blob, `${convertedBaseName}-images.zip`);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Images ZIP download failed.");
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

      {conversion && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion Result</CardTitle>
            <CardDescription>Download the generated document and extracted assets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button onClick={downloadDocx}>
                <Download className="mr-2 h-4 w-4" />
                Download DOCX
              </Button>
              <Button variant="outline" onClick={downloadOriginalPdf}>
                <Download className="mr-2 h-4 w-4" />
                Download Original PDF
              </Button>
              <Button variant="outline" onClick={() => fetchPdfConversionImagesApi(conversion.job_id).then((res) => setImages(res.images || []))}>
                <ImageIcon className="mr-2 h-4 w-4" />
                Refresh Images
              </Button>
              <Button variant="outline" onClick={downloadImagesZip} disabled={images.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Download Images ZIP
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
                      <Button size="sm" variant="outline" onClick={() => downloadImage(image.name)}>
                        Download
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
              onChange={(event) => setSelectedHistoryDate(event.target.value)}
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
              {filteredHistory.map((item) => (
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
                        const blob = await downloadPdfConversionDocxApi(item.job_id);
                        saveBlob(blob, `${getSafeFileName(item.original_filename)}.docx`);
                      }}
                      disabled={item.status === "failed"}
                    >
                      DOCX
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const blob = await downloadPdfConversionImagesZipApi(item.job_id);
                          saveBlob(blob, `${getSafeFileName(item.original_filename)}-images.zip`);
                        } catch (err: any) {
                          setStatus("error");
                          setError(err?.message || "Images ZIP download failed.");
                        }
                      }}
                      disabled={item.status === "failed" || (item.files?.images?.length || 0) === 0}
                    >
                      Images ZIP
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
