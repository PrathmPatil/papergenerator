"use client"

import type React from "react"

import { useState } from "react"
import { FileSpreadsheet, ImageIcon, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function BulkUploadPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "processing" | "success" | "error">("idle")
  const [dragActive, setDragActive] = useState(false)

  // Mock validation results
  const [validationErrors, setValidationErrors] = useState([
    { row: 4, error: "Missing correct option for Q#4" },
    { row: 12, error: "Image 'fig_12.png' not found in upload" },
  ])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Handle file upload simulation
      startUploadSimulation()
    }
  }

  const startUploadSimulation = () => {
    setUploadStatus("processing")
    setIsUploading(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          setUploadStatus("success") // Or 'error' to demo errors
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bulk Upload</h2>
        <p className="text-muted-foreground">Import questions from Excel spreadsheets or upload image banks.</p>
      </div>

      <Tabs defaultValue="excel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="excel">Excel Import</TabsTrigger>
          <TabsTrigger value="images">Image Bank Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="excel">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card
                className={`border-2 border-dashed transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted"}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-green-100 p-4 text-green-600">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold">Drag & Drop Excel File</h3>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse from your computer</p>
                  <Button onClick={startUploadSimulation} disabled={isUploading}>
                    {isUploading ? "Uploading..." : "Select Excel File"}
                  </Button>
                  <p className="mt-4 text-xs text-muted-foreground">Supported formats: .xlsx, .csv</p>
                </CardContent>
              </Card>

              {uploadStatus === "processing" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Processing File...</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2 text-right">{uploadProgress}% complete</p>
                  </CardContent>
                </Card>
              )}

              {uploadStatus === "success" && (
                <Alert variant="default" className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Upload Successful!</AlertTitle>
                  <AlertDescription>
                    142 questions have been imported successfully. You can now review them in the Question Bank.
                  </AlertDescription>
                </Alert>
              )}

              {/* Example of Error State - Hidden by default in this mock flow unless toggled manually */}
              {/* 
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors Found</AlertTitle>
                    <AlertDescription>
                        The file could not be fully processed. Please fix the errors below and try again.
                    </AlertDescription>
                </Alert> 
                */}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3 text-muted-foreground">
                  <p>1. Download the standard template below.</p>
                  <p>
                    2. Fill in the questions, ensuring all required fields (Class, Subject, Question Text, Correct
                    Answer) are present.
                  </p>
                  <p>3. Use the 'Type' column to specify 'MCQ', 'Para', or 'Image'.</p>
                  <p>
                    4. For image questions, put the filename in the image column and upload the images in the Image Bank
                    tab.
                  </p>
                  <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                    <DownloadIcon className="mr-2 h-3 w-3" /> Download Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Uploads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        <div className="text-sm">
                          <p className="font-medium">math_q3_2023.xlsx</p>
                          <p className="text-xs text-muted-foreground">Oct 15 • 142 Qs</p>
                        </div>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Done</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        <div className="text-sm">
                          <p className="font-medium">science_final.csv</p>
                          <p className="text-xs text-muted-foreground">Oct 12 • 50 Qs</p>
                        </div>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Partial</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Table for Validation Feedback */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Validation Log (Demo)</CardTitle>
              <CardDescription>Example of how errors are reported to the user.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Row #</TableHead>
                    <TableHead>Error Description</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationErrors.map((err, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{err.row}</TableCell>
                      <TableCell className="text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        {err.error}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-xs">
                          Ignore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card className="border-2 border-dashed border-muted">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-blue-100 p-4 text-blue-600">
                <ImageIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">Upload Question Images</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a folder of images referenced in your Excel sheet. <br />
                Filenames must match exactly.
              </p>
              <Button variant="secondary">Select Folder</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}
