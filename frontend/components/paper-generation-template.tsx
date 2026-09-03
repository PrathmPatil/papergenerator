"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";

import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import Pagination from "./pagination";

import { fetchAllQuestionsApi, fetchSelectionStatsApi, type SelectionMarksStats } from "@/utils/apis";
import { getClassNameById, getSubjectNameById } from "@/lib/data";
import {
  pruneSelectedQuestionsByTopics,
  pruneSelectedSubQuestions,
} from "@/lib/question-selection";
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

function stableStringify(value: unknown) {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.keys(v)
        .sort()
        .reduce((acc: Record<string, unknown>, key) => {
          acc[key] = (v as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return v;
  });
}

/** Cache selection-stats responses so Back after save does not refetch. */
const selectionStatsCache = new Map<string, SelectionMarksStats>();

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
  questionTopicHints = null,
  onQuestionTopicsLearned,
  onTopicOrderChange,
}: any) {
  const PAGE_SIZE = 10;
  const [subjects, setSubjects] = useState<Record<string, SubjectState>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedMap>({});
  const [selectedSubQuestions, setSelectedSubQuestions] = useState<SelectedSubQuestionMap>({});
  const [topicOrderBySubject, setTopicOrderBySubject] = useState<Record<string, string[]>>({});
  const questionTopicByIdRef = useRef<Record<string, string>>({});
  const onQuestionTopicsLearnedRef = useRef(onQuestionTopicsLearned);
  useEffect(() => {
    onQuestionTopicsLearnedRef.current = onQuestionTopicsLearned;
  }, [onQuestionTopicsLearned]);

  const [selectedQuestion, setSelectedQuestion] = useState<IQuestion | null>(null);
  const [selectedQuestionContext, setSelectedQuestionContext] = useState({ sectionId: "", subjectId: "" });
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const parentSyncRef = useRef<any>(paperGenerateFunction);
  useEffect(() => {
    parentSyncRef.current = paperGenerateFunction;
  }, [paperGenerateFunction]);

  useEffect(() => {
    if (!data?.subjectId) return;

    setSubjects((prev) => {
      const ids = String(data.subjectId)
        .split(",")
        .map((x: string) => x.trim())
        .filter(Boolean);
      const prevKey = Object.keys(prev).sort().join(",");
      const nextKey = [...ids].sort().join(",");
      if (prevKey === nextKey && ids.every((id) => !!prev[id])) {
        return prev;
      }

      const initial: Record<string, SubjectState> = {};
      ids.forEach((id: string) => {
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

  // Prevent parent→child→parent ping-pong: only hydrate when edit payload content changes.
  const selectedQuestionsEditSnapRef = useRef("");
  const selectedSubQuestionsEditSnapRef = useRef("");

  useEffect(() => {
    if (!data?.sections?.length) return;

    const base: SelectedMap = {};
    data.sections.forEach((sec: any) => {
      const sid = getSectionId(sec);
      if (!sid) return;
      base[sid] = normalizeSectionQuestions(sec);
    });

    const fromEdit = normalizeSelectedQuestionsEdit(selectedQuestionsEdit);
    const mergedRaw: SelectedMap = { ...base, ...fromEdit };
    const merged = pruneSelectedQuestionsByTopics(
      mergedRaw,
      (selectedTopics || []).map((id: string) => String(id)),
      {
        ...questionTopicByIdRef.current,
        ...((questionTopicHints && typeof questionTopicHints === "object"
          ? questionTopicHints
          : {}) as Record<string, string>),
      }
    );
    const editSnap = stableStringify(merged);
    if (editSnap === selectedQuestionsEditSnapRef.current) return;
    selectedQuestionsEditSnapRef.current = editSnap;

    setSelectedQuestions((prev) =>
      stableStringify(prev) === editSnap ? prev : merged
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.sections, selectedQuestionsEdit, selectedTopics, questionTopicHints]);

  useEffect(() => {
    const next =
      selectedSubQuestionsEdit && typeof selectedSubQuestionsEdit === "object"
        ? (selectedSubQuestionsEdit as SelectedSubQuestionMap)
        : {};
    const editSnap = stableStringify(next);
    if (editSnap === selectedSubQuestionsEditSnapRef.current) return;
    selectedSubQuestionsEditSnapRef.current = editSnap;

    setSelectedSubQuestions((prev) =>
      stableStringify(prev) === editSnap ? prev : next
    );
  }, [selectedSubQuestionsEdit]);

  const lastSentSnapRef = useRef<string>("");
  useEffect(() => {
    if (!selectedQuestions || Object.keys(selectedQuestions).length === 0) return;

    const snap = stableStringify(selectedQuestions);
    if (snap === lastSentSnapRef.current) return;

    lastSentSnapRef.current = snap;
    selectedQuestionsEditSnapRef.current = snap;
    parentSyncRef.current?.(selectedQuestions);
  }, [selectedQuestions]);

  const lastSentSubQuestionSnapRef = useRef<string>("");
  useEffect(() => {
    const snap = stableStringify(selectedSubQuestions);
    if (snap === lastSentSubQuestionSnapRef.current) return;
    lastSentSubQuestionSnapRef.current = snap;
    selectedSubQuestionsEditSnapRef.current = snap;
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

  const statsFetchGenRef = useRef<Record<string, number>>({});
  const statsAppliedKeyRef = useRef<Record<string, string>>({});

  const buildStatsCacheKey = (
    subjectId: string,
    selectedIds: string[],
    sectionId: string,
    rules: SectionRules | null
  ) =>
    stableStringify({
      subjectId,
      selectedIds: [...selectedIds].sort(),
      subQuestionSelections: selectedSubQuestions[sectionId] || {},
      topicDistributions: rules?.topicDistributions || [],
    });

  const applyStatsToSubject = (
    subjectId: string,
    stats: SelectionMarksStats | null,
    cacheKey: string,
    loading: boolean
  ) => {
    statsAppliedKeyRef.current[subjectId] = cacheKey;
    setSubjects((p) => {
      if (!p[subjectId]) return p;
      const current = p[subjectId];
      if (
        current.statsLoading === loading &&
        stableStringify(current.selectionStats) === stableStringify(stats)
      ) {
        return p;
      }
      return {
        ...p,
        [subjectId]: {
          ...current,
          selectionStats: stats,
          statsLoading: loading,
        },
      };
    });
  };

  const refreshSelectionStats = async (subjectId: string, selectedIds: string[]) => {
    const sec = data?.sections?.find((s: any) => String(s.subjectId) === String(subjectId));
    const rules = sec ? getSectionRules(sec) : null;
    const sectionId = sec ? getSectionId(sec) : "";
    const cacheKey = buildStatsCacheKey(subjectId, selectedIds, sectionId, rules);

    const cached = selectionStatsCache.get(cacheKey);
    if (cached) {
      applyStatsToSubject(subjectId, cached, cacheKey, false);
      return;
    }

    // Already applied / in-flight for this exact selection payload
    if (statsAppliedKeyRef.current[subjectId] === cacheKey) {
      return;
    }

    const fetchGen = (statsFetchGenRef.current[subjectId] || 0) + 1;
    statsFetchGenRef.current[subjectId] = fetchGen;
    statsAppliedKeyRef.current[subjectId] = cacheKey;

    setSubjects((p) => {
      if (!p[subjectId] || p[subjectId].statsLoading) return p;
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

      if (fetchGen !== statsFetchGenRef.current[subjectId]) return;

      if (res?.success && res.selectionStats) {
        selectionStatsCache.set(cacheKey, res.selectionStats);
        applyStatsToSubject(subjectId, res.selectionStats, cacheKey, false);
      } else {
        // Allow retry on failure
        if (statsAppliedKeyRef.current[subjectId] === cacheKey) {
          delete statsAppliedKeyRef.current[subjectId];
        }
        setSubjects((p) => {
          if (!p[subjectId] || !p[subjectId].statsLoading) return p;
          return {
            ...p,
            [subjectId]: { ...p[subjectId], statsLoading: false },
          };
        });
      }
    } catch (error) {
      console.error("Failed to refresh selection stats", error);
      if (fetchGen !== statsFetchGenRef.current[subjectId]) return;
      if (statsAppliedKeyRef.current[subjectId] === cacheKey) {
        delete statsAppliedKeyRef.current[subjectId];
      }
      setSubjects((p) => {
        if (!p[subjectId] || !p[subjectId].statsLoading) return p;
        return {
          ...p,
          [subjectId]: { ...p[subjectId], statsLoading: false },
        };
      });
    }
  };

  // One-shot header stats load when subjects + selection payload are ready.
  // Cache prevents refetch when returning from preview after save.
  const subjectsReadyKey = Object.keys(subjects).sort().join(",");
  const selectionStatsKey = useMemo(() => {
    if (!data?.sections?.length) return "";
    return stableStringify(
      (data.sections as any[]).map((sec) => ({
        subjectId: String(sec?.subjectId || ""),
        sectionId: getSectionId(sec),
        selected: [...(selectedQuestions[getSectionId(sec)] || [])].sort(),
        subQuestionSelections: selectedSubQuestions[getSectionId(sec)] || {},
        rules: getSectionRules(sec)?.topicDistributions || [],
      }))
    );
  }, [data?.sections, selectedQuestions, selectedSubQuestions]);

  const lastStatsKeyRef = useRef("");
  useEffect(() => {
    if (!selectionStatsKey || !subjectsReadyKey) return;
    const combinedKey = `${subjectsReadyKey}::${selectionStatsKey}`;
    if (lastStatsKeyRef.current === combinedKey) return;
    lastStatsKeyRef.current = combinedKey;

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
    const nextQuestions = Array.isArray(res?.questions) ? res.questions : [];
    rememberQuestionTopics(nextQuestions);

    setSubjects((p: Record<string, SubjectState>) => {
      const nextTotalPages = Math.max(Number(res?.totalPages || 0), 1);
      const nextPage = Math.max(Number(res?.currentPage || page), 1);

      return {
        ...p,
        [subjectId]: {
          ...p[subjectId],
          loading: false,
          questions: nextQuestions,
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

  const rememberQuestionTopics = (questions: IQuestion[] = []) => {
    const learned: Record<string, string> = {};
    questions.forEach((q) => {
      const qid = String(q?._id || "");
      const topicId = String(q?.topicId || "");
      if (qid && topicId) {
        questionTopicByIdRef.current[qid] = topicId;
        learned[qid] = topicId;
      }
    });
    if (Object.keys(learned).length > 0) {
      onQuestionTopicsLearnedRef.current?.(learned);
    }
  };

  // Seed topic map from parent (e.g. paper questionsSnapshot on edit).
  useEffect(() => {
    if (!questionTopicHints || typeof questionTopicHints !== "object") return;
    Object.entries(questionTopicHints as Record<string, string>).forEach(([qid, topicId]) => {
      const id = String(qid || "");
      const tid = String(topicId || "");
      if (id && tid) questionTopicByIdRef.current[id] = tid;
    });
  }, [questionTopicHints]);

  // Drop selections that belong to topics no longer in the edit/generate flow.
  useEffect(() => {
    const allowed = (selectedTopics || []).map((id: string) => String(id));
    const topicMap = questionTopicByIdRef.current;

    setSelectedQuestions((prev) => {
      const pruned = pruneSelectedQuestionsByTopics(prev, allowed, topicMap);
      if (pruned === prev) return prev;

      setSelectedSubQuestions((prevSubs) => pruneSelectedSubQuestions(prevSubs, pruned));

      Object.entries(subjects).forEach(([subjectId, state]) => {
        if (!state?.open) return;
        const sec = data?.sections?.find((s: any) => String(s.subjectId) === String(subjectId));
        const sectionId = getSectionId(sec);
        if (!sectionId) return;
        void refreshSelectionStats(subjectId, pruned[sectionId] || []);
      });

      return pruned;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopics, questionTopicHints]);

  const getDefaultTopicOrder = (subjectId: string) => {
    const selectedTopicSet = new Set((selectedTopics || []).map((id: string) => String(id)));
    const matched = (availableTopics as AvailableTopic[]).filter(
      (topic) =>
        String(topic.subjectId) === String(subjectId) && selectedTopicSet.has(String(topic.id))
    );
    const matchedIds = new Set(matched.map((t) => String(t.id)));

    const sec = data?.sections?.find((s: any) => String(s.subjectId) === String(subjectId));
    const distributionIds = (getSectionRules(sec)?.topicDistributions || [])
      .map((item) => String(item.topicId))
      .filter((id) => matchedIds.has(id));

    const rest = matched
      .map((t) => String(t.id))
      .filter((id) => !distributionIds.includes(id));

    return [...distributionIds, ...rest];
  };

  const getSubjectTopics = (subjectId: string): AvailableTopic[] => {
    const order =
      topicOrderBySubject[subjectId]?.length > 0
        ? topicOrderBySubject[subjectId]
        : getDefaultTopicOrder(subjectId);

    const byId = new Map(
      (availableTopics as AvailableTopic[])
        .filter((topic) => String(topic.subjectId) === String(subjectId))
        .map((topic) => [String(topic.id), topic])
    );

    return order.map((id) => byId.get(String(id))).filter(Boolean) as AvailableTopic[];
  };

  const reorderSelectedQuestionsForSubject = (subjectId: string, topicOrder: string[]) => {
    const sec = data?.sections?.find((s: any) => String(s.subjectId) === String(subjectId));
    const sectionId = getSectionId(sec);
    if (!sectionId) return;

    setSelectedQuestions((prev) => {
      const ids = prev[sectionId] || [];
      if (ids.length === 0) return prev;

      const next = orderQuestionIdsByTopic(ids, topicOrder);
      if (next.length === ids.length && next.every((id, idx) => id === ids[idx])) return prev;
      return { ...prev, [sectionId]: next };
    });
  };

  const orderQuestionIdsByTopic = (ids: string[], topicOrder: string[]) => {
    const buckets = new Map<string, string[]>(topicOrder.map((id) => [String(id), []]));
    const unknown: string[] = [];

    ids.forEach((qid) => {
      const topicId = String(questionTopicByIdRef.current[qid] || "");
      if (topicId && buckets.has(topicId)) {
        buckets.get(topicId)!.push(qid);
      } else if (!topicId) {
        // No mapping yet — keep at end. Known topics outside order are dropped (removed topics).
        unknown.push(qid);
      }
    });

    return [...topicOrder.flatMap((id) => buckets.get(String(id)) || []), ...unknown];
  };

  const moveTopic = (subjectId: string, topicId: string, delta: -1 | 1) => {
    const current =
      topicOrderBySubject[subjectId]?.length > 0
        ? [...topicOrderBySubject[subjectId]]
        : getDefaultTopicOrder(subjectId);
    const index = current.findIndex((id) => String(id) === String(topicId));
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;

    const swapped = [...current];
    [swapped[index], swapped[nextIndex]] = [swapped[nextIndex], swapped[index]];

    setTopicOrderBySubject((prev) => ({ ...prev, [subjectId]: swapped }));
    reorderSelectedQuestionsForSubject(subjectId, swapped);
    onTopicOrderChange?.(subjectId, swapped);
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

  useEffect(() => {
    const subjectIds = String(data?.subjectId || "")
      .split(",")
      .map((x: string) => x.trim())
      .filter(Boolean);

    setTopicOrderBySubject((prev) => {
      let changed = false;
      const next = { ...prev };

      subjectIds.forEach((subjectId: string) => {
        const defaults = getDefaultTopicOrder(subjectId);
        const current = prev[subjectId] || [];
        const defaultSet = new Set(defaults);
        const kept = current.filter((id) => defaultSet.has(String(id)));
        const missing = defaults.filter((id) => !kept.includes(String(id)));
        const merged = [...kept, ...missing];

        if (
          merged.length !== current.length ||
          merged.some((id, idx) => String(id) !== String(current[idx]))
        ) {
          next[subjectId] = merged;
          changed = true;
        } else if (!prev[subjectId] && merged.length > 0) {
          next[subjectId] = merged;
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    // If the active topic was removed from the flow, switch to the first remaining topic.
    setSubjects((prev) => {
      let changed = false;
      const next = { ...prev };
      subjectIds.forEach((subjectId: string) => {
        const state = prev[subjectId];
        if (!state) return;
        const allowed = new Set(getDefaultTopicOrder(subjectId));
        const active = String(state.activeTopicId || "");
        if (active && allowed.has(active)) return;
        const fallback = [...allowed][0] || "";
        if (fallback === active) return;
        next[subjectId] = { ...state, activeTopicId: fallback };
        changed = true;
        if (state.open && fallback) {
          setTimeout(() => fetchQuestions(subjectId, 1, fallback), 0);
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.subjectId, data?.sections, selectedTopics, availableTopics]);

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
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Use the arrows to set topic order. Questions are saved in this sequence.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {subjectTopics.map((topic, topicIndex) => {
                        const isActive = String(activeTopicId) === String(topic.id);
                        return (
                          <div
                            key={topic.id}
                            className={`inline-flex items-center rounded-full border text-xs transition ${
                              isActive
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted bg-muted/70 text-muted-foreground"
                            }`}
                          >
                            <button
                              type="button"
                              className="rounded-l-full px-1.5 py-1 disabled:opacity-30"
                              disabled={topicIndex === 0}
                              title="Move topic earlier"
                              onClick={() => moveTopic(subjectId, topic.id, -1)}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTopic(subjectId, topic.id)}
                              className="px-2 py-1 font-medium"
                            >
                              {formatTopicTitle(topic.name)}
                            </button>
                            <button
                              type="button"
                              className="rounded-r-full px-1.5 py-1 disabled:opacity-30"
                              disabled={topicIndex === subjectTopics.length - 1}
                              title="Move topic later"
                              onClick={() => moveTopic(subjectId, topic.id, 1)}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
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
                      {subjectTopics.map((topic) => {
                        const topicId = String(topic.id);
                        const required = stats.requiredByTopicMarks[topicId] || 0;
                        if (!required) return null;
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
                        rememberQuestionTopics(state.questions);
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

                        const topicOrder =
                          topicOrderBySubject[subjectId]?.length > 0
                            ? topicOrderBySubject[subjectId]
                            : getDefaultTopicOrder(subjectId);
                        nextIds = orderQuestionIdsByTopic(nextIds, topicOrder);
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
                          rememberQuestionTopics([q]);
                          let next =
                            val === true
                              ? exists
                                ? current
                                : [...current, q._id]
                              : current.filter((id) => id !== q._id);

                          if (val === true) {
                            const topicOrder =
                              topicOrderBySubject[subjectId]?.length > 0
                                ? topicOrderBySubject[subjectId]
                                : getDefaultTopicOrder(subjectId);
                            next = orderQuestionIdsByTopic(next, topicOrder);
                          }

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
                            setSelectedQuestionContext({ sectionId, subjectId });
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
                    <div>
                      <h3 className="text-lg font-semibold">Sub-Questions</h3>
                      <p className="text-sm text-muted-foreground">
                        Select the sub-questions to include with this paragraph.
                      </p>
                    </div>
                    {selectedQuestion.subQuestions.map((sq: any, idx: number) => {
                      const sectionId = selectedQuestionContext.sectionId;
                      const subjectId = selectedQuestionContext.subjectId;
                      const subQuestionId = getSubQuestionId(sq, idx);
                      const parentSelected = Boolean(sectionId && (selectedQuestions[sectionId] || []).includes(selectedQuestion._id));
                      const subQuestionSelected = parentSelected && getSelectedSubQuestionIds(sectionId, selectedQuestion).includes(subQuestionId);

                      return (
                      <div key={sq._id || sq.id || idx} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={subQuestionSelected}
                              disabled={!sectionId || !subjectId}
                              onCheckedChange={(value) => {
                                if (!sectionId || !subjectId) return;
                                const parentQuestionIds = selectedQuestions[sectionId] || [];
                                const currentlySelected = parentSelected
                                  ? getSelectedSubQuestionIds(sectionId, selectedQuestion)
                                  : [];
                                const nextSubQuestionIds = value === true
                                  ? Array.from(new Set([...currentlySelected, subQuestionId]))
                                  : currentlySelected.filter((id) => id !== subQuestionId);
                                const nextQuestionIds = nextSubQuestionIds.length > 0
                                  ? Array.from(new Set([...parentQuestionIds, selectedQuestion._id]))
                                  : parentQuestionIds.filter((id) => id !== selectedQuestion._id);

                                setSelectedQuestions((previous) => ({ ...previous, [sectionId]: nextQuestionIds }));
                                updateSubQuestionSelection(sectionId, selectedQuestion._id, nextSubQuestionIds);
                                void refreshSelectionStats(subjectId, nextQuestionIds);
                              }}
                              aria-label={`Select sub-question ${idx + 1}`}
                            />
                            <p className="font-medium">{idx + 1}. {sq.text || 'Untitled'}</p>
                          </div>
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
                      );
                    })}
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
