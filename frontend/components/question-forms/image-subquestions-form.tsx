"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MCQForm } from "./mcq-form";

type FinalSubQuestion = {
  id: string;
  type: string;
  text: string;
  options?: any[];
  correctAnswer?: string | boolean;
  marks: number;
  negativeMarks: number;
};

type UISubQuestion = {
  id: number;
  isOpen: boolean;
  data?: any;
};

type ImageSubQuestionsData = {
  text: string;
  questionImage: File | null;
  subQuestions: FinalSubQuestion[];
};

type ImageSubQuestionsFormProps = {
  onChange: React.Dispatch<React.SetStateAction<ImageSubQuestionsData>>;
};

export function ImageSubQuestionsForm({ onChange }: ImageSubQuestionsFormProps) {
  const [text, setText] = useState("");
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [subQuestions, setSubQuestions] = useState<UISubQuestion[]>([
    { id: Date.now(), isOpen: true },
  ]);

  useEffect(() => {
    const formattedSubQuestions: FinalSubQuestion[] = subQuestions
      .map((q, index) => {
        if (!q.data) return null;

        const sqId = `SQ${index + 1}`;
        const d = q.data;

        if (d.type === "mcq_text") {
          const correct = d.options?.find((o: any) => o.isCorrect);

          return {
            id: sqId,
            type: "mcq_text",
            text: d.text || "",
            options: d.options?.map((o: any) => ({
              id: o.id,
              text: o.text,
              mediaUrl: o.mediaUrl,
              isCorrect: o.id === correct?.id,
            })),
            correctAnswer: correct?.id,
            marks: d.marks ?? 1,
            negativeMarks: d.negativeMarks ?? 0,
          };
        }

        if (d.type === "true_false") {
          return {
            id: sqId,
            type: "true_false",
            text: d.text,
            correctAnswer: d.correctAnswer,
            marks: d.marks ?? 1,
            negativeMarks: d.negativeMarks ?? 0,
          };
        }

        if (d.type === "short_answer") {
          return {
            id: sqId,
            type: "short_answer",
            text: d.text,
            correctAnswer: d.correctAnswer,
            marks: d.marks ?? 2,
            negativeMarks: d.negativeMarks ?? 0,
          };
        }

        return null;
      })
      .filter(Boolean) as FinalSubQuestion[];

    onChange({
      text,
      questionImage,
      subQuestions: formattedSubQuestions,
    });
  }, [text, questionImage, subQuestions, onChange]);

  useEffect(() => {
    if (!questionImage) {
      setImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(questionImage);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [questionImage]);

  const addSubQuestion = () => {
    setSubQuestions((prev) => [...prev, { id: Date.now(), isOpen: true }]);
  };

  const toggleQuestion = (id: number) => {
    setSubQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, isOpen: !q.isOpen } : q)));
  };

  const removeQuestion = (id: number) => {
    if (subQuestions.length <= 1) return;
    setSubQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateSubQuestionData = (id: number, data: any) => {
    setSubQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, data } : q)));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Instruction Text</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter the instruction for the image-based question set"
        />
      </div>

      <div className="space-y-2">
        <Label>Question Image</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setQuestionImage(e.target.files?.[0] || null)}
        />
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Question preview"
            className="mt-2 max-h-72 rounded-md border object-contain"
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between">
          <Label>Sub-Questions</Label>
          <Button size="sm" variant="outline" onClick={addSubQuestion}>
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </div>

        {subQuestions.map((q, index) => (
          <Card key={q.id}>
            <div className="flex justify-between border-b p-4">
              <span>Question {index + 1}</span>

              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => toggleQuestion(q.id)}>
                  {q.isOpen ? <ChevronUp /> : <ChevronDown />}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={subQuestions.length <= 1}
                  onClick={() => removeQuestion(q.id)}
                >
                  <Trash className="text-red-500" />
                </Button>
              </div>
            </div>

            <CardContent className={q.isOpen ? "block" : "hidden"}>
              <MCQForm onChange={(data: any) => updateSubQuestionData(q.id, data)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}