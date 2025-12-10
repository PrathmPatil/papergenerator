"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@/lib/user-context"
import { BookOpen, GraduationCap, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoginPage() {
  const { user, login } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleLogin = (role: "master" | "teacher" | "student") => {
    login(role)
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary mb-2">PaperSetter Pro</h1>
        <p className="text-muted-foreground">The comprehensive examination management system</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl w-full">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleLogin("master")}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle>Master Admin</CardTitle>
            <CardDescription>Full control over system, users, and question banks</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="w-full">Login as Master</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleLogin("teacher")}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <CardTitle>Teacher</CardTitle>
            <CardDescription>Create questions, generate papers, and manage classes</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full bg-transparent">
              Login as Teacher
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleLogin("student")}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <CardTitle>Student</CardTitle>
            <CardDescription>Access practice tests, view results, and study materials</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="secondary" className="w-full">
              Login as Student
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Supported Standards: SKG to 12th Class • Multiple Boards • Competitive Exams</p>
      </div>
    </div>
  )
}
