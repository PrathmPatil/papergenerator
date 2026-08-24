import { IQuestion } from "@/app/dashboard/questions/page";
import { apiClient } from "./apiClient";

const BULK_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const PDF_CONVERSION_TIMEOUT_MS = 10 * 60 * 1000;

export interface PdfConversionResponse {
  job_id: string;
  status: "completed" | "failed" | string;
  original_filename: string;
  created_at?: string;
  files?: {
    input_pdf?: string;
    output_docx?: string;
    images?: string[];
  };
  links?: {
    details?: string;
    input_pdf?: string;
    output_docx?: string;
    images?: string;
  };
  error?: string;
}

export interface PdfConversionImageListResponse {
  job_id: string;
  images: {
    name: string;
    url: string;
  }[];
}

export interface PdfConversionListResponse {
  conversions: PdfConversionResponse[];
}

const ensureDownloadBlob = async (blob: Blob, fallbackMessage: string) => {
  const contentType = String(blob.type || "").toLowerCase();

  if (contentType.includes("application/json") || contentType.includes("text/")) {
    const text = await blob.text();
    try {
      const payload = JSON.parse(text);
      throw new Error(payload.message || payload.error || fallbackMessage);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error(text || fallbackMessage);
      }
      throw error;
    }
  }

  if (blob.size === 0) {
    throw new Error(fallbackMessage);
  }

  return blob;
};

// http://localhost:5000/api/hello
export const helloApi = async () => {
  const response = await apiClient({
    url: "/api/hello",
  });
  return response;
};

// http://localhost:5000/api/questions/
// {
//   "classId": "class_8",
//   "subjectId": "",
//   "topicId": "",
//   "type": "",
//   "difficulty": ""
// }
export const fetchQuestionsApi = async (filters: {
  classId?: string;
  subjectId?: string;
  topicId?: string;
  type?: string;
  difficulty?: string;
  isResent?: boolean
}) => {
  const response = await apiClient({
    url: "/api/questions",
    method: "POST",
    data: filters,
  });
  return response;
};

export const fetchTopicsApi = async (filters: {
  classId?: string;
  subjectId?: string;
  search?: string;
}) => {
  const response = await apiClient({
    url: "/api/topics",
    method: "GET",
    params: filters,
  });
  return response;
};

export const updateTopicApi = async (
  id: string,
  payload: {
    name?: string;
    classId?: string;
    subjectId?: string;
  }
) => {
  const response = await apiClient({
    url: `/api/topics/${id}`,
    method: "PUT",
    data: payload,
  });
  return response;
};

export const deleteTopicApi = async (id: string) => {
  const response = await apiClient({
    url: `/api/topics/${id}`,
    method: "DELETE",
  });
  return response;
};

export const createTopicApi = async (payload: {
  name: string;
  classId: string;
  subjectId: string;
}) => {
  const response = await apiClient({
    url: "/api/topics",
    method: "POST",
    data: payload,
  });
  return response;
};

export const bulkUploadTopicsApi = async (payload: FormData) => {
  const response = await apiClient({
    url: "/api/topics/bulk-upload",
    method: "POST",
    data: payload,
    isFormData: true,
    timeout: BULK_UPLOAD_TIMEOUT_MS,
  });
  return response;
};

// http://localhost:5000/api/questions/

export interface SelectionMarksStats {
  totalSelectedMarks: number;
  totalRequiredMarks: number;
  selectedByTopicMarks: Record<string, number>;
  requiredByTopicMarks: Record<string, number>;
  selectedCount?: number;
  remainingMarks?: number;
  isComplete?: boolean;
}

interface FetchQuestionsResponse {
  success: boolean;
  questions: IQuestion[];
  totalRecords?: number;
  totalPages?: number;
  currentPage?: number;
  selectionStats?: SelectionMarksStats;
}

interface QuestionFilterPayload {
  search?: string;
  classId?: string;
  subjectId?: string;
  topicId?: string;
  type?: string;
  difficulty?: string;
  createdFrom?: string;
  createdTo?: string;
  selectedQuestions?: string[];
  subQuestionSelections?: { questionId: string; subQuestionIds: string[] }[];
  topicDistributions?: { topicId: string; marks: number }[];
  page?: number;
  limit?: number;
}

