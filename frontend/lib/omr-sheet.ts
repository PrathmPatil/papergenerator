import { formatClassLabel } from "@/lib/utils";

export type OmrBubbleItem = {
  label: string;
  optionCount: number;
};

export type OmrSectionBlock = {
  name: string;
  items: OmrBubbleItem[];
};

type OmrFlowRow =
  | { kind: "section"; title: string; subtitle: string }
  | { kind: "question"; label: string };

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getClassRank = (classId: unknown) => {
  const raw = String(classId || "").trim().toLowerCase();
  const match = raw.match(/class[_\s-]?(\d+)/i);
  if (match) return Number(match[1]);
  if (raw === "jkg" || raw === "skg") return 0;
  return NaN;
};

export const getOmrRollDigitCount = (classId: unknown) => {
  const rank = getClassRank(classId);
  if (Number.isFinite(rank) && rank >= 6 && rank <= 8) return 3;
  if (Number.isFinite(rank) && rank >= 9 && rank <= 10) return 4;
  return 4;
};

export const getOmrAudienceLabel = (classId: unknown) => {
  const rank = getClassRank(classId);
  if (Number.isFinite(rank) && rank >= 6 && rank <= 8) return "OMR SHEET 6th, 7th & 8th";
  if (Number.isFinite(rank) && rank >= 9 && rank <= 10) return "OMR SHEET 9th to 10th";
  const label = formatClassLabel(classId);
  return label && label !== "-" ? `OMR SHEET — ${label}` : "OMR SHEET";
};

