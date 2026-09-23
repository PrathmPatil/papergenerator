import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import Question from "../models/Question.js";
import Topic from "../models/Topic.js";
import {
  buildQuestionDuplicateFingerprint,
  buildTextDuplicateKey,
} from "../utils/questionDuplicate.js";
import { compactTopicKey } from "../utils/topicResolve.js";

dotenv.config();

function parseArgs(argv = []) {
  const args = {
    classId: "",
    subjectId: "",
    topicId: "",
    includeDeleted: false,
    json: false,
    out: "",
    limit: 0,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--class" && next) {
      args.classId = next;
      i += 1;
    } else if (token === "--subject" && next) {
      args.subjectId = next;
      i += 1;
    } else if (token === "--topic" && next) {
      args.topicId = next;
      i += 1;
    } else if (token === "--out" && next) {
      args.out = next;
      i += 1;
    } else if (token === "--limit" && next) {
      args.limit = Number(next) || 0;
      i += 1;
    } else if (token === "--include-deleted") {
      args.includeDeleted = true;
    } else if (token === "--json") {
      args.json = true;
    }
  }

  return args;
}

function summarizeQuestion(question, topicNameById) {
  return {
    _id: String(question._id),
    classId: question.classId,
    subjectId: question.subjectId,
    topicId: question.topicId,
    topicName: topicNameById.get(String(question.topicId || "")) || "",
    type: question.type,
    marks: question.marks,
    difficulty: question.difficulty,
    isDeleted: Boolean(question.isDeleted),
    createdAt: question.createdAt,
    text: String(question.text || "").slice(0, 180),
  };
}

function collectGroups(items, keyFn) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });
  return [...grouped.values()]
    .filter((group) => group.length > 1)
    .sort((a, b) => b.length - a.length);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  const filter = {};
  if (!args.includeDeleted) {
    filter.$or = [{ isDeleted: false }, { isDeleted: { $exists: false } }];
  }
  if (args.classId) filter.classId = args.classId;
  if (args.subjectId) filter.subjectId = args.subjectId;
  if (args.topicId) filter.topicId = args.topicId;

  const [questions, topics] = await Promise.all([
    Question.find(filter)
      .select(
        "type classId subjectId topicId text paragraph media options subQuestions correctAnswer matches marks negativeMarks difficulty ocrText ocrConfidence needsReview isDeleted createdAt",
      )
      .lean(),
    Topic.find({}).select("name nameLower aliasIds classId subjectId").lean(),
  ]);

  const topicNameById = new Map();
  const topicKeyById = new Map();

  topics.forEach((topic) => {
    const id = String(topic._id);
    const compact = compactTopicKey(topic.name || topic.nameLower);
    const scopedKey = `${topic.classId || ""}|${topic.subjectId || ""}|${compact}`;
    topicNameById.set(id, topic.name || "");
    topicKeyById.set(id, scopedKey);
    (Array.isArray(topic.aliasIds) ? topic.aliasIds : []).forEach((aliasId) => {
      topicNameById.set(String(aliasId), topic.name || "");
      topicKeyById.set(String(aliasId), scopedKey);
    });
  });

  const exactGroups = collectGroups(questions, (question) =>
    buildQuestionDuplicateFingerprint(question),
  );
  const textGroups = collectGroups(questions, (question) =>
    buildTextDuplicateKey(
      question,
      topicKeyById.get(String(question.topicId || "")) ||
        compactTopicKey(question.topicId),
    ),
  );

  const report = {
    scanned: questions.length,
    filters: {
      classId: args.classId || null,
      subjectId: args.subjectId || null,
      topicId: args.topicId || null,
      includeDeleted: args.includeDeleted,
    },
    exactDuplicateGroups: exactGroups.length,
    exactDuplicateQuestions: exactGroups.reduce((sum, group) => sum + group.length, 0),
    textDuplicateGroups: textGroups.length,
    textDuplicateQuestions: textGroups.reduce((sum, group) => sum + group.length, 0),
    exact: exactGroups.map((group) => group.map((question) => summarizeQuestion(question, topicNameById))),
    sameText: textGroups.map((group) => group.map((question) => summarizeQuestion(question, topicNameById))),
  };

  if (args.limit > 0) {
    report.exact = report.exact.slice(0, args.limit);
    report.sameText = report.sameText.slice(0, args.limit);
  }

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Wrote report to ${outPath}`);
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Scanned ${report.scanned} questions`);
    console.log(
      `Exact duplicates (same fields as upload skip): ${report.exactDuplicateGroups} groups, ${report.exactDuplicateQuestions} questions`,
    );
    console.log(
      `Same-text duplicates (class + subject + topic + type + text): ${report.textDuplicateGroups} groups, ${report.textDuplicateQuestions} questions`,
    );

    const printGroups = (title, groups) => {
      if (groups.length === 0) return;
      console.log(`\n${title}`);
      groups.forEach((group, index) => {
        console.log(`\n#${index + 1} (${group.length})`);
        group.forEach((item) => {
          console.log(
            `  ${item._id} | ${item.classId}/${item.subjectId} | ${item.topicName || item.topicId} | ${item.text}`,
          );
        });
      });
    };

    printGroups("Exact duplicate groups", report.exact);
    printGroups("Same-text duplicate groups", report.sameText);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