export async function fetchAllQuestionsApi(
  filters: QuestionFilterPayload
): Promise<FetchQuestionsResponse> {
  const res = await apiClient({
    url: "/api/questions/",
    method: "POST",
    data: filters,
    timeout: 60000,
  });

  return res as unknown as FetchQuestionsResponse;
}

export async function fetchSelectionStatsApi(payload: {
  selectedQuestions?: string[];
  subQuestionSelections?: { questionId: string; subQuestionIds: string[] }[];
  topicDistributions?: { topicId: string; marks: number }[];
}): Promise<{ success: boolean; selectionStats: SelectionMarksStats }> {
  const res = await apiClient({
    url: "/api/questions/selection-stats",
    method: "POST",
    data: payload,
    timeout: 30000,
  });

  return res as unknown as { success: boolean; selectionStats: SelectionMarksStats };
}

export const getQuestionByIdApi = async (id: string) => {
  const response = await apiClient({
    url: `/api/questions/${id}`,
    method: "GET",
    timeout: 60000,
  });
  return response;
};

export async function downloadQuestionBankExcelApi(
  filters: QuestionFilterPayload
): Promise<Blob> {
  const response = await apiClient({
    url: "/api/questions/export-excel",
    method: "POST",
    data: filters,
    responseType: "blob",
  });

  return ensureDownloadBlob(
    response as unknown as Blob,
    "Question Bank Excel download failed."
  );
}

// /api/questions/create
export const createQuestionApi = async (payload: any, isFormData: boolean = false) => {
  const response = await apiClient({
    url: "/api/questions/create",
    method: "POST",
    data: payload,
    isFormData: isFormData,
  });
  return response;
};

// POST /api/questions/create-bulk-upload
export const createBulkQuestionsApi = async (payload: any, isFormData: boolean = true) => {
  const response = await apiClient({
    url: "/api/questions/create-bulk-upload",
    method: "POST",
    data: payload,
    isFormData: isFormData,
    timeout: BULK_UPLOAD_TIMEOUT_MS,
  });
  return response;
};

// http://localhost:5000/api/questions/bulk-image-upload
export const bulkImageUploadApi = async (payload: FormData) => {
  const response = await apiClient({
    url: "/api/questions/bulk-image-upload",
    method: "POST",
    data: payload,
    isFormData: true,
    timeout: BULK_UPLOAD_TIMEOUT_MS,
  });
  return response;
};

// http://localhost:5000/api/questions/bulk-image-upload?questionType=image_subquestions
export const bulkImageUploadWithTypeApi = async (
  payload: FormData,
  questionType: "mcq_image" | "image_subquestions" = "mcq_image"
) => {
  const response = await apiClient({
    url: `/api/questions/bulk-image-upload?questionType=${questionType}`,
    method: "POST",
    data: payload,
    isFormData: true,
    timeout: BULK_UPLOAD_TIMEOUT_MS,
  });
  return response;
};

// http://localhost:5000/api/questions/
//       {
//   "classId": "class_8",
//   "subjectId": "",
//   "topicId": "",
//   "type": "",
//   "difficulty": ""
// }
export const fetchQuestionByIdApi = async (data: { classId: string; subjectId: string; topicId: string; type: string; difficulty: string }) => {
  const response = await apiClient({
    url: `/api/questions/`,
    method: "POST",
    data,
  });
  return response;
}

// http://localhost:5000/api/papers/template/create
// {
//   "title": "INNOSAT Class 8 Model Paper",
//   "classId": "class_8",
//   "totalMarks": 40,
//   "durationMinutes": 90,

//   "sections": [
//     {
//       "id": "sec_eng",
//       "name": "English",
//       "subjectId": "english",
//       "marks": 10
//     },
//     {
//       "id": "sec_sci",
//       "name": "Science",
//       "subjectId": "science",
//       "marks": 15
//     },
//     {
//       "id": "sec_math",
//       "name": "Mathematics",
//       "subjectId": "maths",
//       "marks": 15
//     }
//   ]  
// }

export const deleteQuestionApi = async (id: string) => {
  const response = await apiClient({
    url: `/api/questions/${id}`,
    method: "DELETE",
  });
  return response;
};

export const updateQuestionApi = async (
  id: string,
  payload:
    | FormData
    | {
        text?: string;
        paragraph?: string;
        options?: {
          id?: string;
          text?: string;
          mediaUrl?: string;
          isCorrect?: boolean;
        }[];
        subQuestions?: any[];
        correctAnswer?: string;
        marks?: number;
        difficulty?: "easy" | "medium" | "hard";
        topicId?: string;
      }
) => {
  const response = await apiClient({
    url: `/api/questions/${id}`,
    method: "PUT",
    data: payload,
    isFormData: payload instanceof FormData,
  });
  return response;
};

