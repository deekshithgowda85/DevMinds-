"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Github, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export default function Footer() {
  return (
    <footer className="w-full border-t">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        className="container grid gap-6 px-4 py-10 md:px-6 lg:grid-cols-4 border-x border-muted"
      >
        <div className="space-y-3">
          <Link href="/" className="flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="h-10 w-10 rounded-full bg-primary flex items-center justify-center"
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <span className="font-bold text-xl">MultiAgent Debugger</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Execute code securely with E2B sandbox integration and real-time collaboration.
          </p>
          <div className="flex space-x-3">
            {[
              { icon: <Github className="h-5 w-5" />, label: "GitHub", href: "#" },
              { icon: <Twitter className="h-5 w-5" />, label: "Twitter", href: "#" },
              { icon: <Linkedin className="h-5 w-5" />, label: "LinkedIn", href: "#" },
            ].map((social, index) => (
              <motion.div key={index} whileHover={{ y: -5, scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Link href={social.href} className="text-muted-foreground hover:text-foreground">
                  {social.icon}
                  <span className="sr-only">{social.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <h3 className="text-lg font-medium mb-4">Product</h3>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link href="#features" className="text-muted-foreground hover:text-foreground">
                Features
              </Link>
              <Link href="/editor" className="text-muted-foreground hover:text-foreground">
                Editor
              </Link>
              <Link href="#about" className="text-muted-foreground hover:text-foreground">
                About
              </Link>
            </nav>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4">Resources</h3>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Documentation
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Tutorials
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                FAQ
              </Link>
            </nav>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <h3 className="text-lg font-medium mb-4">Support</h3>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Help Center
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Community
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Contact Us
              </Link>
            </nav>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4">Legal</h3>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Stay Updated</h3>
          <p className="text-sm text-muted-foreground">
            Get the latest updates on new features and improvements.
          </p>
          <form className="flex flex-col sm:flex-row gap-2">
            <Input type="email" placeholder="Enter your email" className="flex-1 rounded-full" />
            <Button type="submit" className="rounded-full">
              Subscribe
            </Button>
          </form>
        </div>
      </motion.div>
      
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 md:h-16 md:flex-row md:py-0">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MultiAgent Debugger. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">Built with E2B Sandbox</p>
        </div>
      </div>
    </footer>
  );
}