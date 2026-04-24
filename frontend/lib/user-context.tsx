"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import type { User, UserRole } from "./types";
import { useRouter } from "next/navigation";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  login: (role: UserRole) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  // Persist user for demo purposes
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
    } 
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      router.push("/dashboard");
      // localStorage.setItem("paper_setter_user", JSON.stringify(user))
    } else {
      // localStorage.removeItem("user");
      // localStorage.removeItem("token");
      // router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    }
  }, [token]);

  const login = (role: UserRole) => {
    // const mockUser = MOCK_USERS.find((u) => u.role === role) || MOCK_USERS[0]
    // setUser(mockUser)
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/");
  }

  return (
    <UserContext.Provider value={{ user, setUser, setToken, token, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
