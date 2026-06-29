import test from "node:test";
import assert from "node:assert/strict";

import {
  buildClassIdCandidates,
  buildSubjectIdCandidates,
  normalizeClassId,
  normalizeSubjectId,
} from "../utils/normalization.js";
import {
  formatImageOptionValidationErrors,
  validateImageOptionRows,
} from "../utils/bulkImageUploadValidation.js";

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

test("flags image-based options that contain both text and image values", () => {
  const issues = validateImageOptionRows([
    {
      optionAText: "Alpha",
      optionAImage: "a.png",
    },
    {
      optionBText: "Beta",
    },
  ]);

  assert.equal(issues.length, 1);
  assert.equal(issues[0].row, 1);
  assert.equal(issues[0].option, "A");
  assert.match(formatImageOptionValidationErrors(issues), /Question row 1: option A/);
});

test("lists every affected question row in the validation message", () => {
  const issues = validateImageOptionRows(
    Array.from({ length: 10 }, (_, index) => ({
      [`optionAText`]: `Value ${index + 1}`,
      [`optionAImage`]: `image-${index + 1}.png`,
    }))
  );

  const formatted = formatImageOptionValidationErrors(issues);

  assert.equal(issues.length, 10);
  assert.match(formatted, /Question row 10/);
  assert.doesNotMatch(formatted, /and 2 more row\(s\)/);
});
