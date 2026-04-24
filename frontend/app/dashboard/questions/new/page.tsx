"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { CLASSES, SUBJECTS } from "@/lib/data";
import type { ClassLevel } from "@/lib/types";

import { MCQForm } from "@/components/question-forms/mcq-form";
import { ParagraphForm } from "@/components/question-forms/paragraph-form";
import { ImageMCQForm } from "@/components/question-forms/image-mcq-form";
import {
  bulkImageUploadApi,
  createBulkQuestionsApi,
  createQuestionApi,
  createTopicApi,
  fetchTopicsApi,
} from "@/utils/apis";
import { Switch } from "@/components/ui/switch";
import { FileUploadForm } from "@/components/question-forms/file-upload-form";
import {
  convertExcelRowsToImageMCQQuestions,
  convertExcelRowsToParagraphQuestions,
  convertExcelRowsToQuestions,
  downloadFile,
} from "@/hooks/common";
import BulkImageMCQUpload from "@/components/question-forms/bulk-image-MCQ-upload";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type Difficulty = "easy" | "medium" | "hard";
type QuestionType = "mcq_text" | "mcq_image" | "paragraph";

interface CreateQuestionPayload {
  type: QuestionType;
  classId: string;
  subjectId: string;
  topicId: string;
  text?: string;
  paragraph?: string;
  options?: {
    id: string;
    text?: string;
    mediaUrl?: string;
    isCorrect: boolean;
  }[];
  subQuestions?: any[];
  marks: number;
  negativeMarks: number;
  correctAnswer?: string;
  difficulty: Difficulty;
}

/* ------------------------------------------------------------------ */
/* Validation */
/* ------------------------------------------------------------------ */

function validatePayload(payload: CreateQuestionPayload) {
  if (!payload.classId) throw new Error("Class is required");
  if (!payload.subjectId) throw new Error("Subject is required");
  // if (!payload.topicId) throw new Error("Topic is required");
  if (!payload.marks || payload.marks <= 0)
    throw new Error("Marks must be greater than 0");
  if (payload.negativeMarks < 0)
    throw new Error("Negative marks must be 0 or greater");
  if (!payload.difficulty) throw new Error("Difficulty is required");

  if (
    payload.type === "mcq_text" &&
    (!payload.options || payload.options.length < 2)
  ) {
    throw new Error("MCQ must have at least two options");
  }

  if (
    payload.type === "paragraph" &&
    (!payload.subQuestions || payload.subQuestions.length === 0)
  ) {
    throw new Error("Paragraph question must have sub-questions");
  }
}

/* ------------------------------------------------------------------ */
/* Page */
/* ------------------------------------------------------------------ */

