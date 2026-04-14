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
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Bell, Palette, Eye, EyeOff } from "lucide-react";
import {
  changePasswordApi,
  updateNotificationsApi,
  updateProfileApi,
  updateThemeApi,
} from "@/utils/apis";

/* =======================
   Types
======================= */

type ErrorState = {
  name?: string;
  email?: string;
  phone?: string;
  institution?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

/* =======================
   Component
======================= */

export default function SettingsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  /* =======================
     State
  ======================= */

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    institution: user?.institution || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    loading: false,
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    paperReminders: true,
    resultNotifications: true,
    systemUpdates: false,
  });

  const [theme, setTheme] = useState("light");
  const [errors, setErrors] = useState<ErrorState>({});

  /* =======================
     Validation Helpers
  ======================= */

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateProfile = () => {
    const newErrors: ErrorState = {};

    if (!profileData.name.trim()) newErrors.name = "Full name is required.";
    if (!profileData.email.trim())
      newErrors.email = "Email address is required.";
    else if (!emailRegex.test(profileData.email))
      newErrors.email = "Please enter a valid email address.";

    if (!profileData.phone.trim())
      newErrors.phone = "Phone number is required.";
    else if (profileData.phone.length < 10)
      newErrors.phone = "Phone number must be at least 10 digits.";

    if (!profileData.institution.trim())
      newErrors.institution = "Institution name is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: ErrorState = {};

    if (!passwordData.currentPassword)
      newErrors.currentPassword = "Current password is required.";
    else if (passwordData.currentPassword.length < 8)
      newErrors.currentPassword = "Password must be at least 8 characters.";

    if (!passwordData.newPassword)
      newErrors.newPassword = "New password is required.";
    else if (passwordData.newPassword.length < 8)
      newErrors.newPassword = "Password must be at least 8 characters.";

    if (!passwordData.confirmPassword)
      newErrors.confirmPassword = "Please confirm your new password.";
    else if (passwordData.newPassword !== passwordData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSave = async () => {
    if (!validateProfile()) return;

    try {
      const res = await updateProfileApi(user?.id || "", profileData);
      console.log(res);
    } catch (error) {
      console.log(error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Profile updated successfully" });
  };

  const handlePasswordChange = async () => {
    if (!validatePassword()) return;

    try {
      setShowPasswords((p) => ({ ...p, loading: true }));

      const payload = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      };

      const res = await changePasswordApi(user?.id || "", payload);

      if (!res.success) {
        toast({
          title: "Error",
          description: res.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: res.message });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswords((p) => ({
        ...p,
        current: false,
        new: false,
        confirm: false,
      }));
      setErrors({});
    } finally {
      setShowPasswords((p) => ({ ...p, loading: false }));
    }
  };

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    try {
      const res = await updateNotificationsApi(user?.id || "", {
        [key]: !notifications[key],
      });
      console.log(res);
      const { success, message } = res;
      if (success !== true) {
        setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
      }
    } catch (error) {
      console.log(error);
      setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  useEffect(() => {
    async function updateTheme() {
      try {
        const res = await updateThemeApi(user?.id || "", {theme});
        console.log(res);
        const { success, message } = res;
        if (success !== true) {
          setTheme("light");
        }
      } catch (error) {
        setTheme("light");
        console.log(error);
      }
    }

    updateTheme();
  },[theme])

  useEffect(() => {
    if (user) {
      
    }
  }, [user]);

  /* =======================
     UI
  ======================= */

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* ================= Profile ================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Profile Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            { key: "name", label: "Full Name" },
            { key: "email", label: "Email Address" },
            { key: "phone", label: "Phone Number" },
            { key: "institution", label: "Institution" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium">{label}</label>
              <Input
                value={(profileData as any)[key]}
                onChange={(e) => {
                  setProfileData({ ...profileData, [key]: e.target.value });
                  setErrors((prev) => ({ ...prev, [key]: undefined }));
                }}
                disabled={key === "email"}
              />
              {errors[key as keyof ErrorState] && (
                <p className="text-sm text-red-500 mt-1">
                  {errors[key as keyof ErrorState]}
                </p>
              )}
            </div>
          ))}
          <div className="col-span-full flex justify-end pt-4 border-t">
            <Button onClick={handleProfileSave}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* ================= Password ================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {(
              ["currentPassword", "newPassword", "confirmPassword"] as const
            ).map((field) => {
              const showKey =
                field === "currentPassword"
                  ? "current"
                  : field === "newPassword"
                  ? "new"
                  : "confirm";
              return (
                <div key={field}>
                  <label className="text-sm font-medium">
                    {field === "currentPassword"
                      ? "Current Password"
                      : field === "newPassword"
                      ? "New Password"
                      : "Confirm Password"}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={
                        showPasswords[showKey as keyof typeof showPasswords]
                          ? "text"
                          : "password"
                      }
                      value={passwordData[field]}
                      onChange={(e) => {
                        setPasswordData({
                          ...passwordData,
                          [field]: e.target.value,
                        });
                        setErrors((p) => ({ ...p, [field]: undefined }));
                      }}
                    />
                    {showPasswords[showKey as keyof typeof showPasswords] ? (
                      <Eye
                        className="h-5 w-5 cursor-pointer"
                        onClick={() =>
                          setShowPasswords((p) => ({
                            ...p,
                            [showKey]: !p[showKey as keyof typeof p],
                          }))
                        }
                      />
                    ) : (
                      <EyeOff
                        className="h-5 w-5 cursor-pointer"
                        onClick={() =>
                          setShowPasswords((p) => ({
                            ...p,
                            [showKey]: !p[showKey as keyof typeof p],
                          }))
                        }
                      />
                    )}
                  </div>
                  {errors[field] && (
                    <p className="text-sm text-red-500 mt-1">{errors[field]}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-4">
            <Button
              onClick={handlePasswordChange}
              disabled={showPasswords.loading}
            >
              {showPasswords.loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ================= Notifications ================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "emailNotifications",
              title: "Email Notifications",
              desc: "Receive email updates and announcements",
            },
            {
              key: "paperReminders",
              title: "Paper Reminders",
              desc: "Get reminders about upcoming exams",
            },
            {
              key: "resultNotifications",
              title: "Result Notifications",
              desc: "Be notified when results are published",
            },
            {
              key: "systemUpdates",
              title: "System Updates",
              desc: "Notifications about maintenance & features",
            },
          ].map((n) => (
            <div
              key={n.key}
              className="flex items-center justify-between border-b py-3 last:border-0"
            >
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.desc}</p>
              </div>
              <button
                onClick={() => handleNotificationChange(n.key as any)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications[n.key as keyof typeof notifications]
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications[n.key as keyof typeof notifications]
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
          {/* <div className="flex justify-end pt-4">
            <Button onClick={handleNotificationSave}>Save Preferences</Button>
          </div> */}
        </CardContent>
      </Card>

      {/* ================= Theme ================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
        </CardContent>
      </Card>
    </div>
  );
}
