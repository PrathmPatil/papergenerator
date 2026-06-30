import test from "node:test";
import assert from "node:assert/strict";

import { buildQuestionListSortOptions } from "../utils/questionListSort.js";

test("prioritizes recently updated questions in list results", () => {
  assert.deepEqual(buildQuestionListSortOptions(), {
    updatedAt: -1,
    createdAt: -1,
    usageCount: 1,
  });
});
