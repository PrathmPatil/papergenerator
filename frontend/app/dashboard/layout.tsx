import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppFooter } from "@/components/app-footer"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
        <AppFooter />
      </main>
    </div>
  )
}
