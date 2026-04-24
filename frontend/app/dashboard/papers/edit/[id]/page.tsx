"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Save, Printer, RefreshCw, Wand2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn, formatTopicTitle, mapPaperToPreviewConfig } from "@/lib/utils";
import { CLASSES, SUBJECTS } from "@/lib/data";
import { MultiSelect } from "@/components/ui/multi-select";
import { PaperPreview, printPaper } from "@/components/paper-preview";
import PaperGenerationTemplate from "@/components/paper-generation-template";
import {
  getEditPaperApi,
  fetchTopicsApi,
  createTopicApi,
  generatePaperApiManual,
  createPaperTemplateApi,
} from "@/utils/apis";
import type { ClassLevel, Sections, Topic } from "@/lib/types";

const STEPS = [
  { id: 1, title: "Basic Details" },
  { id: 2, title: "Topic Selection" },
  { id: 3, title: "Configuration" },
  { id: 4, title: "Select Questions" },
  { id: 5, title: "Preview & Export" },
];

interface EditPaperTemplateSection {
  id: string;
  name: string;
  subjectId: string;
  marks: number;
  rules?: {
    marksPerQuestion: number;
    topicDistributions: { topicId: string; marks: number }[];
  };
}

interface Option {
  id: string;
  text?: string;
  mediaUrl?: string;
}

interface QuestionSnapshot {
  questionId: string;
  type: string;
  text: string;
  media?: { url: string }[];
  options?: Option[];
  marks: number;
  negativeMarks: number;
}

interface Section {
  id: string;
  name: string;
  marks: number;
  questions: string[];
  subjectId?: string;
}

interface Paper {
  _id: string;
  title: string;
  classId: string;
  totalMarks: number;
  durationMinutes: number;
  sections: Section[];
  questionsSnapshot: QuestionSnapshot[];
  createdAt: string;
  templateId?: string;
}

