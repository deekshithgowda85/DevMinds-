"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Github, Star, Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string;
  repository_url: string;
  language: string;
  framework: string;
  status: string;
  stars: number;
  created_at: string;
}

export default function MyProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    repository_url: "",
    language: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else if (response.status === 401) {
        console.log("User not authenticated");
        setProjects([]);
      } else {
        console.error("Error fetching projects:", response.statusText);
        setProjects([]);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project: Project) => {
    // Navigate to editor with project ID
    router.push(`/editor?project=${project.id}&repo=${encodeURIComponent(project.repository_url)}`);
  };

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.repository_url) {
      toast.error("Please provide project name and GitHub URL");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Project created successfully!");
        setShowNewProjectDialog(false);
        setNewProject({
          name: "",
          description: "",
          repository_url: "",
          language: "",
        });
        await fetchProjects();
        // Navigate to editor with new project
        router.push(`/editor?project=${data.project.id}&repo=${encodeURIComponent(data.project.repository_url)}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create project");
      }
    } catch (error) {
      toast.error("Error creating project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 flex justify-between items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">My Projects</h1>
              <p className="text-muted-foreground text-lg">
                Your debugging projects and connected repositories
              </p>
            </div>
            <Button
              onClick={() => setShowNewProjectDialog(true)}
              className="gap-2"
              size="lg"
            >
              <Plus className="w-5 h-5" />
              New Project
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State */}
          {!loading && projects.length === 0 && (
            <Card className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <h3 className="text-2xl font-bold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Get started by creating your first debugging project. Make sure you're signed in to save your projects.
                </p>
                <Button
                  onClick={() => setShowNewProjectDialog(true)}
                  className="gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Project
                </Button>
              </div>
            </Card>
          )}

          {/* Projects Grid */}
          {!loading && projects.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <div className="text-6xl font-bold text-primary/20">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold">{project.name}</h3>
                      {project.stars > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Star className="w-4 h-4" />
                          <span className="text-sm">{project.stars}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                      {project.description || "No description provided"}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.language && (
                        <Badge variant="secondary" className="text-xs">
                          {project.language}
                        </Badge>
                      )}
                      {project.framework && (
                        <Badge variant="secondary" className="text-xs">
                          {project.framework}
                        </Badge>
                      )}
                      <Badge
                        variant={project.status === "active" ? "default" : "outline"}
                        className="text-xs"
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        className="flex-1"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectClick(project);
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Editor
                      </Button>
                      {project.repository_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(project.repository_url, "_blank");
                          }}
                        >
                          <Github className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter your GitHub repository URL to start debugging
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="My Awesome Project"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject({ ...newProject, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="github-url">GitHub Repository URL *</Label>
              <Input
                id="github-url"
                placeholder="https://github.com/username/repo"
                value={newProject.repository_url}
                onChange={(e) =>
                  setNewProject({ ...newProject, repository_url: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of your project"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject({ ...newProject, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                placeholder="e.g., TypeScript, JavaScript, Python"
                value={newProject.language}
                onChange={(e) =>
                  setNewProject({ ...newProject, language: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowNewProjectDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create & Open Editor"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
