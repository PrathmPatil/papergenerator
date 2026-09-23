import dotenv from "dotenv";
import mongoose from "mongoose";
import Topic from "../models/Topic.js";
import Question from "../models/Question.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is not set. Set it in .env before running this script.");
  process.exit(1);
}

function compactTopicKey(raw = "") {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const topics = await Topic.find({}).lean();
  const groups = new Map();

  for (const t of topics) {
    const key = `${t.classId}||${t.subjectId}||${compactTopicKey(t.name || t.nameLower || "")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  let totalMerged = 0;
  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) continue;
    // keep the earliest created (or first) as canonical
    group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const keep = group[0];
    const duplicates = group.slice(1);
    const dupIds = duplicates.map((d) => d._id.toString());

    console.log(`Merging ${duplicates.length} duplicate topics into ${keep._id} (${keep.name})`);

    // Reassign questions
    const { modifiedCount } = await Question.updateMany(
      { topicId: { $in: dupIds } },
      { $set: { topicId: keep._id.toString() } }
    );

    // Delete duplicate topic docs
    const { deletedCount } = await Topic.deleteMany({ _id: { $in: dupIds } });
    await Topic.updateOne(
      { _id: keep._id },
      {
        $set: { nameLower: compactTopicKey(keep.name || keep.nameLower) },
        $addToSet: { aliasIds: { $each: dupIds } },
      },
    );

    console.log(`Reassigned ${modifiedCount} questions, removed ${deletedCount} duplicate topics`);
    totalMerged += duplicates.length;
  }

  const remaining = await Topic.find({}).lean();
  let compacted = 0;
  for (const t of remaining) {
    const nextKey = compactTopicKey(t.name || t.nameLower);
    if (!nextKey || t.nameLower === nextKey) continue;
    try {
      await Topic.updateOne({ _id: t._id }, { $set: { nameLower: nextKey } });
      compacted += 1;
    } catch (err) {
      console.warn(`Could not compact nameLower for ${t._id}:`, err.message);
    }
  }

  console.log(`Done. Total duplicate topic docs removed: ${totalMerged}. Compacted nameLower: ${compacted}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
