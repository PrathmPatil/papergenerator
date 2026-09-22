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
    .filter((section: OmrSectionBlock) => section.items.length > 0);
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
  if (row.kind === "section") return 2.2;
  return 1;
};

/**
 * Fill the visible A4 column to the bottom before starting the next column.
 * Sized so one Word/PDF page (narrow 0.5in margins + header/footer) does not
 * overflow: col1 is roll + questions; leftover questions go to col2 then col3.
 */
const ROLL_WEIGHT = 11;
const COLUMN_CAPACITY = 38;

/**
 * Fill column 1 (with roll), then 2, then 3.
 * ABCD only once per column — at the first question in that column.
 */
type PackedItem =
  | { kind: "roll" }
  | { kind: "abcd" }
  | { kind: "section"; title: string; subtitle: string }
  | { kind: "question"; label: string };

const packStructuredColumns = (flow: OmrFlowRow[]): PackedItem[][] => {
  const cols: PackedItem[][] = [[{ kind: "roll" }], [], []];
  const weights = [ROLL_WEIGHT, 0, 0];
  const abcdPlaced = [false, false, false];
  let col = 0;

  const overflowIfAdded = (extra: number) =>
    col < 2 && weights[col] + extra > COLUMN_CAPACITY && weights[col] >= ROLL_WEIGHT;

  flow.forEach((row, index) => {
    const weight = rowWeight(row);
    const abcdExtra = row.kind === "question" && !abcdPlaced[col] ? 1.2 : 0;
    let needed = weight + abcdExtra;
    if (row.kind === "section") {
      const next = flow[index + 1];
      if (next?.kind === "question") needed += rowWeight(next) + (!abcdPlaced[col] ? 1.2 : 0);
    }
    if (overflowIfAdded(needed)) {
      col += 1;
    }
    if (row.kind === "question" && !abcdPlaced[col]) {
      cols[col].push({ kind: "abcd" });
      weights[col] += 1.2;
      abcdPlaced[col] = true;
    }
    cols[col].push(
      row.kind === "section"
        ? { kind: "section", title: row.title, subtitle: row.subtitle }
        : { kind: "question", label: row.label }
    );
    weights[col] += weight;
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
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
      overflow: hidden;
      font-size: 12px;
    }
    .page {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: ${OMR_MARGIN_MM}mm;
      position: relative;
      background: #ffffff;
      color: #000000;
      overflow: hidden;
    }
    .corner {
      position: absolute; width: 4.2mm; height: 4.2mm; background: #000; z-index: 5;
    }
    .corner.tl { top: 5mm; left: 5mm; }
    .corner.tr { top: 5mm; right: 5mm; }
    .corner.bl { bottom: 5mm; left: 5mm; }
    .corner.br { bottom: 5mm; right: 5mm; }

    .header-wrap { margin: 2mm 0 0; border: 1.6px solid #000; background: #fff; overflow: visible; }
    .header-text {
      text-align: center;
      padding: 4.5mm 5mm;
      line-height: 1.35;
      overflow: visible;
    }
    .header-school { font-size: 12px; font-weight: 800; letter-spacing: 0.2px; }
    .header-exam { font-size: 12px; font-weight: 700; margin-top: 1.5px; }
    .header-code { font-size: 12px; font-weight: 700; margin-top: 1.5px; }
    .header-sheet { font-size: 12px; font-weight: 700; margin-top: 1.5px; }

    .meta { margin: 0 0 2mm; width: 100%; border-collapse: collapse; table-layout: fixed; }
    .meta td {
      border: 1.6px solid #000;
      font-size: 12px;
      font-weight: 700;
      height: 9mm;
      padding: 4px 8px;
      background: #fff;
      vertical-align: middle;
      overflow: visible;
      white-space: normal;
      word-break: break-word;
    }
    .meta .name { border-bottom: none; }
    .meta .exam { width: 72%; }
    .meta .date { width: 28%; }
    .meta .exam-value {
      font-weight: 600;
      white-space: normal;
      overflow: visible;
      word-break: break-word;
    }

    .body-wrap { position: relative; margin: 1mm 0 0; padding: 1mm 2mm 0; overflow: visible; }
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
    .sec-title { font-size: 12px; font-weight: 700; }
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
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .abcd-row .qno { visibility: hidden; }
    .qno {
      font-size: 12px;
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
      font-size: 12px; font-weight: 600;
    }
    .roll-cell .bubble { width: 3.2mm; height: 3.2mm; margin: 0; flex-shrink: 0; }
    .roll-cell .digit { width: 12px; text-align: left; line-height: 1; }

    .omr-empty { text-align: center; margin: 24px 0; font-size: 12px; }
    .foot {
      margin-top: 4mm;
      text-align: center;
      font-size: 12px;
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
    <table class="meta">
      <tr><td class="name" colspan="2">NAME :</td></tr>
      <tr>
        <td class="exam">EXAM : <span class="exam-value">${escapeHtml(title)}</span></td>
        <td class="date">DATE :</td>
      </tr>
    </table>

    ${emptyNotice}
    <div class="body-wrap">
      ${marks}
      <div class="cols">${columnHtml}</div>
    </div>
    <div class="foot">Class: ${escapeHtml(classLabel)} · Darken bubbles fully</div>
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
        padding: ${OMR_MARGIN_MM}mm !important;
        overflow: visible !important;
      }
    }
  `;
  win.document.head.appendChild(style);
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
    "position:fixed;left:0;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;background:#fff;z-index:-1;";
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
      await Promise.race([doc.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]);
    }

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
      scrollX: 0,
      scrollY: 0,
      windowWidth: page.offsetWidth,
      windowHeight: page.offsetHeight,
      onclone: (clonedDoc) => {
        const clonedPage = clonedDoc.querySelector(".page") as HTMLElement | null;
        if (clonedPage) {
          clonedPage.style.width = "210mm";
          clonedPage.style.height = "297mm";
          clonedPage.style.overflow = "hidden";
        }
        const safety = clonedDoc.createElement("style");
        safety.textContent = `
          * {
            color: #000000 !important;
            border-color: #000000 !important;
            outline-color: #000000 !important;
            text-decoration-color: #000000 !important;
            box-shadow: none !important;
            text-overflow: clip !important;
          }
          html, body, .page {
            width: 210mm !important;
            height: 297mm !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            overflow: hidden !important;
          }
          .header-wrap, .header-text, .meta, .meta td, .exam-value, .body-wrap {
            overflow: visible !important;
            white-space: normal !important;
          }
          .bubble, .roll-box, .meta td, .header-wrap { background: #ffffff !important; background-color: #ffffff !important; }
          .corner, .fid { background: #000000 !important; background-color: #000000 !important; }
        `;
        clonedDoc.head.appendChild(safety);
      },
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");

    const baseTitle = String(config?.title || "paper")
      .trim()
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, " ");
    pdf.save(`${baseTitle || "paper"} - OMR Sheet.pdf`);
  } finally {
    iframe.remove();
  }
};

export const exportOmrSheetAsWord = (config: any) => {
  const sections = buildOmrSectionsFromConfig(config);
  const layout = getOmrLayoutOptions(config);
  const title = String(config?.title || "Question Paper");
  const classLabel = formatClassLabel(config?.classId || config?.classLevel);
  const packed = packStructuredColumns(buildOmrFlow(sections));
  const fileTitle = title.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, " ");

  /** Word ignores CSS border-radius, so bubbles must be VML ovals (true circles). */
  const circle = (sizePt = 11) =>
    `<span class="circ"><!--[if mso]><v:oval style="width:${sizePt}pt;height:${sizePt}pt" fillcolor="#FFFFFF" strokecolor="#000000" strokeweight="1.1pt" filled="t" stroked="t"/><![endif]--><!--[if !mso]><!--><span class="circ-fallback">&#9675;</span><!--<![endif]--></span>`;

  const bubbleCell = `<td class="b" align="center" valign="middle">${circle(11)}</td>`;

  const wordRoll = () => {
    const boxCells = Array.from(
      { length: layout.rollDigits },
      () => `<td class="rb" width="24" height="18">&nbsp;</td>`
    ).join("");
    const digitRows = Array.from({ length: 10 }, (_, n) => {
      const cells = Array.from(
        { length: layout.rollDigits },
        () =>
          `<td class="rd" align="center" valign="middle">${circle(10)}&nbsp;<span class="dn">${n}</span></td>`
      ).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table class="roll" align="center" cellspacing="2" cellpadding="0">
      <tr><td class="rt" colspan="${layout.rollDigits}">Roll No</td></tr>
      <tr>${boxCells}</tr>
    </table>
    <table class="roll" align="center" cellspacing="2" cellpadding="0">
      ${digitRows}
    </table>`;
  };

  const wordQuestion = (label: string) =>
    `<table class="q" cellspacing="0" cellpadding="0"><tr><td class="n" valign="middle">${escapeHtml(label)}</td>${bubbleCell}${bubbleCell}${bubbleCell}${bubbleCell}</tr></table>`;

  const wordAbcd = () =>
    `<table class="q abcd" cellspacing="0" cellpadding="0"><tr><td class="n">&nbsp;</td><td class="opt">A</td><td class="opt">B</td><td class="opt">C</td><td class="opt">D</td></tr></table>`;

  const wordSection = (heading: string, subtitle: string) =>
    `<p class="sec">${escapeHtml(heading)}<br/>${escapeHtml(subtitle)}</p>`;

  const wordCol = (items: PackedItem[]) =>
    items
      .map((item) => {
        if (item.kind === "roll") return wordRoll();
        if (item.kind === "abcd") return wordAbcd();
        if (item.kind === "section") return wordSection(item.title, item.subtitle);
        return wordQuestion(item.label);
      })
      .join("");

  const bodyCols = packed
    .map((col) => `<td class="col" valign="top" width="33%">${wordCol(col)}</td>`)
    .join("");

  const html = `<html xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${escapeHtml(title)} - OMR Sheet</title>
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings><o:AllowPNG/></o:OfficeDocumentSettings>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    v\\:* { behavior: url(#default#VML); display: inline-block; }
    o\\:* { behavior: url(#default#VML); }
    /* Word ignores unnamed @page — named section sets Layout > Margins to Narrow (0.5"). */
    @page WordSection1 {
      size: ${A4_WIDTH_PT.toFixed(2)}pt ${A4_HEIGHT_PT.toFixed(2)}pt;
      margin: ${OMR_MARGIN_PT}pt ${OMR_MARGIN_PT}pt ${OMR_MARGIN_PT}pt ${OMR_MARGIN_PT}pt;
      mso-header-margin: ${OMR_MARGIN_PT}pt;
      mso-footer-margin: ${OMR_MARGIN_PT}pt;
      mso-gutter-margin: 0pt;
      mso-paper-source: 0;
      mso-page-orientation: portrait;
    }
    div.WordSection1 { page: WordSection1; }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      mso-ascii-font-family: Arial;
      mso-hansi-font-family: Arial;
      color: #000;
      font-size: 12pt;
    }
    table { border-collapse: collapse; }
    .mark { width: 10px; height: 10px; background: #000; }
    .head { width: 100%; border: 1.5pt solid #000; text-align: center; }
    .head td { padding: 8px 10px; font-weight: 700; line-height: 1.35; border: none; }
    .school { font-size: 12pt; letter-spacing: 0.3pt; }
    .exam { font-size: 12pt; }
    .note { font-size: 12pt; font-weight: 400; text-align: center; margin: 2px 0 4px; }
    .meta { width: 100%; }
    .meta td { border: 1.5pt solid #000; padding: 4px 8px; font-weight: 700; font-size: 12pt; }
    .meta .name { border-bottom: none; height: 18px; }
    .roll { margin: 2px auto 1px; border: none; }
    .rt { font-size: 12pt; font-weight: 800; text-align: center; padding-bottom: 2px; border: none; }
    .rb { width: 24px; height: 16px; border: 1.25pt solid #000; }
    .rd { border: none; white-space: nowrap; padding: 0 3px; }
    .dn { font-size: 12pt; font-weight: 700; font-family: Arial, Helvetica, sans-serif; }
    .b, .opt, .n { border: none !important; }
    .circ { display: inline-block; line-height: 12pt; }
    .circ-fallback { font-size: 14pt; line-height: 14pt; color: #000; }
    .cols { width: 100%; margin-top: 4px; }
    .col { width: 33%; padding: 0 6px; border: none; }
    .sec { text-align: center; font-size: 12pt; font-weight: 700; margin: 4px 0 2px; }
    .q { width: 100%; border: none; margin: 0; }
    .q td { text-align: center; font-size: 12pt; font-weight: 700; border: none; height: 14pt; }
    .q .n { width: 22px; text-align: right; padding-right: 6px; }
    .q .opt { width: 18px; }
    .q .b { width: 18px; }
    .foot { text-align: center; font-size: 12pt; margin-top: 6px; }
  </style>
</head>
<body>
<div class="WordSection1">
  <table class="head"><tr><td>
    <div class="school">${escapeHtml(layout.schoolName)}</div>
    <div class="exam">INNOVATIVE SCHOLAR'S ACHIEVEMENT TEST</div>
    <div class="exam">[ INNOSAT ] ${escapeHtml(layout.academicYear)}</div>
    <div class="exam">${escapeHtml(layout.audience)}</div>
  </td></tr></table>
  <p class="note">Use HB pencil only. Completely darken the circle for the correct option. Do not tick or cross.</p>
  <table class="meta">
    <tr><td class="name" colspan="2">NAME :</td></tr>
    <tr>
      <td width="70%">EXAM : ${escapeHtml(title)}</td>
      <td width="30%">DATE :</td>
    </tr>
  </table>
  <table class="cols"><tr>${bodyCols}</tr></table>
  <p class="foot">Class: ${escapeHtml(classLabel)} &nbsp;|&nbsp; Darken circles fully &nbsp;|&nbsp; One response per question</p>
</div>
</body>
</html>`;

  const blob = new Blob(["\uFEFF" + html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileTitle || "paper"} - OMR Sheet.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
