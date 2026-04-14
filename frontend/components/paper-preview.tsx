"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, Printer } from "lucide-react";
import type { PaperConfig } from "@/lib/types";

/* ============================
   MAIN COMPONENT
============================ */
export function PaperPreview({ config }: { config: PaperConfig }) {
  const cell = {
    border: "1px solid black",
    padding: "5px",
  };

  const cellCenter = {
    ...cell,
    textAlign: "center" as const,
  };

  return (
    <div className="space-y-4">
      {/* ============================
          PAPER
      ============================ */}
      <div
        id="paper-preview"
        className="bg-white text-black font-serif"
        style={{
          width: "100%",
          maxWidth: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          padding: "15mm 18mm",
          lineHeight: "1.4",
          fontSize: "13px",
        }}
      >
        {/* HEADER */}
        <div style={{ textAlign: "center", borderBottom: "1px solid black", paddingBottom: "6px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "bold" }}>
            INNOVATIVE SCHOLARS’ ACHIEVEMENT TEST [ INNOSAT ]
          </h1>
          <p style={{ fontSize: "12px", marginTop: "4px" }}>
            OCTOBER - 2025 CODE : {config.code}
          </p>
        </div>

        {/* STUDENT INFO */}
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

        {/* ============================
            DYNAMIC TABLE
        ============================ */}
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

        {/* ============================
            SECTIONS
        ============================ */}
        {config.sections.map((section, sIndex) => (
          <div key={section.id} style={{ marginTop: "18px" }}>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "6px",
              }}
            >
              SECTION : {section.name.toUpperCase()}
            </h2>

            {section.questions.map((q, qIndex) => (
              <div key={q.questionId} style={{ marginTop: "8px" }}>
                <p style={{ fontSize: "13px" }}>
                  {qIndex + 1}. {q.text}
                </p>

                {/* ✅ 2×2 OPTIONS */}
                <div
                  className="options"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    marginLeft: "15px",
                    marginTop: "4px",
                  }}
                >
                  {q.options.map((opt) => (
                    <p
                      key={opt.id}
                      style={{
                        width: "50%",
                        fontSize: "13px",
                      }}
                    >
                      {opt.id}) {opt.text}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ============================
          BUTTONS
      ============================ */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>

        <CardContent className="flex gap-2 flex-wrap">
          <Button onClick={() => exportAsPDF(config)}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          <Button onClick={printPaper}>
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

/* ============================
   PREVIEW
============================ */
export const handleFullPreview = (config: PaperConfig) => {
  const el = document.getElementById("paper-preview");
  if (!el) return;

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <style>
          body { padding: 20px; font-family: serif; }
          .options { display:flex; flex-wrap:wrap; }
          .options p { width:50%; }
        </style>
      </head>
      <body>${el.outerHTML}</body>
    </html>
  `);

  win.document.close();
};

/* ============================
   PRINT (PRODUCTION)
============================ */
// export const printPaper = () => {
//   const preview = document.getElementById("paper-preview");
//   if (!preview) return;

//   const win = window.open("", "_blank");
//   if (!win) return;

//   win.document.write(`
//     <html>
//       <head>
//         <style>
//           body { padding:20px; font-family:serif; }
//           .options { display:flex; flex-wrap:wrap; }
//           .options p { width:50%; }
//         </style>
//       </head>
//       <body>
//         ${preview.outerHTML}
//         <script>
//           window.onload = () => window.print();
//         </script>
//       </body>
//     </html>
//   `);

//   win.document.close();
// };

/* ============================
   PDF EXPORT (FINAL)
============================ */
export const exportAsPDF = async (config: any) => {
  try {
    const preview = document.getElementById("paper-preview");
    if (!preview) return;

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    /* ============================
       CLEAN HTML (NO TAILWIND)
    ============================ */
    const cleanHTML = `
      <div style="
        width: 210mm;
        min-height: 297mm;
        padding: 15mm 18mm;
        font-family: 'Times New Roman', serif;
        background: #ffffff;
        color: #000000;
        font-size: 13px;
        line-height: 1.4;
      ">
        ${preview.innerHTML}
      </div>
    `;

    /* ============================
       CREATE HIDDEN IFRAME
    ============================ */
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-99999px";
    iframe.style.top = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.open();

    doc.write(`
      <html>
        <body style="margin:0;">
          ${cleanHTML}

          <style>
            /* FORCE SAFE COLORS */
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

            /* ✅ OPTIONS 2x2 (SAFE FLEX) */
            .options {
              display: flex;
              flex-wrap: wrap;
              margin-left: 15px;
              margin-top: 4px;
            }

            .options p {
              width: 50%;
              margin-bottom: 4px;
            }

            h1 { text-align: center; font-size: 18px; }
            h2 { font-size: 14px; margin-top: 18px; }

            p {
              margin: 3px 0;
              line-height: 1.4;
            }
          </style>
        </body>
      </html>
    `);

    doc.close();

    await new Promise((r) => setTimeout(r, 300));

    /* ============================
       RENDER CANVAS
    ============================ */
    const canvas = await html2canvas(doc.body, {
      scale: 3,
      backgroundColor: "#ffffff",
    });

    iframe.remove(); // ✅ NO UI BREAK

    /* ============================
       PDF GENERATION
    ============================ */
    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    let pageNumber = 1;

    const imgData = canvas.toDataURL("image/png");

    while (heightLeft > 0) {
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);

      /* FOOTER */
      pdf.setFontSize(10);
      pdf.text(
        `Page ${pageNumber} / INNOSAT / CODE ${config.code}`,
        105,
        290,
        { align: "center" }
      );

      heightLeft -= 297;

      if (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pageNumber++;
      }
    }

    pdf.save(`${config.title}.pdf`);
  } catch (err) {
    console.error("FINAL PDF ERROR:", err);
  }
};

export const printPaper = async (config: any) => {
  try {
    if (!config) return;

    const preview = document.getElementById("paper-preview");
    if (!preview) return;

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-99999px";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.open();

    doc.write(`
      <html>
        <body style="padding:15mm 18mm;font-family:serif;background:#fff;line-height:1.4;">
          ${preview.innerHTML}
          <style>
            *{background:#fff!important;color:#000!important;}
            table{width:100%;border-collapse:collapse;}
            th,td{border:1px solid #000;padding:5px;}
            .options{display:flex;flex-wrap:wrap;}
            .options p{width:50%;}
          </style>
        </body>
      </html>
    `);

    doc.close();
    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(doc.body, {
      scale: 3,
      backgroundColor: "#ffffff",
    });

    iframe.remove();

    const pdf = new jsPDF("p", "mm", "a4");

    const imgData = canvas.toDataURL("image/png");

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    pdf.setFontSize(10);
    pdf.text(
      `INNOSAT / CODE ${config?.code || ""}`,
      105,
      290,
      { align: "center" }
    );

    pdf.save(`${config?.title || "paper"}_print.pdf`);
  } catch (err) {
    console.error("Print-like PDF error:", err);
  }
};