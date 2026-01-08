"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Save, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { cn, mapPaperToPreviewConfig } from "@/lib/utils";
import PaperGenerationTemplate from "@/components/paper-generation-template";
import { PaperPreview } from "@/components/paper-preview";
import { useParams, useRouter } from "next/navigation";
import { fetchPaperByIdApi, generatePaperApiManual, getEditPaperApi } from "@/utils/apis";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLASSES, SUBJECTS } from "@/lib/data";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ClassLevel } from "@/lib/types";

/* ---------- SAME STEPS ---------- */
const STEPS = [
  { id: 1, title: "Basic Details" },
  { id: 2, title: "Topic Selection" },
  { id: 3, title: "Configuration" },
  { id: 4, title: "Edit Questions" },
  { id: 5, title: "Preview & Export" },
];

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
}

export default function EditPaperPage() {
  const router = useRouter();
  const params = useParams();
  const paperId = params?.id as string;
  const [currentStep, setCurrentStep] = useState(1);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [paperTitle, setPaperTitle] = useState("");
  const [generatedPaper, setGeneratedPaper] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<ClassLevel | "">("");
  const [template, setTemplate] = useState<any>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const filteredSubjects = useMemo(
    () =>
      SUBJECTS.filter(
        (s) => !selectedClass || s.classLevels.includes(selectedClass)
      ),
    [selectedClass]
  );

  const filteredTopics = useMemo(
    () => SUBJECTS.find((s) => s.id === selectedSubjects[0])?.topics || [],
    [selectedSubjects]
  );

  const handleNext = () => {
    console.log(currentStep)
    if (currentStep === 4){
        // update the paper 
        handleSave();
    } else {
          setCurrentStep((prev) => Math.min(prev + 1, 5))};
    }
    
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  useEffect(() => {
    if (!paperId) return;

    const fetchPaper = async () => {
      try {
        const res = await getEditPaperApi(paperId);
        const { success, data } = res;
        if (success) {
          const { paper, template, sections } = data;
          setTemplate({
            classId: paper.classId,

            subjectId: sections.map((s: any) => s.subjectId).join(","),

            type: template.type && template.type,

            difficulty: template.difficulty,

            sections: sections,
          });
          setSections(sections);
          setPaper(paper);
          setPaperTitle(paper.title);
          setSelectedClass(paper.classId);
          setSelectedSubjects(sections.map((s) => s.subjectId));
          setTotalMarks(paper.totalMarks);
          setDuration(paper.durationMinutes);
          setSelectedQuestions(paper.sections.flatMap((s) => s.questions));
          setDifficultyMix({
            easy:template.difficulty && template.difficulty.split(",").some((s) => s === "easy"),
            medium: template.difficulty && template.difficulty.split(",").some((s) => s === "medium"),
            hard: template.difficulty && template.difficulty.split(",").some((s) => s === "hard"),
          });
          setQuestionTypes({
            mcq_text: template.type && template.type
              .split(",")
              .some((s) => s === "mcq_text"),
            mcq_image: template.type && template.type
              .split(",")
              .some((s) => s === "mcq_image"),
            true_false: template.type && template.type
              .split(",")
              .some((s) => s === "true_false"),
            short_answer: template.type && template.type
              .split(",")
              .some((s) => s === "short_answer"),
            paragraph: template.type && template.type
              .split(",")
              .some((s) => s === "paragraph"),
            long_answer: template.type && template.type
              .split(",")
              .some((s) => s === "long_answer"),
          });
        } else {
          console.error("Failed to fetch paper");
          setTemplate(null);
          setSections([]);
          setPaper(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaper();
  }, [paperId]);

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

  const handleSave = async () => {
    try {
      console.log("Raw selectedQuestions:", selectedQuestions);
      console.log("Template:", template);

      // ✅ Step 1: Build section-wise payload
      const sectionPayload = template.sections.map((section: any) => ({
        sectionId: section.id,
        questions: selectedQuestions[section.id] || [], // 👈 EMPTY ARRAY IF NOT SELECTED
      }));

      // ✅ Step 2: Final payload
      const payload = {
        templateId: paper.templateId,
        selectedQuestions: sectionPayload,
        paperId: paper._id,
      };

      console.log("Final Save Payload:", payload);

      // ✅ Step 3: API call
     const res= await generatePaperApiManual(payload);
     if(!res.success){return alert(res.error)}
     else { setGeneratedPaper(res.paper) }
      alert("Paper generated successfully!");
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    } catch (error) {
      console.error("Error while saving paper:", error);
      alert("Failed to generate paper");
    }
  }

  return (
    <div className="max-w-8xl mx-auto space-y-8 h-[calc(100vh-8rem)] flex flex-col">
      {/* ---------------- HEADER ---------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Edit Question Paper
          </h2>
          <p className="text-muted-foreground">
            Modify marks and questions only
          </p>
        </div>

        {/* STEP INDICATOR */}
        <div className="flex items-center gap-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
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

      {/* ---------------- MAIN GRID ---------------- */}
      <div className="flex-1 grid gap-8 lg:grid-cols-3">
        {/* ---------------- LEFT CONTENT ---------------- */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>
              {currentStep <= 3
                ? "These details cannot be edited"
                : "You can update marks and questions"}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Paper Title</Label>
                  <Input
                    disabled
                    value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    placeholder="e.g. Half Yearly Examination 2023"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select
                      disabled
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
                      disabled={true}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSubjects.length > 0 ? (
                    selectedSubjects.map((subjectId) => {
                      const subject = SUBJECTS.find((s) => s.id === subjectId);

                      if (!subject) return null;

                      const usedMarks = getUsedMarksExcept(subject.id);
                      const remaining = totalMarks - usedMarks;
                      const currentMarks = getSubjectMarks(subject.id);
                      console.log("Remaining marks:", remaining);
                      console.log("Current marks:", currentMarks);
                      console.log("Total marks:", totalMarks);
                      console.log("Used marks:", usedMarks);
                      return (
                        <div
                          key={subject.id}
                          className="flex flex-col gap-3 border p-3 rounded-md"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{subject.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {currentMarks} / {totalMarks}
                            </span>
                          </div>

                          <Slider
                            value={[currentMarks]}
                            min={0}
                            max={remaining + currentMarks}
                            step={5}
                            onValueChange={([val]) =>
                              updateSubjectMarks(subject, val)
                            }
                          />
                        </div>
                      );
                    })
                  ) : (
                    <span>No subjects selected</span>
                  )}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8">
                <PaperGenerationTemplate
                  data={template}
                  paperGenerateFunction={setSelectedQuestions}
                  selectedQuestionsEdit={selectedQuestions}
                />
              </div>
            )}

            {currentStep === 5 && generatedPaper && (
              <PaperPreview config={mapPaperToPreviewConfig(generatedPaper)} />
            )}
          </CardContent>

          {/* ---------------- FOOTER ---------------- */}
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Back
            </Button>

            {currentStep === 4 ? (
              <div className="flex gap-2">
                <Button variant="outline">
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            ) : (
              <Button onClick={handleNext}>
                <ChevronRight className="mr-2 h-4 w-4" />
                Next
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* ---------------- SIDEBAR ---------------- */}
        <Card className="h-fit bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Paper Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title</span>
              <span>Unit Test 1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Class</span>
              <span>Class 3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Marks</span>
              <span>50</span>
            </div>

            <div className="pt-4 border-t text-xs text-muted-foreground">
              Only marks & questions can be edited
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
