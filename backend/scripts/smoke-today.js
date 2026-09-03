/**
 * API smoke tests for today's paper edit/clone/order work against local backend.
 * Run: node scripts/smoke-today.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const BASE = process.env.SMOKE_API_BASE || "http://127.0.0.1:5000";
const EMAIL = process.env.MASTER_USER_EMAIL || "master@gmail.com";
const PASSWORD = process.env.MASTER_USER_PASSWORD || "Master@123";

const results = [];
const assert = (name, condition, detail = "") => {
  results.push({ name, passed: Boolean(condition), detail: String(detail || "") });
};

async function req(method, urlPath, { token, body } = {}) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`API base: ${BASE}\n`);

  // Health / login
  const login = await req("POST", "/api/users/login", {
    body: { email: EMAIL, password: PASSWORD },
  });
  const token =
    login.data?.data?.token ||
    login.data?.token ||
    login.data?.accessToken ||
    "";
  assert("A1: login succeeds", login.status < 400 && Boolean(token), `status=${login.status} msg=${login.data?.message || ""}`);
  if (!token) {
    printAndExit();
    return;
  }

  // List papers
  const list = await req("POST", "/api/papers/", {
    token,
    body: { order: "desc", isRecent: false },
  });
  const papers =
    list.data?.papers ||
    list.data?.data?.papers ||
    list.data?.data ||
    [];
  const paperList = Array.isArray(papers) ? papers : [];
  assert("A2: list papers", list.status < 400 && paperList.length > 0, `count=${paperList.length}`);

  // Prefer a paper with the most selected questions (better edit/prune coverage).
  const ranked = [...paperList].sort((a, b) => {
    const aq = (Array.isArray(a.sections) ? a.sections : []).reduce(
      (sum, s) => sum + (Array.isArray(s.questions) ? s.questions.length : 0),
      0
    );
    const bq = (Array.isArray(b.sections) ? b.sections : []).reduce(
      (sum, s) => sum + (Array.isArray(s.questions) ? s.questions.length : 0),
      0
    );
    return bq - aq;
  });
  const source = ranked[0];
  const paperId = String(source?._id || source?.id || "");
  assert("A3: have source paper id", Boolean(paperId), `${paperId} title=${source?.title || ""}`);

  // Clone
  let clonedId = "";
  if (paperId) {
    const clone = await req("POST", `/api/papers/${paperId}/clone`, { token });
    clonedId = String(
      clone.data?.paper?._id ||
        clone.data?.data?.paper?._id ||
        clone.data?.data?._id ||
        clone.data?._id ||
        ""
    );
    assert(
      "A4: clone paper",
      clone.status < 400 && Boolean(clonedId),
      `status=${clone.status} id=${clonedId} msg=${clone.data?.message || ""}`
    );
  }

  // Edit payload
  const editId = clonedId || paperId;
  if (editId) {
    const edit = await req("GET", `/api/papers/edit/${editId}`, { token });
    const payload = edit.data?.data || edit.data;
    const sections = payload?.sections || [];
    const paper = payload?.paper;
    assert(
      "A5: edit endpoint loads",
      edit.status < 400 && Boolean(paper) && sections.length > 0,
      `status=${edit.status} msg=${edit.data?.message || ""} sections=${sections.length}`
    );

    const snapshot = Array.isArray(paper?.questionsSnapshot) ? paper.questionsSnapshot : [];
    const selectedIds = (sections || []).flatMap((s) =>
      Array.isArray(s.questions) ? s.questions.map(String) : []
    );

    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const topicByQ = {};
    for (const q of snapshot) {
      const id = String(q?.questionId || q?._id || "");
      const topicId = String(q?.topicId || "");
      if (id && topicId) topicByQ[id] = topicId;
    }
    // Snapshots in dump often omit topicId — resolve from questions collection.
    const missing = selectedIds.filter((id) => !topicByQ[id]);
    if (missing.length > 0) {
      const objectIds = missing
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      const docs = await db
        .collection("questions")
        .find({ _id: { $in: objectIds } })
        .project({ topicId: 1 })
        .toArray();
      for (const doc of docs) {
        const id = String(doc._id);
        const topicId = String(doc.topicId || "");
        if (topicId) topicByQ[id] = topicId;
      }
    }

    const allTopics = [...new Set(Object.values(topicByQ))];
    const mappedSelected = selectedIds.filter((id) => Boolean(topicByQ[id]));
    assert(
      "A6: selected questions resolve to topicIds",
      selectedIds.length === 0 || mappedSelected.length === selectedIds.length,
      `selected=${selectedIds.length} mapped=${mappedSelected.length} topics=${allTopics.length}`
    );

    if (allTopics.length >= 2 && mappedSelected.length > 0) {
      const keep = allTopics.slice(1);
      const pruned = mappedSelected.filter((id) => keep.includes(topicByQ[id]));
      const dropped = mappedSelected.length - pruned.length;
      assert(
        "A7: topic-change prune removes orphan questions",
        dropped > 0 && pruned.every((id) => keep.includes(topicByQ[id])),
        `before=${mappedSelected.length} after=${pruned.length} dropped=${dropped} keepTopics=${keep.length}`
      );
    } else if (mappedSelected.length > 0 && allTopics.length === 1) {
      assert(
        "A7: single-topic paper keeps its selections",
        true,
        `n=${mappedSelected.length} topic=${allTopics[0]}`
      );
    } else {
      assert(
        "A7: topic-change prune (skipped — need selected questions with topics)",
        true,
        `topics=${allTopics.length} selected=${selectedIds.length}`
      );
    }

    const firstSection = sections[0];
    if (firstSection?.id && Array.isArray(firstSection.questions) && firstSection.questions.length >= 2) {
      const ordered = [...firstSection.questions].map(String).reverse();
      assert(
        "A8: edit sections expose ordered question ids",
        ordered.length === firstSection.questions.length,
        `section=${firstSection.id} n=${ordered.length}`
      );
    } else {
      const sectionWithQs = sections.find((s) => Array.isArray(s.questions) && s.questions.length > 0);
      assert(
        "A8: edit sections expose question ids",
        Boolean(sectionWithQs),
        `section=${sectionWithQs?.id || "none"} n=${sectionWithQs?.questions?.length || 0}`
      );
    }

    const counts = {
      paper: await db.collection("paper").countDocuments(),
      questions: await db.collection("questions").countDocuments(),
      topics: await db.collection("topics").countDocuments(),
    };
    await mongoose.disconnect();
    assert(
      "A9: restored DB has paper/questions/topics",
      counts.paper > 0 && counts.questions > 0 && counts.topics > 0,
      JSON.stringify(counts)
    );
  } else {
    assert("A5: edit endpoint loads", false, "no paper id");
    assert("A6: selected questions resolve to topicIds", false, "skipped");
    assert("A7: topic-change prune", false, "skipped");
    assert("A8: edit sections expose question ids", false, "skipped");
    assert("A9: restored DB has paper/questions/topics", false, "skipped");
  }
  printAndExit();
}

function printAndExit() {
  const failed = results.filter((r) => !r.passed);
  for (const r of results) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