export default function CreateQuestionPage() {
  const router = useRouter();

  /* Metadata */
  const [selectedClass, setSelectedClass] = useState<ClassLevel | "">("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [topicNameInput, setTopicNameInput] = useState("");
  const [topics, setTopics] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [questionType, setQuestionType] = useState<QuestionType>("mcq_text");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileUpload, setFileUpload] = useState<any[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);

  const [isFileUpload, setIsFileUpload] = useState(false);

  /* Question content (received from child forms) */
  const [mcqData, setMcqData] = useState<any>(null);
  const [paragraphData, setParagraphData] = useState<any>(null);

  const filteredSubjects = useMemo(
    () =>
      SUBJECTS.filter((s) =>
        !selectedClass
          ? true
          : s.classLevels.some((level) => level.trim() === selectedClass.trim())
      ),
    [selectedClass]
  );

  const loadTopics = async (classId?: string, subjectId?: string) => {
    if (!classId || !subjectId) {
      setTopics([]);
      return;
    }

    try {
      setTopicsLoading(true);
      const res: any = await fetchTopicsApi({ classId, subjectId });
      setTopics(Array.isArray(res?.topics) ? res.topics : []);
    } catch (error) {
      console.error("Failed to load topics", error);
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedTopic("");
    setTopicNameInput("");
    loadTopics(selectedClass || undefined, selectedSubject || undefined);
  }, [selectedClass, selectedSubject]);

  const handleAddTopic = async () => {
    const topicName = topicNameInput.trim();

    if (!selectedClass) {
      alert("Please select class first");
      return;
    }

    if (!selectedSubject) {
      alert("Please select subject first");
      return;
    }

    if (!topicName) {
      alert("Please enter a topic name");
      return;
    }

    try {
      setCreatingTopic(true);
      const res: any = await createTopicApi({
        name: topicName,
        classId: selectedClass,
        subjectId: selectedSubject,
      });

      const createdTopic = res?.topic;
      await loadTopics(selectedClass, selectedSubject);

      if (createdTopic?._id) {
        setSelectedTopic(createdTopic._id);
      }

      setTopicNameInput("");
    } catch (error) {
      console.error("Failed to create topic", error);
      alert("Failed to create topic");
    } finally {
      setCreatingTopic(false);
    }
  };

  // on questionType change, reset mcqData and paragraphData and fileUpload
  useEffect(() => {
    setMcqData(null);
    setParagraphData(null);
    setFileUpload([]);
    setUploadedFile(null);
    setZipFile(null);
  }, [questionType, isFileUpload]);

  /* ------------------------------------------------------------------ */
  /* Save */
  /* ------------------------------------------------------------------ */

  const handleSave = async () => {
    try {
      setIsLoading(true);
      if (!selectedClass) {
        alert("Please select class");
        setIsLoading(false);
        return;
      }
      if (!selectedSubject) {
        alert("Please select subject");
        setIsLoading(false);
        return;
      }
      const basePayload = {
        classId: selectedClass,
        subjectId: selectedSubject,
        topicId: selectedTopic,
        difficulty,
        marks,
        negativeMarks,
      };
      console.log(questionType, mcqData, paragraphData);
      if (questionType === "mcq_text" && !mcqData) {
        alert("Please fill question details");
        setIsLoading(false);
        return;
      }

      let payload: CreateQuestionPayload;

      switch (questionType) {
        case "mcq_text":
        case "mcq_image":
          payload = {
            ...basePayload,
            type: "mcq_text",
            text: mcqData?.text,
            options: mcqData?.options,
            correctAnswer: mcqData?.options.find((opt: any) => opt.isCorrect)
              ?.id,
          };
          break;

        case "paragraph":
          payload = {
            ...basePayload,
            type: "paragraph",
            text: paragraphData?.text,
            paragraph: paragraphData?.paragraph,
            subQuestions: paragraphData?.subQuestions,
          };
          break;

        default:
          throw new Error("Unsupported question type");
      }
      console.log(payload);
      // validatePayload(payload);
      const formData = new FormData();
      const isFormdataNeeded =
        questionType === "mcq_text" || questionType === "paragraph";
      // for the mcq with image type, we need to handle file uploads
      if (isFormdataNeeded) {
        formData.append("payload", JSON.stringify(payload));
      }

      if (mcqData) {
        // Question image
        if (mcqData.questionImage !== null) {
          formData.append("media", mcqData.questionImage);
        }

        // Option images
        mcqData.options.forEach((opt: any) => {
          if (opt.image) {
            formData.append("media", opt.image, `option_${opt.id}`);
          }
        });
      }

      // DEBUG
      for (let p of formData.entries()) {
        console.log(p[0], p[1]);
      }
      
      // return
      const res = await createQuestionApi(
        isFormdataNeeded ? formData : payload,
        !!isFormdataNeeded
      );
      console.log("Create question response:", res);

      const { success, question } = res;
      if (success !== true) throw new Error("Failed to create question");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // createBulkQuestionsApi
  const handleBulkUpload = async (questionType: QuestionType) => {
    try {
      setIsLoading(true);
      let questions: any[] = [];
      const formData = new FormData();
      if (questionType == "mcq_text") {
        questions = convertExcelRowsToQuestions(fileUpload);
      } else if (questionType == "paragraph") {
        questions = convertExcelRowsToParagraphQuestions(fileUpload);
      }
      if (questionType === "mcq_image") {
         if (!uploadedFile) {
          alert("Please upload excel file");
          setIsLoading(false);
          return;
        }
        if (!zipFile) {
          alert("Please upload zip file containing images");
          setIsLoading(false);
          return;
        }
       
        formData.append("excel", uploadedFile);
        formData.append("images", zipFile);
      }
    console.log("Bulk upload questions:", questions);
      const res =
        questionType === "mcq_image"
          ? await bulkImageUploadApi(formData)
          : await createBulkQuestionsApi(questions, false);
            
      if (!res.success) {
        throw new Error(res.message || "Bulk upload failed");
      }

      alert(
        `Uploaded ${res.createdCount} questions\n` +
          (res.failedCount ? `Failed: ${res.failedCount}` : "")
      );

      console.table(res.errors || []);
      await loadTopics(selectedClass || undefined, selectedSubject || undefined);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/questions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Create New Question</h2>
          <p className="text-muted-foreground">
            Add a question to the master database
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Classification</CardTitle>
            <CardDescription>Categorize this question</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={selectedClass}
                onValueChange={(v) => setSelectedClass(v as ClassLevel)}
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
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                disabled={!selectedClass}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <Select
                value={selectedTopic}
                onValueChange={setSelectedTopic}
                disabled={!selectedSubject || topicsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={topicsLoading ? "Loading topics..." : "Select Topic"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {topics.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No topics found
                    </SelectItem>
                  ) : null}
                  {topics.map((t) => (
                    <SelectItem key={t._id || t.id} value={t._id || t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Type a new topic name"
                  value={topicNameInput}
                  onChange={(e) => setTopicNameInput(e.target.value)}
                  disabled={!selectedClass || !selectedSubject}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTopic}
                  disabled={!selectedClass || !selectedSubject || creatingTopic}
                >
                  {creatingTopic ? "Adding..." : "Add Topic"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Topics are loaded from the database. Add a missing topic here and it will appear in the dropdown.
              </p>
            </div>

            <div className="pt-4 border-t space-y-2">
              <Label>Difficulty</Label>
              <RadioGroup
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
                className="flex justify-between gap-4 mt-2"
              >
                {["easy", "medium", "hard"].map((d) => (
                  <div key={d} className="flex items-center gap-2">
                    <RadioGroupItem value={d} id={d} />
                    <Label htmlFor={d}>{d}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Marks</Label>
              <Input
                type="number"
                min={1}
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
              />
            </div>
            {/* negativeMarks */}
            <div className="space-y-2">
              <Label>Negative Marks</Label>
              <Input
                type="number"
                min={0}
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(Number(e.target.value))}
              />
            </div>
            {/* toggle for file or single input question  */}
            <div className="space-y-2">
              <Label>File Upload</Label>
              <Switch
                checked={isFileUpload}
                onCheckedChange={(v) => setIsFileUpload(v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Question Content */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Question Content</CardTitle>
          </CardHeader>

          <CardContent>
            {
              <Tabs
                value={questionType}
                onValueChange={(v) => setQuestionType(v as QuestionType)}
              >
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="mcq_text" className="cursor-pointer">
                    Text MCQ
                  </TabsTrigger>
                  <TabsTrigger value="mcq_image" className="cursor-pointer">
                    Image MCQ
                  </TabsTrigger>
                  <TabsTrigger value="paragraph" className="cursor-pointer">
                    Paragraph
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mcq_text">
                  {isFileUpload ? (
                    <div className="flex justify-between items-center space-y-4">
                      <FileUploadForm
                        label="Upload MCQ Questions"
                        onRowsChange={setFileUpload}
                        onFileChange={setUploadedFile}
                        accept=".xlsx,.xls"
                        parseExcel
                      />

                      <Button
                        className="cursor-pointer"
                        variant="outline"
                        onClick={() =>
                          downloadFile(
                            "/sample_file/mcq_text_questions_upload_template.xlsx",
                            "mcq_text_questions_upload_template.xlsx"
                          )
                        }
                      >
                        <Download /> Sample File
                      </Button>
                    </div>
                  ) : (
                    <MCQForm onChange={setMcqData} />
                  )}
                </TabsContent>

                <TabsContent value="mcq_image">
                  {isFileUpload ? (
                      <BulkImageMCQUpload
                        onFileUpload={setUploadedFile}
                        onZipUpload={setZipFile}
                      />
                  ) : (
                    <ImageMCQForm onChange={setMcqData} />
                  )}
                </TabsContent>

                <TabsContent value="paragraph">
                  {isFileUpload ? (
                    <div className="flex justify-between items-center space-y-4">
                      <FileUploadForm
                        label="Upload Paragraph Questions"
                        parseExcel={true} 
                        onRowsChange={setFileUpload}
                        onFileChange={setUploadedFile}
                        accept=".xlsx,.xls"
                      />

                      <Button
                        className="cursor-pointer"
                        variant="outline"
                        onClick={() =>
                          downloadFile(
                            "/sample_file/paragraph_questions_upload_template.xlsx",
                            "paragraph_questions_upload_template.xlsx"
                          )
                        }
                      >
                        <Download /> Sample File
                      </Button>
                    </div>
                  ) : (
                    <ParagraphForm onChange={setParagraphData} />
                  )}
                </TabsContent>
              </Tabs>
            }

            <div className="flex justify-end gap-4 mt-8">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  isFileUpload ? handleBulkUpload(questionType) : handleSave()
                }
                disabled={isLoading}
                className="cursor-pointer"
              >
                {isLoading ? "Saving..." : "Save Question"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
