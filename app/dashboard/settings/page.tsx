"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useUser } from "@/lib/user-context"
import { useToast } from "@/hooks/use-toast"
import { Mail, Lock, Bell, Palette, Eye, EyeOff } from "lucide-react"

export default function SettingsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "user@school.com",
    phone: "+91-9876543210",
    institution: "Delhi Public School",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    paperReminders: true,
    resultNotifications: true,
    systemUpdates: false,
  })
  const [theme, setTheme] = useState("light")

  const handleProfileSave = () => {
    toast({
      title: "Success",
      description: "Profile updated successfully",
    })
  }

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    toast({
      title: "Success",
      description: "Password changed successfully",
    })
  }

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and security</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Institution</label>
              <Input
                value={profileData.institution}
                onChange={(e) => setProfileData({ ...profileData, institution: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handleProfileSave}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Password</label>
              <div className="relative">
                <Input
                  type={showPasswords.current ? "text" : "password"}
                  placeholder="Enter current password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
                <button
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">New Password</label>
              <div className="relative">
                <Input
                  type={showPasswords.new ? "text" : "password"}
                  placeholder="Enter new password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
                <button
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Confirm New Password</label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
                <button
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handlePasswordChange}>Update Password</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "emailNotifications" as const,
              label: "Email Notifications",
              description: "Receive email updates about new papers and results",
            },
            {
              key: "paperReminders" as const,
              label: "Paper Reminders",
              description: "Get reminders about upcoming exam dates",
            },
            {
              key: "resultNotifications" as const,
              label: "Result Notifications",
              description: "Receive instant notifications when results are published",
            },
            {
              key: "systemUpdates" as const,
              label: "System Updates",
              description: "Get notified about system maintenance and new features",
            },
          ].map((notification) => (
            <div key={notification.key} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <p className="font-medium">{notification.label}</p>
                <p className="text-sm text-muted-foreground">{notification.description}</p>
              </div>
              <button
                onClick={() => handleNotificationChange(notification.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications[notification.key] ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications[notification.key] ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline">Cancel</Button>
            <Button>Save Preferences</Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Theme</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 mt-2"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System Preference)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline">Cancel</Button>
            <Button>Save Theme</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
