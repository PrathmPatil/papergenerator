import express from "express";
import multer from "multer";
import { createRequire } from "module";

const router = express.Router();
const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.PDF_CONVERSION_UPLOAD_LIMIT_MB || 50) * 1024 * 1024,
  },
});

const getPdfServiceBaseUrl = () =>
  (process.env.PDF_SERVICE_BASE_URL || "http://127.0.0.1:5001").replace(/\/$/, "");

const isValidJobId = (jobId = "") => /^[0-9a-f]{32}$/.test(String(jobId));

const rewriteConversionLinks = (payload = {}) => {
  if (Array.isArray(payload?.conversions)) {
    return {
      ...payload,
      conversions: payload.conversions.map((conversion) => rewriteConversionLinks(conversion)),
    };
  }

  if (!payload?.job_id) return payload;

  return {
    ...payload,
    links: {
      details: `/api/pdf-conversion/${payload.job_id}`,
      input_pdf: `/api/pdf-conversion/${payload.job_id}/pdf`,
      output_docx: `/api/pdf-conversion/${payload.job_id}/docx`,
      images: `/api/pdf-conversion/${payload.job_id}/images`,
    },
  };
};

const sendServiceJson = async (serviceResponse, res, fallbackStatus = 502) => {
  const contentType = serviceResponse.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await serviceResponse.json()
    : { success: false, message: await serviceResponse.text() };

  return res
    .status(serviceResponse.status || fallbackStatus)
    .json(rewriteConversionLinks(payload));
};

const proxyFileResponse = async (servicePath, res, fallbackName) => {
  const serviceResponse = await fetch(`${getPdfServiceBaseUrl()}${servicePath}`);

  if (!serviceResponse.ok) {
    return sendServiceJson(serviceResponse, res);
  }

  const contentType = serviceResponse.headers.get("content-type");
  const contentDisposition = serviceResponse.headers.get("content-disposition");

  if (contentType) res.setHeader("Content-Type", contentType);
  if (contentDisposition) {
    res.setHeader("Content-Disposition", contentDisposition);
  } else if (fallbackName) {
    res.setHeader("Content-Disposition", `attachment; filename="${fallbackName}"`);
  }

  const buffer = Buffer.from(await serviceResponse.arrayBuffer());
  return res.status(serviceResponse.status).send(buffer);
};

const createZipBuffer = (files = []) => {
  const zip = new AdmZip();
  files.forEach((file) => {
    zip.addFile(file.name, file.buffer);
  });
  return zip.toBuffer();
};

router.get("/health", async (_req, res) => {
  try {
    const serviceResponse = await fetch(`${getPdfServiceBaseUrl()}/api/health`);
    return sendServiceJson(serviceResponse, res);
  } catch (error) {
    console.error("PDF image ZIP proxy failed:", error);
    return res.status(502).json({
      success: false,
      message: "PDF image ZIP download failed",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

router.post("/convert", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Upload a PDF file using the 'pdf' form field.",
      });
    }

    const fileName = req.file.originalname || "input.pdf";
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are supported.",
      });
    }

    const formData = new FormData();
    formData.append("pdf", new Blob([req.file.buffer], { type: req.file.mimetype }), fileName);

    const serviceResponse = await fetch(`${getPdfServiceBaseUrl()}/api/convert`, {
      method: "POST",
      body: formData,
    });

    return sendServiceJson(serviceResponse, res);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "PDF conversion service is unavailable",
    });
  }
});

router.post("/docx-to-excel", upload.single("docx"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Upload a DOCX file using the 'docx' form field.",
      });
    }

    const fileName = req.file.originalname || "questions.docx";
    if (!fileName.toLowerCase().endsWith(".docx")) {
      return res.status(400).json({
        success: false,
        message: "Only DOCX files are supported.",
      });
    }

    const formData = new FormData();
    formData.append("docx", new Blob([req.file.buffer], { type: req.file.mimetype }), fileName);
    ["classId", "subjectId", "topicName", "difficulty", "marks", "negativeMarks"].forEach((field) => {
      if (req.body?.[field] !== undefined) {
        formData.append(field, String(req.body[field]));
      }
    });

    const serviceResponse = await fetch(`${getPdfServiceBaseUrl()}/api/docx-to-excel`, {
      method: "POST",
      body: formData,
    });

    if (!serviceResponse.ok) {
      return sendServiceJson(serviceResponse, res);
    }

    const contentType = serviceResponse.headers.get("content-type");
    const contentDisposition = serviceResponse.headers.get("content-disposition");
    const buffer = Buffer.from(await serviceResponse.arrayBuffer());

    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader(
      "Content-Disposition",
      contentDisposition || `attachment; filename="${fileName.replace(/\.docx$/i, "")}-excel-import-files.zip"`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "DOCX to Excel service is unavailable",
    });
  }
});

