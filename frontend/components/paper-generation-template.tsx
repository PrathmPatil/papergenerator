"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import Pagination from "./pagination";

import { fetchAllQuestionsApi, fetchSelectionStatsApi, type SelectionMarksStats } from "@/utils/apis";
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
  usageCount?: number;
  lastUsedAt?: string | Date | null;
}

interface SubjectState {
  open: boolean;
  loading: boolean;
  questions: IQuestion[];
  activeTopicId: string;
  topicPages: Record<string, number>;
  topicTotalPages: Record<string, number>;
  selectionStats: SelectionMarksStats | null;
  statsLoading: boolean;
}

type SelectedMap = Record<string, string[]>;
type SelectedSubQuestionMap = Record<string, Record<string, string[]>>;

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
  selectedSubQuestionsEdit = null,
  subQuestionSelectionChange,
  selectedTopics = [],
  availableTopics = [],
}: any) {
  const PAGE_SIZE = 10;
  const [subjects, setSubjects] = useState<Record<string, SubjectState>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedMap>({});
  const [selectedSubQuestions, setSelectedSubQuestions] = useState<SelectedSubQuestionMap>({});

  const [selectedQuestion, setSelectedQuestion] = useState<IQuestion | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const parentSyncRef = useRef<any>(paperGenerateFunction);
  useEffect(() => {
    parentSyncRef.current = paperGenerateFunction;
  }, [paperGenerateFunction]);

  useEffect(() => {
    if (!data?.subjectId) return;

    setSubjects((prev) => {
      const initial: Record<string, SubjectState> = {};
      String(data.subjectId)
        .split(",")
        .map((x: string) => x.trim())
        .filter(Boolean)
        .forEach((id: string) => {
          const existing = prev[id];
          initial[id] = {
            open: existing?.open ?? false,
            loading: false,
            questions: existing?.questions ?? [],
            activeTopicId: existing?.activeTopicId ?? "",
            topicPages: existing?.topicPages ?? {},
            topicTotalPages: existing?.topicTotalPages ?? {},
            // Keep previously fetched header stats across template refreshes
            selectionStats: existing?.selectionStats ?? null,
            statsLoading: existing?.statsLoading ?? false,
          };
        });
      return initial;
    });
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

  useEffect(() => {
    const next = selectedSubQuestionsEdit && typeof selectedSubQuestionsEdit === "object"
      ? selectedSubQuestionsEdit as SelectedSubQuestionMap
      : {};
    if (JSON.stringify(selectedSubQuestions) !== JSON.stringify(next)) {
      setSelectedSubQuestions(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubQuestionsEdit]);

  const lastSentSnapRef = useRef<string>("");
  useEffect(() => {
    if (!selectedQuestions || Object.keys(selectedQuestions).length === 0) return;

    const snap = JSON.stringify(selectedQuestions);
    if (snap === lastSentSnapRef.current) return;

    lastSentSnapRef.current = snap;
    parentSyncRef.current?.(selectedQuestions);
  }, [selectedQuestions]);

  const lastSentSubQuestionSnapRef = useRef<string>("");
  useEffect(() => {
    const snap = JSON.stringify(selectedSubQuestions);
    if (snap === lastSentSubQuestionSnapRef.current) return;
    lastSentSubQuestionSnapRef.current = snap;
    subQuestionSelectionChange?.(selectedSubQuestions);
  }, [selectedSubQuestions, subQuestionSelectionChange]);

  const getSubQuestionId = (subQuestion: any, index: number) =>
    String(subQuestion?._id ?? subQuestion?.id ?? index + 1);

  const getSelectedSubQuestionIds = (sectionId: string, question: IQuestion) => {
    const allIds = (Array.isArray(question.subQuestions) ? question.subQuestions : [])
      .map(getSubQuestionId);
    const saved = selectedSubQuestions[sectionId]?.[question._id];
    return Array.isArray(saved) ? saved : allIds;
  };

  const getSelectedSubQuestionMarks = (sectionId: string, question: IQuestion) => {
    const selectedIds = new Set(getSelectedSubQuestionIds(sectionId, question));
    return (Array.isArray(question.subQuestions) ? question.subQuestions : []).reduce(
      (sum, subQuestion, index) =>
        selectedIds.has(getSubQuestionId(subQuestion, index))
          ? sum + Math.max(0, Number(subQuestion?.marks || 0))
          : sum,
      0
    );
  };

  const updateSubQuestionSelection = (sectionId: string, questionId: string, ids: string[]) => {
    setSelectedSubQuestions((previous) => ({
      ...previous,
      [sectionId]: { ...(previous[sectionId] || {}), [questionId]: ids },
    }));
  };

  const removeSubQuestionSelection = (sectionId: string, questionId: string) => {
    setSelectedSubQuestions((previous) => {
      const section = { ...(previous[sectionId] || {}) };
      delete section[questionId];
      return { ...previous, [sectionId]: section };
    });
  };

  const topicNameById = useMemo(() => {
    const map = new Map<string, string>();
    (availableTopics as AvailableTopic[]).forEach((topic) => {
      map.set(String(topic.id), formatTopicTitle(topic.name));
    });
    return map;
  }, [availableTopics]);

  const emptyStats = (section: any): SelectionMarksStats & { hasRules: boolean } => {
    const rules = getSectionRules(section);
    const requiredByTopicMarks: Record<string, number> = {};
    (rules?.topicDistributions || []).forEach((item) => {
      requiredByTopicMarks[String(item.topicId)] = Math.max(0, Number(item.marks || 0));
    });
    const totalRequiredMarks = Object.values(requiredByTopicMarks).reduce((sum, n) => sum + n, 0);
    return {
      totalSelectedMarks: 0,
      totalRequiredMarks,
      selectedByTopicMarks: {},
      requiredByTopicMarks,
      remainingMarks: totalRequiredMarks,
      isComplete: false,
      hasRules: Boolean(rules),
    };
  };

  const getSectionSelectionStats = (section: any, subjectId: string) => {
    const rules = getSectionRules(section);
    const backendStats = subjects[subjectId]?.selectionStats;
    if (!rules) {
      return { ...emptyStats(section), hasRules: false };
    }

    if (backendStats) {
      return {
        totalSelectedMarks: Number(backendStats.totalSelectedMarks || 0),
        totalRequiredMarks: Number(backendStats.totalRequiredMarks || 0),
        selectedByTopicMarks: backendStats.selectedByTopicMarks || {},
        requiredByTopicMarks: backendStats.requiredByTopicMarks || {},
        remainingMarks: Number(
          backendStats.remainingMarks ??
            Number(backendStats.totalRequiredMarks || 0) - Number(backendStats.totalSelectedMarks || 0)
        ),
        isComplete: Boolean(backendStats.isComplete),
        hasRules: true,
      };
    }

    return { ...emptyStats(section), hasRules: true };
  };

  const refreshSelectionStats = async (subjectId: string, selectedIds: string[]) => {
    const sec = data?.sections?.find((s: any) => String(s.subjectId) === String(subjectId));
    const rules = sec ? getSectionRules(sec) : null;
    const sectionId = sec ? getSectionId(sec) : "";

    setSubjects((p) => {
      if (!p[subjectId]) return p;
      return {
        ...p,
        [subjectId]: { ...p[subjectId], statsLoading: true },
      };
    });

    try {
      const res = await fetchSelectionStatsApi({
        selectedQuestions: selectedIds,
        subQuestionSelections: Object.entries(selectedSubQuestions[sectionId] || {}).map(
          ([questionId, subQuestionIds]) => ({ questionId, subQuestionIds })
        ),
        topicDistributions: rules?.topicDistributions || [],
      });

      if (res?.success && res.selectionStats) {
        setSubjects((p) => {
          if (!p[subjectId]) return p;
          return {
            ...p,
            [subjectId]: {
              ...p[subjectId],
              selectionStats: res.selectionStats,
              statsLoading: false,
            },
          };
        });
      } else {
        setSubjects((p) => {
          if (!p[subjectId]) return p;
          return {
            ...p,
            [subjectId]: { ...p[subjectId], statsLoading: false },
          };
        });
      }
    } catch (error) {
      console.error("Failed to refresh selection stats", error);
      setSubjects((p) => {
        if (!p[subjectId]) return p;
        return {
          ...p,
          [subjectId]: { ...p[subjectId], statsLoading: false },
        };
      });
    }
  };

  // Load selected/target marks for collapsed headers (do not wait for accordion open)
  const subjectsReadyKey = Object.keys(subjects).sort().join(",");
  const selectionStatsKey = useMemo(() => {
    if (!data?.sections?.length) return "";
    return JSON.stringify(
      (data.sections as any[]).map((sec) => ({
        subjectId: String(sec?.subjectId || ""),
        sectionId: getSectionId(sec),
        selected: selectedQuestions[getSectionId(sec)] || [],
        subQuestionSelections: selectedSubQuestions[getSectionId(sec)] || {},
        rules: getSectionRules(sec)?.topicDistributions || [],
      }))
    );
  }, [data?.sections, selectedQuestions, selectedSubQuestions]);

  useEffect(() => {
    if (!selectionStatsKey || !subjectsReadyKey) return;

    const subjectIds = String(data?.subjectId || "")
      .split(",")
      .map((x: string) => x.trim())
      .filter(Boolean);

    subjectIds.forEach((subjectId) => {
      if (!subjects[subjectId]) return;

      const sec = data?.sections?.find(
        (s: any) => String(s.subjectId) === String(subjectId)
      );
      if (!sec || !getSectionRules(sec)) return;

      const sectionId = getSectionId(sec);
      const selectedIds = sectionId ? selectedQuestions[sectionId] || [] : [];
      void refreshSelectionStats(subjectId, selectedIds);
    });
    // refreshSelectionStats closes over latest data/selectedQuestions; key deps gate re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionStatsKey, subjectsReadyKey]);

  const getSelectConstraint = (q: IQuestion, section: any, subjectId: string) => {
    const stats = getSectionSelectionStats(section, subjectId);
    if (!stats.hasRules) {
      return { allowed: true, reason: "" };
    }

    const topicId = String(q.topicId || "");
    const requiredForTopicMarks = stats.requiredByTopicMarks[topicId] || 0;
    if (!requiredForTopicMarks) {
      return { allowed: false, reason: "Topic not in distribution" };
    }

    const selectedForTopicMarks = stats.selectedByTopicMarks[topicId] || 0;
    const questionMarks = Math.max(0, Number(q.marks ?? 0));

    // A passage can be included with only the sub-questions needed to satisfy
    // the section quota. The exact selected marks are checked server-side once
    // its sub-questions are chosen.
    const minimumSelectableMarks = Array.isArray(q.subQuestions) && q.subQuestions.length > 0
      ? Math.min(...q.subQuestions.map((subQuestion: any) => Math.max(0, Number(subQuestion?.marks || 0))))
      : questionMarks;

    if (selectedForTopicMarks + minimumSelectableMarks > requiredForTopicMarks) {
      return {
        allowed: false,
        reason: `${topicNameById.get(topicId) || "Topic"} marks quota filled`,
      };
    }

    if (stats.totalSelectedMarks + minimumSelectableMarks > stats.totalRequiredMarks) {
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
    const rules = sec ? getSectionRules(sec) : null;
    const selectedForThisSection = sectionId ? selectedQuestions[sectionId] || [] : [];

    const payload: any = {
      classId: data.classId,
      subjectId,
      page,
      limit: PAGE_SIZE,
      type: data.type,
      difficulty: data.difficulty,
      selectedQuestions: selectedForThisSection,
      subQuestionSelections: Object.entries(selectedSubQuestions[sectionId] || {}).map(
        ([questionId, subQuestionIds]) => ({ questionId, subQuestionIds })
      ),
      topicDistributions: rules?.topicDistributions || [],
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
          selectionStats: res?.selectionStats || p[subjectId].selectionStats,
          statsLoading: false,
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
        const stats = sec ? getSectionSelectionStats(sec, subjectId) : null;

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
                    Questions selected:{" "}
                    <span className="font-medium text-foreground">{stats.totalSelectedMarks}</span> marks
                    {" · "}
                    Target for this section:{" "}
                    <span className="font-medium text-foreground">{stats.totalRequiredMarks}</span> marks
                    {state.statsLoading
                      ? " · Updating…"
                      : stats.totalSelectedMarks < stats.totalRequiredMarks
                        ? ` · Still need ${stats.totalRequiredMarks - stats.totalSelectedMarks}`
                        : stats.totalSelectedMarks === stats.totalRequiredMarks
                          ? " · Complete"
                          : ` · Over by ${stats.totalSelectedMarks - stats.totalRequiredMarks}`}
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
                            {topicNameById.get(topicId) || "Topic"}: selected {selected} / target {required}
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Selected marks are calculated on the server from all checked questions (same on every page).
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-2">
                  <Checkbox
                    checked={
                      !!sectionId && state.questions.length > 0 &&
                      state.questions.every((qq) => (selectedQuestions[sectionId] || []).includes(qq._id))
                    }
                    onCheckedChange={() => {
                      if (!sectionId) return;

                      const current = selectedQuestions[sectionId] || [];
                      const allVisibleSelected =
                        state.questions.length > 0 &&
                        state.questions.every((qq) => current.includes(qq._id));

                      let nextIds: string[] = current;

                      if (allVisibleSelected) {
                        nextIds = current.filter((id) => !state.questions.some((qq) => qq._id === id));
                      } else {
                        const rules = getSectionRules(sec);
                        if (!rules) {
                          const set = new Set(current);
                          state.questions.forEach((qq) => qq._id && set.add(qq._id));
                          nextIds = Array.from(set);
                        } else {
                          const stats = getSectionSelectionStats(sec, subjectId);
                          const selectedByTopicMarks = { ...(stats.selectedByTopicMarks || {}) };
                          let totalSelectedMarks = Number(stats.totalSelectedMarks || 0);
                          const totalRequiredMarks = Number(stats.totalRequiredMarks || 0);
                          const snapshot = [...current];

                          for (const qq of state.questions) {
                            if (!qq._id) continue;
                            if (snapshot.includes(qq._id)) continue;

                            const topicId = String(qq.topicId || "");
                            const qMarks = Math.max(0, Number(qq.marks ?? 0));
                            const requiredForTopic = stats.requiredByTopicMarks[topicId] || 0;
                            if (!requiredForTopic) continue;

                            const alreadyForTopic = selectedByTopicMarks[topicId] || 0;
                            if (alreadyForTopic + qMarks > requiredForTopic) continue;
                            if (totalSelectedMarks + qMarks > totalRequiredMarks) continue;

                            snapshot.push(qq._id);
                            selectedByTopicMarks[topicId] = alreadyForTopic + qMarks;
                            totalSelectedMarks += qMarks;
                          }

                          nextIds = snapshot;
                        }
                      }

                          setSelectedQuestions((prev) => ({ ...prev, [sectionId]: nextIds }));
                          if (allVisibleSelected) {
                            setSelectedSubQuestions((previous) => {
                              const sectionSelections = { ...(previous[sectionId] || {}) };
                              state.questions.forEach((question) => delete sectionSelections[question._id]);
                              return { ...previous, [sectionId]: sectionSelections };
                            });
                          } else {
                            setSelectedSubQuestions((previous) => {
                              const sectionSelections = { ...(previous[sectionId] || {}) };
                              state.questions.forEach((question) => {
                                if (!nextIds.includes(question._id) || !Array.isArray(question.subQuestions) || question.subQuestions.length === 0) return;
                                if (!sectionSelections[question._id]) {
                                  sectionSelections[question._id] = question.subQuestions.map(getSubQuestionId);
                                }
                              });
                              return { ...previous, [sectionId]: sectionSelections };
                            });
                          }
                          void refreshSelectionStats(subjectId, nextIds);
                    }}
                    aria-label="Select all questions in current page"
                  />
                  <span className="text-sm text-muted-foreground">Select all visible</span>
                </div>

                {state.questions.map((q) => {
                  const checked =
                    !!sectionId && (selectedQuestions[sectionId] || []).includes(q._id);
                  const constraint = sec
                    ? getSelectConstraint(q, sec, subjectId)
                    : { allowed: true, reason: "" };
                  const disabled = !checked && !constraint.allowed;

                  return (
                    <div key={q._id} className="flex flex-col gap-3 border p-3 rounded">
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(val) => {
                          if (!sectionId) return;

                          if (val === true && !constraint.allowed) {
                            return;
                          }

                          const current = selectedQuestions[sectionId] || [];
                          const exists = current.includes(q._id);
                          const next =
                            val === true
                              ? exists
                                ? current
                                : [...current, q._id]
                              : current.filter((id) => id !== q._id);

                          setSelectedQuestions((prev) => ({ ...prev, [sectionId]: next }));
                          if (val === true && Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                            updateSubQuestionSelection(sectionId, q._id, q.subQuestions.map(getSubQuestionId));
                          } else if (val !== true) {
                            removeSubQuestionSelection(sectionId, q._id);
                          }
                          void refreshSelectionStats(subjectId, next);
                        }}
                      />

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium line-clamp-2">{q.text || q.paragraph}</p>
                          <div className="flex items-center gap-2">
                            {Array.isArray(q.subQuestions) && q.subQuestions.length > 0 && (
                              <button
                                type="button"
                                className="text-sm text-muted-foreground"
                                onClick={() =>
                                  setExpandedQuestions((prev) => ({ ...prev, [String(q._id)]: !prev[String(q._id)] }))
                                }
                              >
                                {expandedQuestions[String(q._id)] ? "Hide sub-questions" : `Show ${q.subQuestions.length} sub-questions`}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline">{q.type}</Badge>
                          <Badge>{q.difficulty}</Badge>
                          <Badge variant="secondary">Marks: {q.marks ?? 1}</Badge>
                          <Badge variant={Number(q.usageCount || 0) > 0 ? "destructive" : "outline"}>
                            {Number(q.usageCount || 0) > 0
                              ? `Used ${Number(q.usageCount || 0)}x`
                              : "Unused"}
                          </Badge>
                          <Badge variant="outline">
                            {topicNameById.get(q.topicId) || "Topic"}
                          </Badge>
                        </div>
                        {disabled && constraint.reason && (
                          <p className="text-xs text-amber-600 mt-2">{constraint.reason}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
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

                      {/* Inline expanded sub-questions */}
                      {expandedQuestions[String(q._id)] && Array.isArray(q.subQuestions) && q.subQuestions.length > 0 && (
                        <div className="mt-3 space-y-1 border-t pt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                            <div>
                              <p className="text-sm font-medium">Choose questions from this passage</p>
                              <p className="text-xs text-muted-foreground">
                                {getSelectedSubQuestionIds(sectionId, q).length} of {q.subQuestions.length} selected · {getSelectedSubQuestionMarks(sectionId, q)} marks
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={!checked}
                              onClick={() => {
                                const selectedIds = getSelectedSubQuestionIds(sectionId, q);
                                const allIds = q.subQuestions!.map(getSubQuestionId);
                                const next = selectedIds.length === allIds.length ? [] : allIds;
                                updateSubQuestionSelection(sectionId, q._id, next);
                                if (next.length === 0) {
                                  const nextQuestionIds = (selectedQuestions[sectionId] || []).filter((id) => id !== q._id);
                                  setSelectedQuestions((previous) => ({ ...previous, [sectionId]: nextQuestionIds }));
                                  void refreshSelectionStats(subjectId, nextQuestionIds);
                                }
                              }}
                            >
                              {getSelectedSubQuestionIds(sectionId, q).length === q.subQuestions.length ? "Clear all" : "Select all"}
                            </Button>
                          </div>
                          {!checked && (
                            <p className="text-xs text-muted-foreground">Select the paragraph question first, then choose its sub-questions.</p>
                          )}
                          {q.subQuestions.map((sq: any, idx: number) => {
                            const subQuestionId = getSubQuestionId(sq, idx);
                            const subQuestionChecked = getSelectedSubQuestionIds(sectionId, q).includes(subQuestionId);
                            return (
                            <label key={sq._id || sq.id || idx} className={`block py-2 transition ${checked ? "cursor-pointer hover:bg-muted/20" : "opacity-60"}`}>
                              <div className="flex items-start gap-2.5">
                                <Checkbox
                                  checked={subQuestionChecked}
                                  disabled={!checked}
                                  onCheckedChange={(value) => {
                                    const current = getSelectedSubQuestionIds(sectionId, q);
                                    const next = value === true
                                      ? Array.from(new Set([...current, subQuestionId]))
                                      : current.filter((id) => id !== subQuestionId);
                                    updateSubQuestionSelection(sectionId, q._id, next);
                                    if (next.length === 0) {
                                      const nextQuestionIds = (selectedQuestions[sectionId] || []).filter((id) => id !== q._id);
                                      setSelectedQuestions((previous) => ({ ...previous, [sectionId]: nextQuestionIds }));
                                      void refreshSelectionStats(subjectId, nextQuestionIds);
                                    }
                                  }}
                                  aria-label={`Select sub-question ${idx + 1}`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium">{idx + 1}. {sq.text || "Untitled"}</p>
                                    <span className="shrink-0 text-xs text-muted-foreground">{String(sq.type || "").replace("_", " ")} · {sq.marks ?? 0} marks</span>
                                  </div>

                              {(Array.isArray(sq.media) && sq.media.length > 0) || sq.mediaUrl ? (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {(Array.isArray(sq.media) ? sq.media : sq.mediaUrl ? [{ url: sq.mediaUrl, alt: sq.mediaAlt || "" }] : []).map((m: any, mi: number) => (
                                    <img key={mi} src={m?.url} alt={m?.alt} className="max-h-28 rounded border" />
                                  ))}
                                </div>
                              ) : null}

                              {(Array.isArray(sq.options) && sq.options.length > 0) && (
                                <ul className="mt-2 space-y-1">
                                  {sq.options.map((opt: any, oi: number) => (
                                    <li key={oi} className="flex items-center gap-2">
                                      <input type="radio" disabled checked={opt.isCorrect} />
                                      {opt.mediaUrl ? <img src={opt.mediaUrl} className="max-h-16" /> : <span>{opt.text}</span>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                                </div>
                              </div>
                            </label>
                          )})}
                        </div>
                      )}
                    </div>
                  );
                })}

                {state.loading && (
                  <p className="text-center text-sm text-muted-foreground">
                    Loading questions...
                  </p>
                )}

                {!state.loading && totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => goToTopicPage(subjectId, page)}
                    pageSizeLabel="10 per page"
                  />
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

              <div className="space-y-3">
                {selectedQuestion.text && (
                  <p className="font-medium">
                    <b>Instruction:</b> {selectedQuestion.text}
                  </p>
                )}

                {selectedQuestion.paragraph && (
                  <div className="rounded bg-muted/10 p-3">
                    <strong>Paragraph:</strong>
                    <div className="mt-2 whitespace-pre-wrap">{selectedQuestion.paragraph}</div>
                  </div>
                )}

                {Array.isArray(selectedQuestion.media) && selectedQuestion.media.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {selectedQuestion.media.map((img: any, i: number) => (
                      <img
                        key={i}
                        src={img?.url}
                        alt={img?.alt}
                        className="max-h-40 rounded border"
                      />
                    ))}
                  </div>
                )}

                {Array.isArray(selectedQuestion.subQuestions) && selectedQuestion.subQuestions.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-lg font-semibold">Sub-Questions</h3>
                    {selectedQuestion.subQuestions.map((sq: any, idx: number) => (
                      <div key={sq._id || sq.id || idx} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <p className="font-medium">{idx + 1}. {sq.text || 'Untitled'}</p>
                          <span className="text-xs text-muted-foreground capitalize">{String(sq.type || '').replace('_', ' ')} | Marks: {sq.marks}</span>
                        </div>

                        {Array.isArray(sq.options) && sq.options.length > 0 && (
                          <ul className="space-y-2">
                            {sq.options.map((opt: any, optIndex: number) => (
                              <li key={opt._id || opt.id || optIndex} className="flex items-center gap-3">
                                <input type="radio" disabled checked={opt.isCorrect} />
                                {opt.mediaUrl ? (
                                  <img src={opt.mediaUrl} alt="Option" className="max-h-20 rounded border" />
                                ) : (
                                  <span>{opt.text}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PaperGenerationTemplate;
