"use client"

import {
  Users,
  BookOpen,
  FileText,
  Upload,
  Settings,
  LayoutDashboard,
  GraduationCap,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  const router = useRouter()
  const { user, setUser, logout } = useUser()

  if (!user) return null

  const commonLinks = [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }]

  const masterLinks = [
    { name: "Question Bank", href: "/dashboard/questions", icon: BookOpen },
    { name: "Paper Generator", href: "/dashboard/generate", icon: FileText },
    { name: "Papers", href: "/dashboard/papers", icon: GraduationCap },
    // { name: "Bulk Upload", href: "/dashboard/upload", icon: Upload },
    { name: "User Management", href: "/dashboard/users", icon: Users },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]

  const teacherLinks = [
    { name: "Question Bank", href: "/dashboard/questions", icon: BookOpen },
    { name: "Paper Generator", href: "/dashboard/generate", icon: FileText },
    // { name: "Bulk Upload", href: "/dashboard/upload", icon: Upload },
    { name: "My Classes", href: "/dashboard/classes", icon: GraduationCap },
  ]

  const studentLinks = [
    { name: "My Papers", href: "/dashboard/my-papers", icon: FileText },
    { name: "Practice Tests", href: "/dashboard/practice", icon: BookOpen },
    { name: "Results", href: "/dashboard/results", icon: GraduationCap },
  ]

  const links = [
    ...commonLinks,
    ...(user.role === "master"
      ? masterLinks
      : user.role === "teacher"
      ? teacherLinks
      : studentLinks),
  ]

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-bold tracking-tight text-primary">
          PaperSetter Pro
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === link.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">
              {user.role}
            </p>
          </div>
        </div>

        {/* 🔥 SIGN OUT CONFIRMATION */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
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
