import { Subject } from "./types";

export const SUBJECTS = [
  { id: "maths", name: "Mathematics", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "reasoning", name: "Reasoning", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "science", name: "Science", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "gk", name: "General Knowledge", classLevels: ["jkg", "skg", "class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "english", name: "English", classLevels: ["jkg", "skg", "class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "history", name: "History", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "geography", name: "Geography", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "civics", name: "Civics", classLevels: ["jkg", "skg", "class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "physics", name: "Physics", classLevels: ["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "chemistry", name: "Chemistry", classLevels: ["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "biology", name: "Biology", classLevels: ["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "mental_ability", name: "Mental Ability", classLevels: ["class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "achievers_section", name: "Achievers Section", classLevels: ["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "logical_reasoning", name: "Logical Reasoning", classLevels: ["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
  { id: "social_science", name: "Social Science", classLevels: ["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },  
];

const SUBJECT_ALIASES: Record<string, string> = {
  // Mathematics
  mathematics: "maths",
  maths: "maths",
  math: "maths",
  math10: "maths",
  maths10: "maths",
  
  // Science
  science: "science",
  science10: "science",
  sci: "science",
  sci10: "science",
  
  // English
  english: "english",
  english10: "english",
  eng: "english",
  eng10: "english",
  
  // Reasoning
  reasoning: "reasoning",
  reasoning10: "reasoning",
  
  // General Knowledge
  gk: "gk",
  generalknowledge: "gk",
  
  // Geography
  geography: "geography",
  geo: "geography",
  
  // History
  history: "history",
  hist: "history",
  
  // Civics
  civics: "civics",
  civic: "civics",
  civicss: "civics",
  
  // Physics
  physics: "physics",
  phys: "physics",
  phy: "physics",
  
  // Chemistry
  chemistry: "chemistry",
  chem: "chemistry",
  
  // Biology
  biology: "biology",
  bio: "biology",
  biol: "biology",

  // Mental Ability
  mentalability: "mental_ability",
  ma: "mental_ability",
  mental: "mental_ability",

  // Achievers Section
  achieversection: "achievers_section",
  achievers: "achievers_section",

  // Logical Reasoning
  logicalreasoning: "logical_reasoning",
  lr: "logical_reasoning",

  // Social Science
  socialscience: "social_science",
  ss: "social_science",
};

const normalizeSubjectKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const normalizeSubjectId = (id: string) => {
  const raw = String(id || "").trim();
  if (!raw) return "";

  // First check if exact match exists in SUBJECTS array
  const exact = SUBJECTS.find((subject) => subject.id === raw);
  if (exact) return exact.id;

  // Normalize the input and check aliases
  const normalized = normalizeSubjectKey(raw);
  
  // Check if normalized version is in aliases
  if (SUBJECT_ALIASES[normalized]) {
    return SUBJECT_ALIASES[normalized];
  }
  
  // Also check lowercase version of raw input
  if (SUBJECT_ALIASES[raw.toLowerCase()]) {
    return SUBJECT_ALIASES[raw.toLowerCase()];
  }
  
  // If still no match, return the normalized version (not raw input)
  // This ensures consistent IDs even for unrecognized subjects
  return normalized || raw;
};

export const getSubjectNameById = (id: string) => {
  const subjectId = normalizeSubjectId(id);
  const subject = SUBJECTS.find((subj) => subj.id === subjectId);
  return subject ? subject.name : "Unknown Subject";
};

// class_6
// 2installHook.js:1 class_7
// installHook.js:1 class_5
// installHook.js:1 class_6
// 3installHook.js:1 class_8
// installHook.js:1 class_7
// 2installHook.js:1 class_6

export const CLASSES = [
  { id: "jkg", name: "JKG" },
  { id: "skg", name: "SKG" },
  { id: "class_1", name: "Class 1" },
  { id: "class_2", name: "Class 2" },
  { id: "class_3", name: "Class 3" },
  { id: "class_4", name: "Class 4" },
  { id: "class_5", name: "Class 5" },
  { id: "class_6", name: "Class 6" },
  { id: "class_7", name: "Class 7" },
  { id: "class_8", name: "Class 8" },
  { id: "class_9", name: "Class 9" },
  { id: "class_10", name: "Class 10" },
  { id: "class_11", name: "Class 11" },
  { id: "class_12", name: "Class 12" },
];

export const getClassNameById = (id: string) => {
  const classItem = CLASSES.find((cls) => cls.id === id);
  return classItem ? classItem.name : "Unknown Class";
}
