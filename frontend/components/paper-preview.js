"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Eye, Printer } from "lucide-react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

const getMediaSrc = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (!API_BASE_URL) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const waitForImagesInDocument = async (doc) => {
  const images = Array.from(doc.images || []);
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const done = () => resolve();
        img.onload = done;
        img.onerror = done;
      });
    })
  );
};

export function PaperPreview({ config }) {
  const [fontSize, setFontSize] = useState(Number(config?.previewSettings?.fontSize || 13));
  const [orientation, setOrientation] = useState(config?.previewSettings?.orientation === "landscape" ? "landscape" : "portrait");
  const [columnCount, setColumnCount] = useState(Math.min(2, Math.max(1, Number(config?.previewSettings?.columnCount || 1))));

  const cell = {
    border: "1px solid black",
    padding: "5px",
  };

  const cellCenter = {
    ...cell,
    textAlign: "center",
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
      pageWidth: safeOrientation === "landscape" ? "277mm" : "190mm",
      pageMinHeight: safeOrientation === "landscape" ? "190mm" : "297mm",
    };
  }, [columnCount, fontSize, orientation]);

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

  const renderSubQuestion = (subQuestion, index) => {
    const options = Array.isArray(subQuestion?.options) ? subQuestion.options : [];
    const media = Array.isArray(subQuestion?.media) ? subQuestion.media : [];
    const hasImageOptions = options.some((opt) => Boolean(opt?.mediaUrl));
    const subQuestionType = String(subQuestion?.type || "").toLowerCase();

    return (
      <div key={subQuestion?.id || `sub-question-${index}`} style={{ marginTop: "10px" }}>
        <p style={{ fontSize: `${previewStyles.fontSize}px` }}>
          {index + 1}. {subQuestion?.text || ""}
        </p>

        {media.length > 0 && (
          <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
            {media.map((img, idx) => {
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
            {options.map((opt) => (
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

  const renderQuestion = (q, qIndex, sectionId) => {
    const options = Array.isArray(q.options) ? q.options : [];
    const media = Array.isArray(q.media) ? q.media : [];
    const hasImageOptions = options.some((opt) => Boolean(opt?.mediaUrl));
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
                  {media.map((img, idx) => {
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
                {(hasSubQuestions ? q.subQuestions : []).map((subQuestion, subIndex) =>
                  renderSubQuestion(subQuestion, subIndex)
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
            {media.map((img, idx) => {
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
            {options.map((opt) => (
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
        <CardContent className="grid gap-4 md:grid-cols-3">
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
        </CardContent>
      </Card>

      <div
        id="paper-preview"
        data-orientation={previewStyles.orientation}
        className="bg-white text-black font-serif"
        style={{
          width: "100%",
          maxWidth: previewStyles.pageWidth,
          minHeight: previewStyles.pageMinHeight,
          margin: "0 auto",
          padding: "12mm 12mm",
          lineHeight: "1.45",
          fontSize: `${previewStyles.fontSize}px`,
          boxSizing: "border-box",
          background: "#ffffff",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "1px solid black", paddingBottom: "6px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "bold" }}>
            INNOVATIVE SCHOLARS' ACHIEVEMENT TEST [ INNOSAT ]
          </h1>
          <p style={{ fontSize: "12px", marginTop: "4px" }}>
            OCTOBER - 2025 CODE : {config.code}
          </p>
        </div>

        <div style={{ marginTop: "10px", fontSize: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Name of the student : __________________________</span>
            <span>Time : {config.durationMinutes} min</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
            <span>Class : {config.classLevel}</span>
            <span>Roll No.: ______</span>
            <span>Date : ______</span>
            <span>Sign. of Invigilator : ______</span>
          </div>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "12px",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              <th style={cell}>Sections</th>

              {config.sections.map((section, index) => (
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

              {config.sections.map((s) => (
                <td key={s.id} style={cellCenter}>
                  {s.marks}
                </td>
              ))}

              <td style={cellCenter}>{config.totalMarks}</td>
            </tr>

            <tr>
              <td style={cell}>Marks obtained</td>

              {config.sections.map((s) => (
                <td key={s.id} style={cell}></td>
              ))}

              <td style={cell}></td>
            </tr>
          </tbody>
        </table>

        {config.sections.map((section, sectionIndex) => (
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
              {(section.questions || []).map((q, qIndex) => renderQuestion(q, qIndex, section.id))}
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

export const handleFullPreview = (config) => {
  const el = document.getElementById("paper-preview");
  if (!el) return;
  const orientation = el.dataset.orientation === "landscape" ? "landscape" : "portrait";
  const pageWidth = orientation === "landscape" ? "277mm" : "190mm";
  const pageMinHeight = orientation === "landscape" ? "190mm" : "297mm";

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
            max-width: ${pageWidth};
            min-height: ${pageMinHeight};
            margin: 0 auto;
            padding: 18mm 15mm;
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

export const exportAsPDF = async (config) => {
  try {
    const preview = document.getElementById("paper-preview");
    if (!preview) return;
    const orientation = preview.dataset.orientation === "landscape" ? "landscape" : "portrait";
    const pageWidthMm = orientation === "landscape" ? 297 : 210;
    const pageHeightMm = orientation === "landscape" ? 210 : 297;

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const cleanHTML = `
      <div style="
        box-sizing: border-box;
        width: ${pageWidthMm}mm;
        min-height: ${pageHeightMm}mm;
        padding: 12mm;
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

    const doc = iframe.contentDocument;
    doc.open();

    doc.write(`
      <html>
        <body style="margin:0;">
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
              font-size: 12px;
            }

            .flex {
              display: flex;
              justify-content: space-between;
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

            h1 { text-align: center; font-size: 18px; }
            h2 { font-size: 14px; margin-top: 18px; }

            p {
              margin: 3px 0;
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

    const pageWidth = pageWidthMm;
    const pageHeight = pageHeightMm;
    const marginX = 10;
    const marginTop = 10;
    const footerBandHeight = 14;
    const printableHeight = pageHeight - marginTop - footerBandHeight;

    const imgWidth = pageWidth - marginX * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = marginTop;
    let pageNumber = 1;

    const imgData = canvas.toDataURL("image/png");

    while (heightLeft > 0) {
      pdf.addImage(imgData, "PNG", marginX, position, imgWidth, imgHeight);

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pageHeight - footerBandHeight, pageWidth, footerBandHeight, "F");

      pdf.setFontSize(10);
      pdf.text(`Page ${pageNumber} / INNOSAT / CODE ${config.code}`, pageWidth / 2, pageHeight - 6, {
        align: "center",
      });

      heightLeft -= printableHeight;

      if (heightLeft > 0) {
        position -= printableHeight;
        pdf.addPage();
        pageNumber++;
      }
    }

    pdf.save(`${config.title}.pdf`);
  } catch (err) {
    console.error("FINAL PDF ERROR:", err);
  }
};

export const exportAsWord = (config) => {
  const preview = document.getElementById("paper-preview");
  if (!preview) return;
  const orientation = preview.dataset.orientation === "landscape" ? "landscape" : "portrait";

  const clone = preview.cloneNode(true);

  clone.querySelectorAll(".options").forEach((optionsNode) => {
    const children = Array.from(optionsNode.children);
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
        margin: 2cm;
        width: ${orientation === "landscape" ? "297mm" : "210mm"};
      }
      @page {
        size: A4 ${orientation};
        margin: 12mm;
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

export const printPaper = (config) => {
  const preview = document.getElementById("paper-preview");
  if (!preview) return;
  const orientation = preview.dataset.orientation === "landscape" ? "landscape" : "portrait";
  const pageWidth = orientation === "landscape" ? "277mm" : "190mm";
  const pageMinHeight = orientation === "landscape" ? "190mm" : "297mm";

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
            margin: 12mm;
          }

          #paper-preview {
            width: 100%;
            max-width: ${pageWidth};
            min-height: ${pageMinHeight};
            margin: 0 auto;
            padding: 12mm 12mm;
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
