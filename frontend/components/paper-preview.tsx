"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText } from "lucide-react";
import type { PaperConfig } from "@/lib/types";


import jsPDF from "jspdf";
import { Printer } from "lucide-react"

interface PaperPreviewProps {
  config: PaperConfig;
}



export function PaperPreview({ config }: PaperPreviewProps) {
  console.log(config);
  return (
    <div className="space-y-4">
      {/* PDF Print Preview */}
      <div
        id="paper-preview"
        className="bg-white text-black shadow-lg rounded border p-8 space-y-6 font-serif"
        style={{ minHeight: "400px" }}
        
      >
        {/* Header */}
        <div className="border-b border-black pb-4 text-center">
          <h1 className="text-lg font-bold uppercase tracking-wide">
            {config.title}
          </h1>
          {config.code && (
            <p className="text-xs mt-1 font-mono">CODE: {config.code}</p>
          )}
          <div className="flex justify-between text-xs mt-3 font-mono">
            <span>Class: {config.classLevel}</span>
            <span>Time: {config.durationMinutes} min</span>
            <span>Max. Marks: {config.totalMarks}</span>
          </div>
          {config.examDate && (
            <p className="text-xs mt-2">
              Date: {config.examDate}{" "}
              {config.examTime && `| Time: ${config.examTime}`}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div>
          <h3 className="font-bold text-xs mb-2 uppercase">
            INSTRUCTIONS FOR STUDENTS:
          </h3>
          <ol className="text-xs space-y-1 ml-4 list-decimal">
            <li>All the questions are compulsory.</li>
            <li>Read the instructions carefully given for each question.</li>
            <li>
              Read the four options carefully and write the correct one in the
              bracket.
            </li>
            <li>Use the space given on the last page for rough work.</li>
            {config.negativeMarking && (
              <li>
                Negative Marking: {config.sections[0]?.negativeMarks || 0}{" "}
                mark(s) for wrong answer.
              </li>
            )}
          </ol>
        </div>

        {/* Marks Distribution Table */}
        <div>
          <h3 className="font-bold text-xs mb-2">MARKS DISTRIBUTION</h3>
          <table className="w-full text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-2 py-1 text-left">
                  Section
                </th>
                <th className="border border-black px-2 py-1 text-center">
                  Total Marks
                </th>
                <th className="border border-black px-2 py-1 text-center">
                  Questions
                </th>
                <th className="border border-black px-2 py-1 text-center">
                  Positive Marks
                </th>
                {config.negativeMarking && (
                  <th className="border border-black px-2 py-1 text-center">
                    Negative Marks
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {config.sections.map((section) => (
                <tr key={section.id}>
                  <td className="border border-black px-2 py-1">
                    {section.name}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">
                    {section.marks}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">
                    {section.questionCount}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">
                    {section.positiveMarks}
                  </td>
                  {config.negativeMarking && (
                    <td className="border border-black px-2 py-1 text-center">
                      {section.negativeMarks}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="font-bold bg-gray-100">
                <td className="border border-black px-2 py-1">Total</td>
                <td className="border border-black px-2 py-1 text-center">
                  {config.totalMarks}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {config.sections.reduce((sum: number, s: any) => sum + (Number(s.questionCount) || 0),
                          0
                        )}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {config.sections.reduce((sum: number, s: any) => sum + (Number(s.positiveMarks) || 0),
                          0
                        )}
                </td>
                {config.negativeMarking && (
                  <td className="border border-black px-2 py-1 text-center">
                    {config.sections.reduce((sum: number, s: any) => sum + (Number(s.negativeMarks) || 0),
                          0
                        )}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sections & Questions */}
        {config.sections.map((section, sectionIndex) => (
          <div key={section.id} className="space-y-3">
            <h3 className="font-bold text-xs uppercase">
              Section {sectionIndex + 1}: {section.name}
            </h3>

            {section.instructions && (
              <p className="text-xs italic">{section.instructions}</p>
            )}

            <div className="space-y-3 ml-2">
              {section.questions && section.questions.length > 0 ? (
                section.questions.map((q: any, qIndex: number) => (
                  <div key={q.questionId} className="text-xs avoid-break">
                    {/* Question text */}
                    <p className="font-bold">
                      {qIndex + 1}. {q.text}
                    </p>

                    {/* Question image (if any) */}
                    {q.media && q.media.length > 0 && (
                      <div className="my-2">
                        <img
                          src={q.media[0].url}
                          alt="question"
                          className="max-h-40 border"
                        />
                      </div>
                    )}

                    {/* Options */}
                    {q.options && q.options.length > 0 && (
                      <div className="ml-4 text-gray-700 flex flex-wrap">
                        {q.options.map((opt: any) => (
                          <p key={opt.id} className="w-1/2 mb-2">
                            ({opt.id}) {opt.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic">
                  No questions in this section.
                </p>
              )}
            </div>
            <div className="print-footer"></div>
          </div>
          
        ))}
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Options</CardTitle>
        </CardHeader>

        <CardContent className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={()=>{handleExportPDF(config)}}
          >
            <FileText className="h-4 w-4" />
            Export as PDF
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={()=>handleExportWord(config)}
          >
            <FileText className="h-4 w-4" />
            Export as Word
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={()=>handleFullPreview(config)}
          >
            <Eye className="h-4 w-4" />
            Full Preview
          </Button>
          <Button variant="outline" onClick={() => handlePrintPDF(config)}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
                              <Button
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={()=>handleDownloadAnswerKey(config)}
          >
            <Download className="h-4 w-4" />
            Download Answer Key
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================
   EXPORT AS PDF
============================ */
export const handleExportPDF = async (config: any) => {
  try {
    console.log("✅ PDF EXPORT iframe v3");

    const preview = document.getElementById("paper-preview") as HTMLElement | null;
    if (!preview) return alert("paper-preview element not found");

    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    // ✅ Make a clean iframe (no globals.css, no shadcn theme)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-99999px";
    iframe.style.top = "0";
    iframe.style.width = "210mm";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            /* ✅ SAFE CSS ONLY (NO okLCH/lab) */
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }

            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: serif;
            }

            /* Match your preview paper size */
            #paper-preview {
              width: 210mm;
              background: #ffffff;
              color: #000000;
              padding: 12mm;
              margin: 0 auto;
            }

            /* stop word breaking */
            #paper-preview, #paper-preview * {
              word-break: normal !important;
              overflow-wrap: normal !important;
              hyphens: none !important;
              box-shadow: none !important;
              outline: none !important;
              text-shadow: none !important;
              background-image: none !important;
            }

            /* table fixes */
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 6px; font-size: 12px; }
            th { background: #e5e7eb; } /* light gray header */
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${preview.outerHTML.replace('id="paper-preview"', 'id="paper-preview"')}
        </body>
      </html>
    `);
    doc.close();

    // Wait a bit for layout
    await new Promise((r) => setTimeout(r, 200));

    const target = doc.getElementById("paper-preview") as HTMLElement | null;
    if (!target) {
      iframe.remove();
      return alert("Preview not found inside iframe");
    }

    // ✅ Render from iframe (lab-free)
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    });

    iframe.remove();

    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeFileName = (config?.title || "paper")
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim();

    pdf.save(`${safeFileName}.pdf`);
  } catch (err: any) {
    console.error("PDF Export failed:", err);
    alert(`PDF Export failed: ${err?.message || err}`);
  }
};
/* ============================
   EXPORT AS PDF FOR PRINT
============================ */

export const handlePrintPDF = () => {
  const preview = document.getElementById("paper-preview");
  if (!preview) {
    alert("paper-preview element not found");
    return;
  }

  const printWindow = window.open("", "_blank", "width=900,height=650");
  if (!printWindow) return;

  // ✅ Copy all stylesheets + <style> tags from current page
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Print</title>
        ${styles}
        <style>
          @page { size: A4; margin: 12mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { background: white; margin: 0; padding: 0; }
          /* remove shadows in print (optional) */
          #paper-preview { box-shadow: none !important; }
        </style>
      </head>
      <body>
        ${preview.outerHTML}
        <script>
          window.onload = () => {
            setTimeout(() => window.print(), 500);
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
/* ============================
   EXPORT AS WORD (.docx)
============================ */
export const handleExportWord = (config: PaperConfig) => {
  const element = document.getElementById("paper-preview")
  if (!element) return

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `

  const blob = new Blob([html], {
    type: "application/msword",
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${config.title}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ============================
   FULL PREVIEW (PRINT VIEW)
============================ */
export const handleFullPreview = (config: PaperConfig) => {
  const element = document.getElementById("paper-preview")
  if (!element) return

  const win = window.open("", "_blank")
  if (!win) return

  win.document.write(`
    <html>
      <head>
        <title>${config.title}</title>
        <style>
          body { font-family: serif; padding: 20px; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `)

  win.document.close()
  win.focus()
}

/* ============================
   DOWNLOAD ANSWER KEY (TXT)
============================ */
export const handleDownloadAnswerKey = (config: PaperConfig) => {
  let content = `ANSWER KEY\n\n${config.title}\n\n`

  config.sections.forEach((section, sIndex) => {
    content += `SECTION ${sIndex + 1}: ${section.name}\n`

    section.questions.forEach((q: any, qIndex: number) => {
      const correctOption =
        q.options?.find((o: any) => o.isCorrect)?.id || "N/A"

      content += `${qIndex + 1}. ${correctOption}\n`
    })

    content += `\n`
  })

  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = `${config.title}_answer_key.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
