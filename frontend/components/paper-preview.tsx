"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileText, Eye, Plus, Printer, Trash2, KeyRound, ChevronDown } from "lucide-react";
import { IconSpinner } from "@/components/loading";
import { formatClassLabel } from "@/lib/utils";
import {
  buildAnswerKeyExcelHtml,
  buildAnswerKeyHtml,
  buildAnswerKeySections,
  buildAnswerKeyStyles,
  formatMarksLabel,
} from "@/lib/answer-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
// Word's "Narrow" page margin is 0.5 in (12.7 mm).
const PAGE_MARGIN_MM = 12.7;
const SCHOOL_LOGO_SRC = "/school%20logo.png";
const MONTH_OPTIONS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const getCurrentPaperMonth = () =>
  new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date()).toUpperCase();

const DEFAULT_STUDENT_INSTRUCTIONS = [
  "All the questions are compulsory.",
  "Read the instructions carefully given for each question.",
];

const DEFAULT_STUDENT_INSTRUCTION_SET = new Set(
  DEFAULT_STUDENT_INSTRUCTIONS.map((line) => line.trim().toLowerCase())
);

const normalizeInstructionLines = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((line) => String(line ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
};

const getPageSize = (orientation: "portrait" | "landscape") => {
  const widthMm = orientation === "landscape" ? 297 : 210;
  const heightMm = orientation === "landscape" ? 210 : 297;

  return {
    widthMm,
    heightMm,
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
  };
};

/** Shared styles for Preview / Print windows opened in a new tab */
const buildStandalonePaperStyles = (
  page: ReturnType<typeof getPageSize>,
  options?: { forPrint?: boolean; orientation?: "portrait" | "landscape" }
) => {
  const forPrint = Boolean(options?.forPrint);
  const orientation = options?.orientation || "portrait";

  return `
    html, body {
      margin: 0;
      padding: 0;
      background: ${forPrint ? "#ffffff" : "#f4f5f7"};
    }

    body {
      padding: ${forPrint ? "12mm" : "20px 16px"};
      box-sizing: border-box;
      min-height: 100vh;
    }

    ${forPrint ? `
      @media print {
        body {
          background: #fff;
          padding: 0;
        }
      }

      @page {
        size: A4 ${orientation};
        margin: ${PAGE_MARGIN_MM}mm;
      }
    ` : ""}

    /* Sheet grows with content — never lock to a single A4 height */
    .preview-sheet {
      display: block;
      width: 100%;
      max-width: ${page.width};
      margin: 0 auto;
      background: #ffffff;
      color: #000;
      box-sizing: border-box;
      height: auto;
      min-height: ${page.height};
      overflow: visible;
    }

    #paper-preview {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: ${PAGE_MARGIN_MM}mm !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      color: #000 !important;
      overflow: visible !important;
    }

    .paper-header {
      display: flex !important;
      align-items: flex-start !important;
      gap: clamp(8px, 2vw, 16px) !important;
      flex-wrap: nowrap !important;
    }

    .paper-header-title {
      flex: 1 1 0 !important;
      min-width: 0 !important;
      text-align: center !important;
    }

    .paper-header-title h1 {
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
      font-size: 18px !important;
      line-height: 1.2 !important;
      margin: 0 !important;
    }

    img.school-logo {
      width: clamp(52px, 12vw, 88px) !important;
      height: clamp(52px, 12vw, 88px) !important;
      max-width: 88px !important;
      max-height: 88px !important;
      object-fit: contain !important;
      border: none !important;
      padding: 0 !important;
      flex-shrink: 0 !important;
    }

    .paper-meta-row {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px 16px !important;
      align-items: baseline !important;
      justify-content: space-between !important;
    }

    .options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px;
      margin-left: 15px;
      margin-top: 4px;
    }

    .options.options-image {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .options > * {
      box-sizing: border-box;
      margin-bottom: 4px;
      font-size: inherit;
    }

    .paper-section-divider {
      border-top: 1px solid #000;
      margin: 16px 0 12px;
      width: 100%;
    }

    .paper-question-grid {
      position: relative;
    }

    .paper-question-grid[data-column-count="2"] .paper-column-divider {
      display: block;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 0;
      border-left: 1px solid #000;
      transform: translateX(-50%);
      pointer-events: none;
    }

    .answer-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }

    .answer-row span.line {
      flex: 1;
      display: block;
      min-height: 18px;
      border-bottom: 1.2px solid #000;
      line-height: 18px;
    }

    img:not(.school-logo) {
      max-width: 160px;
      max-height: 100px;
      object-fit: contain;
      border: 1px solid #000;
      padding: 2px;
    }

    .option-media {
      max-width: 85px;
      max-height: 60px;
    }

    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 5px; }
  `;
};

const getMediaSrc = (url?: string) => {
  if (!url) return "";
  if (/^data:/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (!API_BASE_URL) {
    if (typeof window !== "undefined") {
      // make relative uploads absolute so iframe/html2canvas can load them
      if (url.startsWith("/")) return `${window.location.origin}${url}`;
      return url;
    }
    return url;
  }

  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const toAbsoluteUrl = (src: string) => {
  if (!src) return "";
  if (/^data:/i.test(src)) return src;
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });

const fetchAsDataUrl = async (src: string): Promise<string | null> => {
  if (!src) return null;
  if (/^data:/i.test(src)) return src;

  try {
    const res = await fetch(toAbsoluteUrl(src), { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    return await blobToDataUrl(await res.blob());
  } catch {
    return null;
  }
};

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 80)}`));
    img.src = src;
  });

type WordImageSize = { maxWidth: number; maxHeight: number };

const getWordImageSize = (img: HTMLImageElement): WordImageSize => {
  if (img.classList.contains("school-logo")) {
    return { maxWidth: 72, maxHeight: 72 };
  }
  if (img.classList.contains("option-media")) {
    return { maxWidth: 85, maxHeight: 60 };
  }
  return { maxWidth: 160, maxHeight: 100 };
};

/**
 * Resize + embed as PNG data URL. Word ignores CSS max-width on HTML .doc exports,
 * so we bake the display size into the image pixels and HTML width/height attrs.
 */
const rasterizeImageForWord = async (
  sourceImg: HTMLImageElement | null,
  fallbackSrc: string,
  size: WordImageSize
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  let working: HTMLImageElement | null = null;

  if (sourceImg && sourceImg.complete && sourceImg.naturalWidth > 0) {
    working = sourceImg;
  } else {
    const src =
      (sourceImg && (sourceImg.currentSrc || sourceImg.src || sourceImg.getAttribute("src"))) ||
      fallbackSrc;
    if (!src) return null;

    const dataUrl = /^data:/i.test(src) ? src : await fetchAsDataUrl(src);
    if (!dataUrl) return null;

    try {
      working = await loadImageElement(dataUrl);
    } catch {
      return null;
    }
  }

  const naturalW = working.naturalWidth || working.width || size.maxWidth;
  const naturalH = working.naturalHeight || working.height || size.maxHeight;
  if (naturalW <= 0 || naturalH <= 0) return null;

  const scale = Math.min(1, size.maxWidth / naturalW, size.maxHeight / naturalH);
  const width = Math.max(1, Math.round(naturalW * scale));
  const height = Math.max(1, Math.round(naturalH * scale));

  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(working, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/png"), width, height };
  } catch {
    // Tainted canvas — fetch bytes then redraw from data URL
    const src = working.currentSrc || working.src || fallbackSrc;
    const dataUrl = /^data:/i.test(src) ? src : await fetchAsDataUrl(src);
    if (!dataUrl) return null;
    try {
      const reloaded = await loadImageElement(dataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(reloaded, 0, 0, width, height);
      return { dataUrl: canvas.toDataURL("image/png"), width, height };
    } catch {
      return null;
    }
  }
};

/**
 * Word ignores CSS border-bottom on empty spans. Use a controlled underlined
 * NBSP run so lines stop near the marks column / content edge — not full page.
 */
const WORD_LINE_CHARS = {
  answer: 78,
  name: 52,
  small: 12,
} as const;

const createWordUnderline = (chars: number) => {
  const span = document.createElement("span");
  span.className = "word-underline";
  span.setAttribute(
    "style",
    "text-decoration:underline;letter-spacing:1px;font-size:12pt;line-height:14pt;color:#000;"
  );
  span.textContent = "\u00A0".repeat(Math.max(4, chars));
  return span;
};

const createWordLabeledLine = (label: string, chars: number) => {
  const wrap = document.createElement("span");
  wrap.setAttribute("style", "white-space:nowrap;");

  const labelSpan = document.createElement("span");
  labelSpan.textContent = label.endsWith(" ") ? label : `${label} `;
  wrap.appendChild(labelSpan);
  wrap.appendChild(createWordUnderline(chars));
  return wrap;
};

/**
 * Word (.doc from HTML) cannot resolve localhost/relative image URLs, and it
 * ignores CSS sizing — embed resized data URLs with explicit width/height.
 */
const inlineImagesForWordExport = async (clone: HTMLElement, sourceRoot: HTMLElement) => {
  const sourceBySrc = new Map<string, HTMLImageElement>();

  Array.from(sourceRoot.querySelectorAll("img")).forEach((img) => {
    const keys = [img.currentSrc, img.src, img.getAttribute("src") || ""]
      .filter(Boolean)
      .flatMap((key) => {
        const absolute = toAbsoluteUrl(key);
        return absolute && absolute !== key ? [key, absolute] : [key];
      });

    keys.forEach((key) => {
      if (key && !sourceBySrc.has(key)) sourceBySrc.set(key, img);
    });
  });

  await Promise.all(
    Array.from(clone.querySelectorAll("img")).map(async (img) => {
      const attrSrc = img.getAttribute("src") || "";
      const lookupKeys = [attrSrc, img.src, toAbsoluteUrl(attrSrc)].filter(Boolean);
      const sourceImg =
        lookupKeys.map((key) => sourceBySrc.get(key)).find(Boolean) || null;
      const size = getWordImageSize(img);

      const rasterized = await rasterizeImageForWord(
        sourceImg || null,
        attrSrc || img.src,
        size
      );

      if (!rasterized) return;

      img.setAttribute("src", rasterized.dataUrl);
      img.setAttribute("width", String(rasterized.width));
      img.setAttribute("height", String(rasterized.height));
      img.removeAttribute("srcset");
      img.style.width = `${rasterized.width}px`;
      img.style.height = `${rasterized.height}px`;
      img.style.maxWidth = `${rasterized.width}px`;
      img.style.maxHeight = `${rasterized.height}px`;
      img.style.objectFit = "contain";
    })
  );
};

const waitForImagesInDocument = async (doc: Document) => {
  const images = Array.from(doc.images || []);
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.onload = done;
        img.onerror = done;
      });
    })
  );
};

export function PaperPreview({
  config,
  onPreviewSettingsChange,
}: {
  config: any;
  onPreviewSettingsChange?: (settings: any) => void;
}) {
  const previewSettingsChangeRef = useRef(onPreviewSettingsChange);
  previewSettingsChangeRef.current = onPreviewSettingsChange;
  const [fontSize, setFontSize] = useState(Number(config?.previewSettings?.fontSize ?? 14));
  const [orientation, setOrientation] = useState(config?.previewSettings?.orientation === "landscape" ? "landscape" : "portrait");
  const [columnCount, setColumnCount] = useState(Math.min(2, Math.max(1, Number(config?.previewSettings?.columnCount ?? 1))));
  const [paperMonth, setPaperMonth] = useState(
    String(config?.previewSettings?.month ?? config?.month ?? getCurrentPaperMonth()).toUpperCase()
  );
  const [paperYear, setPaperYear] = useState(
    String(config?.previewSettings?.year ?? config?.year ?? new Date().getFullYear())
  );
  const [paperCode, setPaperCode] = useState(String(config?.previewSettings?.code ?? config?.code ?? ""));
  const [answerLinesEnabled, setAnswerLinesEnabled] = useState(
    config?.previewSettings?.answerLinesEnabled !== false
  );
  const [dynamicStudentInstructions, setDynamicStudentInstructions] = useState<string[]>(() =>
    normalizeInstructionLines(config?.previewSettings?.studentInstructions ?? config?.instructions)
  );
  const [exportBusy, setExportBusy] = useState<string | null>(null);

  const runExport = async (key: string, action: () => void | Promise<void>) => {
    if (exportBusy) return;
    setExportBusy(key);
    try {
      await action();
    } catch (error) {
      console.error(`Export failed (${key}):`, error);
    } finally {
      setExportBusy(null);
    }
  };

  const isExporting = Boolean(exportBusy);

  useEffect(() => {
    previewSettingsChangeRef.current?.({
      fontSize: Number.isFinite(Number(fontSize)) ? Math.max(0, Number(fontSize)) : 14,
      orientation: orientation === "landscape" ? "landscape" : "portrait",
      columnCount: Math.min(2, Math.max(1, Number(columnCount) || 1)),
      month: String(paperMonth || getCurrentPaperMonth()).toUpperCase(),
      year: String(paperYear || new Date().getFullYear()),
      code: String(paperCode || ""),
      answerLinesEnabled,
      studentInstructions: dynamicStudentInstructions,
    });
  }, [answerLinesEnabled, columnCount, dynamicStudentInstructions, fontSize, orientation, paperCode, paperMonth, paperYear]);

  const cell = {
    border: "1px solid black",
    padding: "5px",
  };

  const cellCenter = {
    ...cell,
    textAlign: "center" as const,
  };

  const previewStyles = useMemo(() => {
    const parsedFontSize = Number(fontSize);
    const safeFontSize = Number.isFinite(parsedFontSize) && parsedFontSize >= 0 ? parsedFontSize : 14;
    const safeColumnCount = Math.max(1, Math.min(2, Number(columnCount) || 1));
    const safeOrientation = orientation === "landscape" ? "landscape" : "portrait";

    return {
      fontSize: safeFontSize,
      orientation: safeOrientation,
      columnCount: safeColumnCount,
      pageWidth: safeOrientation === "landscape" ? "297mm" : "210mm",
      pageMinHeight: safeOrientation === "landscape" ? "210mm" : "297mm",
    };
  }, [columnCount, fontSize, orientation]);

  const studentInstructionLines = useMemo(
    () => [
      ...DEFAULT_STUDENT_INSTRUCTIONS,
      ...dynamicStudentInstructions
        .map((line) => String(line || "").trim())
        .filter((line) => Boolean(line) && !DEFAULT_STUDENT_INSTRUCTION_SET.has(line.toLowerCase())),
    ],
    [dynamicStudentInstructions]
  );

  const updateDynamicInstruction = (index: number, value: string) => {
    setDynamicStudentInstructions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addDynamicInstruction = () => {
    setDynamicStudentInstructions((prev) => [...prev, ""]);
  };

  const removeDynamicInstruction = (index: number) => {
    setDynamicStudentInstructions((prev) => prev.filter((_, i) => i !== index));
  };

  const formatQuestionMarksLabel = (marks: unknown) => {
    const value = Number(marks);
    if (!Number.isFinite(value) || value <= 0) return "";
    return `[${value} ${value === 1 ? "Mark" : "Marks"}]`;
  };

  const renderQuestionHeading = (qIndex: number, text: string, marks?: unknown) => {
    const marksLabel = formatQuestionMarksLabel(marks);
    return (
      <div
        className="question-heading"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "10px",
          fontSize: `${previewStyles.fontSize}pt`,
        }}
      >
        <p className="question-heading-text" style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>{qIndex + 1}. </span>
          {text}
        </p>
        {marksLabel ? (
          <span
            className="question-heading-marks"
            style={{
              flexShrink: 0,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {marksLabel}
          </span>
        ) : null}
      </div>
    );
  };

  const renderAnswerLine = (label = "Answer") => {
    if (!answerLinesEnabled) return null;

    return (
    <div
      className="answer-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginTop: "10px",
      }}
    >
      <span style={{ fontSize: `${previewStyles.fontSize}pt`, fontWeight: 600, whiteSpace: "nowrap" }}>
        {label} :
      </span>
      <span
        className="line"
        style={{
          flex: 1,
          borderBottom: "1.2px solid #000",
          minHeight: "18px",
        }}
      >
        &nbsp;
      </span>
    </div>
    );
  };

  const renderSubQuestion = (subQuestion: any, index: number) => {
    const options = Array.isArray(subQuestion?.options) ? subQuestion.options : [];
    const media = Array.isArray(subQuestion?.media)
      ? subQuestion.media
      : subQuestion?.mediaUrl
      ? [{ url: subQuestion.mediaUrl, alt: subQuestion.mediaAlt || "" }]
      : [];
    const hasImageOptions = options.some((opt: any) => Boolean(opt?.mediaUrl));
    const subQuestionType = String(subQuestion?.type || "").toLowerCase();

    return (
      <div
        key={subQuestion?.id || `sub-question-${index}`}
        className="paper-keep-unit paper-sub-question"
        style={{ marginTop: "10px" }}
      >
        {renderQuestionHeading(index, subQuestion?.text || "", subQuestion?.marks)}

        {media.length > 0 && (
          <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
            {media.map((img: any, idx: number) => {
              const src = getMediaSrc(img?.url);
              if (!src) return null;

              return (
                <img
                  key={`${subQuestion?.id || index}-media-${idx}`}
                  src={src}
                  alt={img?.alt || `Sub-question image ${idx + 1}`}
                  style={{
                    maxWidth: "220px",
                    maxHeight: "150px",
                    objectFit: "contain",
                    border: "1px solid #000",
                    padding: "2px",
                  }}
                />
              );
            })}
          </div>
        )}

        {options.length > 0 && (
          <div
            className={`options${hasImageOptions ? " options-image" : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: hasImageOptions
                ? "repeat(4, minmax(0, 1fr))"
                : "repeat(2, minmax(0, 1fr))",
              gap: "4px",
              marginLeft: "15px",
              marginTop: "4px",
            }}
          >
            {options.map((opt: any) => (
              <div
                key={opt.id}
                style={{
                  boxSizing: "border-box",
                  fontSize: `${previewStyles.fontSize}pt`,
                  minWidth: 0,
                }}
              >
                <div>{opt.id}) {opt.text || ""}</div>
                {opt.mediaUrl && (
                  <img
                    className="option-media"
                    src={getMediaSrc(opt.mediaUrl)}
                    alt={`Option ${opt.id}`}
                    style={{
                      marginTop: "4px",
                      maxWidth: "85px",
                      maxHeight: "60px",
                      objectFit: "contain",
                      border: "1px solid #000",
                      padding: "2px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {subQuestionType === "true_false" && options.length === 0 && (
          <div
            className="options"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "4px",
              marginLeft: "15px",
              marginTop: "4px",
            }}
          >
            <div style={{ boxSizing: "border-box", fontSize: `${previewStyles.fontSize}pt`, minWidth: 0 }}>
              <div>A) True</div>
            </div>
            <div style={{ boxSizing: "border-box", fontSize: `${previewStyles.fontSize}pt`, minWidth: 0 }}>
              <div>B) False</div>
            </div>
          </div>
        )}

        {renderAnswerLine("Answer")}
      </div>
    );
  };

  const renderQuestion = (q: any, qIndex: number, sectionId: string) => {
    const options = Array.isArray(q.options) ? q.options : [];
    const media = Array.isArray(q.media) ? q.media : [];
    const hasImageOptions = options.some((opt: any) => Boolean(opt?.mediaUrl));
    const hasSubQuestions = Array.isArray(q.subQuestions) && q.subQuestions.length > 0;
    const hasParagraphText = Boolean(q?.paragraph && String(q.paragraph).trim());
    const isParagraphQuestion = q?.type === "paragraph" || hasSubQuestions || hasParagraphText;

    if (isParagraphQuestion) {
      return (
        <div className="paper-question-item" key={q.questionId || `${sectionId}-${qIndex}`} style={{ marginTop: "6px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
            <div style={{ flex: 1 }}>
              {renderQuestionHeading(
                qIndex,
                q.text ? `Instruction: ${q.text}` : "Instruction:",
                q.marks
              )}

              {hasParagraphText && (
                <div style={{ fontSize: `${previewStyles.fontSize}pt`, marginTop: "4px", marginBottom: "8px" }}>
                  <strong>Paragraph:</strong>
                  <div style={{ marginTop: "4px", whiteSpace: "pre-wrap" }}>{q.paragraph}</div>
                </div>
              )}

              {media.length > 0 && (
                <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                  {media.map((img: any, idx: number) => {
                    const src = getMediaSrc(img?.url);
                    if (!src) return null;

                    return (
                      <img
                        key={`${q.questionId || sectionId}-media-${idx}`}
                        src={src}
                        alt={img?.alt || `Question image ${idx + 1}`}
                        style={{
                          maxWidth: "220px",
                          maxHeight: "150px",
                          objectFit: "contain",
                          border: "1px solid #000",
                          padding: "2px",
                        }}
                      />
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: "8px" }}>
                {(hasSubQuestions ? q.subQuestions : []).map((subQuestion: any, subIndex: number) =>
                  renderSubQuestion(
                    subQuestion,
                    subIndex
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`paper-question-item${options.length > 0 ? " paper-keep-unit" : ""}`}
        key={q.questionId || `${sectionId}-${qIndex}`}
        style={{ marginTop: "6px" }}
      >
        {renderQuestionHeading(qIndex, q.text || "", q.marks)}

        {media.length > 0 && (
          <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
            {media.map((img: any, idx: number) => {
              const src = getMediaSrc(img?.url);
              if (!src) return null;

              return (
                <img
                  key={`${q.questionId || sectionId}-media-${idx}`}
                  src={src}
                  alt={img?.alt || `Question image ${idx + 1}`}
                  style={{
                    maxWidth: "220px",
                    maxHeight: "150px",
                    objectFit: "contain",
                    border: "1px solid #000",
                    padding: "2px",
                  }}
                />
              );
            })}
          </div>
        )}

        {options.length > 0 && (
          <div
            className={`options${hasImageOptions ? " options-image" : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: hasImageOptions
                ? "repeat(4, minmax(0, 1fr))"
                : "repeat(2, minmax(0, 1fr))",
              gap: "4px",
              marginLeft: "15px",
              marginTop: "4px",
            }}
          >
            {options.map((opt: any) => (
              <div
                key={opt.id}
                style={{
                  boxSizing: "border-box",
                  fontSize: `${previewStyles.fontSize}pt`,
                  minWidth: 0,
                }}
              >
                <div>{opt.id}) {opt.text || ""}</div>
                {opt.mediaUrl && (
                  <img
                    className="option-media"
                    src={getMediaSrc(opt.mediaUrl)}
                    alt={`Option ${opt.id}`}
                    style={{
                      marginTop: "4px",
                      maxWidth: "85px",
                      maxHeight: "60px",
                      objectFit: "contain",
                      border: "1px solid #000",
                      padding: "2px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {renderAnswerLine("Answer")}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold leading-none tracking-tight">Preview Settings</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="preview-font-size">Question Font Size (pt)</Label>
            <Input
              id="preview-font-size"
              type="number"
              min={0}
              value={fontSize}
              onChange={(e) => setFontSize(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview-orientation">Page Orientation</Label>
            <select
              id="preview-orientation"
              value={previewStyles.orientation}
              onChange={(e) => setOrientation(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview-column-count">Columns</Label>
            <Input
              id="preview-column-count"
              type="number"
              min={1}
              max={2}
              value={previewStyles.columnCount}
              onChange={(e) => setColumnCount(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview-paper-month">Month</Label>
            <select
              id="preview-paper-month"
              value={paperMonth}
              onChange={(e) => setPaperMonth(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview-paper-year">Year</Label>
            <Input
              id="preview-paper-year"
              type="number"
              min={1900}
              max={2100}
              value={paperYear}
              onChange={(e) => setPaperYear(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview-paper-code">Code</Label>
            <Input
              id="preview-paper-code"
              value={paperCode}
              onChange={(e) => setPaperCode(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border p-3 sm:col-span-2 md:col-span-1">
            <Label htmlFor="preview-answer-lines" className="cursor-pointer">
              Answer Lines
            </Label>
            <Switch
              id="preview-answer-lines"
              checked={answerLinesEnabled}
              onCheckedChange={setAnswerLinesEnabled}
              aria-label="Enable answer lines"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium">Student Instructions</Label>
            <Button type="button" variant="outline" size="sm" onClick={addDynamicInstruction}>
              <Plus className="mr-2 h-4 w-4" />
              Add Instruction
            </Button>
          </div>

          <div className="space-y-2">
            {DEFAULT_STUDENT_INSTRUCTIONS.map((line, idx) => (
              <div key={`default-instruction-${idx}`} className="text-sm text-muted-foreground">
                [{idx + 1}] {line}
              </div>
            ))}

            {dynamicStudentInstructions.map((line, index) => (
              <div key={`dynamic-instruction-${index}`} className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap">[{index + 3}]</span>
                <Input
                  value={line}
                  onChange={(e) => updateDynamicInstruction(index, e.target.value)}
                  placeholder="Enter additional instruction"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeDynamicInstruction(index)}
                  aria-label={`Remove instruction ${index + 3}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {dynamicStudentInstructions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                First 2 instructions are fixed. Add more lines if needed.
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        id="paper-preview"
        data-orientation={previewStyles.orientation}
        data-paper-code={paperCode}
        data-font-size={previewStyles.fontSize}
        className="bg-white text-black font-serif"
        style={{
          width: "100%",
          maxWidth: previewStyles.pageWidth,
          height: "auto",
          minHeight: previewStyles.pageMinHeight,
          margin: "0 auto",
          padding: `${PAGE_MARGIN_MM}mm`,
          fontFamily: "'Times New Roman', Times, serif",
          lineHeight: "1.45",
          fontSize: `${previewStyles.fontSize}pt`,
          boxSizing: "border-box",
          background: "#ffffff",
          overflow: "visible",
        }}
      >
        <div
          className="paper-header"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "clamp(8px, 2vw, 16px)",
            paddingBottom: "4px",
          }}
        >
          <img
            className="school-logo"
            src={SCHOOL_LOGO_SRC}
            alt="School logo"
            style={{
              display: "block",
              width: "clamp(52px, 12vw, 88px)",
              height: "clamp(52px, 12vw, 88px)",
              objectFit: "contain",
              border: "none",
              padding: 0,
              flexShrink: 0,
              marginTop: "2px",
            }}
          />
          <div className="paper-header-title" style={{ flex: "1 1 0", minWidth: 0, textAlign: "center" }}>
            <h1
              className="paper-main-title"
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                lineHeight: 1.2,
                margin: 0,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              INNOVATIVE SCHOLARS' ACHIEVEMENT TEST [ INNOSAT ]
            </h1>
            <div
              className="paper-header-meta"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "baseline",
                gap: "clamp(12px, 4vw, 44px)",
                flexWrap: "wrap",
                fontSize: "clamp(14px, 2.2vw, 21px)",
                fontWeight: 700,
                marginTop: "12px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span className="paper-header-month">{paperMonth} - {paperYear}</span>
              <span className="paper-header-code">CODE : {paperCode}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "2px", fontSize: "clamp(14px, 1.8vw, 18px)", lineHeight: "1.35" }}>
          <div
            className="paper-meta-row paper-meta-row-name"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "12px 24px",
              flexWrap: "wrap",
            }}
          >
            <span className="paper-meta-name-field" style={{ display: "flex", alignItems: "baseline", flex: "1 1 220px", minWidth: 0 }}>
              <span style={{ whiteSpace: "nowrap" }}>Name of the student :</span>
              <span
                className="blank-line blank-line-name"
                style={{
                  display: "inline-block",
                  flex: "1 1 160px",
                  minWidth: "120px",
                  borderBottom: "1px solid #000",
                  marginLeft: "6px",
                  height: "0.9em",
                }}
              />
            </span>
            <span className="paper-meta-time" style={{ whiteSpace: "nowrap" }}>Time : {config.durationMinutes} min</span>
          </div>

          <div
            className="paper-meta-row paper-meta-row-details"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "5px",
              gap: "8px 16px",
              flexWrap: "wrap",
            }}
          >
            <span className="paper-meta-class">Class : {formatClassLabel(config.classLevel || config.classId)}</span>
            <span className="paper-meta-roll" style={{ display: "flex", alignItems: "baseline" }}>
              <span>Roll No.:</span>
              <span className="blank-line blank-line-sm" style={{ display: "inline-block", width: "70px", borderBottom: "1px solid #000", marginLeft: "5px", height: "0.9em" }} />
            </span>
            <span className="paper-meta-date" style={{ display: "flex", alignItems: "baseline" }}>
              <span>Date :</span>
              <span className="blank-line blank-line-sm" style={{ display: "inline-block", width: "70px", borderBottom: "1px solid #000", marginLeft: "5px", height: "0.9em" }} />
            </span>
            <span className="paper-meta-sign" style={{ display: "flex", alignItems: "baseline" }}>
              <span>Sign. of Invigilator :</span>
              <span className="blank-line blank-line-sm" style={{ display: "inline-block", width: "70px", borderBottom: "1px solid #000", marginLeft: "5px", height: "0.9em" }} />
            </span>
          </div>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "10px",
            fontSize: "18px",
          }}
        >
          <thead>
            <tr>
              <th style={cell}>Sections</th>

              {config.sections.map((section: any, index: number) => (
                <th key={section.id} style={cell}>
                  {section.name} [{String.fromCharCode(65 + index)}]
                </th>
              ))}

              <th style={cell}>Total</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={cell}>Total Marks</td>

              {config.sections.map((s: any) => (
                <td key={s.id} style={cellCenter}>
                  {s.marks}
                </td>
              ))}

              <td style={cellCenter}>{config.totalMarks}</td>
            </tr>

            <tr>
              <td style={cell}>Marks obtained</td>

              {config.sections.map((s: any) => (
                <td key={s.id} style={cell}></td>
              ))}

              <td style={cell}></td>
            </tr>
          </tbody>
        </table>

        <div
          className="paper-instructions-box"
          style={{
            border: "1px solid #000",
            marginTop: "12px",
            paddingBottom: "6px",
            pageBreakInside: "avoid",
          }}
        >
          <div
            className="paper-instructions-title"
            style={{
              textAlign: "center",
              fontStyle: "italic",
              fontSize: `${Math.max(previewStyles.fontSize + 1, 14)}pt`,
              lineHeight: "1.3",
              padding: "6px 6px 4px",
            }}
          >
            INSTRUCTIONS FOR STUDENTS:
          </div>

          <div
            className="paper-instructions-list"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "0 14px 4px",
            }}
          >
            {studentInstructionLines.map((line, index) => (
              <div
                key={`paper-instruction-${index}`}
                className="paper-instruction-row"
                style={{
                  display: "block",
                  margin: "0",
                  padding: "2px 0 5px",
                  fontStyle: "italic",
                  fontSize: `${Math.max(previewStyles.fontSize, 12)}pt`,
                  lineHeight: "1.5",
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  overflow: "visible",
                }}
              >
                [{index + 1}] {line}
              </div>
            ))}
          </div>
        </div>

        {config.sections.map((section: any, sectionIndex: number) => (
          <div key={section.id} style={{ marginTop: "14px" }}>
            {sectionIndex > 0 && (
              <div
                className="paper-section-divider"
                aria-hidden="true"
                style={{
                  borderTop: "1px solid #000",
                  margin: "16px 0 12px",
                  width: "100%",
                }}
              />
            )}

            <h2
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginBottom: "6px",
              }}
            >
              SECTION : {section.name.toUpperCase()}
            </h2>

            <div
              className="paper-question-grid"
              data-column-count={previewStyles.columnCount}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${previewStyles.columnCount}, minmax(0, 1fr))`,
                gap: "18px",
                alignItems: "start",
                position: "relative",
              }}
            >
              <span
                className="paper-column-divider"
                aria-hidden="true"
                style={{
                  display: previewStyles.columnCount === 2 ? "block" : "none",
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: "50%",
                  width: 0,
                  borderLeft: "1px solid #000",
                  transform: "translateX(-50%)",
                  pointerEvents: "none",
                }}
              />
              {(section.questions || []).map((q: any, qIndex: number) => renderQuestion(q, qIndex, section.id))}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>

        <CardContent className="flex gap-2 flex-wrap">
          <Button
            disabled={isExporting}
            onClick={() => void runExport("pdf", () => exportAsPDF(config))}
          >
            {exportBusy === "pdf" ? (
              <IconSpinner icon={FileText} spinning className="mr-2" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {exportBusy === "pdf" ? "Preparing PDF..." : "Export PDF"}
          </Button>

          <Button
            disabled={isExporting}
            onClick={() => void runExport("word", () => exportAsWord(config))}
          >
            {exportBusy === "word" ? (
              <IconSpinner icon={FileText} spinning className="mr-2" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {exportBusy === "word" ? "Preparing Word..." : "Export Word"}
          </Button>

          <Button
            disabled={isExporting}
            onClick={() => void runExport("excel", () => exportAsExcel(config))}
          >
            {exportBusy === "excel" ? (
              <IconSpinner icon={FileText} spinning className="mr-2" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {exportBusy === "excel" ? "Preparing Excel..." : "Export Excel"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" disabled={isExporting}>
                {exportBusy?.startsWith("answer-") ? (
                  <IconSpinner icon={KeyRound} spinning className="mr-2" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                {exportBusy?.startsWith("answer-")
                  ? "Preparing Answer Key..."
                  : "Download Answer Key"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                disabled={isExporting}
                onClick={() => void runExport("answer-pdf", () => exportAnswerKeyAsPDF(config))}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isExporting}
                onClick={() => void runExport("answer-word", () => exportAnswerKeyAsWord(config))}
              >
                <FileText className="mr-2 h-4 w-4" />
                Word
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isExporting}
                onClick={() => void runExport("answer-excel", () => exportAnswerKeyAsExcel(config))}
              >
                <FileText className="mr-2 h-4 w-4" />
                Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            disabled={isExporting}
            onClick={() => void runExport("print", () => printPaper(config))}
          >
            {exportBusy === "print" ? (
              <IconSpinner icon={Printer} spinning className="mr-2" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            {exportBusy === "print" ? "Opening..." : "Print"}
          </Button>

          <Button
            disabled={isExporting}
            onClick={() => void runExport("preview", () => handleFullPreview(config))}
          >
            {exportBusy === "preview" ? (
              <IconSpinner icon={Eye} spinning className="mr-2" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {exportBusy === "preview" ? "Opening..." : "Preview"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


const mmToPx = (mm: number) => {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:${mm}mm;`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return Math.max(1, px);
};

/** Split paper DOM into atomic print blocks (header chunks + section chrome + questions). */
const collectPaperPrintBlocks = (paper: HTMLElement): HTMLElement[] => {
  const blocks: HTMLElement[] = [];

  Array.from(paper.children).forEach((child) => {
    const el = child as HTMLElement;
    const grid = el.querySelector(".paper-question-grid") as HTMLElement | null;

    if (grid && el.contains(grid)) {
      const shell = el.cloneNode(false) as HTMLElement;
      Array.from(el.children).forEach((c) => {
        const node = c as HTMLElement;
        if (!node.classList?.contains("paper-question-grid")) {
          shell.appendChild(node.cloneNode(true));
        }
      });
      if (shell.childNodes.length > 0) {
        blocks.push(shell);
      }

      const columnCount = Math.min(
        2,
        Math.max(1, Number(grid.getAttribute("data-column-count") || 1) || 1)
      );
      Array.from(grid.querySelectorAll(":scope > .paper-question-item")).forEach((q) => {
        const wrap = document.createElement("div");
        wrap.className = "paper-print-question";
        wrap.dataset.columnCount = String(columnCount);
        wrap.appendChild(q.cloneNode(true));
        blocks.push(wrap);
      });
      return;
    }

    blocks.push(el.cloneNode(true) as HTMLElement);
  });

  return blocks;
};

const createPdfPageShell = (contentWidthMm: number, fontSizePt: number) => {
  const page = document.createElement("div");
  page.className = "pdf-page-shell";
  page.style.cssText = [
    `width:${contentWidthMm}mm`,
    "box-sizing:border-box",
    "background:#ffffff",
    "color:#000000",
    "font-family:'Times New Roman', Times, serif",
    `font-size:${fontSizePt}pt`,
    "line-height:1.4",
  ].join(";");
  return page;
};

/** html2canvas cannot parse modern CSS color functions (oklch/oklab/lab/…). */
const UNSAFE_CSS_COLOR_FN = /\b(?:oklch|oklab|lab|lch|color-mix|color)\(/i;

const replaceCssColorFunctions = (cssText: string, replacement = "#000000") => {
  // Longer names first so "oklab(" is not partially matched as "lab(".
  const names = ["oklch", "oklab", "color-mix", "color", "lab", "lch"];
  let out = cssText;
  for (const name of names) {
    const needle = `${name}(`;
    let result = "";
    let i = 0;
    while (i < out.length) {
      const lower = out.toLowerCase();
      const idx = lower.indexOf(needle, i);
      if (idx === -1) {
        result += out.slice(i);
        break;
      }
      if (idx > 0 && /[a-z0-9-_]/i.test(out[idx - 1] || "")) {
        result += out.slice(i, idx + 1);
        i = idx + 1;
        continue;
      }
      result += out.slice(i, idx) + replacement;
      let depth = 0;
      let j = idx + needle.length - 1;
      for (; j < out.length; j++) {
        const ch = out[j];
        if (ch === "(") depth++;
        else if (ch === ")") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      i = j;
    }
    out = result;
  }
  return out;
};

/**
 * Layout + color-safe CSS used for both PDF measurement and html2canvas capture
 * so page cuts match the rendered canvas (no oklch / Tailwind dependency).
 */
const getPdfSafePaperCss = () => `
  :root {
    --background: #ffffff;
    --foreground: #000000;
    --card: #ffffff;
    --card-foreground: #000000;
    --popover: #ffffff;
    --popover-foreground: #000000;
    --primary: #000000;
    --primary-foreground: #ffffff;
    --secondary: #f5f5f5;
    --secondary-foreground: #000000;
    --muted: #f5f5f5;
    --muted-foreground: #444444;
    --accent: #f5f5f5;
    --accent-foreground: #000000;
    --destructive: #dc2626;
    --destructive-foreground: #ffffff;
    --border: #000000;
    --input: #e5e5e5;
    --ring: #000000;
  }
  *, *::before, *::after {
    color: #000000 !important;
    border-top-color: #000000 !important;
    border-right-color: #000000 !important;
    border-bottom-color: #000000 !important;
    border-left-color: #000000 !important;
    outline-color: #000000 !important;
    text-decoration-color: #000000 !important;
    box-shadow: none !important;
    text-shadow: none !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body, #paper-preview, .pdf-mode {
    background: #ffffff !important;
    background-color: #ffffff !important;
    color: #000000 !important;
    font-family: "Times New Roman", Times, serif !important;
  }
  #paper-preview, #paper-preview * {
    word-break: normal !important;
    overflow-wrap: break-word !important;
    hyphens: none !important;
  }
  .options {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 4px !important;
    margin-left: 15px !important;
    margin-top: 4px !important;
  }
  .options.options-image {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }
  .paper-question-grid {
    position: relative !important;
  }
  .paper-section-divider {
    border-top: 1px solid #000 !important;
    margin: 16px 0 12px !important;
    width: 100% !important;
  }
  .answer-row {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    margin-top: 10px !important;
  }
  .answer-row span.line {
    flex: 1 !important;
    display: block !important;
    min-height: 18px !important;
    border-bottom: 1.2px solid #000 !important;
  }
`;

/**
 * Make a cloned document safe for html2canvas by removing/rewriting oklch styles
 * (Tailwind v4) and forcing printable black-on-white colors.
 */
const prepareHtml2CanvasClone = (clonedDoc: Document, root: HTMLElement) => {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((node) => node.remove());
  clonedDoc.querySelectorAll("style").forEach((node) => {
    const el = node as HTMLStyleElement;
    if (el.getAttribute("data-html2canvas-safe") === "true") return;
    const text = el.textContent || "";
    if (UNSAFE_CSS_COLOR_FN.test(text)) {
      el.textContent = replaceCssColorFunctions(text);
    }
  });

  const safety = clonedDoc.createElement("style");
  safety.setAttribute("data-html2canvas-safe", "true");
  safety.textContent = getPdfSafePaperCss();
  (clonedDoc.head || clonedDoc.documentElement).appendChild(safety);

  root.classList.add("pdf-mode", "print-safe");
  root.style.setProperty("background", "#ffffff", "important");
  root.style.setProperty("background-color", "#ffffff", "important");
  root.style.setProperty("color", "#000000", "important");
};


/** True when a question/sub-question block has options that must stay with its stem. */
const questionHasOptionsBlock = (questionEl: HTMLElement) =>
  Boolean(
    questionEl.querySelector(
      ".options, .options-table, .options-image, .options-image-table, .answer-row, .answer-table"
    )
  );

const measureStemHeight = (questionEl: HTMLElement) => {
  const options = questionEl.querySelector(
    ".options, .options-table, .options-image, .options-image-table, .answer-row, .answer-table"
  ) as HTMLElement | null;
  if (!options) return questionEl.scrollHeight;
  const qTop = questionEl.getBoundingClientRect().top;
  return Math.max(0, Math.round(options.getBoundingClientRect().top - qTop));
};

/**
 * Pack blocks into pages.
 * Keep questions continuous — only jump to the next page early when the remaining
 * space can fit the question/subquestion text but NOT its options (avoids
 * stem-on-one-page / options-on-next-page). Otherwise fill the page.
 */
const paginatePaperBlocks = async (
  blocks: HTMLElement[],
  options: {
    contentWidthMm: number;
    maxContentHeightPx: number;
    fontSizePt: number;
    columnCount: number;
  }
) => {
  const { contentWidthMm, maxContentHeightPx, fontSizePt, columnCount } = options;
  const tinyRemainingPx = Math.max(36, Math.round(maxContentHeightPx * 0.06));

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-14000px;top:0;pointer-events:none;background:#fff;";
  document.body.appendChild(host);

  const pages: HTMLElement[] = [];
  let page = createPdfPageShell(contentWidthMm, fontSizePt);
  let questionGrid: HTMLElement | null = null;
  host.appendChild(page);

  const pageHeight = () => page.scrollHeight;
  const pageFits = () => pageHeight() <= maxContentHeightPx + 1;

  const ensureQuestionGrid = () => {
    if (questionGrid && page.contains(questionGrid)) return questionGrid;
    questionGrid = document.createElement("div");
    questionGrid.className = "paper-question-grid";
    questionGrid.setAttribute("data-column-count", String(columnCount));
    questionGrid.style.cssText = [
      "display:grid",
      `grid-template-columns:repeat(${columnCount}, minmax(0, 1fr))`,
      "gap:10px",
      "align-items:start",
      "position:relative",
      "width:100%",
    ].join(";");
    page.appendChild(questionGrid);
    return questionGrid;
  };

  const startNewPage = () => {
    pages.push(page);
    page = createPdfPageShell(contentWidthMm, fontSizePt);
    questionGrid = null;
    host.appendChild(page);
  };

  const measureAlone = (node: HTMLElement) => {
    const probePage = createPdfPageShell(contentWidthMm, fontSizePt);
    const probeGrid = document.createElement("div");
    probeGrid.style.cssText = `display:grid;grid-template-columns:repeat(${columnCount}, minmax(0, 1fr));gap:10px;width:100%;`;
    const clone = node.cloneNode(true) as HTMLElement;
    probeGrid.appendChild(clone);
    probePage.appendChild(probeGrid);
    host.appendChild(probePage);
    const full = probePage.scrollHeight;
    const stem = measureStemHeight(clone);
    const hasOptions = questionHasOptionsBlock(clone);
    probePage.remove();
    return { full, stem, hasOptions };
  };

  try {
    let i = 0;
    while (i < blocks.length) {
      const block = blocks[i];
      const isQuestion = block.classList.contains("paper-print-question");

      if (isQuestion) {
        const heightBefore = pageHeight();
        const remaining = maxContentHeightPx - heightBefore;
        const questionSource = (block.firstElementChild || block) as HTMLElement;
        const { full, stem, hasOptions } = measureAlone(questionSource);

        // Only forced early page-break: stem would fit here but options would wrap alone.
        const wouldSplitStemAndOptions =
          hasOptions && stem <= remaining + 1 && full > remaining + 1 && remaining > tinyRemainingPx;

        if (wouldSplitStemAndOptions && page.childNodes.length > 0) {
          startNewPage();
          continue;
        }

        // Negligible space left — start a fresh page instead of a tiny orphan strip.
        if (remaining < tinyRemainingPx && full > remaining + 1 && page.childNodes.length > 0) {
          startNewPage();
          continue;
        }

        const grid = ensureQuestionGrid();
        const questionNode = questionSource.cloneNode(true) as HTMLElement;
        grid.appendChild(questionNode);

        // Continuity: keep the question on this page even if it runs a bit long.
        // PDF/preview capture uses smart clipping only for stem/options safety.
        i += 1;
        continue;
      }

      questionGrid = null;
      const heightBefore = pageHeight();
      const remaining = maxContentHeightPx - heightBefore;
      const node = block.cloneNode(true) as HTMLElement;
      page.appendChild(node);

      if (pageFits()) {
        i += 1;
        continue;
      }

      page.removeChild(node);
      if (page.childNodes.length > 0 && remaining < Math.max(80, maxContentHeightPx * 0.15)) {
        startNewPage();
        continue;
      }
      if (page.childNodes.length > 0) {
        // Keep continuity for large header/instruction blocks when lots of space remains:
        // place and allow overflow rather than leaving a big empty region.
        page.appendChild(node);
        i += 1;
        continue;
      }

      page.appendChild(node);
      i += 1;
    }

    if (page.childNodes.length > 0) {
      pages.push(page);
    } else if (pages.length === 0) {
      pages.push(page);
    } else if (page.parentElement === host) {
      host.removeChild(page);
    }
  } finally {
    host.remove();
  }

  return pages;
};

/** Build Y cut ranges so pages fill like the sample paper.
 * - Fill each page continuously (paragraphs may continue across pages)
 * - Only avoid cutting inside a `.paper-keep-unit` (question/subquestion + options)
 * - Never leave a nearly-empty page just to start the next keep-unit early
 */
const buildContinuousPageRanges = (paper: HTMLElement, pageHeightPx: number) => {
  const rootRect = paper.getBoundingClientRect();
  const totalHeight = Math.max(
    Math.round(paper.scrollHeight),
    Math.round(paper.offsetHeight),
    Math.round(rootRect.height),
    1
  );

  const relTop = (el: Element) =>
    Math.round((el as HTMLElement).getBoundingClientRect().top - rootRect.top);
  const relBottom = (el: Element) =>
    Math.round((el as HTMLElement).getBoundingClientRect().bottom - rootRect.top);

  const keepUnits = Array.from(
    paper.querySelectorAll(".paper-keep-unit")
  ) as HTMLElement[];

  const softBreaks = new Set<number>([totalHeight]);
  paper
    .querySelectorAll(
      ".paper-keep-unit, .paper-instructions-box, .paper-header, .paper-header-table, .paper-section-divider, h2"
    )
    .forEach((el) => softBreaks.add(relBottom(el)));

  const sortedBreaks = [...softBreaks]
    .filter((y) => y > 0 && y <= totalHeight + 1)
    .sort((a, b) => a - b);

  const findKeepUnitContaining = (y: number) => {
    for (const unit of keepUnits) {
      const top = relTop(unit);
      const bottom = relBottom(unit);
      if (y > top + 1 && y < bottom - 1) {
        return { top, bottom, height: bottom - top };
      }
    }
    return null;
  };

  const minUsefulPx = Math.max(56, Math.round(pageHeightPx * 0.2));

  const pickEnd = (fromY: number) => {
    const target = Math.min(fromY + pageHeightPx, totalHeight);
    if (target >= totalHeight - 1) return totalHeight;

    // Prefer the last natural break at or before the page end.
    let end = target;
    let soft = fromY;
    for (const y of sortedBreaks) {
      if (y <= fromY + 8) continue;
      if (y > target + 1) break;
      soft = y;
    }
    if (soft > fromY + 8) end = soft;

    // If the cut would split a keep-unit (stem vs options), move that unit
    // to the next page — unless that would leave this page almost empty, or
    // the unit itself is taller than one page (must hard-split).
    const hit = findKeepUnitContaining(end);
    if (hit && hit.height <= pageHeightPx - 4 && hit.top > fromY + 8) {
      if (hit.top - fromY >= minUsefulPx) {
        end = hit.top;
      }
      // else: keep filling (hard cut) rather than a blank-looking page
    }

    // Collapse tiny slices (e.g. only a section title remnant).
    if (end - fromY < minUsefulPx && target - fromY >= minUsefulPx) {
      end = target;
      const hit2 = findKeepUnitContaining(end);
      if (
        hit2 &&
        hit2.height <= pageHeightPx - 4 &&
        hit2.top > fromY + 8 &&
        hit2.top - fromY >= minUsefulPx
      ) {
        end = hit2.top;
      }
    }

    if (end <= fromY) end = Math.min(fromY + pageHeightPx, totalHeight);
    return Math.min(end, totalHeight);
  };

  const ranges: { start: number; end: number }[] = [];
  let y = 0;
  let guard = 0;
  while (y < totalHeight - 1 && guard++ < 500) {
    const end = pickEnd(y);
    ranges.push({ start: y, end });
    y = end;
  }
  return ranges.length ? ranges : [{ start: 0, end: totalHeight }];
};


export const handleFullPreview = async (config: any) => {
  const el = document.getElementById("paper-preview");
  if (!el) return;

  const orientation = el.dataset.orientation === "landscape" ? "landscape" : "portrait";
  const page = getPageSize(orientation);
  const exportPaperCode = String(el.dataset.paperCode || config?.code || "").replace(/[<>&"'`]/g, "");
  const footerBandHeightMm = 14;
  const fontSizePt = Math.max(
    0,
    Number(el.dataset.fontSize || config?.previewSettings?.fontSize || 14) || 14
  );

  const contentWidthMm = page.widthMm;
  const clipHeightMm = page.heightMm - footerBandHeightMm;
  const clipHeightPx = mmToPx(clipHeightMm);

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-14000px;top:0;background:#ffffff;pointer-events:none;";
  document.body.appendChild(host);

  const paper = el.cloneNode(true) as HTMLElement;
  paper.style.width = `${contentWidthMm}mm`;
  paper.style.maxWidth = `${contentWidthMm}mm`;
  paper.style.minHeight = "0";
  paper.style.height = "auto";
  paper.style.margin = "0";
  paper.style.padding = `${PAGE_MARGIN_MM}mm`;
  paper.style.boxSizing = "border-box";
  paper.style.fontSize = `${fontSizePt}pt`;
  host.appendChild(paper);

  const measureStyle = document.createElement("style");
  measureStyle.setAttribute("data-html2canvas-safe", "true");
  measureStyle.textContent = getPdfSafePaperCss();
  host.appendChild(measureStyle);

  await waitForImagesInDocument(document);
  await new Promise((r) => setTimeout(r, 40));

  // Page clip includes padding; ranges are within the padded paper box.
  const ranges = buildContinuousPageRanges(paper, clipHeightPx);
  host.remove();

  const win = window.open("", "_blank");
  if (!win) return;

  const pagesHtml = ranges
    .map((range, index) => {
      return `
        <div class="paper-page">
          <div class="paper-page-clip">
            <div class="paper-page-inner" style="transform:translateY(-${range.start}px);">
              ${paper.outerHTML}
            </div>
          </div>
          <div class="paper-page-footer">Page ${index + 1} / INNOSAT / CODE ${exportPaperCode}</div>
        </div>
      `;
    })
    .join("");

  win.document.write(`
    <html>
      <head>
        <title>${config?.title || "Paper"} - Preview</title>
        <style>
          html, body { margin: 0; padding: 0; background: #e8eaed; }
          body {
            box-sizing: border-box;
            min-height: 100vh;
            font-family: 'Times New Roman', Times, serif;
            font-size: ${fontSizePt}pt;
          }
          #preview-root {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 28px;
            padding: 48px 24px 64px;
            box-sizing: border-box;
          }
          .paper-page {
            width: ${page.width};
            height: ${page.height};
            background: #ffffff;
            color: #000;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
          }
          .paper-page-clip {
            height: calc(${page.height} - ${footerBandHeightMm}mm);
            overflow: hidden;
            position: relative;
            background: #ffffff;
          }
          .paper-page-inner,
          .paper-page-inner #paper-preview {
            width: ${page.width} !important;
            max-width: ${page.width} !important;
            min-height: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            font-family: 'Times New Roman', Times, serif !important;
            font-size: ${fontSizePt}pt !important;
          }
          .paper-page-footer {
            position: absolute;
            left: 0; right: 0; bottom: 0;
            height: ${footerBandHeightMm}mm;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            background: #ffffff;
            border-top: 1px solid #ddd;
            color: #222;
          }
          .options {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4px;
            margin-left: 15px;
            margin-top: 4px;
          }
          .options.options-image { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .options > * { font-size: inherit; box-sizing: border-box; }
          .paper-section-divider { border-top: 1px solid #000; margin: 16px 0 12px; width: 100%; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 5px; }
          img.school-logo { width: 72px !important; height: 72px !important; object-fit: contain !important; border: none !important; }
          img:not(.school-logo) { max-width: 160px; max-height: 100px; object-fit: contain; border: 1px solid #000; padding: 2px; }
        </style>
      </head>
      <body>
        <div id="preview-root">${pagesHtml}</div>
      </body>
    </html>
  `);
  win.document.close();
};


export const exportAsPDF = async (config: any) => {
  try {
    const preview = document.getElementById("paper-preview");
    if (!preview) return;

    const orientation = preview.dataset.orientation === "landscape" ? "landscape" : "portrait";
    const page = getPageSize(orientation);
    const pageWidthMm = page.widthMm;
    const pageHeightMm = page.heightMm;
    const exportPaperCode = preview.dataset.paperCode || config?.code || "";
    const fontSizePt = Math.max(
      0,
      Number(preview.dataset.fontSize || config?.previewSettings?.fontSize || 14) || 14
    );

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const footerBandHeight = 14;
    const contentWidthMm = pageWidthMm - PAGE_MARGIN_MM * 2;
    const contentHeightMm = pageHeightMm - PAGE_MARGIN_MM * 2 - footerBandHeight;
    const pageHeightPx = mmToPx(contentHeightMm);

    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-14000px;top:0;background:#ffffff;pointer-events:none;";
    document.body.appendChild(host);

    const paper = preview.cloneNode(true) as HTMLElement;
    paper.style.width = `${contentWidthMm}mm`;
    paper.style.maxWidth = `${contentWidthMm}mm`;
    paper.style.minHeight = "0";
    paper.style.height = "auto";
    paper.style.margin = "0";
    paper.style.padding = "0";
    paper.style.boxSizing = "border-box";
    paper.style.fontSize = `${fontSizePt}pt`;
    paper.style.background = "#ffffff";
    paper.style.color = "#000000";
    host.appendChild(paper);

    // Match capture CSS during measurement so page cuts align with the canvas.
    const measureStyle = document.createElement("style");
    measureStyle.setAttribute("data-html2canvas-safe", "true");
    measureStyle.textContent = getPdfSafePaperCss();
    host.appendChild(measureStyle);

    try {
      await waitForImagesInDocument(document);
      await new Promise((r) => setTimeout(r, 60));

      paper.classList.add("pdf-mode", "print-safe");
      const ranges = buildContinuousPageRanges(paper, pageHeightPx);
      const fullCanvas = await html2canvas(paper, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        onclone: (clonedDoc, clonedEl) => {
          prepareHtml2CanvasClone(clonedDoc, clonedEl as HTMLElement);
        },
      });

      const pdf = new jsPDF(orientation === "landscape" ? "l" : "p", "mm", "a4");
      const pxPerMm = fullCanvas.width / contentWidthMm;

      for (let pageIndex = 0; pageIndex < ranges.length; pageIndex++) {
        const { start, end } = ranges[pageIndex];
        const sourceY = Math.max(0, Math.round(start * 2)); // html2canvas scale: 2
        const sourceH = Math.max(1, Math.round((end - start) * 2));
        const sliceH = Math.min(sourceH, fullCanvas.height - sourceY);
        if (sliceH <= 0) continue;

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = fullCanvas.width;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) throw new Error("Could not prepare PDF page canvas");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          fullCanvas,
          0,
          sourceY,
          fullCanvas.width,
          sliceH,
          0,
          0,
          fullCanvas.width,
          sliceH
        );

        const imgHeight = sliceH / pxPerMm;
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", PAGE_MARGIN_MM, PAGE_MARGIN_MM, contentWidthMm, imgHeight);

        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pageHeightMm - footerBandHeight, pageWidthMm, footerBandHeight, "F");
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(
          `Page ${pageIndex + 1} / INNOSAT / CODE ${exportPaperCode}`,
          pageWidthMm / 2,
          pageHeightMm - 6,
          { align: "center" }
        );
      }

      pdf.save(`${config.title}.pdf`);
    } finally {
      host.remove();
    }
  } catch (err) {
    console.error("FINAL PDF ERROR:", err);
  }
};


export const exportAsExcel = (config: any) => {
  const preview = document.getElementById("paper-preview");
  if (!preview) return;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Paper Preview</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: "Times New Roman", serif; color: #000; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 5px; }
          img { max-width: 160px; max-height: 100px; object-fit: contain; border: 1px solid #000; padding: 2px; }
          .option-media { max-width: 85px; max-height: 60px; }
          .answer-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
          .answer-row span.line { flex: 1; display: inline-block; min-height: 18px; border-bottom: 1.2px solid #000; }
          .paper-section-divider { border-top: 1px solid #000; margin: 16px 0 12px; width: 100%; }
          .paper-question-grid { position: relative; }
          .paper-question-grid[data-column-count="2"] .paper-column-divider {
            display: block;
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 0;
            border-left: 1px solid #000;
          }
        </style>
      </head>
      <body>
        ${preview.outerHTML}
      </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${config?.title || "paper"}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportAsWord = async (config: any) => {
  const preview = document.getElementById("paper-preview");
  if (!preview) return;
  const orientation = preview.dataset.orientation === "landscape" ? "landscape" : "portrait";
  const exportPaperCode = preview.dataset.paperCode || config?.code || "";
  const fontSizePt = Math.max(
    0,
    Number(preview.dataset.fontSize || config?.previewSettings?.fontSize || 14) || 14
  );
  const page = getPageSize(orientation);

  const clone = preview.cloneNode(true) as HTMLElement;
  clone.style.fontSize = `${fontSizePt}pt`;
  // Preview uses full-page min-height for on-screen A4 framing — strip it for Word
  // or the document gets a huge empty region under the content.
  clone.style.minHeight = "0";
  clone.style.height = "auto";
  clone.style.maxWidth = "100%";
  clone.style.width = "100%";
  clone.style.margin = "0";
  clone.style.padding = "0";
  clone.style.boxSizing = "border-box";

  clone.querySelectorAll(".options").forEach((optionsNode) => {
    const children = Array.from(optionsNode.children) as HTMLElement[];
    if (children.length === 0) return;
    const hasImageOptions = optionsNode.classList.contains("options-image");
    const columns = hasImageOptions ? 4 : 2;
    const colWidth = `${100 / columns}%`;

    const table = document.createElement("table");
    table.className = "options-table";
    if (hasImageOptions) {
      table.classList.add("options-image-table");
    }
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.tableLayout = "fixed";
    const tbody = document.createElement("tbody");

    for (let i = 0; i < children.length; i += columns) {
      const row = document.createElement("tr");

      for (let col = 0; col < columns; col++) {
        const cell = document.createElement("td");
        cell.className = "option-cell";
        cell.style.width = colWidth;
        cell.style.verticalAlign = "top";
        cell.style.padding = hasImageOptions ? "2px" : "2px 6px";
        cell.style.border = "none";
        cell.innerHTML = children[i + col]?.outerHTML || "&nbsp;";
        row.appendChild(cell);
      }

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    optionsNode.replaceWith(table);
  });

  // Word does not honor flex layouts — convert header to a 2-column table
  clone.querySelectorAll(".paper-header").forEach((headerNode) => {
    const children = Array.from(headerNode.children) as HTMLElement[];
    if (children.length === 0) return;

    const logo = children.find((el) => el.tagName === "IMG" || el.classList.contains("school-logo"));
    const title = children.find((el) => el.classList.contains("paper-header-title")) || children[children.length - 1];

    const table = document.createElement("table");
    table.className = "paper-header-table";
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.tableLayout = "fixed";

    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");

    const logoCell = document.createElement("td");
    logoCell.className = "paper-header-logo-cell";
    logoCell.style.width = "80px";
    logoCell.style.verticalAlign = "top";
    logoCell.style.border = "none";
    logoCell.style.padding = "0 8px 0 0";
    if (logo) logoCell.appendChild(logo.cloneNode(true));

    const titleCell = document.createElement("td");
    titleCell.className = "paper-header-title-cell";
    titleCell.style.verticalAlign = "top";
    titleCell.style.border = "none";
    titleCell.style.padding = "0";
    titleCell.style.textAlign = "center";
    if (title) titleCell.appendChild(title.cloneNode(true));

    tr.appendChild(logoCell);
    tr.appendChild(titleCell);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    headerNode.replaceWith(table);
  });

  // Convert meta flex rows into Word-safe tables with controlled underlines
  clone.querySelectorAll(".paper-meta-row-name").forEach((rowNode) => {
    const timeText =
      rowNode.querySelector(".paper-meta-time")?.textContent?.trim() || "Time :";

    const table = document.createElement("table");
    table.className = "paper-meta-table";
    table.setAttribute("width", "100%");
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.setAttribute("border", "0");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.setAttribute(
      "style",
      "border:none;padding:2px 8px 2px 0;vertical-align:bottom;width:100%;"
    );
    nameCell.appendChild(createWordLabeledLine("Name of the student :", WORD_LINE_CHARS.name));

    const timeCell = document.createElement("td");
    timeCell.setAttribute(
      "style",
      "border:none;padding:2px 0;vertical-align:bottom;white-space:nowrap;text-align:right;"
    );
    timeCell.textContent = timeText;

    tr.appendChild(nameCell);
    tr.appendChild(timeCell);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    rowNode.replaceWith(table);
  });

  clone.querySelectorAll(".paper-meta-row-details").forEach((rowNode) => {
    const classText =
      rowNode.querySelector(".paper-meta-class")?.textContent?.trim() || "Class :";

    const table = document.createElement("table");
    table.className = "paper-meta-table";
    table.setAttribute("width", "100%");
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.setAttribute("border", "0");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "4px";

    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");

    const makeCell = (content: Node, alignRight = false) => {
      const cell = document.createElement("td");
      cell.setAttribute(
        "style",
        `border:none;padding:2px 6px 2px 0;vertical-align:bottom;white-space:nowrap;${
          alignRight ? "text-align:right;" : ""
        }`
      );
      cell.appendChild(content);
      return cell;
    };

    tr.appendChild(makeCell(document.createTextNode(classText)));
    tr.appendChild(makeCell(createWordLabeledLine("Roll No.:", WORD_LINE_CHARS.small)));
    tr.appendChild(makeCell(createWordLabeledLine("Date :", WORD_LINE_CHARS.small)));
    tr.appendChild(makeCell(createWordLabeledLine("Sign. of Invigilator :", WORD_LINE_CHARS.small), true));

    tbody.appendChild(tr);
    table.appendChild(tbody);
    rowNode.replaceWith(table);
  });

  // Legacy generic meta rows (if any remain)
  clone.querySelectorAll(".paper-meta-row").forEach((rowNode) => {
    rowNode.querySelectorAll(".blank-line").forEach((blank) => {
      const chars = blank.classList.contains("blank-line-name")
        ? WORD_LINE_CHARS.name
        : WORD_LINE_CHARS.small;
      blank.replaceWith(createWordUnderline(chars));
    });
  });

  // Month / CODE row — Word drops flex gaps, so force spaced table cells
  clone.querySelectorAll(".paper-header-meta").forEach((metaNode) => {
    const month = metaNode.querySelector(".paper-header-month");
    const code = metaNode.querySelector(".paper-header-code");

    const table = document.createElement("table");
    table.className = "paper-header-meta-table";
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "8px";

    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");

    const monthCell = document.createElement("td");
    monthCell.style.border = "none";
    monthCell.style.textAlign = "right";
    monthCell.style.padding = "0 18px 0 0";
    monthCell.style.fontWeight = "700";
    monthCell.style.fontSize = "14px";
    monthCell.textContent = month?.textContent?.trim() || "";

    const codeCell = document.createElement("td");
    codeCell.style.border = "none";
    codeCell.style.textAlign = "left";
    codeCell.style.padding = "0 0 0 18px";
    codeCell.style.fontWeight = "700";
    codeCell.style.fontSize = "14px";
    codeCell.textContent = code?.textContent?.trim() || "";

    tr.appendChild(monthCell);
    tr.appendChild(codeCell);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    metaNode.replaceWith(table);
  });

  // Keep title size Word-friendly (clamp() is ignored / blown up by Word)
  clone.querySelectorAll(".paper-main-title").forEach((titleNode) => {
    const title = titleNode as HTMLElement;
    title.style.fontSize = "18px";
    title.style.lineHeight = "1.25";
    title.style.margin = "0";
    title.style.fontWeight = "700";
  });

  // Marks on the right — convert flex heading to a 2-column table (matches PDF)
  clone.querySelectorAll(".question-heading").forEach((headingNode) => {
    const textEl = headingNode.querySelector(".question-heading-text");
    const marksEl = headingNode.querySelector(".question-heading-marks");

    const table = document.createElement("table");
    table.className = "question-heading-table";
    table.setAttribute("width", "100%");
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.tableLayout = "fixed";

    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");

    const textCell = document.createElement("td");
    textCell.className = "question-heading-text-cell";
    textCell.style.border = "none";
    textCell.style.padding = "0 8px 0 0";
    textCell.style.verticalAlign = "top";
    textCell.style.width = "100%";
    if (textEl) textCell.appendChild(textEl.cloneNode(true));

    tr.appendChild(textCell);

    if (marksEl) {
      const marksCell = document.createElement("td");
      marksCell.className = "question-heading-marks-cell";
      marksCell.setAttribute("width", "90");
      marksCell.style.border = "none";
      marksCell.style.padding = "0";
      marksCell.style.verticalAlign = "top";
      marksCell.style.textAlign = "right";
      marksCell.style.whiteSpace = "nowrap";
      marksCell.style.fontWeight = "700";
      marksCell.style.width = "90px";
      marksCell.textContent = marksEl.textContent?.trim() || "";
      tr.appendChild(marksCell);
    }

    tbody.appendChild(tr);
    table.appendChild(tbody);
    headingNode.replaceWith(table);
  });

  // Answer line — stop near marks column (content edge), not full page width
  clone.querySelectorAll(".answer-row").forEach((rowNode) => {
    const label =
      Array.from(rowNode.querySelectorAll("span"))
        .map((span) => (span.textContent || "").trim())
        .find((text) => /^answer\s*:/i.test(text)) || "Answer :";

    const answerTable = document.createElement("table");
    answerTable.className = "answer-table";
    answerTable.setAttribute("width", "100%");
    answerTable.setAttribute("cellpadding", "0");
    answerTable.setAttribute("cellspacing", "0");
    answerTable.setAttribute("border", "0");
    answerTable.style.width = "100%";
    answerTable.style.borderCollapse = "collapse";
    answerTable.style.marginTop = "8px";

    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");

    const labelCell = document.createElement("td");
    labelCell.className = "answer-label-cell";
    labelCell.setAttribute("width", "70");
    labelCell.setAttribute("nowrap", "nowrap");
    labelCell.setAttribute(
      "style",
      "border:none;width:70px;padding:0 6px 0 0;vertical-align:bottom;white-space:nowrap;font-weight:700;font-size:13px;"
    );
    labelCell.textContent = label.endsWith(":") ? label : `${label} :`;

    const lineCell = document.createElement("td");
    lineCell.className = "answer-line-cell";
    lineCell.setAttribute(
      "style",
      "border:none;padding:0;vertical-align:bottom;"
    );

    const linePara = document.createElement("p");
    linePara.setAttribute("style", "margin:0;padding:0;line-height:14pt;font-size:12pt;");
    linePara.appendChild(createWordUnderline(WORD_LINE_CHARS.answer));
    lineCell.appendChild(linePara);

    tr.appendChild(labelCell);
    tr.appendChild(lineCell);
    tbody.appendChild(tr);
    answerTable.appendChild(tbody);
    rowNode.replaceWith(answerTable);
  });

  // Embed images so Word does not depend on localhost / relative URLs
  await inlineImagesForWordExport(clone, preview);

  // Do NOT pre-paginate Word with browser measurements — that leaves large empty
  // regions because Word's layout differs. Keep questions together and let Word
  // fill pages naturally.
  const wrapWordKeepTogether = (node: Element) => {
    const el = node as HTMLElement;
    if (el.closest("table.word-keep-together")) return;

    const table = document.createElement("table");
    table.className = "word-keep-together";
    table.setAttribute("width", "100%");
    table.setAttribute("border", "0");
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.style.cssText =
      "width:100%;border-collapse:collapse;page-break-inside:avoid;mso-page-break-inside:avoid;";

    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");
    tr.setAttribute("style", "page-break-inside:avoid;mso-page-break-inside:avoid;");

    const td = document.createElement("td");
    td.setAttribute(
      "style",
      "border:none;padding:0;margin:0;vertical-align:top;page-break-inside:avoid;mso-page-break-inside:avoid;"
    );

    el.replaceWith(table);
    td.appendChild(el);
    tr.appendChild(td);
    tbody.appendChild(tr);
    table.appendChild(tbody);
  };

  clone
    .querySelectorAll(".paper-keep-unit, .paper-instructions-box")
    .forEach((node) => {
      wrapWordKeepTogether(node);
    });

  // Tighten spacing that often looks like "empty space" in Word
  clone.querySelectorAll(".paper-question-item").forEach((node) => {
    const el = node as HTMLElement;
    el.style.marginTop = "4px";
    el.style.marginBottom = "2px";
  });
  clone.querySelectorAll(".paper-question-grid").forEach((node) => {
    const el = node as HTMLElement;
    el.style.gap = "10px";
  });

  const bodyHtml = clone.outerHTML;

  const styles = `
    <style>
      @page {
        size: A4 ${orientation};
        margin: ${PAGE_MARGIN_MM}mm;
      }
      body {
        font-family: 'Times New Roman', serif;
        font-size: ${fontSizePt}pt;
        margin: 0;
        padding: 0;
      }
      #paper-preview {
        width: 100% !important;
        max-width: 100% !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        font-size: ${fontSizePt}pt !important;
      }
      .word-keep-together,
      .word-keep-together tr,
      .word-keep-together td,
      .paper-keep-unit {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        mso-page-break-inside: avoid;
      }
      .paper-question-item {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      .paper-instructions-box,
      .question-heading,
      .question-heading-table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        mso-page-break-inside: avoid;
      }
      .paper-question-grid {
        gap: 10px !important;
      }
      .question-heading,
      .question-heading-text,
      .question-heading-text-cell,
      .option-cell,
      .options-table td {
        font-size: ${fontSizePt}pt !important;
      }
      .paper-export-footer {
        margin-top: 16px;
        text-align: center;
        font-size: 10pt;
        font-family: 'Times New Roman', serif;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid black;
        padding: 5px;
      }
      .options {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 4px;
      }
      .options > * {
        box-sizing: border-box;
      }
      .paper-section-divider {
        border-top: 1px solid #000;
        margin: 16px 0 12px;
        width: 100%;
      }
      .paper-question-grid {
        position: relative;
      }
      .paper-question-grid[data-column-count="2"] .paper-column-divider {
        display: block;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 0;
        border-left: 1px solid #000;
        transform: translateX(-50%);
        pointer-events: none;
      }
      .options-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-top: 4px;
      }
      .options-table td {
        width: 50%;
        border: none;
        vertical-align: top;
        padding: 2px 6px 2px 0;
      }

      .options-table.options-image-table td {
        width: 25%;
        text-align: center;
        padding: 2px;
      }
      .option-cell > * {
        display: block;
      }
      .answer-table {
        width: 100% !important;
        border-collapse: collapse;
        margin-top: 8px;
      }
      .answer-table td {
        border: none !important;
        padding: 0;
        vertical-align: bottom;
      }
      .answer-label-cell {
        width: 70px !important;
        font-size: ${fontSizePt}pt;
        font-weight: 700;
        white-space: nowrap;
        padding-right: 6px !important;
      }
      .answer-table td.answer-line-cell {
        border: none !important;
      }
      .answer-table td.answer-line-cell span,
      .word-underline {
        text-decoration: underline !important;
        letter-spacing: 1px !important;
        font-size: 12pt !important;
        line-height: 14pt !important;
        color: #000 !important;
      }
      .question-heading-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0 0 4px;
      }
      .question-heading-table td {
        border: none !important;
        vertical-align: top;
        padding: 0;
      }
      .question-heading-text-cell {
        width: 100%;
      }
      .question-heading-text-cell p {
        margin: 0;
      }
      .question-heading-marks-cell {
        width: 90px !important;
        white-space: nowrap;
        text-align: right;
        font-weight: 700;
        padding-left: 8px !important;
      }
      .paper-main-title {
        font-size: 18px !important;
        line-height: 1.25 !important;
        margin: 0 !important;
        font-weight: 700 !important;
      }
      .paper-header-meta-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      .paper-header-meta-table td {
        border: none !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        padding: 0 18px !important;
      }
      img {
        max-width: 160px;
        max-height: 100px;
        width: auto;
        height: auto;
        object-fit: contain;
        border: 1px solid #000;
        padding: 2px;
      }

      .option-media {
        max-width: 85px;
        max-height: 60px;
        width: 85px;
        height: auto;
      }
      .school-logo {
        width: 72px !important;
        height: 72px !important;
        max-width: 72px !important;
        max-height: 72px !important;
        border: none !important;
        padding: 0 !important;
      }
      .paper-header,
      .paper-header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 4px;
      }
      .paper-header td,
      .paper-header-table td,
      .paper-meta-table td {
        border: none !important;
        vertical-align: top;
      }
      .paper-header-logo-cell {
        width: 80px !important;
      }
      .paper-header-title-cell {
        text-align: center;
      }
      .paper-meta-table {
        width: 100%;
        border-collapse: collapse;
        margin: 2px 0;
      }
    </style>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <title>${config.title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        ${styles}
      </head>
      <body>
        ${bodyHtml}
        <div class="paper-export-footer">INNOSAT / CODE ${exportPaperCode}</div>
      </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: "application/msword" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.title.replace(/\s+/g, "_")}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};

export const printPaper = (config: any) => {
  const preview = document.getElementById("paper-preview");
  if (!preview) return;
  const orientation = preview.dataset.orientation === "landscape" ? "landscape" : "portrait";
  const page = getPageSize(orientation);

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>${config?.title || "Paper"} - Print</title>
        <style>
          ${buildStandalonePaperStyles(page, { forPrint: true, orientation })}
        </style>
      </head>
      <body>
        <div class="preview-sheet">
          ${preview.outerHTML}
        </div>
        <script>
          (function () {
            function fitSheet() {
              var paper = document.getElementById("paper-preview");
              var sheet = document.querySelector(".preview-sheet");
              if (!paper || !sheet) return;
              paper.style.height = "auto";
              paper.style.minHeight = "0";
              sheet.style.height = "auto";
              sheet.style.minHeight = Math.max(paper.scrollHeight, paper.offsetHeight) + "px";
            }
            window.addEventListener("load", function () {
              fitSheet();
              window.print();
            });
            Array.prototype.forEach.call(document.images || [], function (img) {
              img.addEventListener("load", fitSheet);
              img.addEventListener("error", fitSheet);
            });
            setTimeout(fitSheet, 0);
          })();
        </script>
      </body>
    </html>
  `);

  win.document.close();
};

const getAnswerKeyFileName = (config: any, extension: string) => {
  const baseTitle = String(config?.title || "paper")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, " ");
  return `${baseTitle || "paper"} - Answer Key.${extension}`;
};

export const exportAnswerKeyAsPDF = async (config: any) => {
  try {
    const { jsPDF } = await import("jspdf");
    const sections = buildAnswerKeySections(config);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;
    let y = 18;

    const ensureSpace = (height: number) => {
      if (y + height <= pageHeight - 14) return;
      pdf.addPage();
      y = 18;
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("ANSWER KEY", pageWidth / 2, y, { align: "center" });
    y += 8;

    pdf.setFontSize(13);
    pdf.text(String(config?.title || "Question Paper"), pageWidth / 2, y, { align: "center" });
    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const classLabel = formatClassLabel(config?.classLevel || config?.classId);
    const metaParts = [
      classLabel && classLabel !== "-" ? `Class: ${classLabel}` : "",
      config?.totalMarks !== undefined && config?.totalMarks !== null
        ? `Total Marks: ${config.totalMarks}`
        : "",
      config?.durationMinutes ? `Duration: ${config.durationMinutes} min` : "",
      config?.code ? `Code: ${config.code}` : "",
    ].filter(Boolean);

    if (metaParts.length > 0) {
      pdf.text(metaParts.join("   |   "), pageWidth / 2, y, { align: "center" });
      y += 8;
    }

    pdf.setDrawColor(0, 0, 0);
    pdf.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    const hasEntries = sections.some((section) => section.entries.length > 0);
    if (!hasEntries) {
      ensureSpace(12);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text("No answers available for this paper.", pageWidth / 2, y, { align: "center" });
      pdf.save(getAnswerKeyFileName(config, "pdf"));
      return;
    }

    sections.forEach((section) => {
      if (!section.entries.length) return;

      ensureSpace(12);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(section.name.toUpperCase(), marginX, y);
      y += 6;

      const colWidths = [24, contentWidth - 24 - 32, 32];
      const drawTableHeader = () => {
        ensureSpace(10);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        let x = marginX;
        ["Q. No.", "Answer", "Marks"].forEach((label, index) => {
          pdf.rect(x, y, colWidths[index], 8);
          pdf.text(label, x + colWidths[index] / 2, y + 5.5, { align: "center" });
          x += colWidths[index];
        });
        y += 8;
      };

      drawTableHeader();

      section.entries.forEach((entry) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        const answerText = String(entry.answer || "—");
        const answerLines = pdf.splitTextToSize(answerText, colWidths[1] - 4);
        const marksLabel = formatMarksLabel(entry.marks);
        const rowHeight = Math.max(8, answerLines.length * 4.8 + 2);

        ensureSpace(rowHeight + 2);

        let x = marginX;
        pdf.rect(x, y, colWidths[0], rowHeight);
        pdf.text(String(entry.label), x + colWidths[0] / 2, y + 5.5, { align: "center" });
        x += colWidths[0];

        pdf.rect(x, y, colWidths[1], rowHeight);
        pdf.text(answerLines, x + colWidths[1] / 2, y + 5.5, { align: "center" });
        x += colWidths[1];

        pdf.rect(x, y, colWidths[2], rowHeight);
        if (marksLabel) {
          pdf.text(marksLabel, x + colWidths[2] / 2, y + 5.5, { align: "center" });
        }

        y += rowHeight;
      });

      y += 6;
    });

    pdf.save(getAnswerKeyFileName(config, "pdf"));
  } catch (error) {
    console.error("ANSWER KEY PDF ERROR:", error);
  }
};

export const exportAnswerKeyAsWord = async (config: any) => {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <title>${String(config?.title || "Answer Key")} - Answer Key</title>
        <style>${buildAnswerKeyStyles()}</style>
      </head>
      <body>
        ${buildAnswerKeyHtml(config)}
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getAnswerKeyFileName(config, "doc");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportAnswerKeyAsExcel = (config: any) => {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Answer Key</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 6px 8px; font-family: Calibri, Arial, sans-serif; font-size: 12pt; vertical-align: middle; }
          th { background: #f3f3f3; font-weight: 700; }
        </style>
      </head>
      <body>
        ${buildAnswerKeyExcelHtml(config)}
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getAnswerKeyFileName(config, "xls");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