router.post("/pdf-to-excel", upload.array("pdfs", 20), async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Upload one or more PDF files using the 'pdfs' form field.",
      });
    }

    const formData = new FormData();
    for (const file of files) {
      const fileName = file.originalname || "questions.pdf";
      if (!fileName.toLowerCase().endsWith(".pdf")) {
        return res.status(400).json({
          success: false,
          message: `Only PDF files are supported: ${fileName}`,
        });
      }
      formData.append("pdfs", new Blob([file.buffer], { type: file.mimetype }), fileName);
    }

    ["classId", "subjectId", "difficulty", "marks", "negativeMarks"].forEach((field) => {
      if (req.body?.[field] !== undefined) {
        formData.append(field, String(req.body[field]));
      }
    });

    const serviceResponse = await fetch(`${getPdfServiceBaseUrl()}/api/pdf-to-excel`, {
      method: "POST",
      body: formData,
    });

    if (!serviceResponse.ok) {
      return sendServiceJson(serviceResponse, res);
    }

    const contentType = serviceResponse.headers.get("content-type");
    const contentDisposition = serviceResponse.headers.get("content-disposition");
    const buffer = Buffer.from(await serviceResponse.arrayBuffer());

    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader(
      "Content-Disposition",
      contentDisposition || `attachment; filename="${req.body?.classId || "Class"}_${req.body?.subjectId || "Subject"}_QuestionExcelFiles.zip"`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "PDF question Excel service is unavailable",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 25);
    const serviceResponse = await fetch(
      `${getPdfServiceBaseUrl()}/api/conversions?limit=${encodeURIComponent(limit)}`
    );
    return sendServiceJson(serviceResponse, res);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "PDF conversion service is unavailable",
    });
  }
});

router.get("/:jobId", async (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(404).json({ success: false, message: "Conversion not found." });
  }

  try {
    const serviceResponse = await fetch(`${getPdfServiceBaseUrl()}/api/conversions/${jobId}`);
    return sendServiceJson(serviceResponse, res);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "PDF conversion service is unavailable",
    });
  }
});

router.get("/:jobId/pdf", async (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(404).json({ success: false, message: "Conversion not found." });
  }

  try {
    return proxyFileResponse(`/api/conversions/${jobId}/pdf`, res, `${jobId}.pdf`);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "PDF conversion service is unavailable",
    });
  }
});

router.get("/:jobId/docx", async (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(404).json({ success: false, message: "Conversion not found." });
  }

  try {
    return proxyFileResponse(`/api/conversions/${jobId}/docx`, res, `${jobId}.docx`);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "PDF conversion service is unavailable",
    });
  }
});

router.get("/:jobId/images", async (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(404).json({ success: false, message: "Conversion not found." });
  }

  try {
    const serviceResponse = await fetch(`${getPdfServiceBaseUrl()}/api/conversions/${jobId}/images`);
    return sendServiceJson(serviceResponse, res);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "PDF conversion service is unavailable",
    });
  }
});

router.get("/:jobId/images.zip", async (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(404).json({ success: false, message: "Conversion not found." });
  }

  try {
    const imageListResponse = await fetch(`${getPdfServiceBaseUrl()}/api/conversions/${jobId}/images`);
    if (!imageListResponse.ok) {
      return sendServiceJson(imageListResponse, res);
    }

    const imageListPayload = await imageListResponse.json();
    const images = Array.isArray(imageListPayload.images) ? imageListPayload.images : [];

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No extracted images found for this conversion.",
      });
    }

    const imageFiles = [];

    for (const image of images) {
      const imageName = String(image?.name || "").trim();
      if (!imageName) continue;

      const imageResponse = await fetch(
        `${getPdfServiceBaseUrl()}/api/conversions/${jobId}/images/${encodeURIComponent(imageName)}`
      );

      if (!imageResponse.ok) continue;

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      if (imageBuffer.length > 0) {
        imageFiles.push({ name: imageName, buffer: imageBuffer });
      }
    }

    if (imageFiles.length === 0) {
      return res.status(502).json({
        success: false,
        message: "No image files could be fetched from the PDF conversion service.",
      });
    }

    const zipBuffer = await createZipBuffer(imageFiles);
    if (zipBuffer.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to create image ZIP.",
      });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Length", zipBuffer.length);
    res.setHeader("Content-Disposition", `attachment; filename="${jobId}-images.zip"`);
    return res.status(200).send(zipBuffer);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "PDF conversion service is unavailable",
    });
  }
});

router.get("/:jobId/images/:imageName", async (req, res) => {
  const { jobId, imageName } = req.params;
  if (!isValidJobId(jobId) || !imageName) {
    return res.status(404).json({ success: false, message: "Image not found." });
  }

  try {
    return proxyFileResponse(
      `/api/conversions/${jobId}/images/${encodeURIComponent(imageName)}`,
      res,
      imageName
    );
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "PDF conversion service is unavailable",
    });
  }
});

export default router;
