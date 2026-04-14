// "use client";
// import html2pdf from "html2pdf.js";
// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { FileText, Eye, Printer, Download } from "lucide-react";
// import type { PaperConfig } from "@/lib/types";

// /* ============================
//    MAIN COMPONENT
// ============================ */
// export function PaperPreview({ config }: { config: PaperConfig }) {
//   const [isPreviewOpened, setIsPreviewOpened] = useState(false);

//   // These functions are now properly defined inside the component
//   const handleExportPDF = async () => {
//     await exportAsPDF(config);
//   };

//   const handlePrint = () => {
//     printPaper();
//   };

//   const handleExportWord = () => {
//     exportAsWord(config);
//   };

//   return (
//     <div className="space-y-4">
//       {/* ============================
//           PAPER TEMPLATE (INNOSAT STYLE)
//       ============================ */}
//       <div
//         id="paper-preview"
//         className="bg-white text-black font-serif p-6"
//         style={{
//           width: "210mm",
//           minHeight: "297mm",
//           margin: "auto",
//           boxShadow: "0 0 5px rgba(0,0,0,0.1)",
//         }}
//       >
//         {/* HEADER */}
//         <div className="text-center border-b pb-2">
//           <h1 className="font-bold text-lg">
//             INNOVATIVE SCHOLARS' ACHIEVEMENT TEST [ INNOSAT ]
//           </h1>
//           <p className="text-xs mt-1">OCTOBER - 2025 CODE : {config.code}</p>
//         </div>

//         {/* STUDENT INFO */}
//         <div className="mt-3 text-xs space-y-1">
//           <div className="flex justify-between">
//             <span>Name of the student: __________________________</span>
//             <span>Time: {config.durationMinutes} min</span>
//           </div>

//           <div className="flex justify-between">
//             <span>Class: {config.classLevel}</span>
//             <span>Roll No: ______</span>
//             <span>Date: ______</span>
//             <span>Sign. of Invigilator: ______</span>
//           </div>
//         </div>

//         {/* MARKS TABLE */}
//         <table className="w-full border mt-4 text-xs">
//           <thead>
//             <tr>
//               <th className="border px-2 py-1">Sections</th>
//               <th className="border">English [A]</th>
//               <th className="border">Reasoning [B]</th>
//               <th className="border">Maths [C]</th>
//               <th className="border">Science [D]</th>
//               <th className="border">Total</th>
//             </tr>
//           </thead>

//           <tbody>
//             <tr>
//               <td className="border px-2 py-1">Total Marks</td>
//               {config.sections.map((s) => (
//                 <td key={s.id} className="border text-center">
//                   {s.marks}
//                 </td>
//               ))}
//               <td className="border text-center">{config.totalMarks}</td>
//             </tr>

//             <tr>
//               <td className="border px-2 py-1">Marks obtained</td>
//               <td className="border"></td>
//               <td className="border"></td>
//               <td className="border"></td>
//               <td className="border"></td>
//               <td className="border"></td>
//             </tr>
//           </tbody>
//         </table>

//         {/* SIGN */}
//         <div className="flex justify-between mt-2 text-xs">
//           <span>Sign of Evaluator: ______</span>
//           <span>Sign of Checker: ______</span>
//         </div>

//         {/* INSTRUCTIONS */}
//         <div className="mt-4 text-xs">
//           <p className="font-bold">INSTRUCTIONS FOR STUDENTS :</p>
//           <ol className="list-decimal ml-4">
//             <li>All questions are compulsory.</li>
//             <li>Read instructions carefully.</li>
//             <li>Choose correct option.</li>
//             <li>Use last page for rough work.</li>
//           </ol>
//         </div>

//         {/* SECTIONS */}
//         {config.sections.map((section, sectionIndex) => (
//           <div key={section.id} className="mt-6">
//             <h2 className="font-bold text-sm uppercase">
//               SECTION: {String.fromCharCode(65 + sectionIndex)} {section.name}
//             </h2>

//             {section.questions?.map((q: any, qIndex: number) => (
//               <div key={q.questionId} className="mt-2 text-xs">
//                 <p>
//                   {qIndex + 1}) {q.text}
//                 </p>

