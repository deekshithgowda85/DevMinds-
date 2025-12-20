"use client";

import { useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditorPage() {
  const [code, setCode] = useState(`def hello_world():
    print("Hello, World!")
    # This is a sample Python code
    x = 5
    y = 10
    print(x + y)`);

  const [language, setLanguage] = useState("python");

  return (
    <div className="h-screen bg-linear-to-br from-gray-900 via-orange-900 to-gray-800 text-white flex flex-col">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <Link
          href="/"
          className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>
      {/* Main Content */}
      <div className="flex-1 pt-16">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize={70} minSize={50}>
            {/* Left Panel: Code Editor */}
            <div className="h-full bg-gray-800 flex flex-col">
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-700 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label htmlFor="language" className="text-sm font-medium">Language:</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                <button
                  onClick={() => console.log("Analyze clicked", { language, code })}
                  className="bg-linear-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white px-4 py-2 rounded text-sm font-medium shadow-lg hover:shadow-orange-500/25 transform hover:scale-105 transition-all"
                >
                  Analyze
                </button>
              </div>
              {/* Editor */}
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
          </Panel>
          <Separator className="w-2 bg-gray-700 hover:bg-gray-600 cursor-col-resize" />
          <Panel defaultSize={30} minSize={20}>
            {/* Right Panel: Results */}
            <div className="h-full flex flex-col bg-gray-800">
              <div className="flex-1 p-4 border-b border-gray-700 overflow-auto">
                <h3 className="text-md font-semibold mb-2">Issues Detected</h3>
                {/* Placeholder */}
                <div className="text-gray-400">No issues detected yet</div>
              </div>
              <div className="flex-1 p-4 border-b border-gray-700 overflow-auto">
                <h3 className="text-md font-semibold mb-2">Fixed Code</h3>
                {/* Placeholder */}
                <div className="text-gray-400">Fixed code will appear here</div>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                <h3 className="text-md font-semibold mb-2">Validation Result</h3>
                {/* Placeholder */}
                <div className="text-gray-400">Validation status will appear here</div>
              </div>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}