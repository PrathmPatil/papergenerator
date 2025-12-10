"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useUser } from "@/lib/user-context"
import { MoreVertical, Plus, Trash2, Edit2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  email: string
  role: "teacher" | "student"
  status: "active" | "inactive"
  createdDate: string
  class?: string
}

export default function UserManagementPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "Rajesh Kumar",
      email: "rajesh@school.com",
      role: "teacher",
      status: "active",
      createdDate: "2024-10-01",
    },
    {
      id: "2",
      name: "Priya Singh",
      email: "priya@school.com",
      role: "teacher",
      status: "active",
      createdDate: "2024-10-05",
    },
    {
      id: "3",
      name: "Arjun Patel",
      email: "arjun@school.com",
      role: "student",
      status: "active",
      createdDate: "2024-10-10",
      class: "12-A",
    },
    {
      id: "4",
      name: "Ananya Desai",
      email: "ananya@school.com",
      role: "student",
      status: "active",
      createdDate: "2024-10-12",
      class: "12-B",
    },
  ])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState<"all" | "teacher" | "student">("all")
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "teacher" as const })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Only Master can manage users
  if (user?.role !== "master") {
    return (
      <div className="flex h-96 items-center justify-center">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>Only administrators can access user management</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "all" || u.role === filterRole
    return matchesSearch && matchesRole
  })

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    const user = {
      id: String(users.length + 1),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: "active" as const,
      createdDate: new Date().toISOString().split("T")[0],
    }

    setUsers([...users, user])
    setNewUser({ name: "", email: "", role: "teacher" })
    setIsDialogOpen(false)
    toast({
      title: "Success",
      description: `${user.role === "teacher" ? "Teacher" : "Student"} added successfully`,
    })
  }

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter((u) => u.id !== id))
    toast({
      title: "Success",
      description: "User removed successfully",
    })
  }

  const handleToggleStatus = (id: string) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u)))
    toast({
      title: "Success",
      description: "User status updated",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage teachers and students in the system</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new teacher or student account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Enter full name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">User Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "teacher" | "student" })}
                >
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser}>Add User</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === "teacher").length}</div>
            <p className="text-xs text-muted-foreground">Registered educators</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === "student").length}</div>
            <p className="text-xs text-muted-foreground">Enrolled learners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">Online right now</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-2"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as "all" | "teacher" | "student")}
        >
          <option value="all">All Roles</option>
          <option value="teacher">Teachers</option>
          <option value="student">Students</option>
        </select>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Showing {filteredUsers.length} users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium py-3 px-4">Name</th>
                  <th className="text-left font-medium py-3 px-4">Email</th>
                  <th className="text-left font-medium py-3 px-4">Role</th>
                  <th className="text-left font-medium py-3 px-4">Status</th>
                  <th className="text-left font-medium py-3 px-4">Joined</th>
                  <th className="text-left font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{u.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.role === "teacher" ? "default" : "secondary"}>
                        {u.role === "teacher" ? "Teacher" : "Student"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.status === "active" ? "default" : "outline"}>
                        {u.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{u.createdDate}</td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(u.id)}>
                            {u.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteUser(u.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