//                 <div className="ml-4 grid grid-cols-2">
//                   {q.options?.map((opt: any) => (
//                     <p key={opt.id}>
//                       {opt.id}) {opt.text}
//                     </p>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         ))}
//       </div>

//       {/* ============================
//           BUTTONS
//       ============================ */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Export Options</CardTitle>
//         </CardHeader>

//         <CardContent className="flex gap-2 flex-wrap">
//           <Button onClick={handleExportPDF}>
//             <FileText className="mr-2 h-4 w-4" />
//             Export PDF
//           </Button>

//           <Button onClick={handleExportWord}>
//             <FileText className="mr-2 h-4 w-4" />
//             Export Word
//           </Button>

//           <Button onClick={() => handleFullPreview(config, setIsPreviewOpened)}>
//             <Eye className="mr-2 h-4 w-4" />
//             Preview
//           </Button>

//           <Button onClick={handlePrint}>
//             <Printer className="mr-2 h-4 w-4" />
//             Print
//           </Button>

//           <Button onClick={() => handleDownloadAnswerKey(config)}>
//             <Download className="mr-2 h-4 w-4" />
//             Answer Key
//           </Button>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// /* ============================
//    PREVIEW (Opens in new tab)
// ============================ */
// export const handleFullPreview = (config: PaperConfig, setPreview?: any) => {
//   const el = document.getElementById("paper-preview");
//   if (!el) return;

//   const win = window.open("", "_blank");
//   if (!win) return;

//   // Get the computed styles of the original element
//   const originalStyles = window.getComputedStyle(el);

//   win.document.write(`
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <title>${config.title}</title>
//         <style>
//           /* Reset and base styles */
//           * {
//             margin: 0;
//             padding: 0;
//             box-sizing: border-box;
//           }
//           body {
//             background: white;
//             padding: 20px;
//             display: flex;
//             justify-content: center;
//             font-family: ${originalStyles.fontFamily};
//           }
//           /* Preserve the exact styling */
//           #paper-preview {
//             width: 210mm;
//             min-height: 297mm;
//             margin: 0 auto;
//             background: white;
//             box-shadow: 0 0 5px rgba(0,0,0,0.1);
//           }
//           /* Copy over all necessary classes from your Tailwind/global CSS */
//           .border { border: 1px solid black; }
//           .border-b { border-bottom: 1px solid black; }
//           .text-center { text-align: center; }
//           .font-bold { font-weight: bold; }
//           .text-xs { font-size: 0.75rem; }
//           .text-sm { font-size: 0.875rem; }
//           .text-lg { font-size: 1.125rem; }
//           .mt-1 { margin-top: 0.25rem; }
//           .mt-2 { margin-top: 0.5rem; }
//           .mt-3 { margin-top: 0.75rem; }
//           .mt-4 { margin-top: 1rem; }
//           .mt-6 { margin-top: 1.5rem; }
//           .mb-2 { margin-bottom: 0.5rem; }
//           .p-6 { padding: 1.5rem; }
//           .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
//           .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
//           .flex { display: flex; }
//           .justify-between { justify-content: space-between; }
//           .grid { display: grid; }
//           .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
//           .ml-4 { margin-left: 1rem; }
//           .list-decimal { list-style-type: decimal; }
//           .uppercase { text-transform: uppercase; }
//           .font-serif { font-family: serif; }
//           .w-full { width: 100%; }
//           .space-y-1 > * + * { margin-top: 0.25rem; }
//         </style>
//       </head>
//       <body>
//         ${el.outerHTML}
//       </body>
//     </html>
//   `);

//   win.document.close();
//   if (setPreview) setPreview(true);
// };

// /* ============================
//    PRINT (Opens print modal directly)
// ============================ */
// export const printPaper = () => {
//   const preview = document.getElementById("paper-preview");
//   if (!preview) return;

//   // Create a new window for printing
//   const printWindow = window.open("", "_blank");
//   if (!printWindow) {
//     alert("Please allow pop-ups to print the paper.");
//     return;
//   }

//   // Get the computed styles
//   const originalStyles = window.getComputedStyle(preview);

