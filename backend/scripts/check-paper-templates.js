import mongoose from "mongoose";

await mongoose.connect("mongodb://127.0.0.1:27017/papergenerator");
const db = mongoose.connection.db;

const papers = await db
  .collection("paper")
  .find({ isDeleted: { $ne: true } })
  .project({ title: 1, templateId: 1, sections: 1, questionsSnapshot: 1 })
  .toArray();

console.log("paper", papers.length);

let linked = 0;
for (const p of papers) {
  let templateFound = false;
  if (p.templateId) {
    try {
      const t = await db.collection("papertemplates").findOne({
        _id: new mongoose.Types.ObjectId(String(p.templateId)),
      });
      templateFound = Boolean(t);
    } catch {
      templateFound = false;
    }
  }
  if (templateFound) linked += 1;
  const qCount = (p.sections || []).reduce((s, x) => s + (x.questions || []).length, 0);
  const snap = Array.isArray(p.questionsSnapshot) ? p.questionsSnapshot.length : 0;
  console.log({
    id: String(p._id),
    title: p.title,
    templateId: String(p.templateId || ""),
    templateFound,
    qCount,
    snap,
  });
}
console.log("linked templates", linked);

const sampleTid = papers[0]?.templateId;
if (sampleTid) {
  const asString = await db.collection("papertemplates").findOne({ _id: String(sampleTid) });
  console.log("template lookup as string id", Boolean(asString));
  const any = await db.collection("papertemplates").findOne({});
  console.log("sample template _id type", any?._id?.constructor?.name, String(any?._id));
}

await mongoose.disconnect();
