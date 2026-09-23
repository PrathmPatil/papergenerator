import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuestionDuplicateFingerprint,
  buildTextDuplicateKey,
  normalizeQuestionText,
} from "../utils/questionDuplicate.js";

test("normalizes question text for duplicate checks", () => {
  assert.equal(
    normalizeQuestionText("  The Indian  philosopher   Kanad "),
    "the indian philosopher kanad",
  );
});

test("builds the same fingerprint for equivalent questions", () => {
  const base = {
    type: "mcq_text",
    classId: "class_9",
    subjectId: "chemistry",
    topicId: "6a85ac76e1867eee8bde549b",
    text: " What is an atom? ",
    options: [{ id: "A", text: "Particle", isCorrect: true }],
    marks: 4,
    negativeMarks: 0,
    difficulty: "easy",
  };

  assert.equal(
    buildQuestionDuplicateFingerprint(base),
    buildQuestionDuplicateFingerprint({ ...base, text: "What is an atom?" }),
  );
});

test("same-text key ignores extra spaces", () => {
  const keyA = buildTextDuplicateKey(
    { classId: "class_9", subjectId: "chemistry", type: "mcq_text", text: "What is an atom?" },
    "class_9|chemistry|atomsandmolecules",
  );
  const keyB = buildTextDuplicateKey(
    { classId: "class_9", subjectId: "chemistry", type: "mcq_text", text: "  What is an atom?  " },
    "class_9|chemistry|atomsandmolecules",
  );
  assert.equal(keyA, keyB);
});
