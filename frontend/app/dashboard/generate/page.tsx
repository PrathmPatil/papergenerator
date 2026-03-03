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
import type { ClassLevel, Section, Sections } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CLASSES, SUBJECTS } from "../../../lib/data";
import { TOPICS } from "@/lib/mock-data";
import { MultiSelect } from "@/components/ui/multi-select";
import { createPaperTemplateApi, fetchQuestionByIdApi, generatePaperApiManual, isTitleExist } from "@/utils/apis";
import dynamic from "next/dynamic";


const PaperPreview = dynamic(
  () => import("@/components/paper-preview").then((m) => m.PaperPreview),
  { ssr: false }
);

const PaperGenerationTemplate = dynamic(
  () => import("@/components/paper-generation-template"),
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

export default function GeneratePaperPage() {
  const [currentStep, setCurrentStep] = useState(1);

  const [previewConfig, setPreviewConfig] = useState<any>(null);
  
  // Form State
  const [paperTitle, setPaperTitle] = useState("Unit Test 1");
  const [selectedClass, setSelectedClass] = useState<ClassLevel | "">("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

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
  const [sections, setSections] = useState<Sections[]>([]);
  const [isNameExist, setIsTitleExist] = useState(false);
  const filteredSubjects = SUBJECTS.filter(
    (s) => !selectedClass || s.classLevels.includes(selectedClass)
  );
  const filteredTopics = TOPICS.filter(
    (t) => !selectedSubjects.length || selectedSubjects.includes(t.subjectId)
  );

  const getUsedMarksExcept = (subjectId: string) => {
    return sections
      .filter((s) => s.subjectId !== subjectId)
      .reduce((sum, s) => sum + s.marks, 0);
  };
  
  const getSubjectMarks = (subjectId: string) => {
    return sections.find((s) => s.subjectId === subjectId)?.marks || 0;
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
      const finalMarks = Math.min(value, remaining);

      const exists = prev.find((s) => s.subjectId === subject.id);

      if (exists) {
        return prev.map((s) =>
          s.subjectId === subject.id ? { ...s, marks: finalMarks } : s
        );
      }

      return [
        ...prev,
        {
          id: `sec_${subject.id}`,
          name: subject.name,
          subjectId: subject.id,
          marks: finalMarks,
        },
      ];
    });
  };

  const handleNext = async () => {
    console.log(currentStep);
    if (currentStep === 3) {
      const payload = {
        title: paperTitle,
        totalMarks: Number(totalMarks),
        durationMinutes: Number(duration),
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          subjectId: s.subjectId,
          marks: s.marks,
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
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(selectedTopics.filter((id) => id !== topicId));
    } else {
      setSelectedTopics([...selectedTopics, topicId]);
    }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
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

    // ✅ If backend returns paper with questionsSnapshot, use it for preview
    if (res?.success && res?.paper) {
      // Build preview config that PaperPreview expects
      const preview = {
        title: res.paper.title,
        code: `CODE-${Date.now()}`,
        classLevel: res.paper.classId,
        durationMinutes: res.paper.durationMinutes,
        totalMarks: res.paper.totalMarks,
        examDate: new Date(res.paper.createdAt).toLocaleDateString(),
        negativeMarking: true,

        // IMPORTANT: PaperPreview expects section.questions to be REAL objects (q.text, q.options...)
        sections: res.paper.sections.map((sec: any) => {
          const qs = (res.paper.questionsSnapshot || []).filter((q: any) =>
            sec.questions.includes(q.questionId)
          );

          return {
            id: sec.id,
            name: sec.name,
            marks: sec.marks,
            questionCount: qs.length,
            positiveMarks: qs[0]?.marks ?? 1,
            negativeMarks: qs[0]?.negativeMarks ?? 0,
            instructions: "",
            questions: qs, // ✅ real question objects for preview
          };
        }),
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
                      onChange={(e) => setTotalMarks(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (Minutes)</Label>
                    <Input
                      type="number"
                      value={duration}
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
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  <div className="space-y-4">
                    {filteredTopics.length > 0 ? (
                      filteredTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={topic.id}
                            checked={selectedTopics.includes(topic.id)}
                            onCheckedChange={() => toggleTopic(topic.id)}
                          />
                          <label
                            htmlFor={topic.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {topic.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-10">
                        Select a Class and Subject first.
                      </div>
                    )}
                  </div>
                </ScrollArea>
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

                {/* ===== SUBJECT GRID ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSubjects.length > 0 ? (
                    selectedSubjects.map((subjectId) => {
                      const subject = SUBJECTS.find((s) => s.id === subjectId);
                      if (!subject) return null;

                      // marks used by other subjects
                      const usedMarks = selectedSubjects
                        .filter((id) => id !== subject.id)
                        .reduce((sum, id) => sum + getSubjectMarks(id), 0);

                      const currentMarks = getSubjectMarks(subject.id);

                      // max this subject can take without exceeding total
                      const maxAllowed = Math.max(0, totalMarks - usedMarks);

                      // keep current safe
                      const safeCurrent = Math.max(0, Math.min(currentMarks, maxAllowed));

                      const percent =
                        totalMarks === 0
                          ? 0
                          : Math.min(100, Math.max(0, (safeCurrent / totalMarks) * 100));

                      return (
                        <div
                          key={subject.id}
                          className="flex flex-col gap-3 border p-4 rounded-md"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{subject.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {safeCurrent} / {totalMarks}
                            </span>
                          </div>

                          <input
                            type="number"
                            min={0}
                            max={maxAllowed}
                            step={5}
                            value={safeCurrent}
                            className="w-28 border rounded px-2 py-1"
                            onChange={(e) => {
                              let val = Number(e.target.value);
                              if (!Number.isFinite(val)) val = 0;

                              const safeVal = Math.max(0, Math.min(val, maxAllowed));
                              updateSubjectMarks(subject, safeVal);
                            }}
                          />

                          <div className="w-full bg-gray-200 h-2 rounded">
                            <div
                              className="bg-primary h-2 rounded transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <span>No subjects selected</span>
                  )}
                </div>
                </div>
            )}

            {currentStep === 4 && template?.sections?.length && (
              <PaperGenerationTemplate
                data={template}
                paperGenerateFunction={setSelectedQuestions}
                selectedQuestionsEdit={selectedQuestions}
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
