// Type definitions for the Paper Setter Application

export type UserRole = "master" | "teacher" | "student"

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export type ClassLevel =
  | "SKG"
  | "JKG"
  | "1st"
  | "2nd"
  | "3rd"
  | "4th"
  | "5th"
  | "6th"
  | "7th"
  | "8th"
  | "9th"
  | "10th"
  | "11th"
  | "12th"

export type Subject = {
  id: string
  name: string
}

export type Topic = {
  id: string
  subjectId: string
  name: string
}

export type QuestionType =
  | "mcq_text"
  | "mcq_image"
  | "single_word"
  | "paragraph"
  | "image_mixed"
  | "matching"
  | "true_false"
  | "short_answer"

export type Difficulty = "easy" | "medium" | "hard"

export interface QuestionBase {
  id: string
  type: QuestionType
  classLevel: ClassLevel
  subjectId: string
  topicId: string
  marks: number
  negativeMarks?: number
  difficulty: Difficulty
  createdAt: string
}

export interface MCQQuestion extends QuestionBase {
  type: "mcq_text"
  questionText: string
  options: { id: string; text: string; isCorrect: boolean }[]
}

export interface ImageMCQQuestion extends QuestionBase {
  type: "mcq_image"
  questionImage?: string
  questionText?: string
  options: { id: string; image?: string; text?: string; isCorrect: boolean }[]
}

export interface SingleAnswerQuestion extends QuestionBase {
  type: "single_word"
  questionText: string
  correctAnswer: string
}

export interface ParagraphQuestion extends QuestionBase {
  type: "paragraph"
  paragraphText: string
  subQuestions: (MCQQuestion | SingleAnswerQuestion)[]
}

export interface MatchingQuestion extends QuestionBase {
  type: "matching"
  questionText: string
  options: { id: string; text: string }[]
  correctMatches: { optionId: string; matchId: string }[]
}

export interface TrueFalseQuestion extends QuestionBase {
  type: "true_false"
  questionText: string
  correctAnswer: boolean
}

export interface ShortAnswerQuestion extends QuestionBase {
  type: "short_answer"
  questionText: string
  correctAnswer: string
}

export type Question =
  | MCQQuestion
  | ImageMCQQuestion
  | SingleAnswerQuestion
  | ParagraphQuestion
  | MatchingQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion

export interface Section {
  id: string
  name: string
  description?: string
  marks: number
  questionCount: number
  marksPerQuestion?: number
  positiveMarks: number
  negativeMarks: number
  instructions?: string
}

export interface Sections {
  id: string;
  name: string;
  subjectId: string;
  marks: number;
}


export interface PaperConfig {
  id?: string
  title: string
  code?: string
  classLevel: ClassLevel
  subjectId: string
  topics: string[]
  totalMarks: number
  durationMinutes: number
  sections: Section[]
  negativeMarking: boolean
  examDate?: string
  examTime?: string
  instructions?: string
  createdAt?: string
}

export interface GeneratedPaper {
  config: PaperConfig
  questions: Question[]
  sectionsBreakdown: SectionBreakdown[]
}

export interface SectionBreakdown {
  sectionId: string
  questions: Question[]
  totalMarks: number
}
