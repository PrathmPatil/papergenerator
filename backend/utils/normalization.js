export const normalizeLookupToken = (value = "") =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const SUBJECT_ALIASES = {
  mathematics: "maths",
  math: "maths",
  maths: "maths",
  math10: "maths",
  maths10: "maths",
  science: "science",
  science10: "science",
  sci: "science",
  sci10: "science",
  english: "english",
  english10: "english",
  eng: "english",
  eng10: "english",
  reasoning: "reasoning",
  reasoning10: "reasoning",
  logicalreasoning: "reasoning",
  lr: "reasoning",
  gk: "gk",
  generalknowledge: "gk",
  geography: "geography",
  geo: "geography",
  history: "history",
  hist: "history",
  civics: "civics",
  civic: "civics",
  civicss: "civics",
  physics: "physics",
  phys: "physics",
  phy: "physics",
  chemistry: "chemistry",
  chem: "chemistry",
  biology: "biology",
  bio: "biology",
  biol: "biology",
};

export const normalizeSubjectId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = normalizeLookupToken(raw);
  return SUBJECT_ALIASES[normalized] || normalized || raw;
};

export const normalizeClassId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = normalizeLookupToken(raw);
  const numericMatch = normalized.match(/^(?:class)?(\d{1,2})(?:st|nd|rd|th)?$/);
  if (numericMatch) {
    return `class_${Number(numericMatch[1])}`;
  }

  return normalized || raw;
};

export const uniqueStrings = (values = []) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

export const buildClassIdCandidates = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const normalized = normalizeClassId(raw);
  const compact = normalizeLookupToken(raw);
  const aliases = new Set([raw, raw.toLowerCase(), compact, normalized]);

  const numericMatch = normalized.match(/^class_(\d+)$/);
  if (numericMatch) {
    const numeric = Number(numericMatch[1]);
    aliases.add(`class_${numeric}`);
    aliases.add(`class ${numeric}`);
    aliases.add(`Class ${numeric}`);
    aliases.add(`class${numeric}`);
    aliases.add(String(numeric));
    aliases.add(`${numeric}st`);
    aliases.add(`${numeric}nd`);
    aliases.add(`${numeric}rd`);
    aliases.add(`${numeric}th`);
  }

  return uniqueStrings([...aliases]);
};

export const buildSubjectIdCandidates = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const normalized = normalizeSubjectId(raw);
  const compact = normalizeLookupToken(raw);
  const aliases = new Set([raw, raw.toLowerCase(), compact, normalized]);

  return uniqueStrings([...aliases]);
};
