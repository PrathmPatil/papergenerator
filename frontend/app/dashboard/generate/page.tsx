"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Wand2, Save, RefreshCw, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { ClassLevel, Section, Sections, Topic } from "@/lib/types";
import { cn, formatTopicTitle } from "@/lib/utils";
import { CLASSES, SUBJECTS } from "../../../lib/data";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  createPaperTemplateApi,
  fetchPaperByIdApi,
  fetchQuestionByIdApi,
  generatePaperApiManual,
  fetchTopicsApi,
  createTopicApi,
  isTitleExist,
} from "@/utils/apis";
import dynamic from "next/dynamic";
import { mapPaperToPreviewConfig } from "@/lib/utils";


const PaperPreview = dynamic(
  () => import("@/components/paper-preview").then((m) => m.PaperPreview),
  { ssr: false }
);

const PaperGenerationTemplate = dynamic(
  () =>
    import("@/components/paper-generation-template").then(
      (m) => m.PaperGenerationTemplate
    ),
  { ssr: false }
);

// Steps for the wizard
const STEPS = [
  { id: 1, title: "Basic Details" },
  { id: 2, title: "Topic Selection" },
  { id: 3, title: "Configuration" },
  { id: 4, title: "Select Questions" },
  { id: 5, title: "Preview & Export" },
];

interface TopicDistributionRule {
  topicId: string;
  marks: number;
}

interface SectionRules {
  marksPerQuestion: number;
  topicDistributions: TopicDistributionRule[];
}

type SectionConfig = Sections & {
  rules?: SectionRules;
};

export default function GeneratePaperPage() {
  const [currentStep, setCurrentStep] = useState(1);

  const [previewConfig, setPreviewConfig] = useState<any>(null);
  
  // Form State
  const [paperTitle, setPaperTitle] = useState("Unit Test 1");
  const [selectedClass, setSelectedClass] = useState<ClassLevel | "">("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>({});
  const [topicLoading, setTopicLoading] = useState(false);
  const [activeTopicSubject, setActiveTopicSubject] = useState<string>("");

  const [totalMarks, setTotalMarks] = useState(50);
  const [duration, setDuration] = useState(60);
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

  // Mock Generated Paper State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);

  const [fetchedQuestions, setFetchedQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, string[]>>({});
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [isNameExist, setIsTitleExist] = useState(false);

  const toSafeInt = (value: unknown, fallback = 0) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.floor(num);
  };
  const normalizedSelectedClass = selectedClass.trim();

  const filteredSubjects = SUBJECTS.filter((s) =>
    !normalizedSelectedClass
      ? true
      : s.classLevels.some((level) => level.trim() === normalizedSelectedClass)
  );

  const activeSubject = selectedSubjects.includes(activeTopicSubject)
    ? activeTopicSubject
    : selectedSubjects[0] || "";

  const topicsForActiveSubject = availableTopics.filter(
    (t) => t.subjectId === activeSubject
  );

  const activeSubjectName =
    SUBJECTS.find((s) => s.id === activeSubject)?.name || "subject";

  const getSelectedTopicsForSubject = (subjectId: string) => {
    return availableTopics.filter(
      (topic) => topic.subjectId === subjectId && selectedTopics.includes(topic.id)
    );
  };

  const getSubjectMarks = (subjectId: string) => {
    return sections.find((s) => s.subjectId === subjectId)?.marks || 0;
  };

  const getSectionRules = (subjectId: string): SectionRules => {
    const section = sections.find((s) => s.subjectId === subjectId);
    return {
      marksPerQuestion: Math.max(1, Number(section?.rules?.marksPerQuestion || 1)),
      topicDistributions: Array.isArray(section?.rules?.topicDistributions)
        ? section!.rules!.topicDistributions
        : [],
    };
  };

  const getTopicAllocatedMarks = (subjectId: string) => {
    const rules = getSectionRules(subjectId);
    return rules.topicDistributions.reduce((sum, item) => sum + Number(item.marks || 0), 0);
  };

  const upsertSectionRules = (
    subjectId: string,
    updater: (rules: SectionRules) => SectionRules
  ) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.subjectId !== subjectId) return section;

        const currentRules: SectionRules = {
          marksPerQuestion: Math.max(1, Number(section.rules?.marksPerQuestion || 1)),
          topicDistributions: Array.isArray(section.rules?.topicDistributions)
            ? section.rules!.topicDistributions
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
      prev.map((section) => {
        if (section.subjectId !== subjectId) return section;

        const distributions = Array.isArray(section.rules?.topicDistributions)
          ? section.rules!.topicDistributions
          : [];

        const allocatedWithoutCurrent = distributions
          .filter((rule) => rule.topicId !== topicId)
          .reduce((sum, rule) => sum + Math.max(0, toSafeInt(rule.marks, 0)), 0);

        const maxAllowedForTopic = Math.max(0, toSafeInt(section.marks, 0) - allocatedWithoutCurrent);
        const finalMarks = Math.min(safeRequestedMarks, maxAllowedForTopic);

        return {
          ...section,
          rules: {
            marksPerQuestion: Math.max(1, toSafeInt(section.rules?.marksPerQuestion, 1)),
            topicDistributions: distributions.map((rule) =>
              rule.topicId === topicId
                ? { ...rule, marks: finalMarks }
                : { ...rule, marks: Math.max(0, toSafeInt(rule.marks, 0)) }
            ),
          },
        };
      })
    );
  };

  interface Subject {
    id: string;
    name: string;
  }