//   printWindow.document.write(`
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <title>Print Paper</title>
//         <style>
//           /* Reset and base styles */
//           * {
//             margin: 0;
//             padding: 0;
//             box-sizing: border-box;
//           }
//           body {
//             background: white;
//             padding: 20px;
//             font-family: ${originalStyles.fontFamily};
//           }
//           /* Preserve the exact styling */
//           #paper-preview {
//             width: 210mm;
//             min-height: 297mm;
//             margin: 0 auto;
//             background: white;
//           }
//           /* Copy over all necessary classes */
//           .border { border: 1px solid black; }
//           .border-b { border-bottom: 1px solid black; }
//           .text-center { text-align: center; }
//           .font-bold { font-weight: bold; }
//           .text-xs { font-size: 0.75rem; }
//           .text-sm { font-size: 0.875rem; }
//           .text-lg { font-size: 1.125rem; }
//           .mt-1 { margin-top: 0.25rem; }
//           .mt-2 { margin-top: 0.5rem; }
//           .mt-3 { margin-top: 0.75rem; }
//           .mt-4 { margin-top: 1rem; }
//           .mt-6 { margin-top: 1.5rem; }
//           .mb-2 { margin-bottom: 0.5rem; }
//           .p-6 { padding: 1.5rem; }
//           .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
//           .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
//           .flex { display: flex; }
//           .justify-between { justify-content: space-between; }
//           .grid { display: grid; }
//           .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
//           .ml-4 { margin-left: 1rem; }
//           .list-decimal { list-style-type: decimal; }
//           .uppercase { text-transform: uppercase; }
//           .font-serif { font-family: serif; }
//           .w-full { width: 100%; }
//           .space-y-1 > * + * { margin-top: 0.25rem; }

//           /* Print-specific styles */
//           @media print {
//             body {
//               padding: 0;
//               margin: 0;
//             }
//             button, .no-print {
//               display: none;
//             }
//           }
//         </style>
//       </head>
//       <body>
//         ${preview.outerHTML}
//         <script>
//           // Automatically trigger print dialog when loaded
//           window.onload = () => {
//             window.print();
//             window.onafterprint = () => {
//               window.close();
//             };
//           };
//         </script>
//       </body>
//     </html>
//   `);

//   printWindow.document.close();
// };

// /* ============================
//    EXPORT PDF (Direct download)
// ============================ */
// // export const exportAsPDF = async (config: PaperConfig) => {
// //   try {
// //     const preview = document.getElementById("paper-preview");
// //     if (!preview) return;

// //     // Dynamically import libraries
// //     const html2canvas = (await import("html2canvas")).default;
// //     const { jsPDF } = await import("jspdf");

// //     // Create a clean clone for rendering to avoid affecting the original
// //     const clone = preview.cloneNode(true) as HTMLElement;

// //     // Apply explicit styles to the clone for PDF generation
// //     clone.style.width = "210mm";
// //     clone.style.padding = "15mm";
// //     clone.style.backgroundColor = "#ffffff";
// //     clone.style.color = "#000000";
// //     clone.style.position = "relative";

// //     // Ensure grid layout works properly in the clone
// //     const gridElements = clone.querySelectorAll(".grid");
// //     gridElements.forEach((el: any) => {
// //       el.style.display = "grid";
// //       el.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
// //       el.style.gap = "0.5rem";
// //     });

// //     // Create temporary container off-screen
// //     const container = document.createElement("div");
// //     container.style.position = "absolute";
// //     container.style.left = "-9999px";
// //     container.style.top = "0";
// //     container.appendChild(clone);
// //     document.body.appendChild(container);

// //     // Render to canvas with high quality
// //     const canvas = await html2canvas(clone, {
// //       scale: 2,
// //       useCORS: true,
// //       backgroundColor: "#ffffff",
// //       logging: false,
// //     });

// //     // Clean up temporary container
// //     document.body.removeChild(container);

// //     const imgData = canvas.toDataURL("image/png");
// //     const pdf = new jsPDF("p", "mm", "a4");

// //     const pdfWidth = pdf.internal.pageSize.getWidth();
// //     const pdfHeight = pdf.internal.pageSize.getHeight();
// //     const imgWidth = pdfWidth;
// //     const imgHeight = (canvas.height * imgWidth) / canvas.width;

