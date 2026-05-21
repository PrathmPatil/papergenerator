const normalizeSubjectId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Comprehensive mapping of subject names/abbreviations to standard IDs
  const subjectNameToId = {
    // Mathematics
    "mathematics": "maths",
    "math": "maths",
    "maths": "maths",
    "math10": "maths",
    "maths10": "maths",
    
    // Science
    "science": "science",
    "science10": "science",
    "sci": "science",
    "sci10": "science",
    
    // English
    "english": "english",
    "english10": "english",
    "eng": "english",
    "eng10": "english",
    
    // Reasoning
    "reasoning": "reasoning",
    "reasoning10": "reasoning",
    "logical reasoning": "reasoning",
    "lr": "reasoning",
    
    // General Knowledge
    "gk": "gk",
    "general knowledge": "gk",
    "generalknowledge": "gk",
    
    // Geography
    "geography": "geography",
    "geo": "geography",
    
    // History
    "history": "history",
    "hist": "history",
    
    // Civics
    "civics": "civics",
    "civic": "civics",
    "civicss": "civics",
    
    // Physics
    "physics": "physics",
    "phys": "physics",
    "phy": "physics",
    
    // Chemistry
    "chemistry": "chemistry",
    "chem": "chemistry",
    
    // Biology
    "biology": "biology",
    "bio": "biology",
    "biol": "biology",
  };

  // Normalize: lowercase and remove special characters
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // First check exact match in subject name mapping
  if (subjectNameToId[raw.toLowerCase()]) {
    return subjectNameToId[raw.toLowerCase()];
  }
  
  // Then check normalized version
  if (subjectNameToId[normalized]) {
    return subjectNameToId[normalized];
  }
  
  // If no match found, return the normalized key (not raw)
  // This ensures consistent IDs even for unknown subjects
  return normalized || raw;
};

const normalizeClassId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  const numericMatch = normalized.match(/^(?:class)?(\d{1,2})(?:st|nd|rd|th)?$/);

  if (numericMatch) {
    return `class_${Number(numericMatch[1])}`;
  }

  if (normalized === "jkg" || normalized === "skg") {
    return normalized;
  }

  return normalized || raw;
};

export const normalizeQuestionPayload = (req, res, next) => {
  try {
    if (!req.body.payload) {
      return res.status(400).json({
        success: false,
        error: "payload not received",
      });
    }

    const payload = JSON.parse(req.body.payload);
    const files = req.files || [];

    const toDataUrl = (file) => {
      if (!file?.buffer) return "";
      const mimeType = file.mimetype || "application/octet-stream";
      return `data:${mimeType};base64,${file.buffer.toString("base64")}`;
    };

    /* --------------------------------
       QUESTION MEDIA (images)
    -------------------------------- */
    const media = [];
    const optionMediaMap = {};

    files.forEach((file) => {
      const optionToken = String(file.fieldname || file.originalname || "");

      // Option images: option_A, option_B, etc.
      if (optionToken.startsWith("option_")) {
        const optionId = optionToken.replace("option_", "");
        optionMediaMap[optionId] = toDataUrl(file);
      } else {
        // Question-level media
        const url = toDataUrl(file);
        if (!url) return;

        media.push({
          url,
          alt: file.originalname,
          mimeType: file.mimetype,
        });
      }
    });

    /* --------------------------------
       OPTIONS NORMALIZATION
    -------------------------------- */
    const options = (payload.options || []).map((opt, index) => ({
      id: opt.id || String.fromCharCode(65 + index), // A, B, C, D
      text: opt.text || "",
      mediaUrl: optionMediaMap[opt.id] || opt.mediaUrl || "",
      isCorrect: Boolean(opt.isCorrect),
    }));

    /* --------------------------------
       CORRECT ANSWER AUTO-DETECT
    -------------------------------- */
    let correctAnswer = payload.correctAnswer;
    if (!correctAnswer) {
      const correctOpt = options.find((o) => o.isCorrect);
      correctAnswer = correctOpt ? correctOpt.id : null;
    }

    /* --------------------------------
       FINAL NORMALIZED PAYLOAD
    -------------------------------- */
    req.normalizedPayload = {
      ...payload,
      text: payload.text || "",
      media,
      options,
      correctAnswer,
      classId: normalizeClassId(payload.classId),
      subjectId: normalizeSubjectId(payload.subjectId), // Normalize subject ID
      topicId: payload.topicId || "",
      topicName: payload.topicName || "",
      marks: Number(payload.marks || 1),
      negativeMarks: Number(payload.negativeMarks || 0),
      difficulty: payload.difficulty || "easy",
      subQuestions: payload.subQuestions || [], // Initialize subQuestions
    };

    next();
  } catch (err) {
    console.error("❌ Payload normalization error:", err);
    return res.status(400).json({
      success: false,
      error: "Invalid payload structure",
    });
  }
};
