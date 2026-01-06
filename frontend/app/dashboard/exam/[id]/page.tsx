"use client"

import { useState, useEffect } from "react"
import { Timer, ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

// Mock Exam Data
const EXAM_DATA = {
  title: "Physics Unit 1: Mechanics",
  questions: [
    { id: 1, text: "What is the SI unit of Force?", options: ["Newton", "Joule", "Watt", "Pascal"] },
    {
      id: 2,
      text: "Which law states that for every action there is an equal and opposite reaction?",
      options: ["Newton's 1st Law", "Newton's 2nd Law", "Newton's 3rd Law", "Law of Conservation"],
    },
    {
      id: 3,
      text: "The rate of change of velocity is called...",
      options: ["Speed", "Acceleration", "Momentum", "Displacement"],
    },
    {
      id: 4,
      text: "A ball is thrown vertically upwards. At the highest point, its velocity is...",
      options: ["Maximum", "Zero", "Minimum", "Constant"],
    },
    {
      id: 5,
      text: "Which of the following is a scalar quantity?",
      options: ["Force", "Velocity", "Speed", "Displacement"],
    },
  ],
}

export default function ExamInterfacePage() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: number]: string }>({})
  const [timeLeft, setTimeLeft] = useState(45 * 60) // 45 minutes in seconds

  // Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [EXAM_DATA.questions[currentQuestion].id]: value })
  }

  const progress = (Object.keys(answers).length / EXAM_DATA.questions.length) * 100

  const handleSubmit = () => {
    // Submit logic would go here
    router.push("/dashboard/my-papers")
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Exam Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-bold">{EXAM_DATA.title}</h2>
          <p className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {EXAM_DATA.questions.length}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md font-mono font-medium">
            <Timer className={`h-4 w-4 ${timeLeft < 300 ? "text-red-500" : "text-primary"}`} />
            <span className={timeLeft < 300 ? "text-red-500" : ""}>{formatTime(timeLeft)}</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default">Submit Exam</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have answered {Object.keys(answers).length} out of {EXAM_DATA.questions.length} questions. Once
                  submitted, you cannot change your answers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Yes, Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-2" />

      {/* Question Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed">{EXAM_DATA.questions[currentQuestion].text}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <RadioGroup
            value={answers[EXAM_DATA.questions[currentQuestion].id] || ""}
            onValueChange={handleAnswer}
            className="space-y-4"
          >
            {EXAM_DATA.questions[currentQuestion].options.map((option, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-3 border p-4 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value={option} id={`opt-${idx}`} />
                <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer font-normal text-base">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
        <Separator />
        <CardFooter className="pt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <Button
            onClick={() => setCurrentQuestion((prev) => Math.min(EXAM_DATA.questions.length - 1, prev + 1))}
            disabled={currentQuestion === EXAM_DATA.questions.length - 1}
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Question Navigation Grid (Bottom) */}
      <div className="bg-card p-4 rounded-lg border shadow-sm">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Question Palette</p>
        <div className="flex gap-2 flex-wrap">
          {EXAM_DATA.questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(idx)}
              className={`
                        h-8 w-8 rounded-md text-sm font-medium transition-colors
                        ${currentQuestion === idx ? "ring-2 ring-primary ring-offset-2" : ""}
                        ${answers[q.id] ? "bg-blue-100 text-blue-700 border-blue-200 border" : "bg-muted text-muted-foreground hover:bg-muted/80"}
                    `}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
