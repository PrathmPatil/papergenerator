"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

import { fetchAllQuestionsApi } from "@/utils/apis";
import { getClassNameById, getSubjectNameById } from "@/lib/data";
import { formatTopicTitle } from "@/lib/utils";

interface IQuestion {
  _id: string;
  text: string;
  type: string;
  difficulty: string;
  classId: string;
  subjectId: string;
  topicId: string;
  marks?: number;
  media?: any[];
  options?: any[];
  paragraph?: string;
  subQuestions?: any[];
}

interface SubjectState {
  open: boolean;
  loading: boolean;
  questions: IQuestion[];
  activeTopicId: string;
  topicPages: Record<string, number>;
  topicTotalPages: Record<string, number>;
}

type SelectedMap = Record<string, string[]>;

interface TopicDistributionRule {
  topicId: string;
  marks: number;
}

interface SectionRules {
  topicDistributions: TopicDistributionRule[];
}

interface AvailableTopic {
  id: string;
  name: string;
  subjectId: string;
}

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

function getSectionId(sec: any) {
  return String(sec?.id ?? sec?._id ?? "");
}

function normalizeSectionQuestions(sec: any): string[] {
  if (!Array.isArray(sec?.questions)) return [];
  return sec.questions
    .map((q: any) => String(q?.questionId ?? q?._id ?? q?.id ?? q))
    .filter(Boolean);
}

