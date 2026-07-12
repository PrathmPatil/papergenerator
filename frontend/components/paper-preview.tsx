"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Eye, Plus, Printer, Trash2 } from "lucide-react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const PAGE_MARGIN_MM = 12;
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

export function PaperPreview({ config }: { config: any }) {
  const [fontSize, setFontSize] = useState(Number(config?.previewSettings?.fontSize || 13));
  const [orientation, setOrientation] = useState(config?.previewSettings?.orientation === "landscape" ? "landscape" : "portrait");
  const [columnCount, setColumnCount] = useState(Math.min(2, Math.max(1, Number(config?.previewSettings?.columnCount || 1))));
  const [paperMonth, setPaperMonth] = useState(String(config?.previewSettings?.month || config?.month || "OCTOBER").toUpperCase());
  const [paperYear, setPaperYear] = useState(String(config?.previewSettings?.year || config?.year || "2025"));
  const [paperCode, setPaperCode] = useState(String(config?.previewSettings?.code || config?.code || ""));
  const [dynamicStudentInstructions, setDynamicStudentInstructions] = useState<string[]>(() =>
    normalizeInstructionLines(config?.previewSettings?.studentInstructions ?? config?.instructions)
  );

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
    const safeFontSize = Number.isFinite(parsedFontSize) && parsedFontSize >= 0 ? parsedFontSize : 13;
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

  const renderAnswerLine = (label = "Answer") => (
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
        <p style={{ fontSize: `${previewStyles.fontSize}px` }}>
          {index + 1}. {subQuestion?.text || ""}
        </p>

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
            <span style={{ fontSize: `${previewStyles.fontSize}px`, fontWeight: 600 }}>{qIndex + 1}.</span>

            <div style={{ flex: 1 }}>
              {q.text && (
                <p style={{ fontSize: `${previewStyles.fontSize}px`, marginBottom: "4px" }}>
                  <strong>Instruction:</strong> {q.text}
                </p>
              )}

              {hasParagraphText && (
                <div style={{ fontSize: `${previewStyles.fontSize}px`, marginBottom: "8px" }}>
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
        <p style={{ fontSize: `${previewStyles.fontSize}px` }}>
          {qIndex + 1}. {q.text}
        </p>

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
      <Card>
        <CardHeader>
          <CardTitle>Preview Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="preview-font-size">Font Size</Label>
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

          <div className="space-y-2 md:col-span-3 lg:col-span-6">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Student Instructions</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDynamicInstruction}>
                <Plus className="mr-2 h-4 w-4" />
                Add Instruction
              </Button>
            </div>

            <div className="rounded-md border p-3 space-y-2">
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
        </CardContent>
      </Card>

      <div
        id="paper-preview"
        data-orientation={previewStyles.orientation}
        data-paper-code={paperCode}
        className="bg-white text-black font-serif"
        style={{
          width: "100%",
          maxWidth: previewStyles.pageWidth,
          minHeight: previewStyles.pageMinHeight,
          margin: "0 auto",
          padding: `${PAGE_MARGIN_MM}mm`,
          fontFamily: "'Times New Roman', Times, serif",
          lineHeight: "1.45",
          fontSize: `${previewStyles.fontSize}px`,
          boxSizing: "border-box",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "104px 1fr",
            alignItems: "center",
            columnGap: "12px",
            paddingBottom: "4px",
          }}
        >
          <img
            className="school-logo"
            src={SCHOOL_LOGO_SRC}
            alt="School logo"
            style={{
              display: "block",
              width: "104px",
              height: "104px",
              objectFit: "contain",
              border: "none",
              padding: 0,
            }}
          />
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", lineHeight: 1.15, whiteSpace: "nowrap" }}>
              INNOVATIVE SCHOLARS' ACHIEVEMENT TEST [ INNOSAT ]
            </h1>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "baseline",
                gap: "44px",
                flexWrap: "wrap",
                fontSize: "21px",
                fontWeight: 700,
                marginTop: "12px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>{paperMonth} - {paperYear}</span>
              <span>CODE : {paperCode}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "2px", fontSize: "18px", lineHeight: "1.35" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "24px" }}>
            <span style={{ display: "flex", alignItems: "baseline", flex: "1 1 auto", minWidth: 0 }}>
              <span style={{ whiteSpace: "nowrap" }}>Name of the student :</span>
              <span
                style={{
                  display: "inline-block",
                  flex: "0 1 300px",
                  minWidth: "190px",
                  borderBottom: "1px solid #000",
                  marginLeft: "6px",
                  height: "0.9em",
                }}
              />
            </span>
            <span>Time : {config.durationMinutes} min</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
            <span>Class : {config.classLevel}</span>
            <span style={{ display: "flex", alignItems: "baseline" }}>
              <span>Roll No.:</span>
              <span style={{ display: "inline-block", width: "70px", borderBottom: "1px solid #000", marginLeft: "5px", height: "0.9em" }} />
            </span>
            <span style={{ display: "flex", alignItems: "baseline" }}>
              <span>Date :</span>
              <span style={{ display: "inline-block", width: "70px", borderBottom: "1px solid #000", marginLeft: "5px", height: "0.9em" }} />
            </span>
            <span style={{ display: "flex", alignItems: "baseline" }}>
              <span>Sign. of Invigilator :</span>
              <span style={{ display: "inline-block", width: "70px", borderBottom: "1px solid #000", marginLeft: "5px", height: "0.9em" }} />
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
                fontSize: "14px",
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

          <Button onClick={() => exportAsWord(config)}>
            <FileText className="mr-2 h-4 w-4" />
            Export Word
          </Button>

          <Button onClick={() => exportAsExcel(config)}>
            <FileText className="mr-2 h-4 w-4" />
            Export Excel
          </Button>

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

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>${config?.title || "Paper"} - Preview</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: #f4f5f7;
            display: flex;
            justify-content: center;
            min-height: 100vh;
          }

          #paper-preview {
            width: 100%;
            max-width: ${page.width};
            min-height: ${page.height};
            margin: 0 auto;
            padding: ${PAGE_MARGIN_MM}mm;
            box-sizing: border-box;
            background: #ffffff;
            color: #000;
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

          img {
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
        </style>
      </head>
      <body>${el.outerHTML}</body>
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

export const exportAsWord = (config: any) => {
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

  clone.querySelectorAll("span").forEach((spanNode) => {
    const labelText = (spanNode.textContent || "").trim();
    if (!/^answer\s*:\s*$/i.test(labelText)) return;

    const row = spanNode.parentElement;
    if (!row) return;

    const answerTable = document.createElement("table");
    answerTable.className = "answer-table";

    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");

    const labelCell = document.createElement("td");
    labelCell.className = "answer-label-cell";
    labelCell.textContent = "Answer :";

    const lineCell = document.createElement("td");
    lineCell.className = "answer-line-cell";

    const line = document.createElement("span");
    line.className = "answer-export-line";
    line.innerHTML = "&nbsp;";

    lineCell.appendChild(line);
    tr.appendChild(labelCell);
    tr.appendChild(lineCell);
    tbody.appendChild(tr);
    answerTable.appendChild(tbody);

    row.replaceWith(answerTable);
  });

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
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-top: 8px;
      }
      .answer-table td {
        border: none !important;
        padding: 0;
        vertical-align: middle;
      }
      .answer-label-cell {
        width: 72px;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        padding-right: 8px;
      }
      .answer-line-cell {
        width: auto;
      }
      .answer-export-line {
        display: block;
        width: 100%;
        min-height: 16px;
        border-bottom: 1px solid #000;
        line-height: 16px;
      }
      img {
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
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${config.title}</title>
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
          body {
            margin: 0;
            padding: 12mm;
            background: #f4f7f7;
            min-height: 100vh;
            display: flex;
            justify-content: center;
          }

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

          #paper-preview {
            width: 100%;
            max-width: ${page.width};
            min-height: ${page.height};
            margin: 0 auto;
            padding: ${PAGE_MARGIN_MM}mm;
            box-sizing: border-box;
            background: #ffffff;
            color: #000;
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
          h1 { text-align: center; font-size: 18px; }
          h2 { font-size: 14px; margin-top: 18px; }
          p { margin: 3px 0; line-height: 1.4; }

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

          img {
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
        </style>
      </head>
      <body>
        ${preview.outerHTML}
        <script>
          window.onload = () => window.print();
        </script>
      </body>
    </html>
  `);

  win.document.close();
};
