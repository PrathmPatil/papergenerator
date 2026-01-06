"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUser } from "@/lib/user-context";
import { MoreVertical, Plus, Trash2, Edit2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAllUsersApi,
  registerUserApi,
  toggleUserDeleteApi,
  toggleUserStatusApi,
  updateUserApi,
} from "@/utils/apis";
import { dateConverter, dateConverterUTC } from "@/hooks/common";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "teacher" | "student";
  isActive: true | false;
  isDeleted: true | false;
  createdAt: string;
  class?: string;
}

export default function UserManagementPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "teacher" | "student">(
    "all"
  );
  const [newUser, setNewUser] = useState({
    _id: undefined,
    name: "",
    email: "",
    role: "student" as "teacher" | "student",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetchAllUsersApi();
      const { data, success } = response;
      if (success) {
        setUsers(data);
      } else {
        setUsers([]);
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Only Master can manage users
  // if (user?.role !== "master") {
  //   return (
  //     <div className="flex h-96 w-full items-center justify-center">
  //       <Card className="border-destructive">
  //         <CardHeader>
  //           <CardTitle className="text-destructive">Access Denied</CardTitle>
  //           <CardDescription>
  //             Only administrators can access user management
  //           </CardDescription>
  //         </CardHeader>
  //       </Card>
  //     </div>
  //   );
  // }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const user = {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      password: newUser.role === "teacher" ? "Teacher@123" : "Student@123",
    };
    try {
      const res = await registerUserApi(user);
      const { data, success } = res;
      if (!success) {
        toast({
          title: "Error",
          description: "Failed to add user",
          variant: "destructive",
        });
        return;
      } else{
        fetchUsers();
        toast({
          title: "Success",
          description: `${
            user.role === "teacher" ? "Teacher" : "Student"
          } added successfully`,
        });
      }
      console.log(res);
      // localStorage.setItem("users", JSON.stringify([...users, user]));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive",
      });
    }
    // setUsers([...users, user])
    setNewUser({ _id: undefined, name: "", email: "", role: "student" });
    setIsDialogOpen(false);
    toast({
      title: "Success",
      description: `${
        user.role === "teacher" ? "Teacher" : "Student"
      } added successfully`,
    });
  };
  // handleUpdateUser

  const handleUpdateUser = async (id: string) => {
    // setUsers(users.filter((u) => u.id !== id))
    try {
      const payload = { ...newUser, _id: id }; 
      console.log(payload)
      const res = await updateUserApi(id,payload);
      console.log(res)
      const {success, message} = res;
      if(success){
        toast({
          title: "Success",
          description: message,
        });
        setUsers(prev => prev.map(u => u._id === id ? {...u, ...payload} : u))
        clearForm();
      }else {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    }
    toast({
      title: "Success",
      description: "User removed successfully",
    });
  };

  const handleDeleteUser = async (id: string) => {
    // setUsers(users.filter((u) => u.id !== id))
    try {
      const res = await toggleUserDeleteApi(id, { isDeleted: true });
      const { success, message } = res;
      if (success) {
        toast({
          title: "Success",
          description: message,
        });
        setUsers(users.filter((u) => u._id !== id));
      }else {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    }

  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    setStatusLoading(true);
    console.log(id, isActive)
    try {
      const res = await toggleUserStatusApi(id, {
        isActive: isActive,
      });
      const { data, success } = res;
      if (success) {
        console.log(users)
        setUsers(
          users.map((u) =>
            u._id === id
              ? { ...u, isActive: isActive ?? false }
              : u
          )
        );
        toast({
          title: "Success",
          description: "User isActive updated",
        });
      }else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setStatusLoading(false);
    }
  };

  const clearForm = () => {
    setNewUser({ _id: undefined, name: "", email: "", role: "student" });
    setIsDialogOpen(false);
    setIsEdit(false);
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage teachers and students in the system
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
             {!!isEdit ? "Edit User" : "Add New"} User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{!!isEdit ? "Edit User" : "Add New"} User</DialogTitle>
              <DialogDescription>
               {!!isEdit ? "Update" : "Create"} a new teacher or student account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Enter full name"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  disabled={!!isEdit}
                />
              </div>
              <div>
                <label className="text-sm font-medium">User Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      role: e.target.value as "teacher" | "student",
                    })
                  }
                  disabled={!!isEdit}
                >
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {clearForm()}}
                >
                  Cancel
                </Button>
                <Button onClick={() => {!!isEdit ? handleUpdateUser(newUser._id) : handleAddUser()}}>{!!isEdit ? "Update" : "Add"} User</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-full w-full bg-background rounded-md" />
              </div>
            ))}
            <div className="animate-pulse">
              <div className="h-full w-full bg-background rounded-md" />
            </div>
            <div className="animate-pulse">
              <div className="h-full w-full bg-background rounded-md" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active accounts
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Teachers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter((u) => u.role === "teacher").length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registered educators
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter((u) => u.role === "student").length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enrolled learners
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter((u) => u.isActive === true).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Online right now
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="w-full grid gap-4 ">
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
                  onChange={(e) =>
                    setFilterRole(
                      e.target.value as "all" | "teacher" | "student"
                    )
                  }
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
                  <CardDescription>
                    Showing {filteredUsers.length} users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left font-medium py-3 px-4">
                            Name
                          </th>
                          <th className="text-left font-medium py-3 px-4">
                            Email
                          </th>
                          <th className="text-left font-medium py-3 px-4">
                            Role
                          </th>
                          <th className="text-left font-medium py-3 px-4">
                            Status
                          </th>
                          <th className="text-left font-medium py-3 px-4">
                            Joined
                          </th>
                          <th className="text-left font-medium py-3 px-4">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr
                            key={u._id}
                            className="border-b hover:bg-muted/50"
                          >
                            <td className="py-3 px-4 font-medium">{u.name}</td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {u.email}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  u.role === "teacher" ? "default" : "secondary"
                                }
                              >
                                {u.role === "teacher" ? "Teacher" : "Student"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={u.isActive ? "default" : "outline"}>
                                {u.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {dateConverterUTC(u.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={()=>{setIsEdit(true); setIsDialogOpen(true); setNewUser(u) }}>
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleStatus(u._id, !u.isActive)
                                    }
                                  >
                                    <span
                                      className={`mr-2 h-4 w-4 ${
                                        u.isActive 
                                          ? "bg-red-500"
                                          : "bg-green-500"
                                      } rounded-full`}
                                    ></span>
                                    {u.isActive 
                                      ? "Deactivate"
                                      : "Activate"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteUser(u._id)}
                                    className="text-destructive"
                                  >
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
          </>
        )}
      </div>
    </div>
  );
}