function normalizeSelectedQuestionsEdit(input: any): SelectedMap {
  const out: SelectedMap = {};

  if (input && !Array.isArray(input) && typeof input === "object") {
    for (const [k, v] of Object.entries(input)) {
      out[String(k)] = Array.isArray(v) ? (v as any[]).map(String) : [];
    }
    return out;
  }

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

function getSectionRules(section: any): SectionRules | null {
  const topicDistributions = Array.isArray(section?.rules?.topicDistributions)
    ? section.rules.topicDistributions
        .map((item: any) => ({
          topicId: String(item?.topicId || ""),
          marks: Number(item?.marks || 0),
        }))
        .filter((item: TopicDistributionRule) => !!item.topicId)
    : [];

  if (topicDistributions.length === 0) {
    return null;
  }

  return {
    topicDistributions,
  };
}

export function PaperGenerationTemplate({
  data,
  paperGenerateFunction,
  selectedQuestionsEdit = null,
  selectedTopics = [],
  availableTopics = [],
}: any) {
  const PAGE_SIZE = 10;
  const [subjects, setSubjects] = useState<Record<string, SubjectState>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedMap>({});

  const [selectedQuestion, setSelectedQuestion] = useState<IQuestion | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const parentSyncRef = useRef<any>(paperGenerateFunction);
  useEffect(() => {
    parentSyncRef.current = paperGenerateFunction;
  }, [paperGenerateFunction]);

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
          loading: false,
          questions: [],
          activeTopicId: "",
          topicPages: {},
          topicTotalPages: {},
        };
      });

    setSubjects(initial);
  }, [data?.subjectId]);

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

    if (JSON.stringify(selectedQuestions) === JSON.stringify(merged)) return;
    setSelectedQuestions(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.sections, selectedQuestionsEdit]);

  const lastSentSnapRef = useRef<string>("");
  useEffect(() => {
    if (!selectedQuestions || Object.keys(selectedQuestions).length === 0) return;

    const snap = JSON.stringify(selectedQuestions);
    if (snap === lastSentSnapRef.current) return;

    lastSentSnapRef.current = snap;
    parentSyncRef.current?.(selectedQuestions);
  }, [selectedQuestions]);

  const topicNameById = useMemo(() => {
    const map = new Map<string, string>();
    (availableTopics as AvailableTopic[]).forEach((topic) => {
      map.set(String(topic.id), formatTopicTitle(topic.name));
    });
    return map;
  }, [availableTopics]);

  const questionById = useMemo(() => {
    const map = new Map<string, IQuestion>();
    Object.values(subjects).forEach((subjectState) => {
      subjectState.questions.forEach((q) => {
        map.set(String(q._id), q);
      });
    });
    return map;
  }, [subjects]);

  const getSectionSelectionStats = (section: any) => {
    const sectionId = getSectionId(section);
    const rules = getSectionRules(section);
    const selectedIds = selectedQuestions[sectionId] || [];

    if (!rules) {
      return {
        totalRequiredMarks: 0,
        totalSelectedMarks: selectedIds.reduce((sum, qid) => {
          const q = questionById.get(String(qid));
          return sum + Math.max(1, Number(q?.marks ?? 1));
        }, 0),
        requiredByTopicMarks: {} as Record<string, number>,
        selectedByTopicMarks: {} as Record<string, number>,
        hasRules: false,
      };
    }

    const requiredByTopicMarks: Record<string, number> = {};
    rules.topicDistributions.forEach((item) => {
      requiredByTopicMarks[item.topicId] = Math.max(0, Number(item.marks || 0));
    });

    const selectedByTopicMarks: Record<string, number> = {};
    selectedIds.forEach((qid) => {
      const q = questionById.get(String(qid));
      if (!q?.topicId) return;
      const mark = Math.max(1, Number(q.marks ?? 1));
      selectedByTopicMarks[q.topicId] =
        (selectedByTopicMarks[q.topicId] || 0) + mark;
    });

    return {
      totalRequiredMarks: Object.values(requiredByTopicMarks).reduce((sum, n) => sum + n, 0),
      totalSelectedMarks: selectedIds.reduce((sum, qid) => {
        const q = questionById.get(String(qid));
        return sum + Math.max(1, Number(q?.marks ?? 1));
      }, 0),
      requiredByTopicMarks,
      selectedByTopicMarks,
      hasRules: true,
    };
  };

  const getSelectConstraint = (q: IQuestion, section: any) => {
    const stats = getSectionSelectionStats(section);
    if (!stats.hasRules) {
      return { allowed: true, reason: "" };
    }

    const topicId = String(q.topicId || "");
    const requiredForTopicMarks = stats.requiredByTopicMarks[topicId] || 0;
    if (!requiredForTopicMarks) {
      return { allowed: false, reason: "Topic not in distribution" };
    }

    const selectedForTopicMarks = stats.selectedByTopicMarks[topicId] || 0;
    const questionMarks = Math.max(1, Number(q.marks ?? 1));

    if (selectedForTopicMarks + questionMarks > requiredForTopicMarks) {
      return {
        allowed: false,
        reason: `${topicNameById.get(topicId) || "Topic"} marks quota filled`,
      };
    }

    if (stats.totalSelectedMarks + questionMarks > stats.totalRequiredMarks) {
      return { allowed: false, reason: "Section marks quota reached" };
    }

    return { allowed: true, reason: "" };
  };

  const fetchQuestions = async (subjectId: string, page: number, topicId?: string) => {
    const activeTopicId = topicId || subjects[subjectId]?.activeTopicId;
    if (!activeTopicId) return;

    setSubjects((p) => ({
      ...p,
      [subjectId]: { ...p[subjectId], loading: true },
    }));

    const sec = data?.sections?.find(
      (s: any) => String(s.subjectId) === String(subjectId)
    );
    const sectionId = sec ? getSectionId(sec) : "";

    const selectedForThisSection = sectionId ? selectedQuestions[sectionId] || [] : [];

    const payload: any = {
      classId: data.classId,
      subjectId,
      page,
      limit: PAGE_SIZE,
      type: data.type,
      difficulty: data.difficulty,
      selectedQuestions: selectedForThisSection,
      topicId: activeTopicId,
    };

    const res: any = await fetchAllQuestionsApi(payload);

    setSubjects((p: Record<string, SubjectState>) => {
      const nextTotalPages = Math.max(Number(res?.totalPages || 0), 1);
      const nextPage = Math.max(Number(res?.currentPage || page), 1);

      return {
        ...p,
        [subjectId]: {
          ...p[subjectId],
          loading: false,
          questions: Array.isArray(res?.questions) ? res.questions : [],
          activeTopicId,
          topicPages: {
            ...p[subjectId].topicPages,
            [activeTopicId]: nextPage,
          },
          topicTotalPages: {
            ...p[subjectId].topicTotalPages,
            [activeTopicId]: nextTotalPages,
          },
        },
      };
    });
  };

  const getSubjectTopics = (subjectId: string): AvailableTopic[] => {
    const selectedTopicSet = new Set((selectedTopics || []).map((id: string) => String(id)));
    return (availableTopics as AvailableTopic[]).filter(
      (topic) => String(topic.subjectId) === String(subjectId) && selectedTopicSet.has(String(topic.id))
    );
  };

  const setActiveTopic = (subjectId: string, topicId: string) => {
    setSubjects((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        activeTopicId: topicId,
      },
    }));

    fetchQuestions(subjectId, 1, topicId);
  };

  const toggleSubject = (subjectId: string) => {
    setSubjects((p) => {
      const s = p[subjectId];

      if (!s.open) {
        const subjectTopics = getSubjectTopics(subjectId);
        const defaultTopicId = s.activeTopicId || subjectTopics[0]?.id || "";

        if (defaultTopicId) {
          setTimeout(() => {
            fetchQuestions(subjectId, 1, defaultTopicId);
          }, 0);
        }

        return {
          ...p,
          [subjectId]: {
            ...s,
            open: true,
            activeTopicId: defaultTopicId,
          },
        };
      }

      return { ...p, [subjectId]: { ...s, open: false } };
    });
  };

  const goToTopicPage = (subjectId: string, page: number) => {
    const topicId = subjects[subjectId]?.activeTopicId;
    if (!topicId) return;
    fetchQuestions(subjectId, page, topicId);
  };

  const getPaginationItems = (
    currentPage: number,
    totalPages: number,
    maxNumbers = 5
  ): PaginationItem[] => {
    if (totalPages <= maxNumbers + 2) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items: PaginationItem[] = [1];
    const sideCount = Math.floor(maxNumbers / 2);

    let start = Math.max(2, currentPage - sideCount);
    let end = Math.min(totalPages - 1, currentPage + sideCount);

    const actualCount = end - start + 1;
    if (actualCount < maxNumbers) {
      if (start === 2) {
        end = Math.min(totalPages - 1, end + (maxNumbers - actualCount));
      } else if (end === totalPages - 1) {
        start = Math.max(2, start - (maxNumbers - actualCount));
      }
    }

    if (start > 2) {
      items.push("ellipsis-left");
    }

    for (let i = start; i <= end; i += 1) {
      items.push(i);
    }

    if (end < totalPages - 1) {
      items.push("ellipsis-right");
    }

    items.push(totalPages);
    return items;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Question Paper Generator</h1>

      {Object.entries(subjects).map(([subjectId, state]) => {
        const sec = data?.sections?.find(
          (s: any) => String(s.subjectId) === String(subjectId)
        );
        const subjectTopics = getSubjectTopics(subjectId);
        const activeTopicId = state.activeTopicId || subjectTopics[0]?.id || "";
        const currentPage = state.topicPages[activeTopicId] || 1;
        const totalPages = state.topicTotalPages[activeTopicId] || 1;
        const sectionId = sec ? getSectionId(sec) : "";
        const stats = sec ? getSectionSelectionStats(sec) : null;

        return (
          <Card key={subjectId} className="p-4">
            <button
              onClick={() => toggleSubject(subjectId)}
              className="w-full flex justify-between items-center"
            >
              <div className="text-left">
                <h2 className="text-lg font-semibold">{getSubjectNameById(subjectId)}</h2>
                {stats?.hasRules && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected {stats.totalSelectedMarks} / Required {stats.totalRequiredMarks} marks
                  </p>
                )}
              </div>
              {state.open ? <ChevronUp /> : <ChevronDown />}
            </button>

            {state.open && (
              <div className="mt-4 space-y-3">
                {subjectTopics.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {subjectTopics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setActiveTopic(subjectId, topic.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          String(activeTopicId) === String(topic.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted bg-muted/70 text-muted-foreground"
                        }`}
                      >
                        {formatTopicTitle(topic.name)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No selected topics for this subject.
                  </p>
                )}

                {stats?.hasRules && (
                  <div className="rounded-md border p-3 bg-muted/20">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-medium">Selection Constraints</span>
                      <Badge variant="outline">Mark-based selection</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.requiredByTopicMarks).map(([topicId, required]) => {
                        const selected = stats.selectedByTopicMarks[topicId] || 0;
                        return (
                          <Badge
                            key={topicId}
                            variant={selected >= required ? "default" : "secondary"}
                          >
                            {topicNameById.get(topicId) || "Topic"}: {selected}/{required} marks
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {state.questions.map((q) => {
                  const checked =
                    !!sectionId && (selectedQuestions[sectionId] || []).includes(q._id);
                  const constraint = sec ? getSelectConstraint(q, sec) : { allowed: true, reason: "" };
                  const disabled = !checked && !constraint.allowed;

                  return (
                    <div key={q._id} className="flex gap-3 border p-3 rounded">
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(val) => {
                          if (!sectionId) return;

                          if (val === true && !constraint.allowed) {
                            return;
                          }

                          setSelectedQuestions((prev) => {
                            const current = prev[sectionId] || [];
                            const exists = current.includes(q._id);

                            const next =
                              val === true
                                ? exists
                                  ? current
                                  : [...current, q._id]
                                : current.filter((id) => id !== q._id);

                            return { ...prev, [sectionId]: next };
                          });
                        }}
                      />

                      <div className="flex-1">
                        <p className="font-medium line-clamp-2">{q.text}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline">{q.type}</Badge>
                          <Badge>{q.difficulty}</Badge>
                          <Badge variant="secondary">Marks: {q.marks ?? 1}</Badge>
                          <Badge variant="outline">
                            {topicNameById.get(q.topicId) || "Topic"}
                          </Badge>
                        </div>
                        {disabled && constraint.reason && (
                          <p className="text-xs text-amber-600 mt-2">{constraint.reason}</p>
                        )}
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
                    Loading questions...
                  </p>
                )}

                {!state.loading && totalPages > 1 && (
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        10 per page
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => goToTopicPage(subjectId, 1)}
                        disabled={currentPage <= 1}
                        aria-label="Go to first page"
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => goToTopicPage(subjectId, Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                    >
                      Prev
                    </Button>

                      {getPaginationItems(currentPage, totalPages).map((item) => {
                        if (typeof item !== "number") {
                          return (
                            <span
                              key={`${subjectId}-${activeTopicId}-${item}`}
                              className="px-1 text-xs text-muted-foreground"
                            >
                              ...
                            </span>
                          );
                        }

                        const isActive = item === currentPage;
                        return (
                          <Button
                            key={`${subjectId}-${activeTopicId}-page-${item}`}
                            type="button"
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            className={`h-8 min-w-8 px-2 font-semibold ${
                              isActive ? "shadow-sm" : "hover:bg-muted"
                            }`}
                            onClick={() => goToTopicPage(subjectId, item)}
                            aria-current={isActive ? "page" : undefined}
                          >
                            {item}
                          </Button>
                        );
                      })}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => goToTopicPage(subjectId, Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => goToTopicPage(subjectId, totalPages)}
                        disabled={currentPage >= totalPages}
                        aria-label="Go to last page"
                      >
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

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
                <p>Topic: {topicNameById.get(selectedQuestion.topicId) || "Topic"}</p>
              </div>

              <p className="font-medium">{selectedQuestion.text}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PaperGenerationTemplate;
