import { CLASSES, normalizeSubjectId } from "@/lib/data";

interface ExcelMCQImageRow {
  classId: string;
  subjectId: string;
  topicId?: string;
  topicName?: string;
  type: "mcq_image";
  question_group_id?: string;
  groupId?: string;
  difficulty?: string;
  marks?: number;
  negativeMarks?: number;
  questionText?: string;
  optionAText?: string;
  optionAImage?: string;
  optionBText?: string;
  optionBImage?: string;
  optionCText?: string;
  optionCImage?: string;
  optionDText?: string;
  optionDImage?: string;
  optionEText?: string;
  optionEImage?: string;
  correctAnswer: "A" | "B" | "C" | "D" | "E";
}

type ExcelMCQRow = {
  classId: string;
  subjectId: string;
  topicId?: string;
  topicName?: string;
  type: string;
  difficulty?: string;
  marks?: number | string;
  negativeMarks?: number | string;
  text: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string;
  correctAnswer: "A" | "B" | "C" | "D" | "E";
};

type ExcelParagraphRow = {
  classId: string;
  subjectId: string;
  topicId?: string;
  topicName?: string;
  difficulty?: string;
  questionType?: string;
  question_type?: string;
  paragraphGroupId?: string;
  paragraph_group_id?: string;
  groupId?: string;
  paragraphId?: string;
  paragraph_id?: string;
  passageId?: string;
  passage_id?: string;
  instructionText?: string;
  instruction_text?: string;
  paragraph: string;
  subQuestionId?: string;
  sub_question_id?: string;
  subQuestionType?: "mcq" | "mcq_text" | "mcq_image" | "true_false" | "short_answer";
  sub_question_type?: "mcq" | "mcq_text" | "mcq_image" | "true_false" | "short_answer";
  subQuestionText?: string;
  sub_question_text?: string;
  optionA?: string;
  option_A?: string;
  optionB?: string;
  option_B?: string;
  optionC?: string;
  option_C?: string;
  optionD?: string;
  option_D?: string;
  optionE?: string;
  option_E?: string;
  correctAnswer?: "A" | "B" | "C" | "D" | "E" | true | false | "true" | "false";
  correct_answer?: "A" | "B" | "C" | "D" | "E" | true | false | "true" | "false";
  marks?: number | string;
  negativeMarks?: number | string;
  negative_marks?: number | string;
};

type ExcelRow = Record<string, any>;

const normalizeExcelKey = (key: string) =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const EXCEL_KEY_ALIASES: Record<string, string> = {
  class: "classId",
  classid: "classId",
  classlevel: "classId",
  classname: "classId",
  subject: "subjectId",
  subjectid: "subjectId",
  subjectname: "subjectId",
  topic: "topicName",
  topicid: "topicId",
  topicname: "topicName",
  type: "type",
  questiontype: "questionType",
  question_type: "questionType",
  difficulty: "difficulty",
  marks: "marks",
  negativemarks: "negativeMarks",
  text: "text",
  questiontext: "questionText",
  question: "questionText",
  questionimage: "questionImage",
  optionatext: "optionAText",
  optionaimage: "optionAImage",
  optionbtext: "optionBText",
  optionbimage: "optionBImage",
  optionctext: "optionCText",
  optioncimage: "optionCImage",
  optiondtext: "optionDText",
  optiondimage: "optionDImage",
  optionetext: "optionEText",
  optioneimage: "optionEImage",
  correctanswer: "correctAnswer",
  correct_option: "correctAnswer",
  paragraphgroupid: "paragraphGroupId",
  groupid: "groupId",
  paragraphid: "paragraphId",
  passageid: "passageId",
  instructiontext: "instructionText",
  paragraph: "paragraph",
  subquestionid: "subQuestionId",
  subquestiontype: "subQuestionType",
  subquestiontext: "subQuestionText",
  optiona: "optionA",
  optionb: "optionB",
  optionc: "optionC",
  optiond: "optionD",
  option_a: "optionA",
  option_b: "optionB",
  option_c: "optionC",
  option_d: "optionD",
  correct_answer: "correctAnswer",
  negative_marks: "negativeMarks",
};

