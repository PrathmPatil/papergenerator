/**
 * Today's edit-flow topic/question selection fix scenarios.
 * Run: npx --yes tsx scripts/test-question-selection.ts
 */
import {
  buildQuestionTopicMap,
  pruneSelectedQuestionsByTopics,
  pruneSelectedSubQuestions,
} from "../lib/question-selection";

type Result = { name: string; passed: boolean; detail: string };
const results: Result[] = [];

const assert = (name: string, condition: boolean, detail: string) => {
  results.push({ name, passed: condition, detail });
};

// --- S1: Edit paper — remove topic A, keep topic B ---
{
  const selected = {
    sec1: ["qA1", "qA2", "qB1", "qB2"],
  };
  const topicMap = {
    qA1: "topicA",
    qA2: "topicA",
    qB1: "topicB",
    qB2: "topicB",
  };
  const pruned = pruneSelectedQuestionsByTopics(selected, ["topicB"], topicMap);
  assert(
    "S1: removed-topic questions dropped",
    JSON.stringify(pruned.sec1) === JSON.stringify(["qB1", "qB2"]),
    `got=${JSON.stringify(pruned.sec1)}`
  );
}

// --- S2: Add new topic — existing selections for kept topics stay ---
{
  const selected = { sec1: ["qB1"] };
  const topicMap = { qB1: "topicB", qC1: "topicC" };
  const pruned = pruneSelectedQuestionsByTopics(selected, ["topicB", "topicC"], topicMap);
  assert(
    "S2: kept-topic selections preserved when adding topic",
    pruned === selected && pruned.sec1.length === 1,
    `got=${JSON.stringify(pruned)}`
  );
}

// --- S3: Unknown topic mapping kept (generate remount safety) ---
{
  const selected = { sec1: ["qUnknown", "qA1"] };
  const topicMap = { qA1: "topicA" };
  const pruned = pruneSelectedQuestionsByTopics(selected, ["topicB"], topicMap);
  assert(
    "S3: unknown mapping kept; known removed-topic dropped",
    JSON.stringify(pruned.sec1) === JSON.stringify(["qUnknown"]),
    `got=${JSON.stringify(pruned.sec1)}`
  );
}

// --- S4: Sub-question prune follows parent question prune ---
{
  const selectedQuestions = { sec1: ["qB1"] };
  const subs = {
    sec1: {
      qA1: ["sq1"],
      qB1: ["sq2", "sq3"],
    },
  };
  const prunedSubs = pruneSelectedSubQuestions(subs, selectedQuestions);
  assert(
    "S4: sub-questions for removed parent cleared",
    !prunedSubs.sec1.qA1 &&
      JSON.stringify(prunedSubs.sec1.qB1) === JSON.stringify(["sq2", "sq3"]),
    `got=${JSON.stringify(prunedSubs.sec1)}`
  );
}

// --- S5: Snapshot → topic map (edit load) ---
{
  const map = buildQuestionTopicMap([
    { questionId: "q1", topicId: "t1" },
    { _id: "q2", topicId: "t2" },
    { id: "q3", topicId: "" },
    null,
  ]);
  assert(
    "S5: buildQuestionTopicMap from snapshots",
    map.q1 === "t1" && map.q2 === "t2" && map.q3 === undefined,
    `got=${JSON.stringify(map)}`
  );
}

// --- S6: Full edit scenario — unselect A, select C; only B+C should remain eligible ---
{
  const selected = {
    english: ["qOldA", "qOldB", "qOldA2"],
  };
  const topicMap = {
    qOldA: "alphabet",
    qOldA2: "alphabet",
    qOldB: "synonyms",
  };
  // User unselected alphabet, kept synonyms, added grammar (no questions yet)
  const pruned = pruneSelectedQuestionsByTopics(
    selected,
    ["synonyms", "grammar"],
    topicMap
  );
  assert(
    "S6: edit flow shows only questions from carried topics",
    JSON.stringify(pruned.english) === JSON.stringify(["qOldB"]),
    `got=${JSON.stringify(pruned.english)}`
  );
}

// --- S7: No change returns same reference ---
{
  const selected = { sec1: ["qB1"] };
  const topicMap = { qB1: "topicB" };
  const pruned = pruneSelectedQuestionsByTopics(selected, ["topicB"], topicMap);
  assert("S7: unchanged selection returns same object", pruned === selected, "identity");
}

const failed = results.filter((r) => !r.passed);
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}  (${r.detail})`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
