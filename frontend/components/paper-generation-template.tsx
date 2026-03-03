"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

import { fetchAllQuestionsApi } from "@/utils/apis";
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

type SelectedMap = Record<string, string[]>;

/* ----------------------------------------
   HELPERS
---------------------------------------- */
function getSectionId(sec: any) {
  return String(sec?.id ?? sec?._id ?? "");
}

function normalizeSectionQuestions(sec: any): string[] {
  if (!Array.isArray(sec?.questions)) return [];
  return sec.questions
    .map((q: any) => String(q?.questionId ?? q?._id ?? q?.id ?? q))
    .filter(Boolean);
}

// supports:
// 1) { [sectionId]: ["q1","q2"] }
// 2) [{sectionId:"...", questionId:"..."}]
// 3) [{sectionId:"...", _id:"..."}]
function normalizeSelectedQuestionsEdit(input: any): SelectedMap {
  const out: SelectedMap = {};

  // map style
  if (input && !Array.isArray(input) && typeof input === "object") {
    for (const [k, v] of Object.entries(input)) {
      out[String(k)] = Array.isArray(v) ? (v as any[]).map(String) : [];
    }
    return out;
  }

  // array style
  if (Array.isArray(input)) {
    for (const item of input) {
      const sectionId = String(
        item?.sectionId ?? item?.section?._id ?? item?.section ?? ""
      );
      const qid = String(item?.questionId ?? item?._id ?? item?.id ?? "");
      if (!sectionId || !qid) continue;

      if (!out[sectionId]) out[sectionId] = [];
      if (!out[sectionId].includes(qid)) out[sectionId].push(qid);
    }
    return out;
  }

  return {};
}

/* ----------------------------------------
   COMPONENT
---------------------------------------- */
export default function PaperGenerationTemplate({
  data,
  paperGenerateFunction,
  selectedQuestionsEdit = null,
}: any) {
  const [subjects, setSubjects] = useState<Record<string, SubjectState>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedMap>({});

  const [selectedQuestion, setSelectedQuestion] = useState<IQuestion | null>(
    null
  );
  const [viewModalOpen, setViewModalOpen] = useState(false);

  /* ----------------------------------------
     KEEP A STABLE REF TO PARENT CALLBACK
     (prevents dependency loops when parent recreates function)
  ---------------------------------------- */
  const parentSyncRef = useRef<any>(paperGenerateFunction);
  useEffect(() => {
    parentSyncRef.current = paperGenerateFunction;
  }, [paperGenerateFunction]);

  /* ----------------------------------------
     INIT SUBJECTS
  ---------------------------------------- */
  useEffect(() => {
    if (!data?.subjectId) return;

    const initial: Record<string, SubjectState> = {};
    String(data.subjectId)
      .split(",")
      .map((x: string) => x.trim())
      .filter(Boolean)
      .forEach((id: string) => {
        initial[id] = {
          open: false,
          page: 1,
          hasMore: true,
          loading: false,
          questions: [],
        };
      });

    setSubjects(initial);
  }, [data?.subjectId]);

  /* ----------------------------------------
     INIT SELECTED QUESTIONS (EDIT LOAD)
     - build merged selection from template + edit payload
     - set local state only if different
  ---------------------------------------- */
  useEffect(() => {
    if (!data?.sections?.length) return;

    const base: SelectedMap = {};
    data.sections.forEach((sec: any) => {
      const sid = getSectionId(sec);
      if (!sid) return;
      base[sid] = normalizeSectionQuestions(sec);
    });

    const fromEdit = normalizeSelectedQuestionsEdit(selectedQuestionsEdit);
    const merged: SelectedMap = { ...base, ...fromEdit };

    // ✅ prevent resetting selection repeatedly
    const currentSnap = JSON.stringify(selectedQuestions);
    const mergedSnap = JSON.stringify(merged);
    if (currentSnap === mergedSnap) return;

    setSelectedQuestions(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.sections, selectedQuestionsEdit]);

  /* ----------------------------------------
     SYNC LOCAL SELECTED QUESTIONS TO PARENT
     - ensures preview shows already-selected questions
     - prevents infinite loops by deduping snapshots
  ---------------------------------------- */
  const lastSentSnapRef = useRef<string>("");

  useEffect(() => {
    if (!selectedQuestions || Object.keys(selectedQuestions).length === 0) return;

    const snap = JSON.stringify(selectedQuestions);

    // ✅ send only when changed
    if (snap === lastSentSnapRef.current) return;

    lastSentSnapRef.current = snap;
    parentSyncRef.current?.(selectedQuestions);
  }, [selectedQuestions]);

  /* ----------------------------------------
     OBSERVERS (PER SUBJECT)
  ---------------------------------------- */
  const observers = useRef<Record<string, IntersectionObserver>>({});

  /* ----------------------------------------
     FETCH QUESTIONS
  ---------------------------------------- */
  const fetchQuestions = async (subjectId: string, page: number) => {
    setSubjects((p) => ({
      ...p,
      [subjectId]: { ...p[subjectId], loading: true },
    }));

    const sec = data?.sections?.find(
      (s: any) => String(s.subjectId) === String(subjectId)
    );
    const sectionId = sec ? getSectionId(sec) : "";

    const selectedForThisSection = sectionId
      ? selectedQuestions[sectionId] || []
      : [];

    const payload = {
      classId: data.classId,
      subjectId,
      page,
      limit: 5,
      type: data.type,
      difficulty: data.difficulty,
      selectedQuestions: selectedForThisSection,
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
        const sec = data?.sections?.find(
          (s: any) => String(s.subjectId) === String(subjectId)
        );
        const sectionId = sec ? getSectionId(sec) : "";

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
                {state.questions.map((q) => {
                  const checked =
                    !!sectionId &&
                    (selectedQuestions[sectionId] || []).includes(q._id);

                  return (
                    <div key={q._id} className="flex gap-3 border p-3 rounded">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => {
                          if (!sectionId) return;

                          setSelectedQuestions((prev) => {
                            const current = prev[sectionId] || [];
                            const exists = current.includes(q._id);

                            const next =
                              val === true
                                ? exists
                                  ? current
                                  : [...current, q._id]
                                : current.filter((id) => id !== q._id);

                            // ✅ only local update (parent sync happens in effect)
                            return { ...prev, [sectionId]: next };
                          });
                        }}
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
                  );
                })}

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