const normalizeQuestionType = (value: unknown, fallback = "mcq_text") => {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const typeAliases: Record<string, string> = {
    mcq: "mcq_text",
    mcqtext: "mcq_text",
    textmcq: "mcq_text",
    multiplechoice: "mcq_text",
    multiplechoicequestion: "mcq_text",
    paragraph: "paragraph",
    passage: "paragraph",
    imagewithsubquestions: "image_subquestions",
    imagesubquestions: "image_subquestions",
    mcqimage: "mcq_image",
    imagemcq: "mcq_image",
    shortanswer: "short_answer",
    descriptive: "short_answer",
    descriptiveanswer: "short_answer",
    desc: "short_answer",
    longanswer: "short_answer",
    essay: "short_answer",
    truefalse: "true_false",
    matching: "matching",
  };

  return typeAliases[normalized] || String(value || fallback).trim().toLowerCase();
};

const normalizeDifficulty = (value: unknown) => {
  const normalized = String(value || "easy").trim().toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : "easy";
};

const normalizeCorrectAnswer = (value: unknown) => String(value || "").trim().toUpperCase();

const normalizeExcelRow = (row: ExcelRow): ExcelRow => {
  const normalizedRow: ExcelRow = {};

  Object.entries(row || {}).forEach(([key, value]) => {
    const normalizedKey = EXCEL_KEY_ALIASES[normalizeExcelKey(key)] ?? key;
    normalizedRow[normalizedKey] = value;
  });

  return normalizedRow;
};

const normalizeClassId = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  const exactMatch = CLASSES.find((item) => item.id === raw || item.id === normalized);
  if (exactMatch) return exactMatch.id;

  const numericMatch = normalized.match(/^(?:class)?(\d{1,2})(?:st|nd|rd|th)?$/);
  if (numericMatch) {
    return `class_${Number(numericMatch[1])}`;
  }

  return normalized || raw;
};
export const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 500
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timer) {
      clearTimeout(timer);
    }

    return new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve(fn(...args));
      }, delay);
    });
  };
}

export function convertExcelRowsToQuestions(rows: ExcelMCQRow[] = []) {
  if (!Array.isArray(rows)) {
    throw new Error("Input must be an array");
  }

  return rows.map((row, index) => {
    const normalizedRow = normalizeExcelRow(row);
    const {
      classId,
      subjectId,
      topicId,
      type,
      questionType,
      difficulty,
      marks,
      negativeMarks,
      text,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      optionE,
      correctAnswer,
    } = normalizedRow;

    const normalizedClassId = normalizeClassId(classId);
    const normalizedSubjectId = normalizeSubjectId(String(subjectId || ""));
    const normalizedType = normalizeQuestionType(type || questionType);
    const questionBody = text || questionText || "";
    const normalizedCorrectAnswer = normalizeCorrectAnswer(correctAnswer);
    const freeTextCorrectAnswer = String(correctAnswer || "").trim();

    if (!normalizedClassId || !normalizedSubjectId || !normalizedType || !questionBody) {
      throw new Error(`Missing required fields at row ${index + 1}`);
    }

    if (normalizedType === "short_answer") {
      return {
        classId: normalizedClassId,
        subjectId: normalizedSubjectId,
        topicId: topicId || normalizedRow.topicName || "",
        type: normalizedType,
        difficulty: normalizeDifficulty(difficulty),
        marks: Number(marks) || 1,
        negativeMarks: Number(negativeMarks) || 0,
        text: questionBody,
        options: [],
        correctAnswer: freeTextCorrectAnswer,
      };
    }

    const options = [
      { id: "A", text: optionA },
      { id: "B", text: optionB },
      { id: "C", text: optionC },
      { id: "D", text: optionD },
      { id: "E", text: optionE },
    ]
      .filter((opt) => opt.text)
      .map((opt) => ({
        id: opt.id,
        text: opt.text as string,
        isCorrect: opt.id === normalizedCorrectAnswer,
      }));

    if (
      normalizedType === "mcq_text" &&
      !(["A", "B", "C", "D", "E"] as const).includes(normalizedCorrectAnswer as any)
    ) {
      throw new Error(`Invalid correctAnswer at row ${index + 1}`);
    }

    if (options.length < 2) {
      throw new Error(`At least 2 options required at row ${index + 1}`);
    }

    return {
      classId: normalizedClassId,
      subjectId: normalizedSubjectId,
      topicId: topicId || normalizedRow.topicName || "",
      type: normalizedType,
      difficulty: normalizeDifficulty(difficulty),
      marks: Number(marks) || 1,
      negativeMarks: Number(negativeMarks) || 0,
      text: questionBody,
      options,
      correctAnswer: normalizedCorrectAnswer,
    };
  });
}

