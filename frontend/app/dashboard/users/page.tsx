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
import { dateConverterUTC } from "@/hooks/common";
import Joi from "joi";

type UserRole = "master" | "administrative" | "teacher" | "student";

type UserForm = {
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  institute: string;
};

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  institution: string;
  isActive: true | false;
  isDeleted: true | false;
  createdAt: string;
  class?: string;
}

const normalizeRole = (role: string | undefined | null): UserRole => {
  const value = String(role || "")
    .trim()
    .toLowerCase();

  if (value === "master") return "master";
  if (value === "teacher") return "teacher";
  if (value === "administrative" || value === "admin" || value === "administrator") {
    return "administrative";
  }
  return "student";
};

const userSchema = Joi.object({
  _id: Joi.string().optional(),
  name: Joi.string()
    .pattern(/^[A-Za-z\s]+$/)
    .min(3)
    .max(50)
    .required()
    .messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 3 characters",
      "string.pattern.base": "Name can only contain letters and spaces",
      "string.max": "Name must be less than 50 characters",
    }),
  email: Joi.string().email({ tlds: false }).required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format",
  }),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.empty": "Phone is required",
      "string.pattern.base": "Enter valid 10-digit phone number",
    }),
  institute: Joi.string().min(2).required().messages({
    "string.empty": "Institute is required",
  }),
  role: Joi.string().valid("administrative", "teacher", "student").required().messages({
    "string.empty": "Role is required",
    "any.only": "Role must be either administrative, teacher or student",
  }),
});
export default function UserManagementPage() {
  const { user, token } = useUser();
  const { toast } = useToast();
  const currentUserRole = normalizeRole(user?.role);
  const canCreateUsers = currentUserRole === "master" || currentUserRole === "administrative";
  const canModifyUsers = currentUserRole === "master" || currentUserRole === "administrative";
  const assignableRoles: Array<Extract<UserRole, "administrative" | "teacher" | "student">> =
    currentUserRole === "master"
      ? ["administrative", "teacher", "student"]
      : currentUserRole === "administrative"
      ? ["teacher", "student"]
      : [];

  const canManageTargetRole = (targetRole: UserRole) => {
    if (currentUserRole === "master") return targetRole !== "master";
    if (currentUserRole === "administrative") {
      return targetRole === "teacher" || targetRole === "student";
    }
    return false;
  };
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | UserRole>("all");
  const [newUser, setNewUser] = useState<UserForm>({
    name: "",
    email: "",
    phone: "",
    institute: "",
    role: "student" as UserRole,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (!user) return;
    const hasToken = !!token || (typeof window !== "undefined" && !!localStorage.getItem("token"));
    if (!hasToken) return;
    fetchUsers();
  }, [user, token]);

  useEffect(() => {
    if (!isDialogOpen) {
      setErrors({});
      setIsEdit(false);
      setNewUser({
        _id: undefined,
        name: "",
        email: "",
        phone: "",
        institute: "",
        role: "student",
      });
    }
  }, [isDialogOpen]);

  const validateForm = () => {
    const payloadToValidate = {
      ...newUser,
      role: normalizeRole(newUser.role),
    };

    const { error } = userSchema.validate(payloadToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });
    console.log(error);
    if (!error) {
      setErrors({});
      return true;
    }

    const errorObj: any = {};
    error.details.forEach((err) => {
      errorObj[err.path[0]] = err.message;
    });

    setErrors(errorObj);
    return false;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetchAllUsersApi();
      const { data, success } = response;
      if (success) {
        const normalizedUsers = Array.isArray(data)
          ? data.map((u: any) => ({
              ...u,
              role: normalizeRole(u?.role),
            }))
          : [];
        setUsers(normalizedUsers);
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
    const matchesRole =
      filterRole === "all" || normalizeRole(u.role) === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: UserRole) => {
    if (role === "master") return "Master";
    if (role === "administrative") return "Administrative";
    if (role === "teacher") return "Teacher";
    return "Student";
  };

  const handleAddUser = async () => {
    if (!canCreateUsers) {
      toast({
        title: "Access Denied",
        description: "You are not allowed to create users.",
        variant: "destructive",
      });
      return;
    }

    console.log(validateForm());
    if (!validateForm()) return;

    const passwordMap: Record<Extract<UserRole, "administrative" | "teacher" | "student">, string> = {
      administrative: "Administrative@123",
      teacher: "Teacher@123",
      student: "Student@123",
    };

    const safeRole = normalizeRole(newUser.role);
    if (!assignableRoles.includes(safeRole as "administrative" | "teacher" | "student")) {
      toast({
        title: "Access Denied",
        description: "You are not allowed to create this role.",
        variant: "destructive",
      });
      return;
    }

    const user = {
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      institution: newUser.institute,
      role: safeRole,
      password: passwordMap[safeRole as "administrative" | "teacher" | "student"] || "Student@123",
    };    

    try {
      const res = await registerUserApi(user);
      const { data, success, message } = res;
      console.log(res, data, success, message);
      if (success !== true) {
        toast({
          title: message,
          description: "Failed to add user",
          variant: "destructive",

        });
        return;
      } else {
        fetchUsers();
        toast({
          title: "Success",
          description: `${getRoleLabel(user.role)} added successfully`,
          variant: "default",
        });
        setIsDialogOpen(false);
        setNewUser({
          _id: undefined,
          name: "",
          email: "",
          phone: "",
          institute: "",
          role: "student",
        });
      }
      // localStorage.setItem("users", JSON.stringify([...users, user]));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive",
      });
    }
    // setUsers([...users, user])
    // setNewUser({ _id: undefined, name: "", email: "",phone: "", institute: "", role: "student" });
    // setIsDialogOpen(false);
    // toast({
    //   title: "Success",
    //   description: `${
    //     user.role === "teacher" ? "Teacher" : "Student"
    //   } added successfully`,
    // });
  };
  // handleUpdateUser

  const handleUpdateUser = async (id: string) => {
    if (!canModifyUsers) {
      toast({
        title: "Access Denied",
        description: "You are not allowed to modify users.",
        variant: "destructive",
      });
      return;
    }

    // setUsers(users.filter((u) => u.id !== id))
    if (!id) {
      toast({
        title: "Error",
        description: "User ID is missing",
        variant: "destructive",
      });
      return;
    }
    if (!validateForm()) return;
    try {
      const existingUser = users.find((u) => u._id === id);
      if (!existingUser || !canManageTargetRole(normalizeRole(existingUser.role))) {
        toast({
          title: "Access Denied",
          description: "You are not allowed to modify this user.",
          variant: "destructive",
        });
        return;
      }

      const nextRole = normalizeRole(newUser.role);
      if (!assignableRoles.includes(nextRole as "administrative" | "teacher" | "student")) {
        toast({
          title: "Access Denied",
          description: "You are not allowed to assign this role.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        institution: newUser.institute,
        role: nextRole,
      };
      console.log(payload);
      const res = await updateUserApi(id, payload);
      console.log(res);
      const { success, message } = res;
      if (success) {
        toast({
          title: "Success",
          description: message,
        });
        setUsers((prev) =>
          prev.map((u) => (u._id === id ? { ...u, ...payload } : u)),
        );
        clearForm();
      } else {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!canModifyUsers) {
      toast({
        title: "Access Denied",
        description: "You are not allowed to delete users.",
        variant: "destructive",
      });
      return;
    }

    const targetUser = users.find((u) => u._id === id);
    if (!targetUser || !canManageTargetRole(normalizeRole(targetUser.role))) {
      toast({
        title: "Access Denied",
        description: "You are not allowed to delete this user.",
        variant: "destructive",
      });
      return;
    }

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
      } else {
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
    if (!canModifyUsers) {
      toast({
        title: "Access Denied",
        description: "You are not allowed to update user status.",
        variant: "destructive",
      });
      return;
    }

    const targetUser = users.find((u) => u._id === id);
    if (!targetUser || !canManageTargetRole(normalizeRole(targetUser.role))) {
      toast({
        title: "Access Denied",
        description: "You are not allowed to update this user.",
        variant: "destructive",
      });
      return;
    }

    setStatusLoading(true);
    console.log(id, isActive);
    try {
      const res = await toggleUserStatusApi(id, {
        isActive: isActive,
      });
      const { data, success } = res;
      if (success) {
        console.log(users);
        setUsers(
          users.map((u) =>
            u._id === id ? { ...u, isActive: isActive ?? false } : u,
          ),
        );
        toast({
          title: "Success",
          description: "User isActive updated",
        });
      } else {
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
    setNewUser({
      _id: undefined,
      name: "",
      email: "",
      phone: "",
      institute: "",
      role: "student",
    });
    setIsDialogOpen(false);
    setIsEdit(false);
  };
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
          {canCreateUsers && (
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {!!isEdit ? "Edit User" : "Add New"} User
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {!!isEdit ? "Edit User" : "Add New"} User
              </DialogTitle>
              <DialogDescription>
                {!!isEdit ? "Update" : "Create"} a new teacher or student
                account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Enter full name"
                  value={newUser.name}
                  onChange={(e) => {
                    setNewUser({ ...newUser, name: e.target.value });
                    setErrors({ ...errors, name: "" });
                  }}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) => {
                    setErrors({ ...errors, email: "" });
                    setNewUser({ ...newUser, email: e.target.value });
                  }}
                  disabled={!!isEdit}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  placeholder="+91 XXXXXXXXXX"
                  value={newUser.phone}
                  onChange={(e) => {
                    setNewUser({ ...newUser, phone: e.target.value });
                    setErrors({ ...errors, phone: "" });
                  }}
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Institute</label>
                <Input
                  placeholder="Enter Institute name"
                  value={newUser.institute}
                  onChange={(e) => {
                    setNewUser({ ...newUser, institute: e.target.value });
                    setErrors({ ...errors, institute: "" });
                  }}
                />
                {errors.institute && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.institute}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">User Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={newUser.role}
                  onChange={(e) => {
                    setNewUser({
                      ...newUser,
                      role: normalizeRole(e.target.value),
                    });
                    setErrors({ ...errors, role: "" });
                  }}
                >
                  {assignableRoles.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {getRoleLabel(roleOption)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    clearForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!canCreateUsers && !isEdit}
                  onClick={() => {
                    !!isEdit ? handleUpdateUser(newUser?._id as string) : handleAddUser();
                  }}
                >
                  {!!isEdit ? "Update" : "Add"} User
                </Button>
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
                    Administrative
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter((u) => u.role === "administrative").length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Admin users
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
              {/* <Card>
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
              </Card> */}
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
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                    }}
                  />
                </div>
                <select
                  className="rounded-md border border-input bg-background px-3 py-2"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as "all" | UserRole)}
                >
                  <option value="all">All Roles</option>
                  <option value="master">Master</option>
                  <option value="administrative">Administrative</option>
                  <option value="teacher">Teachers</option>
                  <option value="student">Students</option>
                </select>
              </div>

              {/* Users Table */}
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    Active {users.filter((u) => u.isActive === true).length} users
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
                                  normalizeRole(u.role) === "teacher"
                                    ? "default"
                                    : normalizeRole(u.role) === "administrative"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {getRoleLabel(normalizeRole(u.role))}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={u.isActive ? "default" : "outline"}
                              >
                                {u.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {dateConverterUTC(u.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              {canManageTargetRole(normalizeRole(u.role)) ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setIsEdit(true);
                                        setIsDialogOpen(true);
                                        setNewUser({
                                          _id: u._id,
                                          name: u.name,
                                          email: u.email,
                                          phone: u.phone,
                                          institute: u.institution,
                                          role: normalizeRole(u.role),
                                        });
                                      }}
                                    >
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
                                      {u.isActive ? "Deactivate" : "Activate"}
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
                              ) : (
                                <span className="text-xs text-muted-foreground">View only</span>
                              )}
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
