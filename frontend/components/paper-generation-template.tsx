"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

import { fetchAllQuestionsApi } from "@/utils/apis";
import { baseURL } from "@/hooks/common";
import { getClassNameById, getSubjectNameById } from "@/lib/data";

/* ----------------------------------------
   TYPES
---------------------------------------- */
interface IQuestion {
  _id: string;
  text: string;
  type: string;
  difficulty: string;
  classId: string;
  subjectId: string;
  marks?: number;
  media?: any[];
  options?: any[];
  paragraph?: string;
  subQuestions?: any[];
}

interface SubjectState {
  open: boolean;
  page: number;
  hasMore: boolean;
  loading: boolean;
  questions: IQuestion[];
}

/* ----------------------------------------
   COMPONENT
---------------------------------------- */
export default function PaperGenerationTemplate({
  data,
  paperGenerateFunction,
  selectedQuestionsEdit=[],
}: any) {

  const [subjects, setSubjects] = useState<Record<string, SubjectState>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<
    Record<string, string[]>
  >({});

  const [selectedQuestion, setSelectedQuestion] = useState<IQuestion | null>(
    null
  );
  const [viewModalOpen, setViewModalOpen] = useState(false);
  console.log(selectedQuestionsEdit);
  console.log("Selected Questions:", selectedQuestions);
  console.log(data);
  /* ----------------------------------------
     OBSERVERS (PER SUBJECT)
  ---------------------------------------- */
  const observers = useRef<Record<string, IntersectionObserver>>({});

  /* ----------------------------------------
     INIT SUBJECTS
  ---------------------------------------- */
  useEffect(() => {
    if (!data?.subjectId) return;

    const initial: Record<string, SubjectState> = {};
    data.subjectId.split(",").forEach((id: string) => {
      initial[id] = {
        open: false,
        page: 1,
        hasMore: true,
        loading: false,
        questions: [],
      };
    });

    setSubjects(initial);
  }, [data.subjectId]);

  /* ----------------------------------------
     FETCH QUESTIONS
  ---------------------------------------- */
  const fetchQuestions = async (subjectId: string, page: number) => {
    setSubjects((p) => ({
      ...p,
      [subjectId]: { ...p[subjectId], loading: true },
    }));
const selectedQuestions =
  data.sections.find((s: any) => s.subjectId === subjectId)?.questions || [];
  const sectionId = data.sections.find((s: any) => s.subjectId === subjectId)?.id;
  setSelectedQuestions((prev)=>{
    return {
      ...prev,
      [sectionId]: selectedQuestions
    }
  });
    const payload = {
      classId: data.classId,
      subjectId,
      page,
      limit: 5,
      type: data.type,
      difficulty: data.difficulty,
      selectedQuestions
    };

    const res = await fetchAllQuestionsApi(payload);

    setSubjects((p: Record<string, SubjectState>) => {
      const existing = new Set(p[subjectId].questions.map((q) => q._id));
      const unique = (res.questions as IQuestion[]).filter(
        (q: IQuestion) => !!q._id && !existing.has(q._id)
      );

      return {
        ...p,
        [subjectId]: {
          ...p[subjectId],
          loading: false,
          page: page + 1,
          hasMore: res.questions.length === payload.limit,
          questions: [...p[subjectId].questions, ...unique],
        },
      };
    });
  };

  /* ----------------------------------------
     TOGGLE SUBJECT
  ---------------------------------------- */
  const toggleSubject = (subjectId: string) => {
    setSubjects((p) => {
      const s = p[subjectId];
      if (!s.open && s.questions.length === 0) {
        fetchQuestions(subjectId, s.page);
      }
      return { ...p, [subjectId]: { ...s, open: !s.open } };
    });
  };

  /* ----------------------------------------
     TOGGLE QUESTION (SECTION BASED)
  ---------------------------------------- */
  const toggleQuestion = (question: IQuestion, sectionId: string) => {
    setSelectedQuestions((prev) => {
      const prevIds = prev[sectionId] || [];
      const nextIds = prevIds.includes(question._id)
        ? prevIds.filter((id) => id !== question._id)
        : [...prevIds, question._id];

      const updated = { ...prev, [sectionId]: nextIds };
      paperGenerateFunction(updated);
      return updated;
    });
  };

  /* ----------------------------------------
     INFINITE SCROLL
  ---------------------------------------- */
  const loadMoreRef = (subjectId: string) => (node: HTMLDivElement | null) => {
    if (!node || subjects[subjectId]?.loading || !subjects[subjectId]?.hasMore)
      return;

    observers.current[subjectId]?.disconnect();

    observers.current[subjectId] = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchQuestions(subjectId, subjects[subjectId].page);
        }
      },
      { rootMargin: "200px" }
    );

    observers.current[subjectId].observe(node);
  };

  /* ----------------------------------------
     UI
  ---------------------------------------- */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Question Paper Generator</h1>

      {Object.entries(subjects).map(([subjectId, state]) => {
        const sectionId = data.sections?.find(
          (s: any) => s.subjectId === subjectId
        )?.id;

        return (
          <Card key={subjectId} className="p-4">
            <button
              onClick={() => toggleSubject(subjectId)}
              className="w-full flex justify-between items-center"
            >
              <h2 className="text-lg font-semibold">
                {getSubjectNameById(subjectId)}
              </h2>
              {state.open ? <ChevronUp /> : <ChevronDown />}
            </button>

            {state.open && (
              <div className="mt-4 space-y-3">
                {state.questions.map((q) => (
                  <div
                    key={q._id}
                    className="flex gap-3 border p-3 rounded"
                  >
                    <Checkbox
                      className="cursor-pointer"
                      checked={
                        !!sectionId &&
                        selectedQuestions[sectionId]?.includes(q._id)
                      }
                      onCheckedChange={() =>
                        sectionId && toggleQuestion(q, sectionId)
                      }
                    />

                    <div className="flex-1">
                      <p className="font-medium line-clamp-2">{q.text}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{q.type}</Badge>
                        <Badge>{q.difficulty}</Badge>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedQuestion(q);
                        setViewModalOpen(true);
                      }}
                    >
                      View
                    </Button>
                  </div>
                ))}

                {state.loading && (
                  <p className="text-center text-sm text-muted-foreground">
                    Loading more...
                  </p>
                )}

                {state.hasMore && <div ref={loadMoreRef(subjectId)} />}
              </div>
            )}
          </Card>
        );
      })}

      {/* ================= VIEW MODAL ================= */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>

          {selectedQuestion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>Class: {getClassNameById(selectedQuestion.classId)}</p>
                <p>Subject: {getSubjectNameById(selectedQuestion.subjectId)}</p>
                <p>Type: {selectedQuestion.type}</p>
                <p>Difficulty: {selectedQuestion.difficulty}</p>
                <p>Marks: {selectedQuestion.marks}</p>
              </div>

              <p className="font-medium">{selectedQuestion.text}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