export function convertExcelRowsToImageMCQQuestions(
  rows: ExcelMCQImageRow[] = []
) {
  if (!Array.isArray(rows)) {
    throw new Error("Input must be an array");
  }

  return rows.map((row, index) => {
    const normalizedRow = normalizeExcelRow(row);
    const {
      classId,
      subjectId,
      topicId,
      type,
      difficulty,
      marks,
      negativeMarks,
      questionText,
      questionImage,
      correctAnswer,
    } = normalizedRow;

    const normalizedClassId = normalizeClassId(classId);
    const normalizedSubjectId = normalizeSubjectId(String(subjectId || ""));

    if (!normalizedClassId || !normalizedSubjectId || !type) {
      throw new Error(`Missing required fields at row ${index + 1}`);
    }

    if (!["A", "B", "C", "D", "E"].includes(correctAnswer)) {
      throw new Error(`Invalid correctAnswer at row ${index + 1}`);
    }

    const buildOption = (id: "A" | "B" | "C" | "D") => {
      const text = normalizedRow[`option${id}Text`] ?? normalizedRow[`option${id}`];
      const image = normalizedRow[`option${id}Image`];

      if (!text && !image) return null;

      return {
        id,
        text: text || "",
        image: image ? { url: `/uploads/${image}` } : null,
        isCorrect: id === correctAnswer,
        showPreview: true,
      };
    };

    const options = (["A", "B", "C", "D"] as const)
      .map(buildOption)
      .filter(Boolean);

    if (options.length < 2) {
      throw new Error(`At least 2 options required at row ${index + 1}`);
    }

    return {
      classId: normalizedClassId,
      subjectId: normalizedSubjectId,
      topicId: topicId || normalizedRow.topicName || "",
      type: "mcq_image",
      difficulty: difficulty || "easy",
      marks: Number(marks) || 1,
      negativeMarks: Number(negativeMarks) || 0,
      text: questionText || "",
      image: questionImage ? { url: `/uploads/${questionImage}` } : null,
      options,
      correctAnswer,
    };
  });
}

