"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GitBranch, Loader2, Download, Network } from "lucide-react";
import Navbar from "../components/Navbar";
import BackgroundBlobs from "../components/BackgroundBlobs";

interface ProjectGraph {
  nodes: Node[];
  edges: Edge[];
}

export default function ServicesPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [graph, setGraph] = useState<ProjectGraph | null>(null);

  const analyzeRepository = async () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a GitHub URL");
      return;
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    const cleanUrl = repoUrl.trim().replace(/\.git$/, '');
    
    if (!urlPattern.test(cleanUrl)) {
      toast.error("Invalid GitHub URL. Use format: https://github.com/username/repository");
      return;
    }

    setIsAnalyzing(true);
    toast.info("Cloning and analyzing repository...");

    try {
      const response = await fetch('/api/analyze-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: cleanUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      
      if (!data.nodes || data.nodes.length === 0) {
        toast.warning("No files found in repository");
        return;
      }
      
      setGraph(data);
      toast.success(`Analyzed ${data.nodes.length} nodes and ${data.edges.length} connections`);
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze repository';
      
      if (errorMessage.includes('not found')) {
        toast.error("Repository not found. Check the URL and ensure it's public.");
      } else if (errorMessage.includes('private')) {
        toast.error("Cannot access private repository. Please use a public repository.");
      } else if (errorMessage.includes('Authentication')) {
        toast.error("Authentication failed. Please use a public repository.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadGraph = () => {
    if (!graph) return;
    
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-graph.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Graph downloaded');
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <BackgroundBlobs />
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative pt-32 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Network className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">AI-Powered Analysis</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Project Graph Analyzer
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Visualize your repository structure instantly. Paste any GitHub URL to analyze files, dependencies, and architecture.
            </p>
          </div>

          {/* Input Section */}
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
            <div className="p-8">
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="https://github.com/username/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') analyzeRepository();
                    }}
                    disabled={isAnalyzing}
                    className="h-12 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400"
                  />
                </div>
                <Button
                  onClick={analyzeRepository}
                  disabled={isAnalyzing || !repoUrl.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <GitBranch className="mr-2 h-5 w-5" />
                      Analyze Repository
                    </>
                  )}
                </Button>
                {graph && (
                  <Button 
                    onClick={downloadGraph} 
                    variant="outline"
                    className="h-12 px-6 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Export
                  </Button>
                )}
              </div>

              {isAnalyzing && (
                <div className="p-6 bg-purple-500/10 backdrop-blur-sm rounded-xl border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                    <div>
                      <div className="text-white font-medium">Analyzing Repository</div>
                      <div className="text-sm text-slate-300">Cloning and parsing project structure...</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Graph Section */}
      {graph && (
        <div className="relative py-12">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-6 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent mb-2">
                  {graph.nodes.filter(n => n.data?.type === 'page').length}
                </div>
                <div className="text-sm text-slate-300">Pages</div>
              </Card>
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-6 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-2">
                  {graph.nodes.filter(n => n.data?.type === 'component').length}
                </div>
                <div className="text-sm text-slate-300">Components</div>
              </Card>
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-6 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
                  {graph.nodes.filter(n => n.data?.type === 'api').length}
                </div>
                <div className="text-sm text-slate-300">API Routes</div>
              </Card>
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-6 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent mb-2">
                  {graph.nodes.filter(n => n.data?.type === 'lib').length}
                </div>
                <div className="text-sm text-slate-300">Libraries</div>
              </Card>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-4 text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent mb-1">
                  {graph.nodes.filter(n => n.data?.type === 'model').length}
                </div>
                <div className="text-xs text-slate-300">Models</div>
              </Card>
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-4 text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-violet-600 bg-clip-text text-transparent mb-1">
                  {graph.nodes.filter(n => n.data?.type === 'hook').length}
                </div>
                <div className="text-xs text-slate-300">Hooks</div>
              </Card>
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-4 text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-1">
                  {graph.nodes.filter(n => n.data?.type === 'config').length}
                </div>
                <div className="text-xs text-slate-300">Configs</div>
              </Card>
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-4 text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent mb-1">
                  {graph.nodes.filter(n => n.data?.type === 'function').length}
                </div>
                <div className="text-xs text-slate-300">Functions</div>
              </Card>
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-4 text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text text-transparent mb-1">
                  {graph.edges.length}
                </div>
                <div className="text-xs text-slate-300">Connections</div>
              </Card>
            </div>

            {/* Graph Visualization */}
            <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Project Architecture</h2>
                    <p className="text-sm text-slate-300">
                      {graph.nodes.length} nodes • {graph.edges.length} connections
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50" />
                      <span className="text-sm text-slate-300">Pages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />
                      <span className="text-sm text-slate-300">Components</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" />
                      <span className="text-sm text-slate-300">API Routes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                      <span className="text-sm text-slate-300">Libraries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50" />
                      <span className="text-sm text-slate-300">Models</span>
                    </div>
                  </div>
                </div>
                <div className="h-[600px] rounded-xl overflow-hidden bg-slate-950/50 backdrop-blur-sm border border-white/10">
                  <ReactFlow
                    nodes={graph.nodes}
                    edges={graph.edges.map(edge => ({
                      ...edge,
                      animated: true,
                      style: { stroke: '#94a3b8', strokeWidth: 2 }
                    }))}
                    fitView
                    attributionPosition="bottom-left"
                  >
                    <Background color="#ffffff20" />
                    <Controls className="bg-white/10 backdrop-blur-sm border-white/20" />
                    <MiniMap 
                      className="bg-white/10 backdrop-blur-sm border border-white/20"
                      maskColor="rgb(15, 23, 42, 0.8)"
                    />
                  </ReactFlow>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  );
}