// //     let heightLeft = imgHeight;
// //     let position = 0;

// //     // Add first page
// //     pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
// //     heightLeft -= pdfHeight;

// //     // Add additional pages if content overflows
// //     while (heightLeft > 0) {
// //       position = heightLeft - imgHeight;
// //       pdf.addPage();
// //       pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
// //       heightLeft -= pdfHeight;
// //     }

// //     const fileName = (config?.title || "paper").replace(/\s+/g, "_");
// //     pdf.save(`${fileName}.pdf`);
// //   } catch (err) {
// //     console.error("PDF Export Error:", err);
// //     alert("Failed to export PDF. Please try again.");
// //   }
// // };

// /* ============================
//    EXPORT WORD (Direct download)
// ============================ */
// export const exportAsWord = (config: PaperConfig) => {
//   const el = document.getElementById("paper-preview");
//   if (!el) return;

//   // Create a clone to avoid modifying the original
//   const clone = el.cloneNode(true) as HTMLElement;

//   // Add Word-specific styles
//   const styles = `
//     <style>
//       body {
//         font-family: 'Times New Roman', serif;
//         margin: 2cm;
//         width: 210mm;
//       }
//       .border { border: 1px solid black; }
//       .border-b { border-bottom: 1px solid black; }
//       .text-center { text-align: center; }
//       .font-bold { font-weight: bold; }
//       .grid { display: flex; flex-wrap: wrap; }
//       .grid > p { width: 48%; margin-right: 2%; }
//     </style>
//   `;

//   const htmlContent = `
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <meta charset="UTF-8">
//         <title>${config.title}</title>
//         ${styles}
//       </head>
//       <body>
//         ${clone.outerHTML}
//       </body>
//     </html>
//   `;

//   const blob = new Blob([htmlContent], { type: "application/msword" });
//   const url = URL.createObjectURL(blob);

//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `${config.title.replace(/\s+/g, "_")}.doc`;
//   a.click();

//   URL.revokeObjectURL(url);
// };

// /* ============================
//    ANSWER KEY (Direct download)
// ============================ */
// export const handleDownloadAnswerKey = (config: PaperConfig) => {
//   let content = `ANSWER KEY\n\n${config.title}\n\n`;

//   config.sections.forEach((section, i) => {
//     content += `SECTION ${String.fromCharCode(65 + i)} - ${section.name}\n`;
//     content += "-".repeat(40) + "\n";

//     section.questions.forEach((q: any, j: number) => {
//       const correctOption = q.options?.find((o: any) => o.isCorrect);
//       const answer = correctOption
//         ? `${correctOption.id}) ${correctOption.text}`
//         : "N/A";
//       content += `${j + 1}. ${answer}\n`;
//     });

//     content += "\n";
//   });

//   const blob = new Blob([content], { type: "text/plain" });
//   const url = URL.createObjectURL(blob);

//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `${config.title.replace(/\s+/g, "_")}_answer_key.txt`;
//   a.click();

//   URL.revokeObjectURL(url);
// };

// /* ============================
//    EXPORT AS PDF
// ============================ */

// export const exportAsPDF = async (config: any) => {
//   try {
//     const preview = document.getElementById("paper-preview");
//     if (!preview) return;

//     const html2canvas = (await import("html2canvas")).default;
//     const { jsPDF } = await import("jspdf");

//     // ✅ CREATE CLEAN IFRAME (NO TAILWIND)
//     const iframe = document.createElement("iframe");
//     iframe.style.position = "fixed";
//     iframe.style.left = "-99999px";
//     iframe.style.width = "210mm";
//     document.body.appendChild(iframe);

//     const doc = iframe.contentDocument!;
//     doc.open();

//     // doc.write(`
//     //   <html>
//     //     <head>
//     //       <style>
//     //         body {
//     //           margin: 0;
//     //           padding: 20mm;
//     //           font-family: serif;
//     //           background: #ffffff;
//     //           color: #000000;
//     //         }

//     //         /* REMOVE ANY LAB COLORS */
//     //         * {
//     //           background: #ffffff !important;
//     //           color: #000000 !important;
//     //           box-shadow: none !important;
//     //         }