/** Current academic year label, e.g. 2026-27 (April–March). */
const getAcademicYearLabel = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearShort}`;
};

const getOmrSchoolName = (config: any) => {
  const fromConfig = String(
    config?.institution ||
      config?.schoolName ||
      config?.organization ||
      ""
  ).trim();
  return fromConfig || "INNOVATIVE PUBLIC SCHOOL BORAWADE";
};

/** Runtime OMR layout options — no stored template files. */
export const getOmrLayoutOptions = (config: any) => {
  const classId = config?.classId || config?.classLevel;
  return {
    rollDigits: getOmrRollDigitCount(classId),
    audience: getOmrAudienceLabel(classId),
    schoolName: getOmrSchoolName(config),
    academicYear: getAcademicYearLabel(),
  };
};

const renderOmrHeader = (options: {
  schoolName: string;
  academicYear: string;
  audience: string;
}) => `
    <div class="header-wrap">
      <div class="header-text">
        <div class="header-school">${escapeHtml(options.schoolName)}</div>
        <div class="header-exam">INNOVATIVE SCHOLAR'S ACHIEVEMENT TEST</div>
        <div class="header-code">[ INNOSAT ] ${escapeHtml(options.academicYear)}</div>
        <div class="header-sheet">${escapeHtml(options.audience)}</div>
      </div>
    </div>`;

const optionCountForQuestion = (question: any) => {
  const options = Array.isArray(question?.options) ? question.options : [];
  if (options.length > 0) return Math.min(4, Math.max(2, options.length));
  const type = String(question?.type || "").toLowerCase();
  if (type === "true_false") return 2;
  if (type.startsWith("mcq")) return 4;
  return 0;
};

/**
 * Flatten paper into OMR rows with continuous numbering across the whole sheet
 * (1, 2, 3… then into the next subject). Sub-questions use 1.1 / 1.2.
 */
export const buildOmrSectionsFromConfig = (config: any): OmrSectionBlock[] => {
  const sections = Array.isArray(config?.sections) ? config.sections : [];
  let displayNumber = 0;

  return sections
    .map((section: any) => {
      const questions = Array.isArray(section?.questions) ? section.questions : [];
      const items: OmrBubbleItem[] = [];

      questions.forEach((question: any) => {
        const subQuestions = Array.isArray(question?.subQuestions)
          ? question.subQuestions
          : [];
        const isParagraph =
          question?.type === "paragraph" ||
          subQuestions.length > 0 ||
          Boolean(String(question?.paragraph || "").trim());

        displayNumber += 1;
        const parentLabel = displayNumber;

        if (isParagraph && subQuestions.length > 0) {
          let addedSub = false;
          subQuestions.forEach((sub: any, subIndex: number) => {
            const count = optionCountForQuestion(sub);
            if (count <= 0) return;
            addedSub = true;
            items.push({
              label: `${parentLabel}.${subIndex + 1}`,
              optionCount: count,
            });
          });
          if (!addedSub) displayNumber -= 1;
          return;
        }

        const count = optionCountForQuestion(question);
        if (count <= 0) {
          displayNumber -= 1;
          return;
        }
        items.push({
          label: String(parentLabel),
          optionCount: count,
        });
      });

      return {
        name: String(section?.name || "Section"),
        items,
      };
    })
    .filter((section) => section.items.length > 0);
};

const buildOmrFlow = (sections: OmrSectionBlock[]): OmrFlowRow[] => {
  const flow: OmrFlowRow[] = [];

  sections.forEach((section) => {
    flow.push({
      kind: "section",
      title: String(section.name || "Section").trim(),
      subtitle: "Section1",
    });
    section.items.forEach((item) => {
      flow.push({ kind: "question", label: item.label });
    });
  });

  return flow;
};

const renderAbcd = () =>
  `<div class="abcd-row"><span class="qno"></span><span>A</span><span>B</span><span>C</span><span>D</span></div>`;

const renderQuestion = (label: string) =>
  `<div class="q-row"><span class="qno">${escapeHtml(label)}</span><span class="bubble"></span><span class="bubble"></span><span class="bubble"></span><span class="bubble"></span></div>`;

const renderSection = (title: string, subtitle: string) =>
  `<div class="sec-head"><div class="sec-title">${escapeHtml(title)}</div><div class="sec-sub">${escapeHtml(subtitle)}</div></div>`;

const renderRoll = (digits: number) => {
  const boxes = Array.from({ length: digits }, () => `<div class="roll-box"></div>`).join("");
  const cols = Array.from({ length: digits }, () => {
    const cells = Array.from({ length: 10 }, (_, n) =>
      `<div class="roll-cell"><span class="bubble"></span><span class="digit">${n}</span></div>`
    ).join("");
    return `<div class="roll-col">${cells}</div>`;
  }).join("");

  return `<div class="roll-block"><div class="roll-title">Roll No</div><div class="roll-boxes">${boxes}</div><div class="roll-grid">${cols}</div></div>`;
};

const rowWeight = (row: OmrFlowRow) => {
  if (row.kind === "section") return 2.6;
  return 1;
};

/**
 * How many row-units fit in one OMR column on a single A4 sheet.
 * Fill left → middle → right continuously (do not balance/split subjects early).
 */
const COLUMN_CAPACITY = 26;

/**
 * Fill column 1 (with roll), then 2, then 3.
 * ABCD only once per column — at the first question in that column.
 */
const packColumns = (flow: OmrFlowRow[], rollDigits: number) => {
  const cols: string[][] = [[renderRoll(rollDigits)], [], []];
  const weights = [5.5, 0, 0];
  const abcdPlaced = [false, false, false];

  let col = 0;
  flow.forEach((row) => {
    const weight = rowWeight(row);
    // Only move to the next column when the current one is full.
    if (col < 2 && weights[col] + weight > COLUMN_CAPACITY && weights[col] >= 8) {
      col += 1;
    }

    if (row.kind === "question" && !abcdPlaced[col]) {
      cols[col].push(renderAbcd());
      weights[col] += 1.2;
      abcdPlaced[col] = true;
    }

    const html =
      row.kind === "section"
        ? renderSection(row.title, row.subtitle)
        : renderQuestion(row.label);
    cols[col].push(html);
    weights[col] += weight;
  });

  return cols;
};

const waitForImages = async (root: ParentNode, timeoutMs = 2500) => {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return;
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, timeoutMs);
        })
    )
  );
};

export const buildOmrSheetHtml = (config: any): string => {
  const sections = buildOmrSectionsFromConfig(config);
  const layout = getOmrLayoutOptions(config);
  const title = String(config?.title || "Question Paper");
  const classLabel = formatClassLabel(config?.classId || config?.classLevel);
  const flow = buildOmrFlow(sections);
  const columns = packColumns(flow, layout.rollDigits);

  const columnHtml = columns
    .map((col) => `<div class="omr-col">${col.join("")}</div>`)
    .join("");
  const emptyNotice =
    sections.length === 0
      ? `<p class="omr-empty">No MCQ / True-False questions found for an OMR sheet.</p>`
      : "";

  const marks = [5, 14, 23, 32, 41, 50, 59, 68, 77, 86, 95]
    .map(
      (top) => `
      <i class="fid left" style="top:${top}%"></i>
      <i class="fid mid-left" style="top:${top}%"></i>
      <i class="fid mid-right" style="top:${top}%"></i>
      <i class="fid right" style="top:${top}%"></i>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - OMR Sheet</title>
  <style>
    @page { size: A4; margin: 6mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
    }
    .page {
      width: 198mm;
      margin: 0 auto;
      padding: 3mm 5mm 5mm;
      position: relative;
      background: #ffffff;
      color: #000000;
    }
    .corner {
      position: absolute; width: 4.2mm; height: 4.2mm; background: #000; z-index: 5;
    }
    .corner.tl { top: 2mm; left: 2mm; }
    .corner.tr { top: 2mm; right: 2mm; }
    .corner.bl { bottom: 2mm; left: 2mm; }
    .corner.br { bottom: 2mm; right: 2mm; }

    .header-wrap { margin: 3mm 1mm 0; border: 1.6px solid #000; background: #fff; }
    .header-text {
      text-align: center;
      padding: 3.5mm 4mm;
      line-height: 1.25;
    }
    .header-school { font-size: 15px; font-weight: 800; letter-spacing: 0.2px; }
    .header-exam { font-size: 12px; font-weight: 700; margin-top: 1px; }
    .header-code { font-size: 12px; font-weight: 700; margin-top: 1px; }
    .header-sheet { font-size: 12px; font-weight: 700; margin-top: 1px; }

    .meta { margin: 0 1mm 2mm; }
    .meta .box {
      border: 1.6px solid #000;
      font-size: 12px;
      font-weight: 700;
      min-height: 8.5mm;
      padding: 2px 8px;
      display: flex;
      align-items: center;
      background: #fff;
    }
    .meta .name { width: 100%; border-bottom: none; }
    .meta .row { display: grid; grid-template-columns: 1.45fr 0.55fr; }
    .meta .row .box:first-child { border-right: none; }
    .meta .exam-value {
      margin-left: 6px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .body-wrap { position: relative; margin: 1mm 0 0; padding: 1mm 4mm 0; }
    .fid {
      position: absolute; width: 2.8mm; height: 2.8mm; background: #000; z-index: 4;
    }
    .fid.left { left: 0.2mm; }
    .fid.mid-left { left: 33.1%; }
    .fid.mid-right { left: 66.5%; }
    .fid.right { right: 0.2mm; }

    .cols {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      column-gap: 14px;
      align-items: start;
    }
    .omr-col { padding: 0 1px; }

    .sec-head { text-align: center; margin: 4px 0 2px; line-height: 1.15; }
    .sec-title { font-size: 13px; font-weight: 700; }
    .sec-sub { font-size: 12px; font-weight: 700; }

    .abcd-row, .q-row {
      display: grid;
      grid-template-columns: 28px 1fr 1fr 1fr 1fr;
      align-items: center;
      min-height: 4.5mm;
      margin: 0.5px 0;
    }
    .abcd-row {
      margin-top: 1px;
      margin-bottom: 1px;
      font-size: 10px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .abcd-row .qno { visibility: hidden; }
    .qno {
      font-size: 10px;
      font-weight: 700;
      text-align: right;
      padding-right: 3px;
      line-height: 1;
    }
    .bubble {
      width: 3.6mm;
      height: 3.6mm;
      margin: 0 auto;
      border: 1.35px solid #000;
      border-radius: 50%;
      background: #fff;
      display: block;
    }

    .roll-block { width: fit-content; margin: 0 auto 10px; text-align: center; }
    .roll-title { font-size: 12px; font-weight: 800; margin-bottom: 2px; }
    .roll-boxes { display: flex; gap: 5px; justify-content: center; margin-bottom: 3px; }
    .roll-box { width: 7mm; height: 5.8mm; border: 1.5px solid #000; background: #fff; }
    .roll-grid { display: flex; gap: 7px; justify-content: center; }
    .roll-col { display: flex; flex-direction: column; gap: 1.4px; }
    .roll-cell {
      display: flex; align-items: center; gap: 2px;
      font-size: 8px; font-weight: 600;
    }
    .roll-cell .bubble { width: 3.2mm; height: 3.2mm; margin: 0; flex-shrink: 0; }
    .roll-cell .digit { width: 8px; text-align: left; line-height: 1; }

    .omr-empty { text-align: center; margin: 24px 0; font-size: 13px; }
    .foot {
      margin-top: 4mm;
      text-align: center;
      font-size: 8.5px;
      color: #000;
    }
    @media print {
      .page { width: auto; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>

    ${renderOmrHeader(layout)}
    <div class="meta">
      <div class="box name">NAME :</div>
      <div class="row">
        <div class="box">EXAM :<span class="exam-value">${escapeHtml(title)}</span></div>
        <div class="box">DATE :</div>
      </div>
    </div>

    ${emptyNotice}
    <div class="body-wrap">
      ${marks}
      <div class="cols">${columnHtml}</div>
    </div>
    <div class="foot">Class: ${escapeHtml(classLabel)} · ${escapeHtml(layout.audience)} · Darken bubbles fully</div>
  </div>
</body>
</html>`;
};

export const openOmrSheetPreview = (config: any) => {
  const html = buildOmrSheetHtml(config);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
};

/**
 * Render OMR HTML inside an isolated iframe so html2canvas never walks the
 * app's Tailwind/oklch styles (which crash color parsing).
 */
export const exportOmrSheetAsPDF = async (config: any) => {
  const html = buildOmrSheetHtml(config);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-14000px;top:0;width:210mm;height:320mm;border:0;opacity:0;pointer-events:none;background:#fff;";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("OMR iframe document unavailable");

    doc.open();
    doc.write(html);
    doc.close();

    await new Promise<void>((resolve) => {
      if (doc.readyState === "complete") {
        resolve();
        return;
      }
      iframe.onload = () => resolve();
      setTimeout(() => resolve(), 400);
    });

    await waitForImages(doc, 500);

    const page = doc.querySelector(".page") as HTMLElement | null;
    if (!page) throw new Error("OMR page not found");

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(page, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      allowTaint: true,
      imageTimeout: 500,
      windowWidth: Math.max(page.scrollWidth, 794),
      windowHeight: Math.max(page.scrollHeight, 1123),
      onclone: (clonedDoc) => {
        // Extra safety: neutralize any inherited modern color functions.
        const safety = clonedDoc.createElement("style");
        safety.textContent = `
          * {
            color: #000000 !important;
            border-color: #000000 !important;
            outline-color: #000000 !important;
            text-decoration-color: #000000 !important;
            caret-color: #000000 !important;
            column-rule-color: #000000 !important;
            background-image: none !important;
          }
          html, body, .page { background: #ffffff !important; background-color: #ffffff !important; }
          .bubble, .roll-box, .meta .box, .header-wrap { background: #ffffff !important; background-color: #ffffff !important; }
          .corner, .fid { background: #000000 !important; background-color: #000000 !important; }
        `;
        clonedDoc.head.appendChild(safety);
      },
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let imgWidth = pageWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // One page when content fits (or is only slightly over from capture rounding).
    // Extra pages only when the sheet truly overflows A4.
    if (imgHeight <= pageHeight + 3) {
      if (imgHeight > pageHeight) {
        const scale = pageHeight / imgHeight;
        imgWidth *= scale;
        imgHeight = pageHeight;
      }
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 3) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    const baseTitle = String(config?.title || "paper")
      .trim()
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, " ");
    pdf.save(`${baseTitle || "paper"} - OMR Sheet.pdf`);
  } finally {
    iframe.remove();
  }
};
