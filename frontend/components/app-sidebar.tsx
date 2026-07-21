"use client"

import { useState } from "react"
import {
  Users,
  BookOpen,
  Tags,
  FileText,
  FileSpreadsheet,
  Settings,
  UploadCloud,
  LayoutDashboard,
  GraduationCap,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUser } from "@/lib/user-context"
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

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useUser()
  const [collapsed, setCollapsed] = useState(false)

  if (!user) return null

  const commonLinks = [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }]

  const fullAccessLinks = [
    { name: "Question Bank", href: "/dashboard/questions", icon: BookOpen },
    { name: "Topics", href: "/dashboard/topics", icon: Tags },
    { name: "Paper Generator", href: "/dashboard/generate", icon: FileText },
    { name: "Papers", href: "/dashboard/papers", icon: GraduationCap },
    { name: "PDF Converter", href: "/dashboard/pdf-converter", icon: UploadCloud },
    { name: "DOCX to Excel", href: "/dashboard/docx-to-excel", icon: FileSpreadsheet },
   // { name: "Bulk Upload", href: "/dashboard/upload", icon: Upload },
    { name: "User Management", href: "/dashboard/users", icon: Users },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]

  const studentLinks = [
    { name: "My Papers", href: "/dashboard/my-papers", icon: FileText },
    { name: "Papers", href: "/dashboard/papers", icon: GraduationCap },
  ]

  const role = String(user.role || "").toLowerCase()
  const hasFullAccess =
    role === "master" || role === "administrative" || role === "teacher"

  const links = [
    ...commonLinks,
    ...(hasFullAccess ? fullAccessLinks : studentLinks),
  ]

  const handleLogout = () => {
    logout()
  }

  return (
    <div
      className={cn(
        "flex h-full shrink-0 flex-col border-r bg-card text-card-foreground transition-all duration-300",
        collapsed ? "w-16 min-w-16 max-w-16" : "w-64 min-w-64 max-w-64"
      )}
    >
      <div
        className={cn(
          "relative flex h-14 items-start border-b px-3 pt-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-start",
            collapsed ? "justify-center" : "gap-2"
          )}
        >
          <img
            src="/app-icon.png"
            alt="PaperGenerator"
            className="mt-0.5 h-8 w-8 shrink-0 rounded-lg object-cover"
          />
          {!collapsed && (
            <span className="truncate text-lg font-bold leading-8 tracking-tight text-primary">
              PaperGenerator
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "mt-0.5 h-8 w-8",
            collapsed && "absolute left-14 z-10 border bg-background shadow-sm"
          )}
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.name : undefined}
              className={cn(
                "flex items-start rounded-md py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                pathname === link.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <link.icon className="mt-0.5 h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate leading-5">{link.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <div className={cn("border-t", collapsed ? "p-2" : "p-4")}>
        <div
          className={cn(
            "mb-4 flex items-start",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {user.name?.charAt(0) || "U"}
          </div>
          {!collapsed && (
            <div className="overflow-hidden pt-0.5">
              <p className="truncate text-sm font-medium leading-5">{user.name}</p>
              <p className="truncate text-xs leading-4 text-muted-foreground capitalize">
                {user.role}
              </p>
            </div>
          )}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full bg-transparent",
                collapsed ? "justify-center px-0" : "justify-start gap-2"
              )}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && "Sign Out"}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out? You will need to log in again
                to access your dashboard.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>
                Yes, Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
