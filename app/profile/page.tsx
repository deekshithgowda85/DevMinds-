"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Save, Edit2, X, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    username: "",
    bio: "",
    role: ""
  });
  const [stats, setStats] = useState({
    projects: 0,
    debugSessions: 0,
    codeFixes: 0,
    repositories: 0
  });

  const [editedProfile, setEditedProfile] = useState(profile);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
          setEditedProfile(data.profile);
          console.log("Profile loaded:", data.profile);
        }
      } else if (response.status === 401) {
        toast.error("Please sign in to view your profile");
      } else {
        console.error("Error fetching profile:", response.status);
        toast.error("Error loading profile. Please try refreshing the page.");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        console.log("Could not fetch stats");
        setStats({ projects: 0, debugSessions: 0, codeFixes: 0, repositories: 0 });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats({ projects: 0, debugSessions: 0, codeFixes: 0, repositories: 0 });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile(profile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Try to update first
      let response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedProfile),
      });

      // If profile doesn't exist, create it
      if (response.status === 500 || response.status === 404) {
        response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editedProfile),
        });
      }

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setIsEditing(false);
        toast.success("Profile saved successfully!");
        await fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save profile");
      }
    } catch (error) {
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            {!isEditing ? (
              <Button onClick={handleEdit} className="gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} className="gap-2" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button onClick={handleCancel} variant="outline" className="gap-2" disabled={saving}>
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Profile Information */}
          <Card className="p-8 mb-6">
            <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
            
            {/* Avatar Section */}
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-3xl font-bold text-primary-foreground">
                {(editedProfile.full_name || editedProfile.username || "U").charAt(0).toUpperCase()}
              </div>
              {isEditing && (
                <Button variant="outline" size="sm">
                  Change Avatar
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium mb-2 block">
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={editedProfile.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-base px-3 py-2 bg-muted/30 rounded-md">{profile.full_name || "Not set"}</p>
                )}
              </div>

              {/* Username */}
              <div>
                <Label htmlFor="username" className="text-sm font-medium mb-2 block">
                  Username
                </Label>
                {isEditing ? (
                  <Input
                    id="username"
                    value={editedProfile.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    placeholder="Enter your username"
                  />
                ) : (
                  <p className="text-base px-3 py-2 bg-muted/30 rounded-md">{profile.username || "Not set"}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-2 block">
                  Email Address
                </Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editedProfile.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Enter your email"
                  />
                ) : (
                  <p className="text-base px-3 py-2 bg-muted/30 rounded-md flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {profile.email || "Not set"}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <Label htmlFor="role" className="text-sm font-medium mb-2 block">
                  Role
                </Label>
                {isEditing ? (
                  <Input
                    id="role"
                    value={editedProfile.role}
                    onChange={(e) => handleChange("role", e.target.value)}
                    placeholder="Your role or title"
                  />
                ) : (
                  <p className="text-base px-3 py-2 bg-muted/30 rounded-md">{profile.role || "Not set"}</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio" className="text-sm font-medium mb-2 block">
                  Bio
                </Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={editedProfile.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                ) : (
                  <p className="text-base px-3 py-2 bg-muted/30 rounded-md">{profile.bio || "No bio added yet"}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Account Statistics */}
          <Card className="p-8">
            <h2 className="text-xl font-semibold mb-6">Account Activity</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.projects}</div>
                <div className="text-sm text-muted-foreground">Projects</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.debugSessions}</div>
                <div className="text-sm text-muted-foreground">Debug Sessions</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.codeFixes}</div>
                <div className="text-sm text-muted-foreground">Code Fixes</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.repositories}</div>
                <div className="text-sm text-muted-foreground">Repositories</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
