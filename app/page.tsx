"use client";

import Navbar from "./components/Navbar";
import BackgroundBlobs from "./components/BackgroundBlobs";
import { AcmeHero } from "@/components/acme-hero";
import { HeroParallax } from "@/components/hero-parallax";
import About from "./components/About";
import Footer from "./components/Footer";

const projects = [
  { title: "Multi-Agent Debugger", link: "/editor", thumbnail: "/api/placeholder/600/600" },
  { title: "Code Analyzer Pro", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "DevOps Dashboard", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "AI Assistant", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "API Gateway", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "Database Manager", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "Cloud Deployment", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "Security Scanner", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "Performance Monitor", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "Test Automation", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "CI/CD Pipeline", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "Container Orchestration", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "Microservices Gateway", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "Real-time Analytics", link: "#", thumbnail: "/api/placeholder/600/600" },
  { title: "ML Model Trainer", link: "#", thumbnail: "/api/placeholder/600/600" }
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <BackgroundBlobs />
      <Navbar />
      <div className="pt-24">
        <AcmeHero />
      </div>
      <HeroParallax products={projects} />
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