const totalAllocated = selectedSubjects.reduce(
    (sum, id) => sum + getSubjectMarks(id),
    0
  );

  const remainingMarks = totalMarks - totalAllocated;
  const updateSubjectMarks = (subject: Subject, value: number) => {
    setSections((prev) => {
      const usedMarks = prev
        .filter((s) => s.subjectId !== subject.id)
        .reduce((sum, s) => sum + s.marks, 0);

      const remaining = totalMarks - usedMarks;
      const finalMarks = Math.max(0, Math.min(value, remaining));

      const exists = prev.find((s) => s.subjectId === subject.id);

      if (exists) {
        return prev.map((s) => {
          if (s.subjectId !== subject.id) return s;

          const currentRules: SectionRules = {
            marksPerQuestion: Math.max(1, Number(s.rules?.marksPerQuestion || 1)),
            topicDistributions: Array.isArray(s.rules?.topicDistributions)
              ? s.rules!.topicDistributions
              : [],
          };

          const trimmed = [...currentRules.topicDistributions];
          let allocated = trimmed.reduce((sum, item) => sum + Number(item.marks || 0), 0);
          if (allocated > finalMarks) {
            for (let i = trimmed.length - 1; i >= 0 && allocated > finalMarks; i -= 1) {
              const overshoot = allocated - finalMarks;
              const nextVal = Math.max(0, Number(trimmed[i].marks || 0) - overshoot);
              allocated -= Number(trimmed[i].marks || 0) - nextVal;
              trimmed[i] = { ...trimmed[i], marks: nextVal };
            }
          }

          return {
            ...s,
            marks: finalMarks,
            rules: {
              marksPerQuestion: currentRules.marksPerQuestion,
              topicDistributions: trimmed,
            },
          };
        });
      }

      const initialTopicRules = getSelectedTopicsForSubject(subject.id).map((topic) => ({
        topicId: topic.id,
        marks: 0,
      }));

      return [
        ...prev,
        {
          id: `sec_${subject.id}`,
          name: subject.name,
          subjectId: subject.id,
          marks: finalMarks,
          rules: {
            marksPerQuestion: 1,
            topicDistributions: initialTopicRules,
          },
        },
      ];
    });
  };

  const validateDistributionBeforeNext = () => {
    if (sections.length === 0) {
      return "Please allocate marks to at least one subject.";
    }

    for (const subjectId of selectedSubjects) {
      const subject = SUBJECTS.find((s) => s.id === subjectId);
      const section = sections.find((s) => s.subjectId === subjectId);

      if (!section || section.marks <= 0) {
        return `Please set marks for ${subject?.name || "a subject"}.`;
      }

      const rules = getSectionRules(subjectId);

      const subjectTopics = getSelectedTopicsForSubject(subjectId);
      if (subjectTopics.length === 0) {
        return `Please select at least one topic for ${subject?.name || "a subject"}.`;
      }

      const topicMarksSum = rules.topicDistributions.reduce(
        (sum, item) => sum + Number(item.marks || 0),
        0
      );

      if (topicMarksSum !== section.marks) {
        return `Topic marks for ${subject?.name || "a subject"} must equal subject marks (${section.marks}).`;
      }

      for (const rule of rules.topicDistributions) {
        if (rule.marks <= 0) {
          const topicName = availableTopics.find((t) => t.id === rule.topicId)?.name || "topic";
          return `Please assign marks for ${topicName} in ${subject?.name || "subject"}.`;
        }
      }
    }

    return "";
  };

  const handleNext = async () => {
    console.log(currentStep);
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
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          subjectId: s.subjectId,
          marks: s.marks,
          rules: {
            marksPerQuestion: Math.max(1, Number(s.rules?.marksPerQuestion || 1)),
            topicDistributions: (s.rules?.topicDistributions || []).map((rule) => ({
              topicId: rule.topicId,
              marks: Number(rule.marks || 0),
            })),
          },
        })),
        classId: selectedClass || "",
        subjectId: (selectedSubjects || []).join(","),
        topicId: (selectedTopics || []).join(","),
        difficulty: Object.keys(difficultyMix)
          .filter((k) => difficultyMix[k as keyof typeof difficultyMix])
          .join(","),
        type: Object.keys(questionTypes)
          .filter((k) => questionTypes[k as keyof typeof questionTypes])
          .join(","),
      };

     const res= await createPaperTemplateApi(payload);
     const {success, template} = res;
     if(success){
      setTemplate({...payload, ...template});
      setCurrentStep(4);       
     }
    } else if(currentStep === 1){ 
      if(isNameExist) return;
      else setCurrentStep((prev) => Math.min(prev + 1, 5));
    } else{
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) => {
      const isSelected = prev.includes(id);
      const nextSubjects = isSelected
        ? prev.filter((s) => s !== id)
        : [...prev, id];

      if (isSelected) {
        setSelectedTopics((prevTopics) =>
          prevTopics.filter((topicId) => {
            const topic = availableTopics.find((t) => t.id === topicId);
            return topic?.subjectId !== id;
          })
        );

        setSections((prevSections) =>
          prevSections.filter((section) => section.subjectId !== id)
        );
      }

      return nextSubjects;
    });
  };

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
    setSelectedTopics((prevTopics) => {
      const nextTopics = prevTopics.filter((topicId) => {
        const topic = availableTopics.find((t) => t.id === topicId);
        return topic ? selectedSubjects.includes(topic.subjectId) : false;
      });

      if (
        nextTopics.length === prevTopics.length &&
        nextTopics.every((topicId, idx) => topicId === prevTopics[idx])
      ) {
        return prevTopics;
      }

      return nextTopics;
    });

    setSections((prevSections) => {
      const nextSections = prevSections
        .filter((section) => selectedSubjects.includes(section.subjectId))
        .map((section) => {
          const subjectTopicIds = getSelectedTopicsForSubject(section.subjectId).map(
            (topic) => topic.id
          );

          const existingRules = Array.isArray(section.rules?.topicDistributions)
            ? section.rules!.topicDistributions
            : [];

          const distributions = subjectTopicIds.map((topicId) => {
            const existing = existingRules.find((item) => item.topicId === topicId);
            return {
              topicId,
              marks: Number(existing?.marks || 0),
            };
          });

          let allocated = distributions.reduce(
            (sum, item) => sum + Number(item.marks || 0),
            0
          );

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

      if (JSON.stringify(nextSections) === JSON.stringify(prevSections)) {
        return prevSections;
      }

      return nextSections;
    });
  }, [selectedSubjects, availableTopics, selectedTopics]);

  useEffect(() => {
    const loadTopics = async () => {
      if (!selectedClass || selectedSubjects.length === 0) return;

      setTopicLoading(true);
      try {
        const resultTopics: Topic[] = [];

        await Promise.all(
          selectedSubjects.map(async (subjectId) => {
            const res: any = await fetchTopicsApi({
              classId: selectedClass,
              subjectId,
            });
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
          const keep = prev.filter((topic) =>
            selectedSubjects.includes(topic.subjectId)
          );
          const merged = [...keep, ...resultTopics];
          return Array.from(
            new Map(merged.map((topic) => [topic.id, topic])).values()
          );
        });
      } catch (error) {
        console.error("Failed to load topics", error);
      } finally {
        setTopicLoading(false);
      }
    };

    loadTopics();
  }, [selectedClass, selectedSubjects]);

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
        return Array.from(
          new Map(merged.map((item) => [item.id, item])).values()
        );
      });

      setSelectedTopics((prev) =>
        prev.includes(topic.id) ? prev : [...prev, topic.id]
      );
      setTopicInputs((prev) => ({ ...prev, [activeSubject]: "" }));
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to create the topic"
      );
      console.error(error);
    } finally {
      setTopicLoading(false);
    }
  };

  const generatePaper = () => {
    setIsGenerating(true);
    // Simulate generation with realistic structure
    setTimeout(() => {
      const sections: Section[] = [
        {
          id: "eng",
          name: "English [A]",
          marks: 40,
          questionCount: 20,
          marksPerQuestion: 2,
          positiveMarks: 2,
          negativeMarks: -0.5,
          instructions: "Read the passage and answer the following questions.",
        },
        {
          id: "reasoning",
          name: "Reasoning [B]",
          marks: 16,
          questionCount: 8,
          marksPerQuestion: 2,
          positiveMarks: 2,
          negativeMarks: 0,
          instructions: "Solve the following problems.",
        },
        {
          id: "maths",
          name: "Maths [C]",
          marks: 56,
          questionCount: 28,
          marksPerQuestion: 2,
          positiveMarks: 2,
          negativeMarks: -0.5,
          instructions: "Attempt all questions.",
        },
        {
          id: "science",
          name: "Science [D]",
          marks: 48,
          questionCount: 24,
          marksPerQuestion: 2,
          positiveMarks: 2,
          negativeMarks: -1,
          instructions: "Choose the correct answer.",
        },
      ];

      setGeneratedPaper({
        config: {
          title: paperTitle,
          code: `CODE-${Date.now()}`,
          classLevel: selectedClass,
          subjectId: selectedSubjects,
          topics: selectedTopics,
          totalMarks,
          durationMinutes: duration,
          sections,
          negativeMarking: true,
          examDate: new Date().toLocaleDateString(),
          instructions:
            "All questions are compulsory. Negative marking applies.",
        },
        questions: [],
        sectionsBreakdown: [],
      });
      setIsGenerating(false);
      setCurrentStep(4);
    }, 2000);
  };

  const fetchQuestions = async () => {
    setIsGenerating(true);

    try {
      const payload = {
        classId: selectedClass || "",
        subjectId: (selectedSubjects || []).join(","),
        topicId: (selectedTopics || []).join(","),
        difficulty: Object.keys(difficultyMix)
          .filter((k) => difficultyMix[k as keyof typeof difficultyMix])
          .join(","),
        type: Object.keys(questionTypes)
          .filter((k) => questionTypes[k as keyof typeof questionTypes])
          .join(","),
      };

      const res = await fetchQuestionByIdApi(payload);

      if (res && res.success) {
        setFetchedQuestions(res.questions || []);
        setCurrentStep(4);
      } else {
        alert(res.message || "Failed to fetch questions");
      }
      // buildStepFour(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  // ✅ Put this INSIDE GeneratePaperPage component (not outside)
const handleSave = async () => {
  try {
    if (!template?._id) {
      alert("Template not found!");
      return;
    }

    // ✅ Build section-wise payload (IDs)
    const sectionPayload = template.sections.map((section: any) => ({
      sectionId: section.id,
      questions: selectedQuestions?.[section.id] || [],
    }));

    const payload = {
      templateId: template._id,
      selectedQuestions: sectionPayload,
    };

    // ✅ API call
    const res = await generatePaperApiManual(payload);

    // Re-fetch the saved paper so preview always gets full paragraph + subquestion data
    if (res?.success && res?.paper?._id) {
      const fullPaperRes: any = await fetchPaperByIdApi(String(res.paper._id));
      const fullPaper = fullPaperRes?.paper || res.paper;

      const preview = {
        ...mapPaperToPreviewConfig(fullPaper),
        code: fullPaper?.code || `CODE-${Date.now()}`,
        examDate: new Date(fullPaper?.createdAt || Date.now()).toLocaleDateString(),
      };

      setPreviewConfig(preview);
      setCurrentStep(5);
      
      return;
    }

    alert("Paper generated, but preview data missing.");
  } catch (error) {
    console.error(error);
    alert("Failed to generate paper");
  }
};


  const selectedSubjectNames = useMemo(() => {
    const result = filteredSubjects
      .filter((s) => selectedSubjects.includes(s.id))
      .map((s) => s.name);
    return result.join(", ") || "-";
  }, [selectedSubjects, filteredSubjects]);

  // isTitleExist
  const isPaperNameExist = async (name: string) => {
    try {
      const res = await isTitleExist(name);
      console.log(res)
      return res.isExist;
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (paperTitle) {
      isPaperNameExist(paperTitle).then((res) => {
        setIsTitleExist(res);
      })
    }
  },[paperTitle]);
  console.log(isNameExist);

  return (
    <div className="max-w-8xl mx-auto space-y-8 h-[calc(100vh-8rem)] flex flex-col">
      {/* Wizard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Generate Paper</h2>
          <p className="text-muted-foreground">
            Create a structured question paper in minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-[2px] w-8",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 grid gap-8 lg:grid-cols-3">
        {/* Main Configuration Area */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>
              Configure the parameters for this step.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Paper Title</Label>
                  <Input
                    value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    placeholder="e.g. Half Yearly Examination 2023"
                  />
                  {isNameExist && <p className="text-red-500">Paper name already exist</p>}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select
                      value={selectedClass}
                      onValueChange={(v) => {
                        setSelectedClass(v as ClassLevel);
                        setSelectedSubjects([]);
                        setSelectedTopics([]);
                        setActiveTopicSubject("");
                      }}
                    >
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
                      options={filteredSubjects.map((s) => ({
                        value: s.id,
                        label: s.name,
                      }))}
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
                    <Input
                      type="number"
                      value={totalMarks}
                      min={0}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setTotalMarks(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (Minutes)</Label>
                    <Input
                      type="number"
                      value={duration}
                      min={0}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base">Select Topics to Include</Label>
                  <Badge variant="secondary">
                    {selectedTopics.length} Selected
                  </Badge>
                </div>

                {selectedSubjects.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    Select a class and at least one subject to choose topics.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedSubjects.map((subjectId) => {
                        const subject = SUBJECTS.find((s) => s.id === subjectId);
                        if (!subject) return null;

                        const selectedCount = availableTopics.filter(
                          (topic) =>
                            topic.subjectId === subjectId &&
                            selectedTopics.includes(topic.id)
                        ).length;

                        return (
                          <button
                            key={subject.id}
                            type="button"
                            onClick={() => setActiveTopicSubject(subject.id)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm transition",
                              activeSubject === subject.id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted bg-muted/70 text-muted-foreground"
                            )}
                          >
                            {subject.name}
                            {selectedCount > 0 && (
                              <Badge className="ml-2" variant="secondary">
                                {selectedCount}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.5fr,0.9fr]">
                      <div className="space-y-4">
                        <div className="rounded-lg border bg-slate-50 p-4">
                          <p className="text-sm font-semibold">
                            Topics for {SUBJECTS.find((s) => s.id === activeSubject)?.name || "subject"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {topicsForActiveSubject.length} available
                          </p>
                        </div>

                        <ScrollArea className="h-[300px] border rounded-md p-4">
                          <div className="space-y-3">
                            {topicLoading ? (
                              <div className="text-center text-muted-foreground py-10">
                                Loading topics...
                              </div>
                            ) : topicsForActiveSubject.length > 0 ? (
                              topicsForActiveSubject.map((topic) => (
                                <div
                                  key={topic.id}
                                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={topic.id}
                                      checked={selectedTopics.includes(topic.id)}
                                      onCheckedChange={() => toggleTopic(topic.id)}
                                    />
                                    <label htmlFor={topic.id} className="text-sm font-medium">
                                      {formatTopicTitle(topic.name)}
                                    </label>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {activeSubjectName}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-center text-muted-foreground py-10">
                                No topics available for this subject yet. Add a new topic below.
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* <div className="space-y-4">
                        <div className="rounded-md border p-4">
                          <Label>Add New Topic</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Add a topic for the selected subject and include it immediately.
                          </p>
                          <Input
                            value={topicInputs[activeSubject] || ""}
                            onChange={(e) =>
                              setTopicInputs((prev) => ({
                                ...prev,
                                [activeSubject]: e.target.value,
                              }))
                            }
                            placeholder="Example: Algebra Applications"
                          />
                          <Button
                            type="button"
                            className="mt-4 w-full"
                            onClick={handleAddTopic}
                            disabled={
                              !topicInputs[activeSubject]?.trim() || !activeSubject
                            }
                          >
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
                                return (
                                  <Badge key={topic.id} variant="secondary">
                                    {formatTopicTitle(topic.name)}
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No topics selected yet.
                              </span>
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
                    <Switch
                      checked={difficultyMix.easy}
                      onCheckedChange={(val) =>
                        setDifficultyMix((prev) => ({ ...prev, easy: val }))
                      }
                    />
                  </div>

                  <div className="w-1/3 bg-yellow-100 text-yellow-800 flex items-center justify-between border p-3 rounded-full">
                    <span className="text-sm">Medium</span>
                    <Switch
                      checked={difficultyMix.medium}
                      onCheckedChange={(val) =>
                        setDifficultyMix((prev) => ({ ...prev, medium: val }))
                      }
                    />
                  </div>

                  <div className="w-1/3 bg-red-100 text-red-800 flex items-center justify-between border p-3 rounded-full">
                    <span className="text-sm">Hard</span>
                    <Switch
                      checked={difficultyMix.hard}
                      onCheckedChange={(val) =>
                        setDifficultyMix((prev) => ({ ...prev, hard: val }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between border p-3 rounded-md">
                    <span className="text-sm">MCQ (Text)</span>
                    <Switch
                      checked={questionTypes.mcq_text}
                      onCheckedChange={(val) =>
                        setQuestionTypes((prev) => ({ ...prev, mcq_text: val }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border p-3 rounded-md">
                    <span className="text-sm">MCQ (Image)</span>
                    <Switch
                      checked={questionTypes.mcq_image}
                      onCheckedChange={(val) =>
                        setQuestionTypes((prev) => ({
                          ...prev,
                          mcq_image: val,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border p-3 rounded-md">
                    <span className="text-sm">Paragraph Based</span>
                    <Switch
                      checked={questionTypes.paragraph}
                      onCheckedChange={(val) =>
                        setQuestionTypes((prev) => ({
                          ...prev,
                          paragraph: val,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border p-3 rounded-md">
                    <span className="text-sm">Short Answer</span>
                    <Switch
                      checked={questionTypes.short_answer}
                      onCheckedChange={(val) =>
                        setQuestionTypes((prev) => ({
                          ...prev,
                          short_answer: val,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border p-3 rounded-md">
                    <span className="text-sm">Long Answer</span>
                    <Switch
                      checked={questionTypes.long_answer}
                      onCheckedChange={(val) =>
                        setQuestionTypes((prev) => ({
                          ...prev,
                          long_answer: val,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border p-3 rounded-md">
                    <span className="text-sm">True / False</span>
                    <Switch
                      checked={questionTypes.true_false}
                      onCheckedChange={(val) =>
                        setQuestionTypes((prev) => ({
                          ...prev,
                          true_false: val,
                        }))
                      }
                    />
                  </div>
                </div>
                 
             {/* ===== Remaining Marks Display ===== */}
             
                <div
                  className={`mb-4 p-3 border rounded-md flex justify-between items-center ${
                    remainingMarks < 0
                      ? "bg-red-50 border-red-200"
                      : remainingMarks === 0
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <span className="font-medium">Remaining Marks</span>

                  <span
                    className={`font-semibold ${
                      remainingMarks < 0
                        ? "text-red-600"
                        : remainingMarks === 0
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {remainingMarks}
                  </span>
                </div>

                <div className="space-y-4">
                  {selectedSubjects.length > 0 ? (
                    selectedSubjects.map((subjectId) => {
                      const subject = SUBJECTS.find((s) => s.id === subjectId);
                      if (!subject) return null;

                      const usedMarks = selectedSubjects
                        .filter((id) => id !== subject.id)
                        .reduce((sum, id) => sum + getSubjectMarks(id), 0);

                      const currentMarks = getSubjectMarks(subject.id);
                      const maxAllowed = Math.max(0, totalMarks - usedMarks);
                      const safeCurrent = Math.max(0, Math.min(currentMarks, maxAllowed));

                      const rules = getSectionRules(subject.id);
                      const topicChoices = getSelectedTopicsForSubject(subject.id);
                      const allocatedTopicMarks = getTopicAllocatedMarks(subject.id);
                      const topicMarksRemaining = safeCurrent - allocatedTopicMarks;

                      return (
                        <div key={subject.id} className="rounded-lg border p-4 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold">{subject.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Subject marks {">"} topic marks {">"} question marks
                              </p>
                            </div>
                            <Badge
                              variant={topicMarksRemaining === 0 ? "default" : "secondary"}
                            >
                              {safeCurrent} / {totalMarks} marks
                            </Badge>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-xs">Subject Marks</Label>
                              <Input
                                type="number"
                                min={0}
                                max={maxAllowed}
                                step={1}
                                value={safeCurrent}
                                onWheel={(e) => e.currentTarget.blur()}
                                onChange={(e) => {
                                  const val = toSafeInt(e.target.value, 0);
                                  updateSubjectMarks(
                                    subject,
                                    Math.max(0, Math.min(val, maxAllowed))
                                  );
                                }}
                              />
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
                              <Badge variant={topicMarksRemaining === 0 ? "default" : "secondary"}>
                                Remaining: {topicMarksRemaining}
                              </Badge>
                            </div>

                            {topicChoices.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No topics selected for this subject. Go back to Topic Selection.
                              </p>
                            ) : (
                              <div className="grid gap-3 md:grid-cols-2">
                                {topicChoices.map((topic) => {
                                  const currentTopicMarks =
                                    rules.topicDistributions.find((item) => item.topicId === topic.id)
                                      ?.marks || 0;

                                  const maxTopicAllowed = Math.max(
                                    0,
                                    safeCurrent - (allocatedTopicMarks - currentTopicMarks)
                                  );

                                  return (
                                    <div
                                      key={topic.id}
                                      className="rounded-md border bg-background p-3 space-y-2"
                                    >
                                      <span className="text-sm font-medium leading-tight">
                                        {formatTopicTitle(topic.name)}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={maxTopicAllowed}
                                          step={1}
                                          value={currentTopicMarks}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          onChange={(e) => {
                                            const val = toSafeInt(e.target.value, 0);
                                            updateTopicMarks(
                                              subject.id,
                                              topic.id,
                                              Math.max(0, Math.min(val, maxTopicAllowed))
                                            );
                                          }}
                                        />
                                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                                          {currentTopicMarks} marks
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="w-full bg-gray-200 h-2 rounded">
                            <div
                              className="bg-primary h-2 rounded transition-all duration-300"
                              style={{
                                width: `${
                                  totalMarks === 0
                                    ? 0
                                    : Math.min(100, Math.max(0, (safeCurrent / totalMarks) * 100))
                                }%`,
                              }}
                            />
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
            ) }

            {currentStep === 5 && previewConfig && (
              <PaperPreview config={previewConfig} />
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isGenerating}
            >
              Back
            </Button>
            {currentStep === 4 ? (
              <div className="flex gap-2">
                <Button variant="outline">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />Save Paper
                </Button>
              </div>
            ) : (
              <Button onClick={handleNext} disabled={isGenerating}>
                {isGenerating ? (
                  <>Generating...</>
                ) : currentStep === 3 ? (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Fetch Questions
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

        {/* Live Summary Sidebar */}
        <Card className="h-fit bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Blueprint Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Title:</span>
              <span className="font-medium text-right">
                {paperTitle || "-"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Class:</span>
              <span className="font-medium">{selectedClass || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject:</span>
              <span className="font-medium text-right">
                {selectedSubjectNames || "-"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Marks:</span>
              <span className="font-medium">{totalMarks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Topics:</span>
              <span className="font-medium">
                {selectedTopics.length} selected
              </span>
            </div>
            <div className="mt-4 text-sm">
              <b>Total Allocated:</b>
              {sections.reduce((sum, s) => sum + s.marks, 0)} / {totalMarks}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>Est. Questions: ~{(totalMarks / 2.5).toFixed(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
