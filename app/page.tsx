"use client";

import Navbar from "./components/Navbar";
import BackgroundBlobs from "./components/BackgroundBlobs";
import { AcmeHero } from "@/components/acme-hero";
import { HeroParallax } from "@/components/hero-parallax";
import About from "./components/About";
import Footer from "./components/Footer";

const projects = [
  { title: "Multi-Agent Debugger", link: "/editor", thumbnail: "/new1.webp" },
  { title: "Code Analyzer Pro", link: "#", thumbnail: "/new2.png" },
  { title: "DevOps Dashboard", link: "#", thumbnail: "/new3.png" },
  { title: "AI Assistant", link: "#", thumbnail: "/new4.webp" },
  { title: "API Gateway", link: "#", thumbnail: "/new5.webp" },
  { title: "Database Manager", link: "#", thumbnail: "/new6.png" },
  { title: "Cloud Deployment", link: "#", thumbnail: "/new7.jpg" },
  { title: "Security Scanner", link: "#", thumbnail: "/new11.jpg" },
  { title: "Performance Monitor", link: "#", thumbnail: "/new9.webp" },
  { title: "Test Automation", link: "#", thumbnail: "/new10.webp" },
  { title: "CI/CD Pipeline", link: "#", thumbnail: "/images.jpg" },
  { title: "Container Orchestration", link: "#", thumbnail: "/download.jpg" },
  { title: "Microservices Gateway", link: "#", thumbnail: "/image 7.jpg" },
  { title: "Real-time Analytics", link: "#", thumbnail: "/image10.jpg" },
  { title: "ML Model Trainer", link: "#", thumbnail: "/image12.jpg" }
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
