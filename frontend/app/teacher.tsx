"use client"

import { TeacherProvider } from "@/lib/teacher-context"
import type React from "react"

export function Teachers({ children }: { children: React.ReactNode }) {
  return <TeacherProvider>{children}</TeacherProvider>
}
