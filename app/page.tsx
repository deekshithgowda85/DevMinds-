"use client";

import Navbar from "./components/Navbar";
import BackgroundBlobs from "./components/BackgroundBlobs";
import Hero from "./components/Hero";
import Features from "./components/Features";
import About from "./components/About";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-linear-to-br from-gray-900 via-orange-900 to-gray-800">
      <Navbar />
      <BackgroundBlobs />
      <Hero />
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
