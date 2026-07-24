import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getClassNameById } from '@/lib/data'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTopicTitle(value: string) {
  const cleaned = String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) return "Untitled Topic"

  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/** Resolve internal class keys (e.g. class_3) to client-facing labels (Class 3). */
export function formatClassLabel(value: unknown) {
  const raw = String(value || "").trim()
  if (!raw) return "-"
  const fromCatalog = getClassNameById(raw)
  if (fromCatalog && fromCatalog !== "Unknown Class") return fromCatalog
  // Fallback: class_3 -> Class 3, jkg -> JKG
  if (/^class_\d+$/i.test(raw)) {
    return `Class ${raw.split("_")[1]}`
  }
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function mapPaperToPreviewConfig(paper: any) {
  const snapshots = Array.isArray(paper?.questionsSnapshot)
    ? paper.questionsSnapshot
    : []

  return {
    title: paper.title,
    classLevel: formatClassLabel(paper.classId || paper.classLevel),
    classId: paper.classId || "",
    durationMinutes: paper.durationMinutes,
    totalMarks: paper.totalMarks,
    negativeMarking: true,

    sections: paper.sections.map((section: any) => {
      const sectionQuestionIds = new Set(
        (Array.isArray(section?.questions) ? section.questions : []).map((id: any) => String(id))
      )

      const sectionQuestions = snapshots
        .filter((q: any) => sectionQuestionIds.has(String(q?.questionId || q?._id || "")))
        .map((q: any) => ({
          ...q,
          questionId: String(q?.questionId || q?._id || ""),
          type: q?.type || "",
          text: q?.text || "",
          paragraph: q?.paragraph || "",
          subQuestions: Array.isArray(q?.subQuestions) ? q.subQuestions : [],
          options: Array.isArray(q?.options) ? q.options : [],
          media: Array.isArray(q?.media) ? q.media : [],
          correctAnswer: q?.correctAnswer,
          matches: q?.matches,
          marks: Math.max(0, Number(q?.marks || 0)),
          negativeMarks: Math.max(0, Number(q?.negativeMarks || 0)),
        }))

      const positiveMarks = sectionQuestions.reduce(
        (sum: number, q: any) => sum + (q.marks || 0),
        0
      )

      const negativeMarks = sectionQuestions.reduce(
        (sum: number, q: any) => sum + (q.negativeMarks || 0),
        0
      )

      return {
        id: section.id,
        name: section.name,
        marks: positiveMarks || Number(section.marks || 0),
        questionCount: sectionQuestions.length,
        positiveMarks,
        negativeMarks,
        instructions: `Attempt all questions from ${section.name}.`,
        questions: sectionQuestions,
      }
    }),
  }
}

