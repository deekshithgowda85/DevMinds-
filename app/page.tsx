"use client";

import Navbar from "./components/Navbar";
import BackgroundBlobs from "./components/BackgroundBlobs";
import { AcmeHero } from "@/components/acme-hero";
import Features from "./components/Features";
import About from "./components/About";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <BackgroundBlobs />
      <div className="container max-w-7xl mx-auto pt-4 px-4">
        <Navbar />
      </div>
      <AcmeHero />
      <Features />
      <About />
      <Footer />

      {/* Custom CSS for blob animation */}
      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
