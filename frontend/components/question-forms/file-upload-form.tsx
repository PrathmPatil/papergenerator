"use client";

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";

type FileUploadFormProps = {
  label: string;
  accept: string;
  parseExcel?: boolean;
  onFileChange: (file: File | null) => void;
  onRowsChange?: (rows: any[]) => void;
};

export const FileUploadForm: React.FC<FileUploadFormProps> = ({
  label,
  accept=".xlsx,.xls",
  parseExcel = false,
  onFileChange,
  onRowsChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileName(file?.name || "");
    onFileChange(file);

    if (!file || !parseExcel) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, {
          type: "binary",
        });
        const sheet =
          workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
          trim: true,
        });

        onRowsChange?.(rows);
      } catch (err) {
        console.error("Excel parse error:", err);
        alert("Invalid Excel file");
      }
    };

    reader.readAsBinaryString(file);

    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="block w-full text-sm
          file:mr-4 file:rounded-md file:border-0
          file:bg-primary file:px-4 file:py-2
          file:text-white hover:file:bg-primary/90"
      />

      {fileName && (
        <p className="text-xs text-muted-foreground">
          Selected: {fileName}
        </p>
      )}
    </div>
  );
};

