/**
 * Restore mongodump .bson files into the local MongoDB database.
 *
 * Usage: node scripts/restore-bson-dump.js [dumpDir]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { BSON } from "bson";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/papergenerator";
const dumpDir =
  process.argv[2] ||
  path.join(__dirname, "..", "..", "papergenerator");

/** Dump collection file stem → target MongoDB collection (mongoose defaults). */
const COLLECTION_MAP = {
  // Mongoose 9 maps model "Paper" → collection "paper" (not "papers")
  paper: "paper",
  papertemplates: "papertemplates",
  questions: "questions",
  topics: "topics",
  users: "users",
  usersettings: "usersettings",
};

function readBsonDocuments(filePath) {
  const buffer = fs.readFileSync(filePath);
  const docs = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 4 > buffer.length) {
      throw new Error(`Truncated BSON length at offset ${offset} in ${filePath}`);
    }
    const size = buffer.readInt32LE(offset);
    if (size < 5 || offset + size > buffer.length) {
      throw new Error(`Invalid BSON document size ${size} at offset ${offset} in ${filePath}`);
    }
    const slice = buffer.subarray(offset, offset + size);
    docs.push(BSON.deserialize(slice));
    offset += size;
  }

  return docs;
}

async function restoreCollection(db, sourceName, targetName, filePath) {
  const docs = readBsonDocuments(filePath);
  const collection = db.collection(targetName);

  await collection.drop().catch((err) => {
    if (err?.codeName !== "NamespaceNotFound" && err?.code !== 26) throw err;
  });

  if (docs.length === 0) {
    console.log(`  ${sourceName} → ${targetName}: empty (0 docs)`);
    return { targetName, count: 0 };
  }

  await collection.insertMany(docs, { ordered: false });
  console.log(`  ${sourceName} → ${targetName}: ${docs.length} docs`);
  return { targetName, count: docs.length };
}

async function main() {
  if (!fs.existsSync(dumpDir)) {
    console.error(`Dump directory not found: ${dumpDir}`);
    process.exit(1);
  }

  console.log(`Dump dir: ${dumpDir}`);
  console.log(`Target DB: ${MONGO_URI}`);
  console.log("Replacing matching collections with dump data...\n");

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const results = [];
  for (const [sourceName, targetName] of Object.entries(COLLECTION_MAP)) {
    const filePath = path.join(dumpDir, `${sourceName}.bson`);
    if (!fs.existsSync(filePath)) {
      console.warn(`  skip missing file: ${sourceName}.bson`);
      continue;
    }
    results.push(await restoreCollection(db, sourceName, targetName, filePath));
  }

  console.log("\nDone.");
  for (const r of results) {
    console.log(`  ${r.targetName}: ${r.count}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
