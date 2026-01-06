"use client";

import React, { useEffect, useState } from "react";
import { FileUploadForm } from "./file-upload-form";
import { Button } from "../ui/button";
import { downloadFile } from "@/hooks/common";
import { Download } from "lucide-react";

export default function BulkImageMCQUpload({
  onFileUpload,
  onZipUpload,
}: {
  onFileUpload: (file: File | null) => void;
  onZipUpload: (file: File | null) => void;
}) {

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);

  useEffect(() => {
    onFileUpload(excelFile);
    onZipUpload(zipFile);
  }, [excelFile, zipFile]);

  return (
    <div className="space-y-6">
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
          onClick={() =>
            downloadFile(
              "/sample_file/mcq_image_bulk_upload_template.xlsx",
              "mcq_image_bulk_upload_template.xlsx"
            )
          }
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
