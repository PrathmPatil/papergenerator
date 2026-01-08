import { IQuestion } from "@/app/dashboard/questions/page";
import { apiClient } from "./apiClient";

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

// http://localhost:5000/api/questions/

interface FetchQuestionsResponse {
  success: boolean;
  questions: IQuestion[];
}

interface QuestionFilterPayload {
  search?: string;
  classId?: string;
  subjectId?: string;
  type?: string;
  difficulty?: string;
}

export async function fetchAllQuestionsApi(
  filters: QuestionFilterPayload
): Promise<FetchQuestionsResponse> {
  const res = await apiClient({
    url: "/api/questions/",
    method: "POST",
    data: filters,
  });

  return res;
}

// /api/questions/create
export const createQuestionApi = async (payload: any, isFormData: boolean = false) => {
  const response = await apiClient({
    url: "/api/questions/create",
    method: "POST",
    data: payload,
    headers: isFormData
      ? { "Content-Type": "multipart/form-data" }
      : { "Content-Type": "application/json" },
  });
  return response;
};

// POST /api/questions/create-bulk-upload
export const createBulkQuestionsApi = async (payload: any, isFormData: boolean = true) => {
  const response = await apiClient({
    url: "/api/questions/create-bulk-upload",
    method: "POST",
    data: payload,
    headers: isFormData
      ? { "Content-Type": "multipart/form-data" }
      : { "Content-Type": "application/json" },
  });
  return response;
};

// http://localhost:5000/api/questions/bulk-image-upload
export const bulkImageUploadApi = async (payload: FormData) => {
  const response = await apiClient({
    url: "/api/questions/bulk-image-upload",
    method: "POST",
    data: payload,
    headers: { "Content-Type": "multipart/form-data" },
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
    url: `/api/papers/edit/${id}`,
    method: "PUT",
    data: payload,
  });
  return response;
}


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