export const bulkUpdateQuestionsApi = async (payload: {
  ids: string[];
  marks?: number;
  difficulty?: "easy" | "medium" | "hard";
  topicId?: string;
  type?: string;
}) => {
  const response = await apiClient({
    url: "/api/questions/bulk-update",
    method: "PUT",
    data: payload,
  });
  return response;
};

export const bulkDeleteQuestionsApi = async (payload: { ids: string[] }) => {
  const response = await apiClient({
    url: "/api/questions/bulk-delete",
    method: "PUT",
    data: payload,
  });
  return response;
};

export const bulkClearQuestionUsageApi = async (payload: { ids: string[] }) => {
  const response = await apiClient({
    url: "/api/questions/bulk-clear-usage",
    method: "PUT",
    data: payload,
  });
  return response;
};

export const rebuildQuestionUsageApi = async () => {
  const response = await apiClient({
    url: "/api/questions/rebuild-usage",
    method: "POST",
  });
  return response;
};
export const createPaperTemplateApi = async (payload: any) => {
  const response = await apiClient({
    url: "/api/papers/template/create",
    method: "POST",
    data: payload,
  });
  return response;
}

// http://localhost:5000/api/papers/generate/manual
export const generatePaperApiManual = async (payload: any) => {
  const response = await apiClient({
    url: "/api/papers/generate/manual",
    method: "POST",
    data: payload,
  });
  return response;
}

// http://localhost:5000/api/papers
export const fetchAllPapersApi = async (payload: any) => {
  const response = await apiClient({
    url: "/api/papers",
    method: "POST",
    data: payload,
  });
  return response;
}

// /api/papers/:id
export const fetchPaperByIdApi = async (id: string) => {
  const response = await apiClient({
    url: `/api/papers/${id}`,
    method: "GET",
  });
  return response;
}

// http://localhost:5000/api/papers/edit/695762a49ca75f5b131634c8
export const getEditPaperApi = async (id: string) => {
  const response = await apiClient({
    url: `/api/papers/edit/${id}`
  });
  return response;
}

// /check/:title
export const isTitleExist = async (name:string)=>{
  const response = await apiClient({
    url: `/api/papers/check/${name}`
  });
  return response;
}

// update the paper :id
export const updatePaperName = async (id: string, payload: any) => {
  const response = await apiClient({
    url: `/api/papers/${id}`,
    method: "PUT",
    data: payload,
  });
  return response;
}

// DELETE /api/papers/:id  (soft delete)
export const deletePaperApi = async (id: string) => {
  const response = await apiClient({
    url: `/api/papers/${id}`,
    method: "DELETE",
  });
  return response;
};



// POST /api/users/register
export const registerUserApi = async (payload: any) => {
  const response = await apiClient({
    url: "/api/users/register",
    method: "POST",
    data: payload,
  });
  return response;
}

// POST /api/users/login
export const loginUserApi = async (payload: any) => {
  const response = await apiClient({
    url: "/api/users/login",
    method: "POST",
    data: payload,
  });
  return response;
}

// /api/users
export const fetchAllUsersApi = async () => {
  const response = await apiClient({
    url: "/api/users",
  });
  return response;
}

// /api/users/:id
export const fetchUserByIdApi = async (id: string) => {
  const response = await apiClient({
    url: `/api/users/${id}`,
  });
  return response;
}

// PUT /api/users/:id
export const updateUserApi = async (id: string, payload: any) => {
  const response = await apiClient({
    url: `/api/users/${id}`,
    method: "PUT",
    data: payload,
  });
  return response;
}

// PUT /api/users/:id/is-active
export const toggleUserStatusApi = async (id: string, payload: any) => {
  const response = await apiClient({
    url: `/api/users/${id}/is-active`,
    method: "PUT",
    data: payload,
  });
  return response;
}

// PUT /api/users/:id/is-deleted
export const toggleUserDeleteApi = async (id: string, payload: any) => {
  const response = await apiClient({
    url: `/api/users/${id}/is-deleted`,
    method: "PUT",
    data: payload,
  });
  return response;
}

