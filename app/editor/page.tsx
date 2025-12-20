"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import type { ApiComponent } from "@/components/file-viewer";
import {
  PlayIcon,
  FileCode,
  Search,
  GitBranch,
  Settings,
  FileText,
  Layers,
  Terminal,
  Save,
  Upload,
  Download,
  Moon,
  Sun,
  FileJson,
  Code,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { createGitClient } from "@/lib/git-client";
import { GitPanel } from "./components/GitPanel";

// Sample project structure for the file viewer
const sampleProject: ApiComponent = {
  name: "project-files",
  version: "1.0.0",
  files: [
    {
      path: "src/index.ts",
      content: `// Main entry point
import { fibonacci } from './utils';

console.log("Starting application...");

for (let i = 0; i < 10; i++) {
  console.log(\`fibonacci(\${i}) = \${fibonacci(i)}\`);
}`,
    },
    {
      path: "src/utils.ts",
      content: `// Utility functions
export function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

export function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
    },
    {
      path: "src/types.ts",
      content: `// Type definitions
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}`,
    },
    {
      path: "src/components/Button.tsx",
      content: `import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick}
      className={\`btn btn-\${variant}\`}
    >
      {label}
    </button>
  );
};`,
    },
    {
      path: "README.md",
      content: `# Multi-Agent Debugger Project

This is a sample project demonstrating the code editor functionality.

## Features
- File viewer
- Code editor with Monaco
- Syntax highlighting
- Code execution

## Getting Started
1. Browse files in the file explorer
2. Edit code in the editor
3. Run code and see output`,
    },
    {
      path: "package.json",
      content: `{
  "name": "multi-agent-debugger",
  "version": "1.0.0",
  "description": "Advanced debugging tool",
  "main": "src/index.ts",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "react": "^19.0.0",
    "next": "^16.0.0"
  }
}`,
    },
  ],
};

const defaultCode = {
  javascript: `// JavaScript Code Runner
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
  console.log(\`fibonacci(\${i}) = \${fibonacci(i)}\`);
}`,
  python: `# Python Code Runner
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print("Fibonacci sequence:")
for i in range(10):
    print(f"fibonacci({i}) = {fibonacci(i)}")`,
  java: `// Java Code Runner
public class Main {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    public static void main(String[] args) {
        System.out.println("Fibonacci sequence:");
        for (int i = 0; i < 10; i++) {
            System.out.println("fibonacci(" + i + ") = " + fibonacci(i));
        }
    }
}`,
  cpp: `// C++ Code Runner
#include <iostream>
using namespace std;

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    cout << "Fibonacci sequence:" << endl;
    for (int i = 0; i < 10; i++) {
        cout << "fibonacci(" << i << ") = " << fibonacci(i) << endl;
    }
    return 0;
}`
};

