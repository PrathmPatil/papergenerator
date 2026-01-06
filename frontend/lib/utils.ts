import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function mapPaperToPreviewConfig(paper: any) {
  return {
    title: paper.title,
    classLevel: paper.classId,
    durationMinutes: paper.durationMinutes,
    totalMarks: paper.totalMarks,
    negativeMarking: true,

    sections: paper.sections.map((section: any) => {
      const sectionQuestions = paper.questionsSnapshot.filter((q: any) =>
        section.questions.includes(q.questionId)
      )

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