//     //         /* TABLE */
//     //         table {
//     //           width: 100%;
//     //           border-collapse: collapse;
//     //         }

//     //         th, td {
//     //           border: 1px solid #000;
//     //           padding: 6px;
//     //           font-size: 12px;
//     //         }

//     //         /* FLEX */
//     //         .flex {
//     //           display: flex;
//     //           justify-content: space-between;
//     //         }

//     //         /* OPTIONS GRID */
//     //         .options {
//     //           display: grid;
//     //           grid-template-columns: 1fr 1fr;
//     //           gap: 4px 40px;
//     //           margin-left: 20px;
//     //           margin-top: 5px;
//     //         }

//     //         .question {
//     //           margin-top: 10px;
//     //         }

//     //         h1 { text-align: center; font-size: 18px; }
//     //         h2 { font-size: 14px; margin-top: 20px; }
//     //       </style>
//     //     </head>

//     //     <body>
//     //       ${preview.innerHTML}
//     //     </body>
//     //   </html>
//     // `);

//     doc.write(`
//   <html>
//     <head>
//       <style>
//         body {
//           margin: 0;
//           padding: 20mm;
//           font-family: "Times New Roman", serif;
//           background: #ffffff;
//           color: #000000;

//           /* ✅ FIX OVERLAP */
//           line-height: 1.5;
//           letter-spacing: 0.2px;
//         }

//         * {
//           box-shadow: none !important;
//           text-shadow: none !important;
//         }

//         /* ✅ TEXT FIX */
//         p {
//           margin: 4px 0;
//           font-size: 13px;
//           line-height: 1.5;
//         }

//         h1 {
//           text-align: center;
//           font-size: 18px;
//           margin-bottom: 5px;
//         }

//         h2 {
//           font-size: 14px;
//           margin-top: 20px;
//         }

//         /* ✅ TABLE FIX */
//         table {
//           width: 100%;
//           border-collapse: collapse;
//           margin-top: 10px;
//         }

//         th, td {
//           border: 1px solid #000;
//           padding: 6px;
//           font-size: 12px;
//           line-height: 1.4;
//         }

//         /* ✅ FLEX */
//         .flex {
//           display: flex;
//           justify-content: space-between;
//         }

//         /* ✅ QUESTION BLOCK */
//         .question {
//           margin-top: 10px;
//           page-break-inside: avoid;
//         }

//         /* ✅ OPTIONS FIX (IMPORTANT) */
//         .options {
//           display: grid;
//           grid-template-columns: 1fr 1fr;
//           gap: 6px 40px;
//           margin-left: 20px;
//           margin-top: 6px;
//         }

//       </style>
//     </head>

//     <body>
//       ${preview.innerHTML}
//     </body>
//   </html>
// `);
//     doc.close();

//     await new Promise((r) => setTimeout(r, 300));

//     const target = doc.body;

//     const canvas = await html2canvas(target, {
//       scale: 3,
//       backgroundColor: "#ffffff",
//     });

//     iframe.remove();

//     const imgData = canvas.toDataURL("image/png");

//     const pdf = new jsPDF("p", "mm", "a4");

//     const imgWidth = 210;
//     const imgHeight = (canvas.height * imgWidth) / canvas.width;

//     let heightLeft = imgHeight;
//     let position = 0;

//     pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
//     heightLeft -= 297;

//     while (heightLeft > 0) {
//       position = heightLeft - imgHeight;
//       pdf.addPage();
//       pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
//       heightLeft -= 297;
//     }

//     pdf.save(`${config.title || "paper"}.pdf`);
//   } catch (err) {
//     console.error("PDF Export Error:", err);
//   }
// };

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, Printer, Download } from "lucide-react";
import type { PaperConfig } from "@/lib/types";

