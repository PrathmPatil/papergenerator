"use client";

import { useEffect, useMemo, useState } from "react";
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

type ErrorState = {
  name?: string;
  email?: string;
  phone?: string;
  institution?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const getUserId = (user: { id?: string; _id?: string } | null | undefined) =>
  String(user?.id || user?._id || "").trim();

export default function SettingsPage() {
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const userId = useMemo(() => getUserId(user), [user]);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    institution: "",
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
  });

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    paperReminders: true,
    resultNotifications: true,
    systemUpdates: false,
  });

  const [theme, setTheme] = useState("light");
  const [errors, setErrors] = useState<ErrorState>({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    if (!user) return;
    setProfileData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      institution: user.institution || "",
    });
  }, [user]);

  const validateProfile = () => {
    const newErrors: ErrorState = {};

    if (!profileData.name.trim()) newErrors.name = "Full name is required.";
    if (!profileData.email.trim()) newErrors.email = "Email address is required.";
    else if (!emailRegex.test(profileData.email))
      newErrors.email = "Please enter a valid email address.";

    if (!profileData.phone.trim()) newErrors.phone = "Phone number is required.";
    else if (profileData.phone.length < 10)
      newErrors.phone = "Phone number must be at least 10 digits.";

    if (!profileData.institution.trim())
      newErrors.institution = "Institution name is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: ErrorState = {};

    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required.";
    }

    if (!passwordData.newPassword.trim()) {
      newErrors.newPassword = "New password is required.";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "New password must be at least 8 characters.";
    } else if (passwordData.newPassword === passwordData.currentPassword) {
      newErrors.newPassword = "New password must be different from the current password.";
    }

    if (!passwordData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your new password.";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSave = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User session not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    if (!validateProfile()) return;

    try {
      setProfileLoading(true);
      const res: any = await updateProfileApi(userId, profileData);
      if (res?.success === false) {
        toast({
          title: "Error",
          description: res?.message || "Failed to update profile",
          variant: "destructive",
        });
        return;
      }

      if (user) {
        setUser({
          ...user,
          name: profileData.name,
          phone: profileData.phone,
          institution: profileData.institution,
        });
      }

      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User session not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    if (!validatePassword()) return;

    try {
      setPasswordLoading(true);

      const res: any = await changePasswordApi(userId, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (!res?.success) {
        toast({
          title: "Error",
          description: res?.message || "Failed to update password",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: res?.message || "Password updated successfully",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswords({ current: false, new: false, confirm: false });
      setErrors({});
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    if (!userId) return;
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    try {
      const res: any = await updateNotificationsApi(userId, {
        [key]: !notifications[key],
      });
      if (res?.success !== true) {
        setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
      }
    } catch {
      setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  useEffect(() => {
    async function persistTheme() {
      if (!userId) return;
      try {
        const res: any = await updateThemeApi(userId, { theme });
        if (res?.success !== true) setTheme("light");
      } catch {
        setTheme("light");
      }
    }
    void persistTheme();
  }, [theme, userId]);

  const passwordFields = [
    { key: "currentPassword" as const, label: "Current Password", showKey: "current" as const },
    { key: "newPassword" as const, label: "New Password", showKey: "new" as const },
    { key: "confirmPassword" as const, label: "Confirm New Password", showKey: "confirm" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and update your account password.
        </p>
      </div>

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
            <Button onClick={handleProfileSave} disabled={profileLoading}>
              {profileLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Change Password
          </CardTitle>
          <CardDescription>
            Enter your current password, then choose a new password (minimum 8 characters).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {passwordFields.map(({ key, label, showKey }) => (
              <div key={key}>
                <label className="text-sm font-medium">{label}</label>
                <div className="relative mt-1">
                  <Input
                    type={showPasswords[showKey] ? "text" : "password"}
                    autoComplete={
                      key === "currentPassword" ? "current-password" : "new-password"
                    }
                    value={passwordData[key]}
                    onChange={(e) => {
                      setPasswordData({
                        ...passwordData,
                        [key]: e.target.value,
                      });
                      setErrors((prev) => ({ ...prev, [key]: undefined }));
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        [showKey]: !prev[showKey],
                      }))
                    }
                    aria-label={showPasswords[showKey] ? "Hide password" : "Show password"}
                  >
                    {showPasswords[showKey] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors[key] && (
                  <p className="text-sm text-red-500 mt-1">{errors[key]}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handlePasswordChange} data-testid="update-password-button" disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notification Preferences
          </CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "emailNotifications" as const,
              title: "Email Notifications",
              desc: "Receive email updates and announcements",
            },
            {
              key: "paperReminders" as const,
              title: "Paper Reminders",
              desc: "Get reminders about upcoming exams",
            },
            {
              key: "resultNotifications" as const,
              title: "Result Notifications",
              desc: "Be notified when results are published",
            },
            {
              key: "systemUpdates" as const,
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
              <Button
                variant={notifications[n.key] ? "default" : "outline"}
                size="sm"
                onClick={() => void handleNotificationChange(n.key)}
              >
                {notifications[n.key] ? "On" : "Off"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Theme
          </CardTitle>
          <CardDescription>Choose your preferred appearance</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {["light", "dark", "system"].map((value) => (
            <Button
              key={value}
              variant={theme === value ? "default" : "outline"}
              onClick={() => setTheme(value)}
              className="capitalize"
            >
              {value}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
