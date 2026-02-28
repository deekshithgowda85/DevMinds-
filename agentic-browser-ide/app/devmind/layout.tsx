'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DevMindLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/devmind', label: 'Dashboard', icon: '🏠' },
    { href: '/devmind/debug', label: 'CodeTrace Debug', icon: '🔍' },
    { href: '/devmind/docs', label: 'SmartDocs', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Top Navigation */}
      <nav className="border-b border-[#222] bg-[#111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <Link href="/devmind" className="flex items-center gap-2">
              <span className="text-xl">🧠</span>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                DevMind
              </span>
            </Link>

            {/* Nav Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#222] text-white'
                        : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Back to IDE */}
            <Link
              href="/"
              className="text-xs text-[#666] hover:text-[#aaa] transition-colors"
            >
              ← Back to IDE
            </Link>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
