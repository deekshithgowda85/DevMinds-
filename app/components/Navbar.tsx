"use client";

import Link from "next/link";
import { Menu, Moon, Sun, LogOut, User, LogIn, UserPlus } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useDevMindAuth } from "@/hooks/use-devmind-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const { user, loading, login, register, logout } = useDevMindAuth();
  const router = useRouter();

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "", displayName: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [guestName, setGuestName] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("devmind-guest-name");
    if (saved) setGuestName(saved);
  }, []);

  const isGuest = !user && !!guestName;
  const displayName = user?.displayName || user?.username || guestName || "";

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        await login(authForm.username, authForm.password);
      } else {
        await register(authForm.username, authForm.password, authForm.displayName || undefined);
      }
      localStorage.removeItem("devmind-guest-name");
      setGuestName(null);
      setShowAuthForm(false);
      setAuthForm({ username: "", password: "", displayName: "" });
      toast.success(authMode === "login" ? "Signed in!" : "Account created!");
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleGuestSignIn() {
    const name = "guest-" + Math.random().toString(36).slice(2, 8);
    localStorage.setItem("devmind-guest-name", name);
    setGuestName(name);
    setShowAuthForm(false);
    toast.success("Signed in as guest");
  }

  async function handleSignOut() {
    if (user) {
      await logout();
    }
    localStorage.removeItem("devmind-guest-name");
    setGuestName(null);
    toast.success("Signed out successfully");
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-7xl">
      <div className="flex items-center justify-between rounded-full bg-background/80 backdrop-blur-xl py-3 px-6 shadow-lg border">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-xl">C/</span>
            <span>Codebug</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/my-projects"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/services"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Services
            </Link>
            <Link
              href="/devmind"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              DevMind
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/editor">
            <Button className="hidden md:flex rounded-full px-6 bg-gradient-to-r from-slate-200 via-white to-slate-200 text-slate-900 hover:from-slate-300 hover:via-slate-100 hover:to-slate-300 font-semibold shadow-md hover:shadow-lg transition-all">
              Try Editor
            </Button>
          </Link>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Profile/Auth Section */}
          {!loading && (
            <>
              {user || isGuest ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-sm font-semibold text-primary-foreground">
                        {displayName.charAt(0).toUpperCase() || "U"}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {displayName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {isGuest ? "Guest user" : `@${user?.username}`}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/my-projects" className="cursor-pointer">
                        <span className="mr-2">📁</span>
                        My Projects
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setShowAuthForm(!showAuthForm)}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>

                  {showAuthForm && (
                    <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-background border shadow-xl p-4 z-50">
                      <form onSubmit={handleAuth} className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">
                          {authMode === "login" ? "Sign In" : "Create Account"}
                        </p>
                        <input
                          type="text"
                          placeholder="Username"
                          value={authForm.username}
                          onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                          required
                          className="w-full px-3 py-2 rounded-lg text-sm bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                        />
                        {authMode === "register" && (
                          <input
                            type="text"
                            placeholder="Display Name (optional)"
                            value={authForm.displayName}
                            onChange={(e) => setAuthForm({ ...authForm, displayName: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg text-sm bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                          />
                        )}
                        <input
                          type="password"
                          placeholder="Password"
                          value={authForm.password}
                          onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                          required
                          className="w-full px-3 py-2 rounded-lg text-sm bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500"
                        />
                        {authError && <p className="text-xs text-destructive">{authError}</p>}
                        <Button
                          type="submit"
                          disabled={authLoading}
                          className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm"
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          {authLoading ? "Please wait..." : authMode === "login" ? "Sign In" : "Register"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}
                          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {authMode === "login" ? "Need an account? Register" : "Have an account? Sign In"}
                        </button>
                      </form>
                      <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full rounded-lg text-sm"
                        onClick={handleGuestSignIn}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Sign in as Guest
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 md:hidden"
              >
                <Menu className="h-[15px] w-[15px]" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] sm:w-[300px]">
              <nav className="flex flex-col space-y-4">
                {(user || isGuest) && (
                  <>
                    <div className="pb-4 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-sm font-semibold text-primary-foreground">
                          {displayName.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {isGuest ? "Guest user" : `@${user?.username}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/my-projects"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Projects
                </Link>
                <Link
                  href="/services"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Services
                </Link>
                <Link
                  href="/devmind"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  DevMind
                </Link>
                <Link
                  href="/profile"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/editor"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Editor
                </Link>
                {user || isGuest ? (
                  <Button
                    variant="outline"
                    className="mt-4 w-full justify-start text-red-600"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                ) : (
                  <div className="mt-4 space-y-2">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => { setShowAuthForm(true); }}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleGuestSignIn}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Sign in as Guest
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;