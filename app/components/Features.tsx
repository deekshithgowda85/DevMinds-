"use client";

import { motion } from "framer-motion";

export default function Features() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1 }}
      viewport={{ once: true }}
      id="features"
      className="py-20 px-6 bg-gray-800/50 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-4xl font-bold text-center mb-12 bg-linear-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent"
        >
          Key Features
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            className="text-center"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🔍
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Issue Detection</h3>
            <p className="text-gray-300">AI scanner identifies bugs, vulnerabilities, and code smells.</p>
          </motion.div>
          <motion.div
            className="text-center"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              className="bg-yellow-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🔧
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Automated Fixes</h3>
            <p className="text-gray-300">Get proposed corrected code with clear explanations.</p>
          </motion.div>
          <motion.div
            className="text-center"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              ✅
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Independent Validation</h3>
            <p className="text-gray-300">Validator ensures fixes are correct and don&apos;t introduce new issues.</p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}