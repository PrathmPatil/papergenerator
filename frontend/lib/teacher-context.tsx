"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { User, UserRole } from "./types"
import { MOCK_USERS } from "./mock-data"
import { useRouter } from "next/navigation"

interface TeacherContextType {
  user: User | null
  setUser: (user: User | null) => void
  login: (role: UserRole) => void
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined)

export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  // Persist user for demo purposes
  useEffect(() => {
    const stored = localStorage.getItem("user")
    const { role } = JSON.parse(stored || "{}")
    if (role == "teacher") {
      
    }
  }, [])


  const login = (role: UserRole) => {
    // const mockUser = MOCK_USERS.find((u) => u.role === role) || MOCK_USERS[0]
    // setUser(mockUser)
  }

  return <TeacherContext.Provider value={{ user, setUser, login }}>{children}</TeacherContext.Provider>
}

export function useTeacher() {
  const context = useContext(TeacherContext)
  if (context === undefined) {
    throw new Error("useTeacher must be used within a UserProvider")
  }
  return context
}