// /:userId/password
export const changePasswordApi = async (id: string, payload: any) => {
  const response = await apiClient({
    url: `/api/users/${id}/password`,
    method: "PUT",
    data: payload,
  });
  return response;
}

// Put // /:userId/profile
export const updateProfileApi = async (id: string, payload: any) => {
  const response = await apiClient({
    url: `/api/users/${id}/profile`,
    method: "PUT",
    data: payload,
  });
  return response;
}

// /profile/:id
export const fetchProfileApi = async (id: string) => {
  const response = await apiClient({
    url: `/api/users/profile/${id}`,
  });
  return response;
}

// /:userId/notifications
export const updateNotificationsApi = async (id: string, payload: any) => {
  const response = await apiClient({
    url: `/api/setting/${id}/notifications`,
    method: "PUT",
    data: payload,
  });
  return response;
}

// /:userId/theme
export const updateThemeApi = async (id: string, payload: any) => {
  const response = await apiClient({
    url: `/api/setting/${id}/theme`,
    method: "PUT",
    data: payload,
  });
  return response;
}

// GET /api/papers/export/:id  (download pdf)
export const exportPaperPdfApi = async (id: string): Promise<Blob> => {
  const response = await apiClient({
    url: `/api/papers/export/${id}`,
    method: "GET",
    responseType: "blob", // ✅ IMPORTANT
  });
  return response as unknown as Blob;
};

export const convertPdfToDocxApi = async (pdfFile: File): Promise<PdfConversionResponse> => {
  const formData = new FormData();
  formData.append("pdf", pdfFile);

  const response = await apiClient<PdfConversionResponse>({
    url: "/api/pdf-conversion/convert",
    method: "POST",
    data: formData,
    isFormData: true,
    timeout: PDF_CONVERSION_TIMEOUT_MS,
  });

  return response as unknown as PdfConversionResponse;
};

export const convertDocxToExcelZipApi = async (
  docxFile: File,
  options: {
    classId: string;
    subjectId: string;
    topicId?: string;
    topicName?: string;
    difficulty?: string;
    marks?: number;
    negativeMarks?: number;
  }
): Promise<Blob> => {
  const formData = new FormData();
  formData.append("docx", docxFile);
  formData.append("classId", options.classId);
  formData.append("subjectId", options.subjectId);
  if (options.topicId) formData.append("topicId", options.topicId);
  if (options.topicName) formData.append("topicName", options.topicName);
  formData.append("difficulty", options.difficulty || "easy");
  formData.append("marks", String(options.marks ?? 1));
  formData.append("negativeMarks", String(options.negativeMarks ?? 0));

  const response = await apiClient({
    url: "/api/pdf-conversion/docx-to-excel",
    method: "POST",
    data: formData,
    isFormData: true,
    responseType: "blob",
    timeout: PDF_CONVERSION_TIMEOUT_MS,
  });

  return ensureDownloadBlob(response as unknown as Blob, "DOCX to Excel export failed.");
};

export const convertPdfsToExcelZipApi = async (
  pdfFiles: File[],
  options: {
    classId: string;
    subjectId: string;
    topicId?: string;
    topicName?: string;
    difficulty?: string;
    marks?: number;
    negativeMarks?: number;
  }
): Promise<Blob> => {
  const formData = new FormData();
  pdfFiles.forEach((file) => formData.append("pdfs", file));
  formData.append("classId", options.classId);
  formData.append("subjectId", options.subjectId);
  if (options.topicId) formData.append("topicId", options.topicId);
  if (options.topicName) formData.append("topicName", options.topicName);
  formData.append("difficulty", options.difficulty || "easy");
  formData.append("marks", String(options.marks ?? 1));
  formData.append("negativeMarks", String(options.negativeMarks ?? 0));

  const response = await apiClient({
    url: "/api/pdf-conversion/pdf-to-excel",
    method: "POST",
    data: formData,
    isFormData: true,
    responseType: "blob",
    timeout: PDF_CONVERSION_TIMEOUT_MS,
  });

  return ensureDownloadBlob(response as unknown as Blob, "PDF to Excel generation failed.");
};

export type ExcelPackageHistoryItem = {
  job_id: string;
  status: string;
  source_type?: string;
  original_filename: string;
  created_at?: string;
  class_id?: string;
  subject_id?: string;
  topic_id?: string;
  difficulty?: string;
  error?: string;
  files?: {
    input_docx?: string;
    package_zip?: string;
  };
};