export default function EditPaperPage() {
  const router = useRouter();
  const params = useParams();
  const paperId = params?.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [template, setTemplate] = useState<any>(null);
  const [previewConfig, setPreviewConfig] = useState<any>(null);

  const [paperTitle, setPaperTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassLevel | "">("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>({});
  const [topicLoading, setTopicLoading] = useState(false);
  const [activeTopicSubject, setActiveTopicSubject] = useState<string>("");

  const [totalMarks, setTotalMarks] = useState(0);
  const [duration, setDuration] = useState(0);
  const [difficultyMix, setDifficultyMix] = useState({
    easy: true,
    medium: true,
    hard: true,
  });
  const [questionTypes, setQuestionTypes] = useState({
    mcq_text: true,
    mcq_image: true,
    true_false: true,
    short_answer: true,
    paragraph: true,
    long_answer: true,
  });

  const [sections, setSections] = useState<Sections[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, string[]>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const toSafeInt = (value: unknown, fallback = 0) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.floor(num);
  };

  const filteredSubjects = useMemo(
    () =>
      SUBJECTS.filter((s) =>
        !selectedClass
          ? true
          : s.classLevels.some((level) => level.trim() === selectedClass.trim())
      ),
    [selectedClass]
  );

  const activeSubject = selectedSubjects.includes(activeTopicSubject)
    ? activeTopicSubject
    : selectedSubjects[0] || "";

  const topicsForActiveSubject = availableTopics.filter((t) => t.subjectId === activeSubject);
  const activeSubjectName = SUBJECTS.find((s) => s.id === activeSubject)?.name || "subject";

  const getSectionRules = (subjectId: string) => {
    const section = sections.find((s: any) => String(s.subjectId) === String(subjectId)) as any;
    return {
      marksPerQuestion: Math.max(1, Number(section?.rules?.marksPerQuestion || 1)),
      topicDistributions: Array.isArray(section?.rules?.topicDistributions)
        ? section.rules.topicDistributions
        : [],
    };
  };

  const getSelectedTopicsForSubject = (subjectId: string) =>
    availableTopics.filter((topic) => topic.subjectId === subjectId && selectedTopics.includes(topic.id));

  const getSubjectMarks = (subjectId: string) =>
    sections.find((s) => s.subjectId === subjectId)?.marks || 0;

  const totalAllocated = selectedSubjects.reduce((sum, id) => sum + getSubjectMarks(id), 0);
  const remainingMarks = totalMarks - totalAllocated;

  const updateSubjectMarks = (subject: { id: string; name: string }, value: number) => {
    setSections((prev) => {
      const usedMarks = prev.filter((s) => s.subjectId !== subject.id).reduce((sum, s) => sum + s.marks, 0);
      const remaining = Math.max(0, toSafeInt(totalMarks, 0) - Math.max(0, toSafeInt(usedMarks, 0)));
      const finalMarks = Math.max(0, Math.min(toSafeInt(value, 0), remaining));

      const current = prev.find((s) => s.subjectId === subject.id) as any;
      const currentRules = current?.rules || {
        marksPerQuestion: 1,
        topicDistributions: getSelectedTopicsForSubject(subject.id).map((topic) => ({ topicId: topic.id, marks: 0 })),
      };

      const normalizedDistributions = (Array.isArray(currentRules.topicDistributions)
        ? currentRules.topicDistributions
        : getSelectedTopicsForSubject(subject.id).map((topic) => ({ topicId: topic.id, marks: 0 }))
      ).map((rule: any) => ({
        topicId: rule.topicId,
        marks: Math.max(0, toSafeInt(rule.marks, 0)),
      }));

      let allocated = normalizedDistributions.reduce((sum: number, item: any) => sum + Number(item.marks || 0), 0);
      if (allocated > finalMarks) {
        for (let i = normalizedDistributions.length - 1; i >= 0 && allocated > finalMarks; i -= 1) {
          const overshoot = allocated - finalMarks;
          const currentMarks = Number(normalizedDistributions[i].marks || 0);
          const nextVal = Math.max(0, currentMarks - overshoot);
          allocated -= currentMarks - nextVal;
          normalizedDistributions[i] = { ...normalizedDistributions[i], marks: nextVal };
        }
      }

      const nextSection = {
        id: current?.id || `sec_${subject.id}`,
        name: subject.name,
        subjectId: subject.id,
        marks: finalMarks,
        rules: {
          marksPerQuestion: Math.max(1, toSafeInt(currentRules.marksPerQuestion, 1)),
          topicDistributions: normalizedDistributions,
        },
      };

      const exists = prev.some((s) => s.subjectId === subject.id);
      const next = exists
        ? prev.map((s) => (s.subjectId === subject.id ? (nextSection as any) : s))
        : [...prev, nextSection as any];

      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  };

  const upsertSectionRules = (
    subjectId: string,
    updater: (rules: { marksPerQuestion: number; topicDistributions: { topicId: string; marks: number }[] }) => {
      marksPerQuestion: number;
      topicDistributions: { topicId: string; marks: number }[];
    }
  ) => {
    setSections((prev) =>
      prev.map((section: any) => {
        if (String(section.subjectId) !== String(subjectId)) return section;
        const currentRules = {
          marksPerQuestion: Math.max(1, Number(section.rules?.marksPerQuestion || 1)),
          topicDistributions: Array.isArray(section.rules?.topicDistributions)
            ? section.rules.topicDistributions
            : [],
        };
        const nextRules = updater(currentRules);
        return {
          ...section,
          rules: {
            marksPerQuestion: Math.max(1, Number(nextRules.marksPerQuestion || 1)),
            topicDistributions: nextRules.topicDistributions.map((rule) => ({
              topicId: rule.topicId,
              marks: Math.max(0, Number(rule.marks || 0)),
            })),
          },
        };
      })
    );
  };

  const updateTopicMarks = (subjectId: string, topicId: string, marks: number) => {
    const safeRequestedMarks = Math.max(0, toSafeInt(marks, 0));

    setSections((prev) =>
      prev.map((section: any) => {
        if (String(section.subjectId) !== String(subjectId)) return section;

        const distributions = Array.isArray(section.rules?.topicDistributions)
          ? section.rules.topicDistributions
          : [];

        const allocatedWithoutCurrent = distributions
          .filter((rule: any) => String(rule.topicId) !== String(topicId))
          .reduce((sum: number, rule: any) => sum + Math.max(0, toSafeInt(rule.marks, 0)), 0);

        const maxAllowedForTopic = Math.max(0, toSafeInt(section.marks, 0) - allocatedWithoutCurrent);
        const finalMarks = Math.min(safeRequestedMarks, maxAllowedForTopic);

        return {
          ...section,
          rules: {
            marksPerQuestion: Math.max(1, toSafeInt(section.rules?.marksPerQuestion, 1)),
            topicDistributions: distributions.map((rule: any) =>
              String(rule.topicId) === String(topicId)
                ? { ...rule, marks: finalMarks }
                : { ...rule, marks: Math.max(0, toSafeInt(rule.marks, 0)) }
            ),
          },
        };
      })
    );
  };

  const validateDistributionBeforeNext = () => {
    for (const subjectId of selectedSubjects) {
      const subject = SUBJECTS.find((s) => s.id === subjectId);
      const section = sections.find((s) => s.subjectId === subjectId) as any;
      const rules = getSectionRules(subjectId);

      if (!subject || !section) {
        return `Please set marks for ${subject?.name || "a subject"}.`;
      }

      const subjectTopics = getSelectedTopicsForSubject(subjectId);
      if (subjectTopics.length === 0) {
        return `Please select at least one topic for ${subject.name}.`;
      }

      const topicMarksSum = (rules.topicDistributions || []).reduce(
        (sum: number, item: any) => sum + Number(item.marks || 0),
        0
      );

      if (topicMarksSum !== Number(section.marks || 0)) {
        return `Topic marks for ${subject.name} must equal subject marks (${section.marks}).`;
      }

      for (const rule of rules.topicDistributions || []) {
        if (rule.marks <= 0) {
          const topicName = availableTopics.find((t) => t.id === rule.topicId)?.name || "topic";
          return `Please assign marks for ${topicName} in ${subject.name}.`;
        }
      }
    }

    return "";
  };

  const handleNext = async () => {
    if (currentStep === 3) {
      const validationError = validateDistributionBeforeNext();
      if (validationError) {
        alert(validationError);
        return;
      }

      const payload = {
        title: paperTitle,
        totalMarks: Number(totalMarks),
        durationMinutes: Number(duration),
        sections: sections.map((s: any) => ({
          id: s.id,
          name: s.name,
          subjectId: s.subjectId,
          marks: s.marks,
          rules: {
            marksPerQuestion: Math.max(1, Number(s.rules?.marksPerQuestion || 1)),
            topicDistributions: (s.rules?.topicDistributions || []).map((rule: any) => ({
              topicId: rule.topicId,
              marks: Number(rule.marks || 0),
            })),
          },
        })),
        classId: selectedClass || "",
        subjectId: selectedSubjects.join(","),
        topicId: selectedTopics.join(","),
        difficulty: Object.keys(difficultyMix).filter((k) => difficultyMix[k as keyof typeof difficultyMix]).join(","),
        type: Object.keys(questionTypes).filter((k) => questionTypes[k as keyof typeof questionTypes]).join(","),
      };

      const res: any = await createPaperTemplateApi(payload);

      if (res?.success) {
        setTemplate({ ...payload, ...res.template });
        setCurrentStep(4);
        return;
      }

      alert(res?.error || "Failed to save configuration");
      return;
    }

    if (currentStep === 4) {
      handleSave();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) => (prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]));
  };

  useEffect(() => {
    if (!paperId) return;

    const fetchPaper = async () => {
      try {
        const res: any = await getEditPaperApi(paperId);
        if (!res?.success || !res?.data?.paper) {
          throw new Error(res?.message || "Paper not found");
        }

        const currentPaper: Paper = res.data.paper;
        const currentTemplate = res.data.template;
        const currentSections = Array.isArray(res.data.sections) ? res.data.sections : [];

        setPaper(currentPaper);
        setPaperTitle(currentPaper.title);
        setSelectedClass(currentPaper.classId as ClassLevel);
        setTotalMarks(currentPaper.totalMarks);
        setDuration(currentPaper.durationMinutes);
        setSections(currentSections);
        setSelectedSubjects(
          Array.from(
            new Set(
              currentSections
                .map((s: any) => String(s.subjectId || ""))
                .filter(Boolean)
            )
          )
        );
        setSelectedTopics(
          Array.from(
            new Set(
              (currentTemplate?.sections || []).flatMap((section: any) =>
                Array.isArray(section?.rules?.topicDistributions)
                  ? section.rules.topicDistributions.map((rule: any) => String(rule.topicId))
                  : []
              )
            )
          )
        );
        setTemplate(currentTemplate);
        setSelectedQuestions(
          currentSections.reduce((acc: Record<string, string[]>, section: any) => {
            acc[String(section.id)] = Array.isArray(section.questions)
              ? section.questions.map((q: any) => String(q))
              : [];
            return acc;
          }, {})
        );

        if (currentTemplate?.difficulty) {
          const diff = String(currentTemplate.difficulty).split(",");
          setDifficultyMix({
            easy: diff.includes("easy"),
            medium: diff.includes("medium"),
            hard: diff.includes("hard"),
          });
        }

        if (currentTemplate?.type) {
          const types = String(currentTemplate.type).split(",");
          setQuestionTypes({
            mcq_text: types.includes("mcq_text"),
            mcq_image: types.includes("mcq_image"),
            true_false: types.includes("true_false"),
            short_answer: types.includes("short_answer"),
            paragraph: types.includes("paragraph"),
            long_answer: types.includes("long_answer"),
          });
        }

        setCurrentStep(1);
      } catch (error) {
        console.error(error);
        alert("Failed to load paper for editing");
      } finally {
        setLoading(false);
      }
    };

    fetchPaper();
  }, [paperId]);

  useEffect(() => {
    if (selectedSubjects.length === 0) {
      setActiveTopicSubject("");
      setAvailableTopics([]);
      return;
    }

    if (!selectedSubjects.includes(activeTopicSubject)) {
      setActiveTopicSubject(selectedSubjects[0]);
    }
  }, [activeTopicSubject, selectedSubjects]);

  useEffect(() => {
    const loadTopics = async () => {
      if (!selectedClass || selectedSubjects.length === 0) return;
      setTopicLoading(true);
      try {
        const resultTopics: Topic[] = [];
        await Promise.all(
          selectedSubjects.map(async (subjectId) => {
            const res: any = await fetchTopicsApi({ classId: selectedClass, subjectId });
            if (res?.topics) {
              resultTopics.push(
                ...res.topics.map((topic: any) => ({
                  id: topic._id || topic.id,
                  subjectId: topic.subjectId,
                  name: topic.name,
                }))
              );
            }
          })
        );

        setAvailableTopics((prev) => {
          const keep = prev.filter((topic) => selectedSubjects.includes(topic.subjectId));
          const merged = [...keep, ...resultTopics];
          const next = Array.from(new Map(merged.map((topic) => [topic.id, topic])).values());
          return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
        });
      } catch (error) {
        console.error("Failed to load topics", error);
      } finally {
        setTopicLoading(false);
      }
    };

    loadTopics();
  }, [selectedClass, selectedSubjects]);

  useEffect(() => {
    setSelectedTopics((prevTopics) => {
      const nextTopics = prevTopics.filter((topicId) => {
        const topic = availableTopics.find((t) => t.id === topicId);
        if (!topic) {
          return true;
        }

        return selectedSubjects.includes(topic.subjectId);
      });

      return JSON.stringify(nextTopics) === JSON.stringify(prevTopics) ? prevTopics : nextTopics;
    });

    setSections((prevSections) => {
      const nextSections = prevSections
        .filter((section) => selectedSubjects.includes(section.subjectId || ""))
        .map((section: any) => {
          const subjectTopicIds = getSelectedTopicsForSubject(section.subjectId).map((topic) => topic.id);
          const existingRules = Array.isArray(section.rules?.topicDistributions) ? section.rules.topicDistributions : [];
          const distributions = subjectTopicIds.map((topicId) => {
            const existing = existingRules.find((item: any) => item.topicId === topicId);
            return { topicId, marks: Number(existing?.marks || 0) };
          });

          let allocated = distributions.reduce((sum, item) => sum + Number(item.marks || 0), 0);
          if (allocated > section.marks) {
            for (let i = distributions.length - 1; i >= 0 && allocated > section.marks; i -= 1) {
              const overshoot = allocated - section.marks;
              const nextVal = Math.max(0, Number(distributions[i].marks || 0) - overshoot);
              allocated -= Number(distributions[i].marks || 0) - nextVal;
              distributions[i] = { ...distributions[i], marks: nextVal };
            }
          }

          return {
            ...section,
            rules: {
              marksPerQuestion: Math.max(1, Number(section.rules?.marksPerQuestion || 1)),
              topicDistributions: distributions,
            },
          };
        });

      return JSON.stringify(nextSections) === JSON.stringify(prevSections) ? prevSections : nextSections;
    });
  }, [selectedSubjects, availableTopics, selectedTopics]);

  const handleAddTopic = async () => {
    if (!activeSubject || !selectedClass) return;
    const inputValue = topicInputs[activeSubject]?.trim() || "";
    if (!inputValue) return;

    setTopicLoading(true);
    try {
      const res: any = await createTopicApi({
        name: inputValue,
        classId: selectedClass,
        subjectId: activeSubject,
      });

      if (!res?.topic) {
        throw new Error(res?.message || "Failed to create topic");
      }

      const topic: Topic = {
        id: res.topic._id || res.topic.id,
        subjectId: res.topic.subjectId,
        name: res.topic.name,
      };

      setAvailableTopics((prev) => {
        const merged = [...prev.filter((t) => t.id !== topic.id), topic];
        return Array.from(new Map(merged.map((item) => [item.id, item])).values());
      });

      setSelectedTopics((prev) => (prev.includes(topic.id) ? prev : [...prev, topic.id]));
      setTopicInputs((prev) => ({ ...prev, [activeSubject]: "" }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create the topic");
      console.error(error);
    } finally {
      setTopicLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!paper?._id || !template?._id) {
        alert("Paper/template not loaded");
        return;
      }

      const sectionPayload = template.sections.map((section: any) => ({
        sectionId: section.id,
        questions: selectedQuestions?.[section.id] || [],
      }));

      const payload = {
        templateId: template._id,
        selectedQuestions: sectionPayload,
        paperId: paper._id,
      };

      setIsGenerating(true);
      const res: any = await generatePaperApiManual(payload);
      if (!res?.success || !res?.paper) {
        alert(res?.error || "Failed to generate paper");
        return;
      }

      setPaper(res.paper);
      setPreviewConfig(mapPaperToPreviewConfig(res.paper));
      setCurrentStep(5);
      alert("Paper updated successfully!");
    } catch (error) {
      console.error("Error while saving paper:", error);
      alert("Failed to update paper");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (previewConfig) {
      printPaper(previewConfig);
      return;
    }
    alert("Please generate the paper first before printing.");
  };

  if (loading) {
    return <div className="p-6 text-center">Loading paper...</div>;
  }

  return (
    <div className="max-w-8xl mx-auto space-y-8 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Question Paper</h2>
          <p className="text-muted-foreground">Update the same structured flow used for paper generation.</p>
        </div>

        <div className="flex items-center gap-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  currentStep >= step.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {step.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("mx-2 h-0.5 w-8", currentStep > step.id ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>
              Configure marks, topics, and question selection exactly like the paper generator.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Paper Title</Label>
                  <Input value={paperTitle} onChange={(e) => setPaperTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v as ClassLevel)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASSES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <MultiSelect
                      options={filteredSubjects.map((s) => ({ value: s.id, label: s.name }))}
                      value={selectedSubjects}
                      onChange={setSelectedSubjects}
                      placeholder="Select Subject"
                      disabled={!selectedClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Total Marks</Label>
                    <Input type="number" value={totalMarks} min={0} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => setTotalMarks(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (Minutes)</Label>
                    <Input type="number" value={duration} min={0} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => setDuration(Number(e.target.value))} />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base">Select Topics to Include</Label>
                  <Badge variant="secondary">{selectedTopics.length} Selected</Badge>
                </div>

                {selectedSubjects.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">Select a class and at least one subject to choose topics.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedSubjects.map((subjectId) => {
                        const subject = SUBJECTS.find((s) => s.id === subjectId);
                        if (!subject) return null;

                        const selectedCount = availableTopics.filter((topic) => topic.subjectId === subjectId && selectedTopics.includes(topic.id)).length;

                        return (
                          <button
                            key={subject.id}
                            type="button"
                            onClick={() => setActiveTopicSubject(subject.id)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm transition",
                              activeSubject === subject.id ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-muted/70 text-muted-foreground"
                            )}
                          >
                            {subject.name}
                            {selectedCount > 0 && (
                              <Badge className="ml-2" variant="secondary">{selectedCount}</Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.5fr,0.9fr]">
                      <div className="space-y-4">
                        <div className="rounded-lg border bg-slate-50 p-4">
                          <p className="text-sm font-semibold">Topics for {activeSubjectName}</p>
                          <p className="text-xs text-muted-foreground">{topicsForActiveSubject.length} available</p>
                        </div>

                        <ScrollArea className="h-[300px] border rounded-md p-4">
                          <div className="space-y-3">
                            {topicLoading ? (
                              <div className="text-center text-muted-foreground py-10">Loading topics...</div>
                            ) : topicsForActiveSubject.length > 0 ? (
                              topicsForActiveSubject.map((topic) => (
                                <div key={topic.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                                  <div className="flex items-center gap-2">
                                    <Checkbox id={topic.id} checked={selectedTopics.includes(topic.id)} onCheckedChange={() => toggleTopic(topic.id)} />
                                    <label htmlFor={topic.id} className="text-sm font-medium">{formatTopicTitle(topic.name)}</label>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{activeSubjectName}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-center text-muted-foreground py-10">No topics available for this subject yet. Add a new topic below.</div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
{/* 
                      <div className="space-y-4">
                        <div className="rounded-md border p-4">
                          <Label>Add New Topic</Label>
                          <p className="text-sm text-muted-foreground mt-1">Add a topic for the selected subject and include it immediately.</p>
                          <Input
                            value={topicInputs[activeSubject] || ""}
                            onChange={(e) => setTopicInputs((prev) => ({ ...prev, [activeSubject]: e.target.value }))}
                            placeholder="Example: Algebra Applications"
                          />
                          <Button type="button" className="mt-4 w-full" onClick={handleAddTopic} disabled={!topicInputs[activeSubject]?.trim() || !activeSubject}>
                            {topicLoading ? "Adding…" : "Add Topic"}
                          </Button>
                        </div>

                        <div className="rounded-md border p-4">
                          <Label>Selected Topics</Label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedTopics.length > 0 ? (
                              selectedTopics.map((topicId) => {
                                const topic = availableTopics.find((t) => t.id === topicId);
                                if (!topic) return null;
                                return <Badge key={topic.id} variant="secondary">{formatTopicTitle(topic.name)}</Badge>;
                              })
                            ) : (
                              <span className="text-sm text-muted-foreground">No topics selected yet.</span>
                            )}
                          </div>
                        </div>
                      </div> */}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="flex justify-between text-xs text-center gap-4">
                  <div className="w-1/3 bg-green-100 text-green-800 flex items-center justify-between border p-3 rounded-full">
                    <span className="text-sm">Easy</span>
                    <Switch checked={difficultyMix.easy} onCheckedChange={(val) => setDifficultyMix((prev) => ({ ...prev, easy: val }))} />
                  </div>
                  <div className="w-1/3 bg-yellow-100 text-yellow-800 flex items-center justify-between border p-3 rounded-full">
                    <span className="text-sm">Medium</span>
                    <Switch checked={difficultyMix.medium} onCheckedChange={(val) => setDifficultyMix((prev) => ({ ...prev, medium: val }))} />
                  </div>
                  <div className="w-1/3 bg-red-100 text-red-800 flex items-center justify-between border p-3 rounded-full">
                    <span className="text-sm">Hard</span>
                    <Switch checked={difficultyMix.hard} onCheckedChange={(val) => setDifficultyMix((prev) => ({ ...prev, hard: val }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(questionTypes).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between border p-3 rounded-md">
                      <span className="text-sm">{key.replace(/_/g, " ")}</span>
                      <Switch checked={enabled} onCheckedChange={(val) => setQuestionTypes((prev) => ({ ...prev, [key]: val }))} />
                    </div>
                  ))}
                </div>

                <div className={`mb-4 p-3 border rounded-md flex justify-between items-center ${remainingMarks < 0 ? "bg-red-50 border-red-200" : remainingMarks === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
                  <span className="font-medium">Remaining Marks</span>
                  <span className={`font-semibold ${remainingMarks < 0 ? "text-red-600" : remainingMarks === 0 ? "text-green-600" : "text-yellow-600"}`}>{remainingMarks}</span>
                </div>

                <div className="space-y-4">
                  {selectedSubjects.length > 0 ? (
                    selectedSubjects.map((subjectId) => {
                      const subject = SUBJECTS.find((s) => s.id === subjectId);
                      if (!subject) return null;

                      const usedMarks = selectedSubjects.filter((id) => id !== subject.id).reduce((sum, id) => sum + getSubjectMarks(id), 0);
                      const currentMarks = getSubjectMarks(subject.id);
                      const maxAllowed = Math.max(0, totalMarks - usedMarks);
                      const safeCurrent = Math.max(0, Math.min(currentMarks, maxAllowed));
                      const rules = getSectionRules(subject.id);
                      const topicChoices = getSelectedTopicsForSubject(subject.id);
                      const allocatedTopicMarks = (rules.topicDistributions || []).reduce((sum: number, item: any) => sum + Number(item.marks || 0), 0);
                      const topicMarksRemaining = safeCurrent - allocatedTopicMarks;

                      return (
                        <div key={subject.id} className="rounded-lg border p-4 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold">{subject.name}</p>
                              <p className="text-xs text-muted-foreground">Subject marks {">"} topic marks {">"} question marks</p>
                            </div>
                            <Badge variant={topicMarksRemaining === 0 ? "default" : "secondary"}>{safeCurrent} / {totalMarks} marks</Badge>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-xs">Subject Marks</Label>
                              <Input type="number" min={0} max={maxAllowed} step={1} value={safeCurrent} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => {
                                const val = toSafeInt(e.target.value, 0);
                                updateSubjectMarks(subject, Math.max(0, Math.min(val, maxAllowed)));
                              }} />
                            </div>
                            {/* <div className="space-y-2">
                              <Label className="text-xs">Selection Rule</Label>
                              <div className="h-10 rounded-md border px-3 flex items-center text-sm">
                                Use question's own marks during selection
                              </div>
                            </div> */}
                          </div>

                          <div className="rounded-md border p-3 bg-muted/20">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <Label className="text-sm">Topic-wise Marks Distribution</Label>
                              <Badge variant={topicMarksRemaining === 0 ? "default" : "secondary"}>Remaining: {topicMarksRemaining}</Badge>
                            </div>

                            {topicChoices.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No topics selected for this subject. Go back to Topic Selection.</p>
                            ) : (
                              <div className="grid gap-3 md:grid-cols-2">
                                {topicChoices.map((topic) => {
                                  const currentTopicMarks = rules.topicDistributions.find((item: any) => item.topicId === topic.id)?.marks || 0;
                                  const maxTopicAllowed = Math.max(0, safeCurrent - (allocatedTopicMarks - currentTopicMarks));

                                  return (
                                    <div key={topic.id} className="rounded-md border bg-background p-3 space-y-2">
                                      <span className="text-sm font-medium leading-tight">{formatTopicTitle(topic.name)}</span>
                                      <div className="flex items-center gap-2">
                                        <Input type="number" min={0} max={maxTopicAllowed} step={1} value={currentTopicMarks} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => {
                                          const val = toSafeInt(e.target.value, 0);
                                          updateTopicMarks(subject.id, topic.id, Math.max(0, Math.min(val, maxTopicAllowed)));
                                        }} />
                                        <span className="whitespace-nowrap text-xs text-muted-foreground">{currentTopicMarks} marks</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="w-full bg-gray-200 h-2 rounded">
                            <div className="bg-primary h-2 rounded transition-all duration-300" style={{ width: `${totalMarks === 0 ? 0 : Math.min(100, Math.max(0, (safeCurrent / totalMarks) * 100))}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">No subjects selected</span>
                  )}
                </div>
              </div>
            )}

            {currentStep === 4 && template?.sections?.length && (
              <PaperGenerationTemplate
                data={template}
                paperGenerateFunction={setSelectedQuestions}
                selectedQuestionsEdit={selectedQuestions}
                selectedTopics={selectedTopics}
                availableTopics={availableTopics}
              />
            )}

            {currentStep === 5 && previewConfig && (
              <PaperPreview config={previewConfig} />
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isGenerating}>
              Back
            </Button>

            {currentStep === 4 ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button onClick={handleSave} disabled={isGenerating}>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </div>
            ) : (
              <Button onClick={handleNext} disabled={isGenerating}>
                {isGenerating ? (
                  <>Generating...</>
                ) : currentStep === 3 ? (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Save Configuration
                  </>
                ) : (
                  <>
                    <ChevronRight className="mr-2 h-4 w-4" /> Next
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="h-fit bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Paper Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span>{paperTitle || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Class</span><span>{selectedClass || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Subjects</span><span>{selectedSubjects.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Topics</span><span>{selectedTopics.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Marks</span><span>{totalMarks}</span></div>
            <div className="pt-4 border-t text-xs text-muted-foreground">This edit flow now mirrors the generator flow.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
