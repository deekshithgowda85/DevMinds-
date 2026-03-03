"use client";

import { Shield, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      <div className="text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 bg-gray-800/80 backdrop-blur-xl border border-purple-500/30 px-6 py-3 rounded-full shadow-2xl mb-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </motion.div>
          <span className="text-sm font-medium text-purple-300">
            AI-Powered Debugging
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold mb-6"
        >
          <span className="bg-linear-to-r from-orange-400 via-yellow-400 to-red-400 bg-clip-text text-transparent">
            Keep Your Code
          </span>
          <br />
          <span className="text-white">Clean & Bug-Free</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto"
        >
          Write or paste your code, get structured issue detection, proposed fixes, and independent validation.
          Inspired by Bolt and Replit, powered by multi-agent AI.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <Link
            href="/editor"
            className="group inline-flex items-center justify-center px-8 py-4 bg-linear-to-r from-orange-600 to-yellow-600 text-white rounded-xl hover:shadow-2xl hover:shadow-orange-500/25 transition transform hover:scale-105"
          >
            Start Debugging
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition" />
          </Link>
          <button
            className="inline-flex items-center justify-center px-8 py-4 bg-gray-800/80 backdrop-blur-xl border border-orange-500/30 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transition transform hover:scale-105"
          >
            <Shield className="mr-2 h-5 w-5 text-orange-400" />
            Learn More
          </button>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          <motion.div
            className="bg-gray-800/60 backdrop-blur-xl border border-purple-500/20 p-6 rounded-2xl shadow-2xl hover:shadow-purple-500/20 transition cursor-pointer"
            whileHover={{ y: -10, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              className="flex items-center justify-center mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle className="h-10 w-10 text-green-400" />
            </motion.div>
            <h3 className="text-2xl font-bold bg-linear-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">Issue Detection</h3>
            <p className="text-gray-300 text-sm">AI scanner identifies bugs, vulnerabilities, and code smells.</p>
          </motion.div>
          <motion.div
            className="bg-gray-800/60 backdrop-blur-xl border border-orange-500/20 p-6 rounded-2xl shadow-2xl hover:shadow-orange-500/20 transition cursor-pointer"
            whileHover={{ y: -10, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          >
            <motion.div
              className="flex items-center justify-center mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Shield className="h-10 w-10 text-orange-400" />
            </motion.div>
            <h3 className="text-2xl font-bold bg-linear-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2">Automated Fixes</h3>
            <p className="text-gray-300 text-sm">Get proposed corrected code with clear explanations.</p>
          </motion.div>
          <motion.div
            className="bg-gray-800/60 backdrop-blur-xl border border-orange-500/20 p-6 rounded-2xl shadow-2xl hover:shadow-orange-500/20 transition cursor-pointer"
            whileHover={{ y: -10, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
          >
            <motion.div
              className="flex items-center justify-center mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-10 w-10 text-yellow-400" />
            </motion.div>
            <h3 className="text-2xl font-bold bg-linear-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">Independent Validation</h3>
            <p className="text-gray-300 text-sm">Validator ensures fixes are correct and don&apos;t introduce new bugs.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}