/**
 * Marks validation scenario tests for edit/generate flows.
 * Run: npx --yes tsx scripts/test-marks-validation.ts
 */
import {
  hydrateEditSections,
  summarizeMarksBalance,
  validateMarksDistribution,
} from "../lib/marks-validation";

type Result = { name: string; passed: boolean; detail: string };

const results: Result[] = [];

const assert = (name: string, condition: boolean, detail: string) => {
  results.push({ name, passed: condition, detail });
};

const subjectNames = { reasoning: "Reasoning" };
const topicNames = { topic_alphabet: "Alphabet Test" };

// --- Scenario 1: User's bug — total/subject 48, topic 50 ---
{
  const sections = [
    {
      subjectId: "reasoning",
      marks: 48,
      rules: {
        marksPerQuestion: 1,
        topicDistributions: [{ topicId: "topic_alphabet", marks: 50 }],
      },
    },
  ];
  const error = validateMarksDistribution({
    totalMarks: 48,
    selectedSubjects: ["reasoning"],
    sections,
    subjectNames,
    topicNames,
  });
  const summary = summarizeMarksBalance(48, ["reasoning"], sections);
  assert(
    "S1: topic 50 > subject 48 blocks submit",
    Boolean(error) && error.includes("exceed subject marks"),
    error || "no error"
  );
  assert(
    "S1: display remaining is -2",
    summary.displayRemaining === -2,
    `displayRemaining=${summary.displayRemaining}`
  );
  assert("S1: not balanced", summary.isBalanced === false, `isBalanced=${summary.isBalanced}`);
}

// --- Scenario 2: Fix by reducing topic marks to 48 ---
{
  const sections = [
    {
      subjectId: "reasoning",
      marks: 48,
      rules: {
        topicDistributions: [{ topicId: "topic_alphabet", marks: 48 }],
      },
    },
  ];
  const error = validateMarksDistribution({
    totalMarks: 48,
    selectedSubjects: ["reasoning"],
    sections,
    subjectNames,
    topicNames,
  });
  assert("S2: reduce topic to 48 allows submit", error === "", error || "ok");
}

// --- Scenario 3: Fix by increasing total + subject to 50 ---
{
  const sections = [
    {
      subjectId: "reasoning",
      marks: 50,
      rules: {
        topicDistributions: [{ topicId: "topic_alphabet", marks: 50 }],
      },
    },
  ];
  const error = validateMarksDistribution({
    totalMarks: 50,
    selectedSubjects: ["reasoning"],
    sections,
    subjectNames,
    topicNames,
  });
  assert("S3: raise total/subject to 50 allows submit", error === "", error || "ok");
}

// --- Scenario 4: Only raise total to 50, subject still 48, topic 50 ---
{
  const error = validateMarksDistribution({
    totalMarks: 50,
    selectedSubjects: ["reasoning"],
    sections: [
      {
        subjectId: "reasoning",
        marks: 48,
        rules: { topicDistributions: [{ topicId: "topic_alphabet", marks: 50 }] },
      },
    ],
    subjectNames,
    topicNames,
  });
  assert(
    "S4: total 50 but subject 48 / topic 50 still blocked",
    Boolean(error),
    error || "no error"
  );
}

// --- Scenario 5: Subject exceeds total ---
{
  const error = validateMarksDistribution({
    totalMarks: 48,
    selectedSubjects: ["reasoning"],
    sections: [
      {
        subjectId: "reasoning",
        marks: 50,
        rules: { topicDistributions: [{ topicId: "topic_alphabet", marks: 50 }] },
      },
    ],
    subjectNames,
    topicNames,
  });
  assert(
    "S5: subject 50 > total 48 blocks submit",
    Boolean(error) && error.toLowerCase().includes("exceed total"),
    error || "no error"
  );
}

// --- Scenario 6: Under-allocated topics ---
{
  const error = validateMarksDistribution({
    totalMarks: 48,
    selectedSubjects: ["reasoning"],
    sections: [
      {
        subjectId: "reasoning",
        marks: 48,
        rules: { topicDistributions: [{ topicId: "topic_alphabet", marks: 40 }] },
      },
    ],
    subjectNames,
    topicNames,
  });
  assert(
    "S6: topic under-allocation blocked",
    Boolean(error) && error.includes("must equal subject marks"),
    error || "no error"
  );
}

// --- Scenario 7: Remaining subject marks > 0 ---
{
  const error = validateMarksDistribution({
    totalMarks: 50,
    selectedSubjects: ["reasoning"],
    sections: [
      {
        subjectId: "reasoning",
        marks: 48,
        rules: { topicDistributions: [{ topicId: "topic_alphabet", marks: 48 }] },
      },
    ],
    subjectNames,
    topicNames,
  });
  assert(
    "S7: unallocated total marks blocked",
    Boolean(error) && error.includes("Remaining subject marks"),
    error || "no error"
  );
}

