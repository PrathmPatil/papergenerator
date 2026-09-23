import test from "node:test";
import assert from "node:assert/strict";

import {
  compactTopicKey,
  collectTopicFilterValues,
  pickCanonicalTopic,
  topicsShareCompactKey,
} from "../utils/topicResolve.js";

test("compacts spaced and cased topic names to the same key", () => {
  assert.equal(compactTopicKey("Atoms and Molecules"), "atomsandmolecules");
  assert.equal(compactTopicKey("atoms and molecules"), "atomsandmolecules");
  assert.equal(compactTopicKey("Atoms and molecules"), "atomsandmolecules");
});

test("treats legacy spaced nameLower as the same topic", () => {
  assert.equal(
    topicsShareCompactKey({ name: "Atoms and molecules", nameLower: "atoms and molecules" }, "atomsandmolecules"),
    true,
  );
});

test("keeps the preferred topic id when merging aliases", () => {
  const keep = pickCanonicalTopic(
    [
      { _id: "new", createdAt: "2026-08-19", questionCount: 0 },
      { _id: "old", createdAt: "2026-05-03", questionCount: 441 },
    ],
    "new",
  );
  assert.equal(keep._id, "new");
});

test("otherwise keeps the topic that already has questions", () => {
  const keep = pickCanonicalTopic([
    { _id: "new", createdAt: "2026-08-19", questionCount: 0 },
    { _id: "old", createdAt: "2026-05-03", questionCount: 441 },
  ]);
  assert.equal(keep._id, "old");
});

test("filter values include alias topic ids and compact names", () => {
  const values = collectTopicFilterValues(
    ["6a85ac76e1867eee8bde549b"],
    [
      { _id: "6a85ac76e1867eee8bde549b", name: "Atoms and Molecules", nameLower: "atomsandmolecules" },
      { _id: "69f7778aa17df8be404b69f1", name: "Atoms and molecules", nameLower: "atoms and molecules" },
    ],
  );
  assert.ok(values.includes("69f7778aa17df8be404b69f1"));
  assert.ok(values.includes("atomsandmolecules"));
});
