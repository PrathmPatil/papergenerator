import test from "node:test";
import assert from "node:assert/strict";

import {
  buildClassIdCandidates,
  buildSubjectIdCandidates,
  normalizeClassId,
  normalizeSubjectId,
} from "../utils/normalization.js";

test("normalizes common class labels to stable IDs", () => {
  assert.equal(normalizeClassId("Class 10"), "class_10");
  assert.equal(normalizeClassId("10th"), "class_10");
  assert.equal(normalizeClassId("SKG"), "skg");
});

test("normalizes subject names and aliases to stable IDs", () => {
  assert.equal(normalizeSubjectId("Mathematics"), "maths");
  assert.equal(normalizeSubjectId("Logical Reasoning"), "reasoning");
  assert.equal(normalizeSubjectId("Phys"), "physics");
});

test("builds lookup aliases for existing unnormalized data", () => {
  assert.ok(buildClassIdCandidates("10").includes("class_10"));
  assert.ok(buildSubjectIdCandidates("General Knowledge").includes("gk"));
});
