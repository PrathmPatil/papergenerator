
interface ExcelMCQImageRow {
  classId: string;
  subjectId: string;
  topicId?: string;
  type: "mcq_image";
  difficulty?: string;
  marks?: number;
  negativeMarks?: number;

  questionText?: string;
  questionImage?: string;

  optionAText?: string;
  optionAImage?: string;
  optionBText?: string;
  optionBImage?: string;
  optionCText?: string;
  optionCImage?: string;
  optionDText?: string;
  optionDImage?: string;

  correctAnswer: "A" | "B" | "C" | "D";
}

type ExcelMCQRow = {
  classId: string;
  subjectId: string;
  topicId?: string;
  type: string;
  difficulty?: string;
  marks?: number | string;
  negativeMarks?: number | string;
  text: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: "A" | "B" | "C" | "D";
};

type ExcelParagraphRow = {
  classId: string;
  subjectId: string;
  topicId?: string;
  difficulty?: string;
  question_type: "paragraph";

  instruction_text: string;
  paragraph: string;

  sub_question_id: string;
  sub_question_type: "mcq_text" | "true_false" | "short_answer";
  sub_question_text?: string;

  option_A?: string;
  option_B?: string;
  option_C?: string;
  option_D?: string;

  correct_answer?: "A" | "B" | "C" | "D" | true | false | "true" | "false";

  marks?: number | string;
  negative_marks?: number | string;
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
    const {
      classId,
      subjectId,
      topicId,
      type,
      difficulty,
      marks,
      negativeMarks,
      text,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
    } = row;

    if (!classId || !subjectId || !type || !text) {
      throw new Error(`Missing required fields at row ${index + 1}`);
    }

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      throw new Error(`Invalid correctAnswer at row ${index + 1}`);
    }

    const options = [
      { id: "A", text: optionA },
      { id: "B", text: optionB },
      { id: "C", text: optionC },
      { id: "D", text: optionD },
    ]
      .filter((opt) => opt.text)
      .map((opt) => ({
        id: opt.id,
        text: opt.text as string,
        isCorrect: opt.id === correctAnswer,
      }));

    if (options.length < 2) {
      throw new Error(`At least 2 options required at row ${index + 1}`);
    }

    return {
      classId,
      subjectId,
      topicId: topicId || "",
      type,
      difficulty: difficulty || "easy",
      marks: Number(marks) || 1,
      negativeMarks: Number(negativeMarks) || 0,
      text,
      options,
      correctAnswer,
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
    } = row;

    if (!classId || !subjectId || !type) {
      throw new Error(`Missing required fields at row ${index + 1}`);
    }

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      throw new Error(`Invalid correctAnswer at row ${index + 1}`);
    }

    const buildOption = (id: "A" | "B" | "C" | "D") => {
      const text = row[`option${id}Text` as keyof ExcelMCQImageRow];
      const image = row[`option${id}Image` as keyof ExcelMCQImageRow];

      if (!text && !image) return null;

      return {
        id,
        text: text || "",
        image: image
          ? { url: `/uploads/${image}` }
          : null,
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
      classId,
      subjectId,
      topicId: topicId || "",
      type: "mcq_image",
      difficulty: difficulty || "easy",
      marks: Number(marks) || 1,
      negativeMarks: Number(negativeMarks) || 0,

      text: questionText || "",
      image: questionImage
        ? { url: `/uploads/${questionImage}` }
        : null,

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
 console.log(rows)
  if (rows.length === 0) return [];

  /* ================= PARAGRAPH LEVEL ================= */

  const firstRow = rows[0];
 console.log(firstRow)
  const {
    classId,
    subjectId,
    topicId,
    difficulty,
    question_type,
    instruction_text,
    paragraph,
  } = firstRow;

  if (!classId || !subjectId || question_type !== "paragraph") {
    throw new Error("Invalid paragraph question data");
  }

  if (!instruction_text || !paragraph) {
    throw new Error("Missing instruction text or paragraph");
  }

  /* ================= SUB QUESTIONS ================= */

  const subQuestions = rows.map((row, index) => {
    const {
      sub_question_id,
      sub_question_type,
      sub_question_text,
      option_A,
      option_B,
      option_C,
      option_D,
      correct_answer,
      marks,
      negative_marks,
    } = row;
    if (!sub_question_id || !sub_question_type) {
      throw new Error(`Missing sub-question fields at row ${index + 1}`);
    }

    /* ---------- MCQ ---------- */
    if (sub_question_type === "mcq_text") {
      if (!["A", "B", "C", "D"].includes(correct_answer as string)) {
        throw new Error(`Invalid correct answer at row ${index + 1}`);
      }

      const options = [
        { id: "A", text: option_A },
        { id: "B", text: option_B },
        { id: "C", text: option_C },
        { id: "D", text: option_D },
      ]
        .filter((o) => o.text)
        .map((o) => ({
          id: o.id,
          text: o.text as string,
          isCorrect: o.id === correct_answer,
        }));

      if (options.length < 2) {
        throw new Error(`At least 2 options required at row ${index + 1}`);
      }

      return {
        id: sub_question_id,
        type: "mcq_text",
        text: sub_question_text || "",
        options,
        correctAnswer: correct_answer,
        marks: Number(marks) || 1,
        negativeMarks: Number(negative_marks) || 0,
      };
    }

    /* ---------- TRUE / FALSE ---------- */
    if (sub_question_type === "true_false") {
      if (
        correct_answer !== true &&
        correct_answer !== false &&
        correct_answer !== "true" &&
        correct_answer !== "false"
      ) {
        throw new Error(`Invalid true/false value at row ${index + 1}`);
      }

      return {
        id: sub_question_id,
        type: "true_false",
        text: sub_question_text || "",
        correctAnswer: correct_answer === true || correct_answer === "true",
        marks: Number(marks) || 1,
        negativeMarks: Number(negative_marks) || 0,
      };
    }

    /* ---------- SHORT ANSWER ---------- */
    if (sub_question_type === "short_answer") {
      return {
        id: sub_question_id,
        type: "short_answer",
        text: sub_question_text || "",
        correctAnswer: correct_answer || "",
        marks: Number(marks) || 2,
        negativeMarks: Number(negative_marks) || 0,
      };
    }

    throw new Error(`Unsupported sub-question type at row ${index + 1}`);
  });

  /* ================= FINAL PAYLOAD ================= */

  return [
    {
      classId,
      subjectId,
      topicId: topicId || "",
      difficulty: difficulty || "easy",
      type: "paragraph",
      text: instruction_text,
      paragraph,
      subQuestions,
      marks: subQuestions.reduce((sum, q) => sum + q.marks, 0),
      negativeMarks: subQuestions.reduce((sum, q) => sum + q.negativeMarks, 0),
    },
  ];
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
