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

/** Word/PDF "Narrow" margins: 0.5 in. */
const OMR_MARGIN_IN = 0.5;
const OMR_MARGIN_MM = OMR_MARGIN_IN * 25.4;
const OMR_MARGIN_PT = OMR_MARGIN_IN * 72;
const A4_WIDTH_PT = (210 / 25.4) * 72;
const A4_HEIGHT_PT = (297 / 25.4) * 72;

export const clampOmrRollColumns = (value: unknown, fallback = 3) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(4, Math.max(1, Math.round(parsed)));
};

export const getOmrRollDigitCount = (classId: unknown, override?: unknown) => {
  if (override !== undefined && override !== null && String(override).trim() !== "") {
    return clampOmrRollColumns(override, 3);
  }
  return 3;
};

export const getOmrAudienceLabel = (classId: unknown) => {
  const label = formatClassLabel(classId);
  if (label && label !== "-") return `OMR SHEET ${label}`;
  return "OMR SHEET";
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
  const rollOverride =
    config?.previewSettings?.rollNumberColumns ?? config?.rollNumberColumns;
  return {
    rollDigits: getOmrRollDigitCount(classId, rollOverride),
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
        <div class="header-exam">INNOVATIVE SCHOLAR&apos;S ACHIEVEMENT TEST</div>
        <div class="header-code">[ INNOSAT] ${escapeHtml(options.academicYear)}</div>
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
    .filter((section: OmrSectionBlock) => section.items.length > 0);
};

const SECTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const buildOmrFlow = (sections: OmrSectionBlock[]): OmrFlowRow[] => {
  const flow: OmrFlowRow[] = [];

  sections.forEach((section, index) => {
    flow.push({
      kind: "section",
      title: String(section.name || "Section").trim(),
      subtitle: `Section ${SECTION_LETTERS[index] || index + 1}`,
    });
    section.items.forEach((item) => {
      flow.push({ kind: "question", label: item.label });
    });
  });

  return flow;
};

const renderAbcd = () =>
  `<div class="q-row"><span class="qno"></span><span class="slot">A</span><span class="slot">B</span><span class="slot">C</span><span class="slot">D</span></div>`;

const renderQuestion = (label: string) =>
  `<div class="q-row"><span class="qno">${escapeHtml(label)}</span><span class="slot"><span class="bubble"></span></span><span class="slot"><span class="bubble"></span></span><span class="slot"><span class="bubble"></span></span><span class="slot"><span class="bubble"></span></span></div>`;

const renderSection = (title: string, subtitle: string) =>
  `<div class="sec-head"><div class="sec-title">${escapeHtml(title)}</div><div class="sec-sub">${escapeHtml(subtitle)}</div></div>`;

const renderRoll = (digits: number) => {
  const boxes = Array.from({ length: digits }, () => `<div class="roll-box"></div>`).join("");
  const colTemplate = `6.4mm ${Array.from({ length: digits }, () => "4.05mm").join(" ")}`;
  const rows = Array.from({ length: 10 }, (_, n) => {
    const bubbles = Array.from(
      { length: digits },
      () => `<span class="bubble"></span>`
    ).join("");
    return `<div class="roll-row" style="grid-template-columns:${colTemplate}"><span class="digit">${n}</span>${bubbles}</div>`;
  }).join("");

  return `<div class="roll-block"><div class="roll-title">Roll No</div><div class="roll-boxes">${boxes}</div><div class="roll-grid">${rows}</div></div>`;
};

const rowWeight = (row: OmrFlowRow) => {
  if (row.kind === "section") return 2.2;
  return 1;
};

/**
 * Fill the visible A4 column to the bottom before starting the next column.
 * Sized so one Word/PDF page (narrow 0.5in margins + header/footer) does not
 * overflow: col1 is roll + questions; leftover questions go to col2 then col3.
 */
const ROLL_WEIGHT = 12;
const COLUMN_CAPACITY = 44;
const ABCD_EVERY = 5;

/**
 * Fill column 1 (with roll), then 2, then 3.
 * ABCD repeats every 5 questions, matching the INNOSAT sheet.
 */
type PackedItem =
  | { kind: "roll" }
  | { kind: "abcd" }
  | { kind: "section"; title: string; subtitle: string }
  | { kind: "question"; label: string };

const packStructuredColumns = (flow: OmrFlowRow[]): PackedItem[][] => {
  const cols: PackedItem[][] = [[{ kind: "roll" }], [], []];
  const weights = [ROLL_WEIGHT, 0, 0];
  let col = 0;
  let sinceAbcd = ABCD_EVERY;

  const overflowIfAdded = (extra: number) =>
    col < 2 && weights[col] + extra > COLUMN_CAPACITY && weights[col] >= ROLL_WEIGHT;

  const pushAbcd = () => {
    cols[col].push({ kind: "abcd" });
    weights[col] += 1.1;
    sinceAbcd = 0;
  };

  flow.forEach((row, index) => {
    const weight = rowWeight(row);
    const needsAbcd = row.kind === "question" && sinceAbcd >= ABCD_EVERY;
    let needed = weight + (needsAbcd ? 1.1 : 0);
    if (row.kind === "section") {
      const next = flow[index + 1];
      if (next?.kind === "question") needed += rowWeight(next) + 1.1;
    }
    if (overflowIfAdded(needed)) {
      col += 1;
      sinceAbcd = ABCD_EVERY;
    }
    if (row.kind === "section") {
      sinceAbcd = ABCD_EVERY;
      cols[col].push({ kind: "section", title: row.title, subtitle: row.subtitle });
      weights[col] += weight;
      return;
    }
    if (needsAbcd || sinceAbcd >= ABCD_EVERY) {
      pushAbcd();
    }
    cols[col].push({ kind: "question", label: row.label });
    weights[col] += weight;
    sinceAbcd += 1;
  });

  return cols;
};

const packColumns = (flow: OmrFlowRow[], rollDigits: number) =>
  packStructuredColumns(flow).map((col) =>
    col.map((item) => {
      if (item.kind === "roll") return renderRoll(rollDigits);
      if (item.kind === "abcd") return renderAbcd();
      if (item.kind === "section") return renderSection(item.title, item.subtitle);
      return renderQuestion(item.label);
    })
  );

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
  const flow = buildOmrFlow(sections);
  const columns = packColumns(flow, layout.rollDigits);
  const emptyNotice =
    sections.length === 0
      ? `<p class="omr-empty">No MCQ / True-False questions found for an OMR sheet.</p>`
      : "";

  const marks = Array.from({ length: 9 }, () => `<i class="fid"></i>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - OMR Sheet</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      min-height: 297mm;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
      overflow: visible;
      font-size: 10pt;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      height: auto;
      margin: 0;
      padding: ${OMR_MARGIN_IN}in;
      position: relative;
      background: #ffffff;
      color: #000000;
      overflow: visible;
    }

    .header-wrap { margin: 0; border: 1.6px solid #000; background: #fff; }
    .header-text {
      font-family: "Times New Roman", Times, serif;
      text-align: center;
      padding: 2.2mm 4mm 2.6mm;
      line-height: 1.2;
    }
    .header-school { font-size: 16pt; font-weight: 700; letter-spacing: 0.2px; }
    .header-exam { font-size: 14pt; font-weight: 700; margin-top: 0.6mm; }
    .header-code { font-size: 14pt; font-weight: 700; margin-top: 0.2mm; }
    .header-sheet { font-size: 14pt; font-weight: 700; margin-top: 0.2mm; }

    .meta { margin: 0; width: 100%; border-collapse: collapse; table-layout: fixed; }
    .meta td {
      border: 1.6px solid #000;
      border-top: none;
      font-size: 10pt;
      font-weight: 700;
      font-family: Arial, Helvetica, sans-serif;
      height: 8.2mm;
      padding: 2px 8px;
      background: #fff;
      vertical-align: middle;
    }
    .meta .exam { width: 70%; }
    .meta .date { width: 30%; }
    .meta .exam-value { font-weight: 700; }

    .body-wrap {
      margin-top: 3.2mm;
      display: grid;
      grid-template-columns: 4.05mm 1fr 4.05mm 1fr 4.05mm 1fr 4.05mm;
      column-gap: 2.3mm;
      align-items: start;
    }
    .fid-col {
      display: flex;
      flex-direction: column;
      gap: 26.31mm;
      padding-top: 0.2mm;
    }
    .fid {
      width: 4.05mm;
      height: 4.05mm;
      background: #000;
      display: block;
      flex-shrink: 0;
    }

    .omr-col {
      padding: 0;
      min-width: 0;
      width: 100%;
    }

    .sec-head { text-align: center; margin: 2.2mm 0 0.8mm; line-height: 1.15; }
    .sec-title { font-size: 10pt; font-weight: 700; }
    .sec-sub { font-size: 10pt; font-weight: 400; }

    .q-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      width: 100%;
      height: 5.8mm;
    }
    .q-row .qno {
      flex: 0 0 9mm;
      width: 9mm;
      height: 5.8mm;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 1.4mm;
      font-size: 10pt;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }
    .q-row .slot {
      flex: 1 1 0;
      min-width: 0;
      height: 5.8mm;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10pt;
      font-weight: 700;
      line-height: 1;
    }
    .bubble {
      width: 4.05mm;
      height: 4.05mm;
      flex-shrink: 0;
      border: 1.15px solid #000;
      border-radius: 50%;
      background: #fff;
      display: block;
    }

    .roll-block { width: fit-content; margin: 0 auto 2.4mm; text-align: center; }
    .roll-title { font-size: 10pt; font-weight: 700; margin-bottom: 0.8mm; }
    .roll-boxes { display: flex; justify-content: center; margin: 0 0 1.1mm 6.4mm; }
    .roll-box {
      width: 5.7mm;
      height: 5.7mm;
      border: 1.35px solid #000;
      background: #fff;
      margin-left: -1.35px;
    }
    .roll-box:first-child { margin-left: 0; }
    .roll-grid { display: flex; flex-direction: column; gap: 0.9mm; }
    .roll-row {
      display: grid;
      grid-template-columns: 6.4mm 4.05mm 4.05mm 4.05mm;
      column-gap: 2.05mm;
      align-items: center;
      justify-content: center;
      min-height: 6.2mm;
    }
    .roll-row .digit {
      font-size: 10pt;
      font-weight: 400;
      text-align: right;
      padding-right: 0.6mm;
      line-height: 1;
    }
    .roll-row .bubble { margin: 0 auto; }

    .omr-empty { text-align: center; margin: 24px 0; font-size: 10pt; }
    @media print {
      .page { width: auto; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    ${renderOmrHeader(layout)}
    <table class="meta">
      <tr><td class="name" colspan="2">NAME :</td></tr>
      <tr>
        <td class="exam">EXAM : <span class="exam-value">${escapeHtml(title)}</span></td>
        <td class="date">DATE :</td>
      </tr>
    </table>

    ${emptyNotice}
    <div class="body-wrap">
      <div class="fid-col">${marks}</div>
      <div class="omr-col">${columns[0]?.join("") || ""}</div>
      <div class="fid-col">${marks}</div>
      <div class="omr-col">${columns[1]?.join("") || ""}</div>
      <div class="fid-col">${marks}</div>
      <div class="omr-col">${columns[2]?.join("") || ""}</div>
      <div class="fid-col">${marks}</div>
    </div>
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

  const style = win.document.createElement("style");
  style.textContent = `
    html, body {
      width: 100% !important;
      height: auto !important;
      min-height: 100% !important;
      overflow: auto !important;
      background: #cfd4da !important;
    }
    body {
      display: flex !important;
      justify-content: center !important;
      align-items: flex-start !important;
      padding: 24px 16px 64px !important;
      box-sizing: border-box !important;
    }
    .page {
      margin: 0 auto !important;
      overflow: visible !important;
      height: auto !important;
      min-height: 297mm !important;
      flex: 0 0 auto;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
    }
    @media print {
      @page { size: A4; margin: ${OMR_MARGIN_IN}in; }
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        display: block !important;
        overflow: visible !important;
        width: auto !important;
        height: auto !important;
      }
      .page {
        box-shadow: none !important;
        margin: 0 auto !important;
        height: auto !important;
        min-height: auto !important;
        padding: 0 !important;
        overflow: visible !important;
      }
    }
  `;
  win.document.head.appendChild(style);
};

const mmToCssPx = (mm: number) => Math.round((mm / 25.4) * 96);

const omrDownloadName = (config: any) => {
  const baseTitle = String(config?.title || "paper")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, " ");
  return `${baseTitle || "paper"} - OMR Sheet`;
};

const OMR_CAPTURE_CSS = `
  html, body {
    width: 210mm !important;
    min-height: 297mm !important;
    height: auto !important;
    overflow: visible !important;
    background: #ffffff !important;
  }
  .page {
    width: 210mm !important;
    min-height: 297mm !important;
    height: auto !important;
    overflow: visible !important;
    background: #ffffff !important;
    padding: 0 !important;
  }
  .q-row {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    width: 100% !important;
    height: 5.8mm !important;
  }
  .q-row .qno,
  .q-row .slot {
    display: flex !important;
    align-items: center !important;
    height: 5.8mm !important;
    line-height: 1 !important;
  }
  .q-row .qno { justify-content: flex-end !important; }
  .q-row .slot {
    justify-content: center !important;
    flex: 1 1 0 !important;
  }
  .bubble, .roll-box, .meta td, .header-wrap { background: #ffffff !important; }
  .fid { background: #000000 !important; }
`;

/**
 * Rasterize the same HTML as Preview so PDF/Word match the on-screen sheet.
 */
const renderOmrSheetCanvas = async (config: any) => {
  const html = buildOmrSheetHtml(config);
  const widthPx = mmToCssPx(210);
  const minHeightPx = mmToCssPx(297);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:0;top:0;width:${widthPx}px;height:${minHeightPx}px;border:0;opacity:0;pointer-events:none;background:#fff;z-index:-1;`;
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
    if (doc.fonts?.ready) {
      await Promise.race([doc.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1200))]);
    }

    const page = doc.querySelector(".page") as HTMLElement | null;
    if (!page) throw new Error("OMR page not found");

    page.style.width = `${widthPx}px`;
    page.style.height = "auto";
    page.style.minHeight = `${minHeightPx}px`;
    page.style.overflow = "visible";
    page.style.padding = "0";

    const contentH = Math.max(minHeightPx, page.scrollHeight, page.offsetHeight);
    iframe.style.height = `${contentH}px`;

    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const html2canvas = (await import("html2canvas")).default;
    return await html2canvas(page, {
      scale: 3,
      backgroundColor: "#ffffff",
      width: widthPx,
      windowWidth: widthPx,
      windowHeight: contentH,
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      logging: false,
      allowTaint: true,
      letterRendering: true,
      onclone: (clonedDoc) => {
        const clonedPage = clonedDoc.querySelector(".page") as HTMLElement | null;
        if (clonedPage) {
          clonedPage.style.width = `${widthPx}px`;
          clonedPage.style.height = "auto";
          clonedPage.style.minHeight = `${minHeightPx}px`;
          clonedPage.style.overflow = "visible";
          clonedPage.style.padding = "0";
        }
        const safety = clonedDoc.createElement("style");
        safety.textContent = OMR_CAPTURE_CSS;
        clonedDoc.head.appendChild(safety);
      },
    });
  } finally {
    iframe.remove();
  }
};

