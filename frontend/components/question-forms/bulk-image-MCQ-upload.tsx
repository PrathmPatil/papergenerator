"use client";

import React, { useEffect, useState } from "react";
import { FileUploadForm } from "./file-upload-form";
import { Button } from "../ui/button";
import { downloadFile } from "@/hooks/common";
import { Download } from "lucide-react";

export default function BulkImageMCQUpload({
  onFileUpload,
  onZipUpload,
  questionType = "mcq_image",
}: {
  onFileUpload: (file: File | null) => void;
  onZipUpload: (file: File | null) => void;
  questionType?: "mcq_image" | "image_subquestions";
}) {

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);

  useEffect(() => {
    onFileUpload(excelFile);
    onZipUpload(zipFile);
  }, [excelFile, zipFile]);

  return (
    <div className="space-y-6">
      {questionType === "mcq_image" && (
        <div className="rounded-md border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
          <p className="font-medium text-foreground">Excel format for image MCQ (one question, one image, multiple options)</p>
          <p>
            Each row represents one complete MCQ question with a question image and option images.
          </p>
          <p>
            Required columns: classId, subjectId, topicId, type, difficulty, marks, negativeMarks, questionText, questionImage, optionAText, optionAImage, optionBText, optionBImage, optionCText, optionCImage, optionDText, optionDImage, correctAnswer.
          </p>
        </div>
      )}
      
      {questionType === "image_subquestions" && (
        <div className="rounded-md border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
          <p className="font-medium text-foreground">Excel format for image with multiple sub-questions (grouped)</p>
          <p>
            Add one row per sub-question and keep the same value in <b>question_group_id</b> (or <b>groupId</b>)
            for all rows that belong to the same image block.
          </p>
          <p>
            Recommended columns: classId, subjectId, topicId, type, question_group_id, questionImage,
            instructionText, subQuestionId, subQuestionText, optionAText...optionDText, correctAnswer, marks, difficulty.
          </p>
        </div>
      )}

      <div className="space-y-2 flex justify-between items-center">
        <FileUploadForm
          label="Upload Excel File"
          accept=".xlsx,.xls"
          parseExcel
          onFileChange={setExcelFile}
        />
        <Button
          className="cursor-pointer"
          variant="outline"
          onClick={() => {
            const templatePath = questionType === "image_subquestions" 
              ? "/sample_file/mcq_image_bulk_upload_template.xlsx"
              : "/sample_file/mcq_image_questions_template.xlsx";
            const templateName = questionType === "image_subquestions"
              ? "image_subquestions_bulk_template.xlsx"
              : "mcq_image_questions_template.xlsx";
            downloadFile(templatePath, templateName);
          }}
        >
          <Download /> Sample File
        </Button>
      </div>
      <div className="space-y-2 flex justify-between items-center">
        <FileUploadForm
          label="Upload Images ZIP"
          accept=".zip"
          onFileChange={setZipFile}
        />
        <Button
          className="cursor-pointer"
          variant="outline"
          onClick={() =>
            downloadFile(
              "/sample_file/mcq_image_bulk_upload_images.zip",
              "mcq_image_bulk_upload_images.zip"
            )
          }
        >
          <Download /> Sample File
        </Button>
      </div>
    </div>
  );
}
