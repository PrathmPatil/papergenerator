"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { User, UserRole } from "./types"
import { MOCK_USERS } from "./mock-data"

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  login: (role: UserRole) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // Persist user for demo purposes
  useEffect(() => {
    const stored = localStorage.getItem("paper_setter_user")
    if (stored) {
      setUser(JSON.parse(stored))
    } else {
      // Default to Master for first visit for convenience
      setUser(MOCK_USERS[0])
    }
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem("paper_setter_user", JSON.stringify(user))
    } else {
      localStorage.removeItem("paper_setter_user")
    }
  }, [user])

  const login = (role: UserRole) => {
    const mockUser = MOCK_USERS.find((u) => u.role === role) || MOCK_USERS[0]
    setUser(mockUser)
  }

  return <UserContext.Provider value={{ user, setUser, login }}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