// --- Scenario 8: Topic marks 0 ---
{
  const error = validateMarksDistribution({
    totalMarks: 48,
    selectedSubjects: ["reasoning"],
    sections: [
      {
        subjectId: "reasoning",
        marks: 48,
        rules: { topicDistributions: [{ topicId: "topic_alphabet", marks: 0 }] },
      },
    ],
    subjectNames,
    topicNames,
  });
  assert(
    "S8: zero topic marks blocked",
    Boolean(error) && error.toLowerCase().includes("assign marks"),
    error || "no error"
  );
}

// --- Scenario 9: Multi-topic valid split ---
{
  const error = validateMarksDistribution({
    totalMarks: 50,
    selectedSubjects: ["reasoning"],
    sections: [
      {
        subjectId: "reasoning",
        marks: 50,
        rules: {
          topicDistributions: [
            { topicId: "topic_alphabet", marks: 30 },
            { topicId: "topic_other", marks: 20 },
          ],
        },
      },
    ],
    subjectNames,
    topicNames: { ...topicNames, topic_other: "Other" },
  });
  assert("S9: multi-topic balanced allows submit", error === "", error || "ok");
}

// --- Scenario 10: Multi-topic over-allocate ---
{
  const error = validateMarksDistribution({
    totalMarks: 50,
    selectedSubjects: ["reasoning"],
    sections: [
      {
        subjectId: "reasoning",
        marks: 50,
        rules: {
          topicDistributions: [
            { topicId: "topic_alphabet", marks: 30 },
            { topicId: "topic_other", marks: 25 },
          ],
        },
      },
    ],
    subjectNames,
    topicNames: { ...topicNames, topic_other: "Other" },
  });
  assert(
    "S10: multi-topic 55 > 50 blocked",
    Boolean(error) && error.includes("exceed subject marks"),
    error || "no error"
  );
}

// --- Scenario 11: Hydrate keeps paper marks + template topic mismatch ---
{
  const hydrated = hydrateEditSections({
    paperSections: [{ id: "sec_reasoning", subjectId: "reasoning", marks: 48 }],
    editSections: [
      {
        id: "sec_reasoning",
        name: "Reasoning",
        subjectId: "reasoning",
        marks: 50,
        rules: {
          topicDistributions: [{ topicId: "topic_alphabet", marks: 50 }],
        },
      },
    ],
    templateSections: [
      {
        id: "sec_reasoning",
        name: "Reasoning",
        subjectId: "reasoning",
        marks: 50,
        rules: {
          topicDistributions: [{ topicId: "topic_alphabet", marks: 50 }],
        },
      },
    ],
  });

  assert("S11: hydrate subject marks from paper (48)", hydrated[0]?.marks === 48, `marks=${hydrated[0]?.marks}`);
  assert(
    "S11: hydrate keeps template topic marks (50)",
    hydrated[0]?.rules?.topicDistributions?.[0]?.marks === 50,
    `topic=${hydrated[0]?.rules?.topicDistributions?.[0]?.marks}`
  );

  const error = validateMarksDistribution({
    totalMarks: 48,
    selectedSubjects: ["reasoning"],
    sections: hydrated,
    subjectNames,
    topicNames,
  });
  assert("S11: hydrated mismatch cannot submit", Boolean(error), error || "no error");
}

// --- Scenario 12: total marks 0 ---
{
  const error = validateMarksDistribution({
    totalMarks: 0,
    selectedSubjects: ["reasoning"],
    sections: [
      {
        subjectId: "reasoning",
        marks: 0,
        rules: { topicDistributions: [{ topicId: "topic_alphabet", marks: 0 }] },
      },
    ],
    subjectNames,
    topicNames,
  });
  assert("S12: total marks 0 blocked", Boolean(error) && error.includes("greater than 0"), error || "no error");
}

// --- Scenario 13: no subjects ---
{
  const error = validateMarksDistribution({
    totalMarks: 50,
    selectedSubjects: [],
    sections: [],
    subjectNames,
    topicNames,
  });
  assert("S13: no subjects blocked", Boolean(error) && error.includes("at least one subject"), error || "no error");
}

// --- Print report ---
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log("\n========== MARKS VALIDATION TEST REPORT ==========\n");
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"} | ${r.name}`);
  console.log(`       ${r.detail}\n`);
}
console.log("--------------------------------------------------");
console.log(`Total: ${results.length}  Passed: ${passed}  Failed: ${failed}`);
console.log("==================================================\n");

if (failed > 0) process.exit(1);