export default function EditorPage() {
  const [language, setLanguage] = useState<"javascript" | "python" | "java" | "cpp">("javascript");
  const [code, setCode] = useState(defaultCode.javascript);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeView, setActiveView] = useState<"files" | "search" | "git" | "debug">("files");
  const [showOutput, setShowOutput] = useState(true);
  const [selectedFile, setSelectedFile] = useState("Main.js");
  const { resolvedTheme, setTheme } = useTheme();
  const [gitClient] = useState(() => createGitClient());

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "");
  };

  const handleLanguageChange = (newLang: "javascript" | "python" | "java" | "cpp") => {
    setLanguage(newLang);
    setCode(defaultCode[newLang]);
    const extensions = { javascript: 'js', python: 'py', java: 'java', cpp: 'cpp' };
    setSelectedFile(`Main.${extensions[newLang]}`);
    setOutput([]);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput([]);
    setShowOutput(true);
    
    try {
      const logs: string[] = [];
      
      if (language === "javascript") {
        // JavaScript execution
        const customConsole = {
          log: (...args: unknown[]) => {
            logs.push(args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '));
          },
          error: (...args: unknown[]) => {
            logs.push('ERROR: ' + args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '));
          },
          warn: (...args: unknown[]) => {
            logs.push('WARNING: ' + args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '));
          }
        };
        
        const func = new Function('console', code);
        func(customConsole);
      } else if (language === "python") {
        // Python simulation (browser-based)
        logs.push('Python execution requires a backend server.');
        logs.push('Sample output for demo:');
        logs.push('Fibonacci sequence:');
        for (let i = 0; i < 10; i++) {
          const fib = (n: number): number => n <= 1 ? n : fib(n-1) + fib(n-2);
          logs.push(`fibonacci(${i}) = ${fib(i)}`);
        }
      } else if (language === "java") {
        // Java simulation (browser-based)
        logs.push('Java execution requires a backend server with JDK.');
        logs.push('Sample output for demo:');
        logs.push('Fibonacci sequence:');
        for (let i = 0; i < 10; i++) {
          const fib = (n: number): number => n <= 1 ? n : fib(n-1) + fib(n-2);
          logs.push(`fibonacci(${i}) = ${fib(i)}`);
        }
      } else if (language === "cpp") {
        // C++ simulation (browser-based)
        logs.push('C++ execution requires a backend server with g++ compiler.');
        logs.push('Sample output for demo:');
        logs.push('Fibonacci sequence:');
        for (let i = 0; i < 10; i++) {
          const fib = (n: number): number => n <= 1 ? n : fib(n-1) + fib(n-2);
          logs.push(`fibonacci(${i}) = ${fib(i)}`);
        }
      }
      
      setOutput(logs.length > 0 ? logs : ['Code executed successfully with no output']);
    } catch (error) {
      setOutput([`Error: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar - VSCode Style */}
      <div className="h-12 border-b flex items-center px-2 gap-2 bg-muted/50">
        <div className="flex items-center gap-4 flex-1">
          <div className="font-semibold px-2">Multi-Agent Debugger</div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex gap-1 text-sm">
            <Button variant="ghost" size="sm" className="h-8">File</Button>
            <Button variant="ghost" size="sm" className="h-8">Edit</Button>
            <Button variant="ghost" size="sm" className="h-8">View</Button>
            <Button variant="ghost" size="sm" className="h-8">Run</Button>
            <Button variant="ghost" size="sm" className="h-8">Terminal</Button>
            <Button variant="ghost" size="sm" className="h-8">Help</Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar - Left Side Icons */}
        <div className="w-12 border-r flex flex-col items-center py-2 gap-1 bg-muted/30 flex-shrink-0">
          <Button
            variant={activeView === "files" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setActiveView("files")}
            title="Explorer"
          >
            <FileCode className="h-4 w-4" />
          </Button>
          <Button
            variant={activeView === "search" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setActiveView("search")}
            title="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant={activeView === "git" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setActiveView("git")}
            title="Source Control"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
          <Button
            variant={activeView === "debug" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setActiveView("debug")}
            title="Debug"
          >
            <Layers className="h-4 w-4" />
          </Button>
          
          <div className="flex-1" />
          
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setShowOutput(!showOutput)}
            title="Toggle Terminal"
          >
            <Terminal className="h-4 w-4" />
          </Button>
        </div>

        {/* Sidebar - File Explorer/Search/etc */}
        <div className="w-64 border-r flex flex-col bg-background overflow-hidden">
          <div className="h-10 border-b flex items-center px-3 font-semibold text-sm">
            {activeView === "files" && "EXPLORER"}
            {activeView === "search" && "SEARCH"}
            {activeView === "git" && "SOURCE CONTROL"}
            {activeView === "debug" && "DEBUG"}
          </div>
          
          <ScrollArea className="flex-1">
            {activeView === "files" && (
              <div className="p-2">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
                    {sampleProject.name}
                  </div>
                  {sampleProject.files.map((file) => {
                    const fileName = file.path.split('/').pop() || file.path;
                    const indent = (file.path.split('/').length - 1) * 12;
                    const isActive = selectedFile === file.path;
                    
                    // Determine file icon based on extension
                    const getFileIcon = () => {
                      if (fileName.endsWith('.json')) return <FileJson className="h-4 w-4 flex-shrink-0 text-yellow-500" />;
                      if (fileName.endsWith('.md')) return <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />;
                      if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return <Code className="h-4 w-4 flex-shrink-0 text-blue-400" />;
                      return <FileText className="h-4 w-4 flex-shrink-0" />;
                    };
                    
                    return (
                      <button
                        key={file.path}
                        className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 truncate transition-colors ${
                          isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                        }`}
                        style={{ paddingLeft: `${8 + indent}px` }}
                        onClick={() => {
                          if (file.content) {
                            setCode(file.content);
                            setSelectedFile(file.path);
                          }
                        }}
                      >
                        {getFileIcon()}
                        <span className="truncate">{fileName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {activeView === "search" && (
              <div className="p-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                  <p className="text-sm text-muted-foreground">
                    Search across all files
                  </p>
                </div>
              </div>
            )}
            {activeView === "git" && (
              <GitPanel 
                gitClient={gitClient}
                onRefresh={() => {
                  // Refresh file tree or editor if needed
                  console.log('Git operation completed, refresh if needed');
                }}
              />
            )}
            {activeView === "debug" && (
              <div className="p-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Debugger</p>
                  <Button size="sm" className="w-full gap-2">
                    <PlayIcon className="h-4 w-4" />
                    Start Debugging
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor Tabs */}
          <div className="h-10 border-b flex items-center px-2 bg-muted/30 justify-between">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{selectedFile}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as "javascript" | "python" | "java" | "cpp")}
                className="h-7 px-2 text-xs border rounded bg-background"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              
              <Button
                onClick={runCode}
                disabled={isRunning}
                size="sm"
                className="h-7 gap-2"
              >
                <PlayIcon className="h-3 w-3" />
                {isRunning ? "Running..." : "Run"}
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-2">
                <Upload className="h-3 w-3" />
                Import
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-2">
                <Download className="h-3 w-3" />
                Export
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              value={code}
              onChange={handleEditorChange}
              theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
              options={{
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                tabSize: language === "python" ? 4 : 2,
                formatOnPaste: true,
                formatOnType: true,
                lineNumbers: "on",
                renderWhitespace: "selection",
                cursorBlinking: "smooth",
                folding: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>
        </div>

        {/* Output Panel */}
        {showOutput && (
          <div className="w-80 border-l flex flex-col bg-muted/20 overflow-hidden">
            <div className="h-10 border-b flex items-center justify-between px-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Terminal className="h-4 w-4" />
                TERMINAL OUTPUT
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setOutput([])}
              >
                Clear
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {output.length === 0 ? (
                <div className="text-muted-foreground text-sm italic">
                  Console output will appear here. Click &quot;Run&quot; to execute your code.
                </div>
              ) : (
                <div className="space-y-1 font-mono text-xs">
                  {output.map((line, index) => (
                    <div 
                      key={index} 
                      className={`
                        ${line.startsWith('ERROR:') ? 'text-red-500' : ''}
                        ${line.startsWith('WARNING:') ? 'text-yellow-500' : ''}
                        whitespace-pre-wrap break-words
                      `}
                    >
                      <span className="text-muted-foreground mr-2">[{index + 1}]</span>
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="border-t p-2 bg-muted/30">
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {language === "javascript" && "JavaScript Runtime"}
                  {language === "python" && "Python 3.11"}
                  {language === "java" && "Java JDK 17"}
                  {language === "cpp" && "G++ Compiler"}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                  {isRunning ? 'Running' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-6 border-t flex items-center px-3 text-xs bg-muted/50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            main
          </span>
          <span>UTF-8</span>
          <span className="capitalize font-medium">
            {language === "cpp" ? "C++" : language === "javascript" ? "JavaScript" : language === "python" ? "Python" : "Java"}
          </span>
          <span>Ln 1, Col 1</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <span>Spaces: {language === "python" ? "4" : "2"}</span>
          <span className="flex items-center gap-1">
            {output.length > 0 && (
              <span className={output.some(l => l.startsWith('ERROR:')) ? 'text-red-500' : 'text-green-500'}>
                {output.some(l => l.startsWith('ERROR:')) ? '✗' : '✓'}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
