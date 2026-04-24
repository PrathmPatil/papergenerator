import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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


export function mapPaperToPreviewConfig(paper: any) {
  const snapshots = Array.isArray(paper?.questionsSnapshot)
    ? paper.questionsSnapshot
    : []

  return {
    title: paper.title,
    classLevel: paper.classId,
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
        }))

      const positiveMarks = sectionQuestions.reduce(
        (sum: number, q: any) => sum + (q.marks || 1),
        0
      )

      const negativeMarks = sectionQuestions.reduce(
        (sum: number, q: any) => sum + (q.negativeMarks || 0),
        0
      )

      return {
        id: section.id,
        name: section.name,
        marks: positiveMarks,
        questionCount: sectionQuestions.length,
        positiveMarks,
        negativeMarks,
        instructions: `Attempt all questions from ${section.name}.`,
        questions: sectionQuestions,
      }
    }),
  }
}
