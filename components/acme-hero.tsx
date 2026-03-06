"use client";

import Image from "next/image";
import { FingerprintIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

export function AcmeHero() {
  return (
      <div className="container max-w-5xl mx-auto">
        <main className="relative container px-2 mx-auto">
          <section className="w-full py-12 md:py-24 lg:py-32 xl:py-36">
            <motion.div
              className="flex flex-col items-center space-y-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.h1
                className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Code Debugging, Redefined
              </motion.h1>
              <motion.p
                className="mx-auto max-w-xl text-md sm:text-2xl text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Debug and execute code with{" "}
                <span className="font-semibold text-foreground">
                  E2B sandbox integration
                </span>{" "}
                and{" "}
                <span className="font-semibold text-foreground">real-time collaboration</span>
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <a href="/editor">
                  <Button className="rounded-xl bg-foreground text-background hover:bg-foreground/90">
                    Try Editor Now
                    <div className="ml-2 space-x-1 hidden sm:inline-flex">
                      <FingerprintIcon className="w-5 h-5" />
                    </div>
                  </Button>
                </a>
                <a href="#features">
                  <Button variant="outline" className="rounded-xl">
                    Learn More
                  </Button>
                </a>
              </motion.div>

              <motion.div
                className="flex flex-col items-center space-y-3 pb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-primary hover:text-primary/80 transition-colors">
                    /w E2B Sandbox
                  </span>
                  <span className="text-muted-foreground/60">
                    Multi-Language Support
                  </span>
                  <span className="text-primary hover:text-primary/80 transition-colors">
                    /w Git Integration
                  </span>
                </div>
                <p className="text-sm text-muted-foreground/60">
                  Execute code securely with real-time collaboration
                </p>
              </motion.div>
              <motion.div
                className="w-full border p-2 rounded-3xl"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <div className="relative w-full">
                  <div className="relative w-full rounded-3xl overflow-hidden border shadow-2xl bg-slate-950">
                    <Image
                      src="/image.png"
                      alt="Multi-Agent Debugger Editor Preview"
                      width={1920}
                      height={1080}
                      className="w-full h-auto object-cover rounded-3xl"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background to-transparent" />
                </div>
              </motion.div>
            </motion.div>
          </section>
        </main>
      </div>
  );
}