export function convertExcelRowsToParagraphQuestions(
  rows: ExcelParagraphRow[] = []
) {
  if (!Array.isArray(rows)) {
    throw new Error("Input must be an array");
  }

  if (rows.length === 0) return [];

  const normalize = (value: unknown) => String(value || "").trim();
  const normalizedRows: ExcelParagraphRow[] = rows.map(
    (row) => normalizeExcelRow(row) as ExcelParagraphRow
  );

  const groupRows = new Map<string, ExcelParagraphRow[]>();
  normalizedRows.forEach((row, index) => {
    const groupId =
      normalize(row.paragraphGroupId) ||
      normalize(row.groupId) ||
      normalize(row.paragraphId) ||
      normalize(row.passageId);

    const fallbackKey = [
      normalize(row.classId),
      normalize(row.subjectId),
      normalize(row.topicId),
      normalize(row.instructionText),
      normalize(row.paragraph),
    ].join("|");

    const key = groupId || fallbackKey || `row_${index + 1}`;
    if (!groupRows.has(key)) {
      groupRows.set(key, []);
    }
    groupRows.get(key)!.push(row);
  });

  const buildSubQuestion = (row: ExcelParagraphRow, index: number) => {
    const {
      subQuestionId,
      subQuestionType,
      subQuestionText,
      optionA,
      optionB,
      optionC,
      optionD,
      optionE,
      correctAnswer,
      marks,
      negativeMarks,
    } = row;

    const normalizedSubQuestionType = normalizeQuestionType(subQuestionType || "mcq_text");
    const normalizedCorrectAnswer = normalizeCorrectAnswer(correctAnswer);

    if (!subQuestionId || !normalizedSubQuestionType) {
      throw new Error(`Missing sub-question fields at row ${index + 1}`);
    }

    if (
      normalizedSubQuestionType === "mcq" ||
      normalizedSubQuestionType === "mcq_text" ||
      normalizedSubQuestionType === "mcq_image"
    ) {
      if (!["A", "B", "C", "D", "E"].includes(normalizedCorrectAnswer)) {
        throw new Error(`Invalid correct answer at row ${index + 1}`);
      }

      const options = [
        { id: "A", text: optionA },
        { id: "B", text: optionB },
        { id: "C", text: optionC },
        { id: "D", text: optionD },
      ]
        .filter((o) => o.text)
        .map((o) => ({
          id: o.id,
          text: o.text as string,
          isCorrect: o.id === normalizedCorrectAnswer,
        }));

      if (options.length < 2) {
        throw new Error(`At least 2 options required at row ${index + 1}`);
      }

      return {
        id: subQuestionId,
        type: "mcq_text",
        text: subQuestionText || "",
        options,
        correctAnswer: normalizedCorrectAnswer,
        marks: Number(marks) || 1,
        negativeMarks: Number(negativeMarks) || 0,
      };
    }

    if (normalizedSubQuestionType === "true_false") {
      if (
        correctAnswer !== true &&
        correctAnswer !== false &&
        String(correctAnswer).toLowerCase() !== "true" &&
        String(correctAnswer).toLowerCase() !== "false"
      ) {
        throw new Error(`Invalid true/false value at row ${index + 1}`);
      }

      return {
        id: subQuestionId,
        type: "true_false",
        text: subQuestionText || "",
        correctAnswer: correctAnswer === true || String(correctAnswer).toLowerCase() === "true",
        marks: Number(marks) || 1,
        negativeMarks: Number(negativeMarks) || 0,
      };
    }

    if (normalizedSubQuestionType === "short_answer") {
      return {
        id: subQuestionId,
        type: "short_answer",
        text: subQuestionText || "",
        correctAnswer: correctAnswer || "",
        marks: Number(marks) || 2,
        negativeMarks: Number(negativeMarks) || 0,
      };
    }

    throw new Error(`Unsupported sub-question type at row ${index + 1}`);
  };

  return Array.from(groupRows.values()).map((group, groupIndex) => {
    const firstRow = group[0];
    const {
      classId,
      subjectId,
      topicId,
      difficulty,
      questionType,
      instructionText,
      paragraph,
    } = firstRow;

    const normalizedClassId = normalizeClassId(classId);
    const normalizedSubjectId = normalizeSubjectId(String(subjectId || ""));

    if (
      !normalizedClassId ||
      !normalizedSubjectId ||
      (questionType && normalizeQuestionType(questionType, "paragraph") !== "paragraph")
    ) {
      throw new Error(`Invalid paragraph question data in group ${groupIndex + 1}`);
    }

    if (!instructionText || !paragraph) {
      throw new Error(`Missing instruction text or paragraph in group ${groupIndex + 1}`);
    }

    const subQuestions = group.map((row, index) => buildSubQuestion(row, index));

    return {
      classId: normalizedClassId,
      subjectId: normalizedSubjectId,
      topicId: topicId || firstRow.topicName || "",
      difficulty: normalizeDifficulty(difficulty),
      type: "paragraph",
      text: instructionText,
      paragraph,
      subQuestions,
      marks: subQuestions.reduce((sum, q) => sum + q.marks, 0),
      negativeMarks: subQuestions.reduce((sum, q) => sum + q.negativeMarks, 0),
    };
  });
}

export const downloadFile = (
  filePath: string,
  fileName: string = filePath.split("/").pop() ?? "download"
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", filePath, true);
    xhr.responseType = "blob";
    xhr.onload = () => {
      if (xhr.status === 200) {
        const url = window.URL.createObjectURL(new Blob([xhr.response]));
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.setAttribute("download", fileName);
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        resolve();
      } else {
        reject(new Error(`Failed to download file at ${filePath}`));
      }
    };
    xhr.onerror = () => reject(new Error(`Failed to download file at ${filePath}`));
    xhr.send();
  });
};

export const dateConverterUTC = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";

  return date.toISOString().split("T")[0];
};
