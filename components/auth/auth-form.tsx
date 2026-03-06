"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, User } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        if (formData.name) {
          await updateProfile(credential.user, { displayName: formData.name });
        }
        toast.success("Account created successfully!");
        router.push("/editor");
        router.refresh();
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success("Welcome back!");
        router.push("/editor");
        router.refresh();
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      const msg =
        err.code === "auth/invalid-credential" || err.code === "auth/wrong-password"
          ? "Invalid email or password"
          : err.code === "auth/email-already-in-use"
          ? "Email already in use"
          : err.code === "auth/weak-password"
          ? "Password must be at least 6 characters"
          : err.message || "Something went wrong";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="John Doe"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              placeholder="john@example.com"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="pl-10"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="pl-10"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground">
              Must be at least 6 characters
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading
            ? "Please wait..."
            : mode === "signup"
            ? "Create Account"
            : "Sign In"}
        </Button>
      </form>

    </div>
  );
}