"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileText, Eye, Plus, Printer, Trash2, KeyRound, ChevronDown } from "lucide-react";
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
      font-size: 13px;
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
  const [paperMonth, setPaperMonth] = useState(String(config?.previewSettings?.month ?? config?.month ?? "OCTOBER").toUpperCase());
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

  useEffect(() => {
    previewSettingsChangeRef.current?.({
      fontSize: Number.isFinite(Number(fontSize)) ? Math.max(0, Number(fontSize)) : 14,
      orientation: orientation === "landscape" ? "landscape" : "portrait",
      columnCount: Math.min(2, Math.max(1, Number(columnCount) || 1)),
      month: String(paperMonth || "OCTOBER").toUpperCase(),
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
          fontSize: `${previewStyles.fontSize}px`,
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
      <span style={{ fontSize: `${previewStyles.fontSize}px`, fontWeight: 600, whiteSpace: "nowrap" }}>
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
      <div key={subQuestion?.id || `sub-question-${index}`} style={{ marginTop: "10px" }}>
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
                  fontSize: `${previewStyles.fontSize}px`,
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
            <div style={{ boxSizing: "border-box", fontSize: `${previewStyles.fontSize}px`, minWidth: 0 }}>
              <div>A) True</div>
            </div>
            <div style={{ boxSizing: "border-box", fontSize: `${previewStyles.fontSize}px`, minWidth: 0 }}>
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
                <div style={{ fontSize: `${previewStyles.fontSize}px`, marginTop: "4px", marginBottom: "8px" }}>
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
      <div className="paper-question-item" key={q.questionId || `${sectionId}-${qIndex}`} style={{ marginTop: "6px" }}>
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
                  fontSize: `${previewStyles.fontSize}px`,
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
            <Label htmlFor="preview-font-size">Question Text Size</Label>
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
          fontSize: `${previewStyles.fontSize}px`,
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
              fontSize: `${Math.max(previewStyles.fontSize + 1, 14)}px`,
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
                  fontSize: `${Math.max(previewStyles.fontSize, 12)}px`,
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
          <Button onClick={() => exportAsPDF(config)}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          <Button onClick={() => void exportAsWord(config)}>
            <FileText className="mr-2 h-4 w-4" />
            Export Word
          </Button>

          <Button onClick={() => exportAsExcel(config)}>
            <FileText className="mr-2 h-4 w-4" />
            Export Excel
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                <KeyRound className="mr-2 h-4 w-4" />
                Download Answer Key
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => void exportAnswerKeyAsPDF(config)}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportAnswerKeyAsWord(config)}>
                <FileText className="mr-2 h-4 w-4" />
                Word
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAnswerKeyAsExcel(config)}>
                <FileText className="mr-2 h-4 w-4" />
                Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => printPaper(config)}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          <Button onClick={() => handleFullPreview(config)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export const handleFullPreview = (config: any) => {
  const el = document.getElementById("paper-preview");
  if (!el) return;
  const orientation = el.dataset.orientation === "landscape" ? "landscape" : "portrait";
  const page = getPageSize(orientation);
  const exportPaperCode = String(el.dataset.paperCode || config?.code || "").replace(/[<>&"'`]/g, "");
  const footerBandHeightMm = 14;

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>${config?.title || "Paper"} - Preview</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #e8eaed;
          }

          body {
            box-sizing: border-box;
            min-height: 100vh;
            font-family: 'Times New Roman', Times, serif;
          }

          #preview-root {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 28px;
            /* Vertical padding around the page stack (scrolls with content) */
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
            margin: 0;
          }

          .paper-page-clip {
            height: calc(${page.height} - ${footerBandHeightMm}mm);
            overflow: hidden;
            position: relative;
            background: #ffffff;
          }

          .paper-page-clip #paper-preview,
          .paper-page-clip [id^="paper-preview-page-"] {
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
            font-family: 'Times New Roman', Times, serif !important;
          }

          .paper-page-footer {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: ${footerBandHeightMm}mm;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            letter-spacing: 0.02em;
            background: #ffffff;
            border-top: 1px solid #ddd;
            color: #222;
          }

          #measure-source {
            position: absolute;
            left: -10000px;
            top: 0;
            width: ${page.width};
            visibility: hidden;
            pointer-events: none;
          }

          #measure-source #paper-preview {
            display: block !important;
            width: ${page.width} !important;
            max-width: ${page.width} !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: ${PAGE_MARGIN_MM}mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            font-family: 'Times New Roman', Times, serif !important;
          }

          .paper-header {
            display: flex !important;
            align-items: flex-start !important;
            gap: clamp(8px, 2vw, 16px) !important;
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

          img:not(.school-logo) {
            max-width: 160px;
            max-height: 100px;
            object-fit: contain;
            border: 1px solid #000;
            padding: 2px;
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

          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 5px; }

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
          }

          .option-media {
            max-width: 85px;
            max-height: 60px;
          }
        </style>
      </head>
      <body>
        <div id="measure-source">${el.outerHTML}</div>
        <div id="preview-root"></div>
        <script>
          (function () {
            var PAGE_CODE = ${JSON.stringify(exportPaperCode)};
            var FOOTER_MM = ${footerBandHeightMm};
            var PAGE_HEIGHT_MM = ${page.heightMm};

            function mmToPx(mm) {
              var probe = document.createElement("div");
              probe.style.cssText = "position:absolute;visibility:hidden;height:" + mm + "mm;";
              document.body.appendChild(probe);
              var px = probe.getBoundingClientRect().height;
              probe.remove();
              return Math.max(1, px);
            }

            function buildPages() {
              var sourcePaper = document.querySelector("#measure-source #paper-preview");
              var root = document.getElementById("preview-root");
              var measure = document.getElementById("measure-source");
              if (!sourcePaper || !root) return;

              root.innerHTML = "";

              var pageHeightPx = mmToPx(PAGE_HEIGHT_MM);
              var footerPx = mmToPx(FOOTER_MM);
              var clipHeightPx = Math.max(1, Math.round(pageHeightPx - footerPx));
              var contentHeight = Math.max(sourcePaper.scrollHeight, sourcePaper.offsetHeight);
              var totalPages = Math.max(1, Math.ceil(contentHeight / clipHeightPx));

              for (var i = 0; i < totalPages; i++) {
                var pageEl = document.createElement("div");
                pageEl.className = "paper-page";

                var clip = document.createElement("div");
                clip.className = "paper-page-clip";

                var inner = sourcePaper.cloneNode(true);
                inner.id = "paper-preview-page-" + (i + 1);
                inner.style.transform = "translateY(" + (-i * clipHeightPx) + "px)";
                clip.appendChild(inner);
                pageEl.appendChild(clip);

                var footer = document.createElement("div");
                footer.className = "paper-page-footer";
                footer.textContent = "Page " + (i + 1) + " / INNOSAT / CODE " + PAGE_CODE;
                pageEl.appendChild(footer);

                root.appendChild(pageEl);
              }

              if (measure) measure.remove();
            }

            function runWhenReady() {
              var images = Array.prototype.slice.call(document.images || []);
              var pending = images.filter(function (img) { return !img.complete; }).length;
              if (pending === 0) {
                buildPages();
                return;
              }
              var done = 0;
              var finished = false;
              var finishAll = function () {
                if (finished) return;
                finished = true;
                buildPages();
              };
              images.forEach(function (img) {
                if (img.complete) return;
                var finish = function () {
                  done += 1;
                  if (done >= pending) finishAll();
                };
                img.addEventListener("load", finish);
                img.addEventListener("error", finish);
              });
              setTimeout(finishAll, 1500);
            }

            if (document.readyState === "complete") runWhenReady();
            else window.addEventListener("load", runWhenReady);
          })();
        </script>
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

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const contentWidthMm = pageWidthMm - PAGE_MARGIN_MM * 2;

    const cleanHTML = `
      <div style="
        box-sizing: border-box;
        width: ${contentWidthMm}mm;
        min-height: ${pageHeightMm - PAGE_MARGIN_MM * 2}mm;
        font-family: 'Times New Roman', serif;
        background: #ffffff;
        color: #000000;
        line-height: 1.4;
      ">
        ${preview.outerHTML}
      </div>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-99999px";
    iframe.style.top = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.open();

    doc.write(`
      <html>
        <body style="margin:0; width:${contentWidthMm}mm; background:#ffffff;">
          ${cleanHTML}

          <style>
            * {
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th, td {
              border: 1px solid #000;
              padding: 5px;
            }

            .flex {
              display: flex;
              justify-content: space-between;
            }

            #paper-preview {
              width: ${contentWidthMm}mm !important;
              max-width: ${contentWidthMm}mm !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
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
              font-size: 13px;
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

            h1 { text-align: center; }

            p {
              line-height: 1.4;
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

            .option-media {
              max-width: 85px;
              max-height: 60px;
            }
          </style>
        </body>
      </html>
    `);

    doc.close();

    await waitForImagesInDocument(doc);
    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(doc.body, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    iframe.remove();

    const pdf = new jsPDF(orientation === "landscape" ? "l" : "p", "mm", "a4");

    const marginX = PAGE_MARGIN_MM;
    const marginTop = PAGE_MARGIN_MM;
    const footerBandHeight = 14;
    const printableHeight = pageHeightMm - marginTop - PAGE_MARGIN_MM - footerBandHeight;
    const imgWidth = contentWidthMm;
    const pxPerMm = canvas.width / imgWidth;
    const sliceHeightPx = Math.max(1, Math.round(printableHeight * pxPerMm));

    let sourceY = 0;
    let pageNumber = 1;

    while (sourceY < canvas.height - 1) {
      const currentSliceHeightPx = Math.min(sliceHeightPx, canvas.height - sourceY);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = currentSliceHeightPx;

      const pageContext = pageCanvas.getContext("2d");
      if (!pageContext) {
        throw new Error("Could not prepare PDF page canvas");
      }

      pageContext.fillStyle = "#ffffff";
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageContext.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        currentSliceHeightPx,
        0,
        0,
        canvas.width,
        currentSliceHeightPx
      );

      const pageImgData = pageCanvas.toDataURL("image/png");
      const pageImgHeight = currentSliceHeightPx / pxPerMm;
      pdf.addImage(pageImgData, "PNG", marginX, marginTop, imgWidth, pageImgHeight);

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pageHeightMm - footerBandHeight, pageWidthMm, footerBandHeight, "F");

      pdf.setFontSize(10);
      pdf.text(`Page ${pageNumber} / INNOSAT / CODE ${exportPaperCode}`, pageWidthMm / 2, pageHeightMm - 6, {
        align: "center",
      });

      sourceY += currentSliceHeightPx;

      if (sourceY < canvas.height - 1) {
        pdf.addPage();
        pageNumber++;
      }
    }

    pdf.save(`${config.title}.pdf`);
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
  const page = getPageSize(orientation);

  const clone = preview.cloneNode(true) as HTMLElement;

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

  const styles = `
    <style>
      body {
        font-family: 'Times New Roman', serif;
        margin: 0;
        padding: 0;
      }
      @page {
        size: A4 ${orientation};
        margin: ${PAGE_MARGIN_MM}mm;
      }
      #paper-preview {
        width: 100% !important;
        max-width: ${page.width} !important;
        min-height: ${page.height} !important;
        margin: 0 auto !important;
        padding: ${PAGE_MARGIN_MM}mm !important;
        box-sizing: border-box !important;
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
        font-size: 13px;
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
      .paper-export-footer {
        position: fixed;
        bottom: 4mm;
        left: 0;
        right: 0;
        width: 100%;
        text-align: center;
        font-size: 10px;
        font-family: 'Times New Roman', serif;
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
          </w:WordDocument>
        </xml>
        <![endif]-->
        ${styles}
      </head>
      <body>
        ${clone.outerHTML}
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
