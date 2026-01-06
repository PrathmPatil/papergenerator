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

    /* --------------------------------
       QUESTION MEDIA (images)
    -------------------------------- */
    const media = [];
    const optionMediaMap = {};

    files.forEach((file) => {
      // Option images: option_A, option_B, etc.
      if (file.fieldname.startsWith("option_")) {
        const optionId = file.fieldname.replace("option_", "");
        optionMediaMap[optionId] = `/uploads/${file.filename}`;
      } else {
        // Question-level media
        media.push({
          url: `/uploads/${file.filename}`,
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
      marks: Number(payload.marks || 1),
      negativeMarks: Number(payload.negativeMarks || 0),
      difficulty: payload.difficulty || "easy",
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
