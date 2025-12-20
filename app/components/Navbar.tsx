"use client";

import Link from "next/link";
import { Menu, Moon, Sun, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="flex items-center justify-between rounded-xl bg-background/80 backdrop-blur-xl py-4 px-4 md:px-6 lg:px-8 shadow-lg border z-50">
        <div className="flex items-center space-x-4 md:space-x-8">
          <Link href="/" className="text-base md:text-lg font-bold">
            MultiAgent Debugger
          </Link>
          <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
            <button
              onClick={() => handleScroll('features')}
              className="text-sm font-medium text-muted-foreground/60 hover:text-foreground/80 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => handleScroll('about')}
              className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors"
            >
              About
            </button>
            <Link
              href="/editor"
              className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors"
            >
              Editor
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Separator orientation="vertical" className="h-6 md:h-8" />
          
          {loading ? (
            <div className="h-8 w-8 md:h-9 md:w-9 animate-pulse bg-muted rounded-full" />
          ) : user ? (
            <div className="flex items-center space-x-2">
              <span className="hidden md:inline text-sm text-muted-foreground">
                {user.user_metadata?.name || user.email}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8 md:h-9 md:w-9"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline" className="hidden md:inline-flex h-8 md:h-9 px-3 md:px-4 text-xs md:text-sm">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
          
          <Link href="/editor">
            <Button className="hidden md:inline-flex h-8 md:h-9 rounded-full bg-foreground px-3 md:px-4 text-xs md:text-sm font-medium text-background hover:bg-foreground/90">
              Try Debugger
            </Button>
          </Link>
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
                <button
                  onClick={() => handleScroll('features')}
                  className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors text-left"
                >
                  Features
                </button>
                <button
                  onClick={() => handleScroll('about')}
                  className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors text-left"
                >
                  About
                </button>
                <Link
                  href="/editor"
                  className="text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors"
                >
                  Editor
                </Link>
                
                {user ? (
                  <div className="flex flex-col space-y-2 pt-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Signed in as {user.user_metadata?.name || user.email}
                    </span>
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="w-full justify-start"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                )}
                
                <Link href="/editor">
                  <Button className="h-7 w-full rounded-full bg-foreground px-3 text-sm font-normal text-background hover:bg-foreground/90">
                    Try Debugger
                  </Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
  );
};

export default Navbar;