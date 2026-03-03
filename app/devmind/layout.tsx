'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client';
import Navbar from '../components/Navbar';
import BackgroundBlobs from '../components/BackgroundBlobs';
import { signOut, signInAnonymously } from 'firebase/auth';
import { useState } from 'react';
import {
  LayoutDashboard, Bug, BookOpen, FileText, Dumbbell,
  BarChart2, LogOut, LogIn, User, X, ChevronRight, Menu,
} from 'lucide-react';

export default function DevMindLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [signingInGuest, setSigningInGuest] = useState(false);

  const navItems = [
    { href: '/devmind', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/devmind/debug', label: 'CodeTrace Debug', icon: Bug },
    { href: '/devmind/explain', label: 'Code Explain', icon: BookOpen },
    { href: '/devmind/docs', label: 'SmartDocs', icon: FileText },
    { href: '/devmind/practice', label: 'Practice Quiz', icon: Dumbbell },
    { href: '/devmind/analytics', label: 'Analytics', icon: BarChart2 },
  ];

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const username = user?.isAnonymous
    ? 'Guest'
    : user?.displayName || user?.email?.split('@')[0] || '';

  async function handleGuestSignIn() {
    setSigningInGuest(true);
    try {
      await signInAnonymously(auth);
    } finally {
      setSigningInGuest(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push('/auth/login');
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-foreground flex flex-col">
      <BackgroundBlobs />
      {/* background visuals */}

      <Navbar />

      <div className="flex flex-1">

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-40 transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Sidebar header with close button */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-3 px-2">Navigation</p>
            {navItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    active
                      ? 'bg-purple-600/15 text-purple-500 dark:text-purple-300 border border-purple-600/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${
                    active ? 'text-purple-500 dark:text-purple-400' : 'text-muted-foreground group-hover:text-foreground'
                  }`} />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="w-3 h-3 ml-auto text-purple-500" />}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-3 px-2">General</p>
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Back to Home</span>
              </Link>
            </div>
          </nav>

          {/* User Section */}
          <div className="border-t border-border p-4">
            {!loading && (
              <>
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                        {username.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{username}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {user.isAnonymous ? 'Guest Session' : user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/auth/login"
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Sign In
                    </Link>
                    <button
                      onClick={handleGuestSignIn}
                      disabled={signingInGuest}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground/40 transition-all disabled:opacity-50"
                    >
                      <User className="w-3.5 h-3.5" />
                      {signingInGuest ? 'Signing in...' : 'Continue as Guest'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Main Content – shifted right when sidebar is open on desktop */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
          {/* Single fixed left button to open sidebar when closed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="fixed left-4 top-1/2 z-50 -translate-y-1/2 p-3 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-500 focus:outline-none"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
