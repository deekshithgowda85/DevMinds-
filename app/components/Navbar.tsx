"use client";

import Link from "next/link";

const Navbar = () => {
  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed w-full bg-gray-900/90 backdrop-blur-xl z-50 shadow-2xl border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="h-9 w-9 bg-linear-to-r from-orange-400 to-yellow-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-lg group-hover:bg-orange-400/30 transition-all duration-300"></div>
            </div>
            <span className="text-2xl font-bold bg-linear-to-r from-orange-400 via-yellow-400 to-red-400 bg-clip-text text-transparent group-hover:from-orange-300 group-hover:via-yellow-300 group-hover:to-red-300 transition-all duration-300">
              MultiAgent
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => handleScroll('features')}
              className="font-medium transition-all duration-300 relative group text-gray-300 hover:text-orange-400"
            >
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-linear-to-r from-orange-400 to-yellow-400 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => handleScroll('about')}
              className="font-medium transition-all duration-300 relative group text-gray-300 hover:text-orange-400"
            >
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-linear-to-r from-orange-400 to-yellow-400 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <Link
              href="/editor"
              className="px-5 py-2.5 bg-linear-to-r from-orange-500 to-yellow-500 text-white rounded-xl hover:from-orange-600 hover:to-yellow-600 transition-all duration-300 font-medium shadow-lg hover:shadow-orange-500/25 transform hover:scale-105"
            >
              Try Debugger
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;