/* ============================
   MAIN COMPONENT
============================ */
export function PaperPreview({ config }: { config: PaperConfig }) {
  const [isPreviewOpened, setIsPreviewOpened] = useState(false);

  const cell = {
    border: "1px solid black",
    padding: "5px",
  };

  const cellCenter = {
    ...cell,
    textAlign: "center",
  };
  return (
    <div className="space-y-4">
      {/* PAPER */}
      <div
        id="paper-preview"
        className="bg-white text-black font-serif p-6"
        style={{
          width: "100%", // ✅ FULL WIDTH
          maxWidth: "210mm", // ✅ A4 limit
          minHeight: "297mm",
          margin: "0 auto", // center
          padding: "15mm 18mm", // ✅ exact margins like PDF
          lineHeight: "1.4", // ✅ compact like exam paper
          fontSize: "13px", // ✅ base size
        }}
      >
        {/* HEADER */}
        <div className="text-center border-b pb-2">
          <h1
            className="font-bold text-lg"
            style={{ fontSize: "18px", fontWeight: "bold" }}
          >
            INNOVATIVE SCHOLARS' ACHIEVEMENT TEST [ INNOSAT ]
          </h1>
          <p
            className="text-xs mt-1"
            style={{ fontSize: "12px", marginTop: "4px" }}
          >
            OCTOBER - 2025 CODE : {config.code}
          </p>
        </div>

        {/* STUDENT INFO */}
        <div style={{ marginTop: "10px", fontSize: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Name of the student : __________________________</span>
            <span>Time : {config.durationMinutes} min</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "5px",
            }}
          >
            <span>Class : {config.classLevel}</span>
            <span>Roll No.: ______</span>
            <span>Date : ______</span>
            <span>Sign. of Invigilator : ______</span>
          </div>
        </div>

        {/* TABLE */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "12px",
            fontSize: "12px",
          }}
        >
          {console.log(config)}
          <thead>
            <tr>
              <th style={cell}>Sections</th>
              <th style={cell}>English [A]</th>
              <th style={cell}>Reasoning [B]</th>
              <th style={cell}>Maths [C]</th>
              <th style={cell}>Science [D]</th>
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
              <td style={cell}></td>
              <td style={cell}></td>
              <td style={cell}></td>
              <td style={cell}></td>
              <td style={cell}></td>
            </tr>
          </tbody>
        </table>

        {/* SECTIONS */}
        {config.sections.map((section, sIndex) => (
          <div style={{ marginTop: "18px" }}>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "6px",
              }}
            >
              SECTION :  {section.name.toUpperCase()}
            </h2>

            {section.questions.map((q, qIndex) => (
              <div key={q.questionId} style={{ marginTop: "8px" }}>
                <p style={{ fontSize: "13px" }}>
                  {qIndex + 1}. {q.text}
                </p>

                {/* ✅ PERFECT 2 COLUMN OPTIONS */}
                <div
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

      {/* BUTTONS */}
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
          body {
            padding: 20px;
            display: flex;
            justify-content: center;
            font-family: serif;
          }

          #paper-preview {
            width: 210mm;
          }

          .options {
            display: flex;
            flex-wrap: wrap;
          }

          .options p {
            width: 50%;
          }
        </style>
      </head>
      <body>${el.outerHTML}</body>
    </html>
  `);

  win.document.close();
};

/* ============================
   PRINT
============================ */
export const printPaper = () => {
  const preview = document.getElementById("paper-preview");
  if (!preview) return;

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <style>
          body { padding: 20px; font-family: serif; }

          .options {
            display: flex;
            flex-wrap: wrap;
          }

          .options p {
            width: 50%;
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

/* ============================
   PDF EXPORT (FINAL)
============================ */
export const exportAsPDF = async (config: any) => {
  try {
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
        <head>
          <style>
            body {
              padding: 20mm;
              font-family: serif;
              background: white;
              line-height: 1.5;
            }

            .options {
              display: flex;
              flex-wrap: wrap;
            }

            .options p {
              width: 50%;
              margin-bottom: 4px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th, td {
              border: 1px solid black;
              padding: 5px;
            }
          </style>
        </head>
        <body>
          ${preview.innerHTML}
        </body>
      </html>
    `);

    doc.close();

    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(doc.body, {
      scale: 2,
      backgroundColor: "#ffffff",
    });

    iframe.remove();

    const pdf = new jsPDF("p", "mm", "a4");

    const imgData = canvas.toDataURL("image/png");

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`${config.title}.pdf`);
  } catch (err) {
    console.error(err);
  }
};