const NARROW_MARGIN_MM = OMR_MARGIN_MM;
const NARROW_INNER_WIDTH_MM = 210 - 2 * NARROW_MARGIN_MM;
const NARROW_INNER_HEIGHT_MM = 297 - 2 * NARROW_MARGIN_MM;

const fitNarrowInnerMm = (canvas: HTMLCanvasElement) => {
  const heightMm = NARROW_INNER_WIDTH_MM * (canvas.height / canvas.width);
  if (heightMm <= NARROW_INNER_HEIGHT_MM) {
    return { widthMm: NARROW_INNER_WIDTH_MM, heightMm };
  }
  return {
    widthMm: NARROW_INNER_HEIGHT_MM * (canvas.width / canvas.height),
    heightMm: NARROW_INNER_HEIGHT_MM,
  };
};

export const exportOmrSheetAsPDF = async (config: any) => {
  const canvas = await renderOmrSheetCanvas(config);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { widthMm, heightMm } = fitNarrowInnerMm(canvas);
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    NARROW_MARGIN_MM,
    NARROW_MARGIN_MM,
    widthMm,
    heightMm,
    undefined,
    "FAST",
  );
  pdf.save(`${omrDownloadName(config)}.pdf`);
};

export const exportOmrSheetAsWord = async (config: any) => {
  const canvas = await renderOmrSheetCanvas(config);
  const { widthMm, heightMm } = fitNarrowInnerMm(canvas);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <style>
    @page WordSection1 {
      size: ${A4_WIDTH_PT.toFixed(2)}pt ${A4_HEIGHT_PT.toFixed(2)}pt;
      margin: ${OMR_MARGIN_PT}pt ${OMR_MARGIN_PT}pt ${OMR_MARGIN_PT}pt ${OMR_MARGIN_PT}pt;
      mso-header-margin: ${OMR_MARGIN_PT}pt;
      mso-footer-margin: ${OMR_MARGIN_PT}pt;
      mso-gutter-margin: 0pt;
      mso-page-orientation: portrait;
    }
    div.WordSection1 { page: WordSection1; }
    body { margin: 0; padding: 0; }
    img { width: ${widthMm}mm; height: ${heightMm}mm; border: 0; }
  </style>
</head>
<body>
<div class="WordSection1">
  <img src="${canvas.toDataURL("image/png")}" width="${mmToCssPx(widthMm)}" height="${mmToCssPx(heightMm)}" alt="OMR Sheet" />
</div>
</body>
</html>`;

  const blob = new Blob(["\uFEFF" + html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${omrDownloadName(config)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