export type ExcelPackageHistoryResponse = {
  packages: ExcelPackageHistoryItem[];
};

export const convertPdfConversionToExcelZipApi = async (
  jobId: string,
  options: {
    classId: string;
    subjectId: string;
    topicId?: string;
    topicName?: string;
    difficulty?: string;
    marks?: number;
    negativeMarks?: number;
  }
): Promise<Blob> => {
  const response = await apiClient({
    url: `/api/pdf-conversion/${jobId}/excel-package`,
    method: "POST",
    data: {
      classId: options.classId,
      subjectId: options.subjectId,
      topicId: options.topicId,
      topicName: options.topicName,
      difficulty: options.difficulty || "easy",
      marks: options.marks ?? 1,
      negativeMarks: options.negativeMarks ?? 0,
    },
    responseType: "blob",
    timeout: PDF_CONVERSION_TIMEOUT_MS,
  });

  return ensureDownloadBlob(response as unknown as Blob, "PDF conversion to Excel export failed.");
};

export const fetchExcelPackageHistoryApi = async (
  limit: number = 25
): Promise<ExcelPackageHistoryResponse> => {
  const response = await apiClient<ExcelPackageHistoryResponse>({
    url: "/api/pdf-conversion/excel-packages",
    method: "GET",
    params: { limit },
  });

  return response as unknown as ExcelPackageHistoryResponse;
};

export const downloadExcelPackageApi = async (packageJobId: string): Promise<Blob> => {
  const response = await apiClient({
    url: `/api/pdf-conversion/excel-packages/${packageJobId}/download`,
    method: "GET",
    responseType: "blob",
    timeout: PDF_CONVERSION_TIMEOUT_MS,
  });

  return ensureDownloadBlob(response as unknown as Blob, "Excel package download failed.");
};

export const fetchPdfConversionApi = async (jobId: string): Promise<PdfConversionResponse> => {
  const response = await apiClient<PdfConversionResponse>({
    url: `/api/pdf-conversion/${jobId}`,
    method: "GET",
  });

  return response as unknown as PdfConversionResponse;
};

export const fetchPdfConversionsApi = async (limit: number = 25): Promise<PdfConversionListResponse> => {
  const response = await apiClient<PdfConversionListResponse>({
    url: "/api/pdf-conversion",
    method: "GET",
    params: { limit },
  });

  return response as unknown as PdfConversionListResponse;
};

export const fetchPdfConversionImagesApi = async (
  jobId: string
): Promise<PdfConversionImageListResponse> => {
  const response = await apiClient<PdfConversionImageListResponse>({
    url: `/api/pdf-conversion/${jobId}/images`,
    method: "GET",
  });

  return response as unknown as PdfConversionImageListResponse;
};

export const downloadPdfConversionDocxApi = async (jobId: string): Promise<Blob> => {
  const response = await apiClient({
    url: `/api/pdf-conversion/${jobId}/docx`,
    method: "GET",
    responseType: "blob",
    timeout: PDF_CONVERSION_TIMEOUT_MS,
  });

  return ensureDownloadBlob(response as unknown as Blob, "DOCX download failed.");
};

export const downloadPdfConversionPdfApi = async (jobId: string): Promise<Blob> => {
  const response = await apiClient({
    url: `/api/pdf-conversion/${jobId}/pdf`,
    method: "GET",
    responseType: "blob",
    timeout: PDF_CONVERSION_TIMEOUT_MS,
  });

  return ensureDownloadBlob(response as unknown as Blob, "PDF download failed.");
};

export const downloadPdfConversionImageApi = async (
  jobId: string,
  imageName: string
): Promise<Blob> => {
  const response = await apiClient({
    url: `/api/pdf-conversion/${jobId}/images/${encodeURIComponent(imageName)}`,
    method: "GET",
    responseType: "blob",
    timeout: PDF_CONVERSION_TIMEOUT_MS,
  });

  return ensureDownloadBlob(response as unknown as Blob, "Image download failed.");
};

export const downloadPdfConversionImagesZipApi = async (jobId: string): Promise<Blob> => {
  const response = await apiClient({
    url: `/api/pdf-conversion/${jobId}/images.zip`,
    method: "GET",
    responseType: "blob",
    timeout: PDF_CONVERSION_TIMEOUT_MS,
  });

  return ensureDownloadBlob(response as unknown as Blob, "Images ZIP download failed.");
};
