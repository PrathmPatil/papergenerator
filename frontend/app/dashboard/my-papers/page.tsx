"use client"

import { Clock, CheckCircle2, PlayCircle, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const ASSIGNED_PAPERS = [
  {
    id: 1,
    title: "Physics Unit 1: Mechanics",
    subject: "Physics",
    due: "Tomorrow",
    duration: "45 mins",
    status: "pending",
  },
  { id: 2, title: "Math Algebra Quiz", subject: "Mathematics", due: "Oct 25", duration: "30 mins", status: "pending" },
  {
    id: 3,
    title: "English Literature Mid-Term",
    subject: "English",
    due: "Oct 28",
    duration: "90 mins",
    status: "pending",
  },
]

const COMPLETED_PAPERS = [
  { id: 101, title: "Chemistry Basics", score: "85/100", date: "Oct 10", status: "graded" },
  { id: 102, title: "Geography World Map", score: "Pending", date: "Oct 12", status: "submitted" },
]

export default function StudentPapersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Papers</h2>
        <p className="text-muted-foreground">View your upcoming exams and past results.</p>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Upcoming Exams
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ASSIGNED_PAPERS.map((paper) => (
            <Card key={paper.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline">{paper.subject}</Badge>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">New</Badge>
                </div>
                <CardTitle className="text-lg pt-2">{paper.title}</CardTitle>
                <CardDescription>Due: {paper.due}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Duration: {paper.duration}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/dashboard/exam/${paper.id}`} className="w-full">
                  <Button className="w-full">
                    <PlayCircle className="mr-2 h-4 w-4" /> Start Exam
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Completed & Results
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {COMPLETED_PAPERS.map((paper) => (
            <Card key={paper.id} className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{paper.title}</CardTitle>
                <CardDescription>Submitted on {paper.date}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Score</span>
                  <span
                    className={`text-lg font-bold ${paper.status === "graded" ? "text-green-600" : "text-yellow-600"}`}
                  >
                    {paper.score}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full bg-transparent" disabled={paper.status !== "graded"}>
                  <BarChart2 className="mr-2 h-4 w-4" /> View Analysis
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
