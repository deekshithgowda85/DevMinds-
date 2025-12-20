"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
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
  FolderGit2,
  RefreshCw,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { createGitClient } from "@/lib/git-client";
import { GitPanel } from "./components/GitPanel";
import { CommitDialog } from "./components/CommitDialog";
import { useE2BSandbox } from "@/hooks/use-e2b-sandbox";
import { toast } from "sonner";

export default function EditorPage() {
  const [language, setLanguage] = useState<"javascript" | "python" | "java" | "cpp">("javascript");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeView, setActiveView] = useState<"files" | "search" | "git" | "debug">("files");
  const [showOutput, setShowOutput] = useState(true);
  const [selectedFile, setSelectedFile] = useState("");
  const [files, setFiles] = useState<Array<{path: string, content: string}>>([]);
  const [newFileName, setNewFileName] = useState("");
  const { resolvedTheme, setTheme } = useTheme();
  const [gitClient, setGitClient] = useState<ReturnType<typeof createGitClient> | null>(null);
  const repoPath = '/workspace/repo';
  
  // E2B Sandbox integration
  const {
    session,
    loading: sandboxLoading,
    initializeSandbox,
    closeSandbox,
    executeCode: executeInSandbox,
    writeFile,
    readFile,
    deleteFile,
    listFiles,
    cloneRepository,
    gitCommit,
    gitPush,
    gitPull,
  } = useE2BSandbox();

  // Initialize gitClient only on client side
  useEffect(() => {
    setGitClient(createGitClient());
  }, []);

  // Initialize sandbox on mount
  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing E2B sandbox...');
        const result = await initializeSandbox();
        console.log('E2B Sandbox initialized:', result);
        toast.success(`E2B Sandbox initialized: ${result.sessionId}`);
      } catch (error) {
        console.error('Failed to initialize sandbox:', error);
        toast.error('Failed to initialize sandbox: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };
    
    init();

    // Cleanup on unmount
    return () => {
      closeSandbox();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "");
  };

  const handleLanguageChange = (newLang: "javascript" | "python" | "java" | "cpp") => {
    setLanguage(newLang);
    setOutput([]);
  };

  // Create new file
  const createNewFile = async () => {
    console.log('Creating new file, session:', session);
    
    if (!session) {
      toast.error('Sandbox not initialized. Please wait or refresh.');
      return;
    }

    if (!newFileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    try {
      const filepath = `${repoPath}/${newFileName}`;
      console.log('Writing file to:', filepath);
      
      await writeFile(filepath, '');
      
      setFiles(prev => [...prev, { path: filepath, content: '' }]);
      setSelectedFile(filepath);
      setCode('');
      setNewFileName('');
      toast.success('File created successfully');
    } catch (error) {
      console.error('File creation error:', error);
      toast.error('Failed to create file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Load file content
  const loadFile = async (filepath: string) => {
    if (!session) {
      toast.error('Sandbox not initialized');
      return;
    }

    try {
      const content = await readFile(filepath);
      setCode(content);
      setSelectedFile(filepath);
      
      // Update language based on file extension
      const ext = filepath.split('.').pop()?.toLowerCase();
      if (ext === 'js' || ext === 'ts') setLanguage('javascript');
      else if (ext === 'py') setLanguage('python');
      else if (ext === 'java') setLanguage('java');
      else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') setLanguage('cpp');
    } catch (error) {
      toast.error('Failed to load file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Delete file
  const handleDeleteFile = async (filepath: string) => {
    if (!session) {
      toast.error('Sandbox not initialized');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${filepath}?`)) {
      return;
    }

    try {
      await deleteFile(filepath);
      setFiles(prev => prev.filter(f => f.path !== filepath));
      
      if (selectedFile === filepath) {
        setCode('');
        setSelectedFile('');
      }
      
      toast.success('File deleted successfully');
    } catch (error) {
      toast.error('Failed to delete file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Create .gitignore file
  const createGitignore = async () => {
    if (!session) {
      toast.error('Sandbox not initialized');
      return;
    }

    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json
yarn.lock

# Build outputs
dist/
build/
out/
.next/
target/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Test coverage
coverage/
.nyc_output/

# Temporary files
tmp/
temp/
*.tmp
`;

    try {
      const filepath = `${repoPath}/.gitignore`;
      await writeFile(filepath, gitignoreContent);
      
      setFiles(prev => [...prev, { path: filepath, content: gitignoreContent }]);
      setSelectedFile(filepath);
      setCode(gitignoreContent);
      toast.success('.gitignore created successfully');
    } catch (error) {
      console.error('Failed to create .gitignore:', error);
      toast.error('Failed to create .gitignore');
    }
  };

  // Create README.md file
  const createReadme = async () => {
    if (!session) {
      toast.error('Sandbox not initialized');
      return;
    }

    const readmeContent = `# Multi-Agent Debugger Project

## Overview
This project uses E2B sandbox environment for collaborative code editing and execution.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd <repository-name>
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
# or
yarn install
\`\`\`

3. Set up environment variables:
Create a \`.env.local\` file in the root directory:
\`\`\`
E2B_API_KEY=your_api_key_here
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features
- **Code Editor**: Monaco-based editor with multi-language support
- **E2B Sandbox**: Execute code in isolated environments
- **Git Integration**: Built-in Git operations (commit, push, pull)
- **File Management**: Create, edit, and delete files in the sandbox
- **Collaborative**: Multiple developers can work on the same codebase

## Supported Languages
- JavaScript/TypeScript
- Python
- Java
- C++

## Project Structure
\`\`\`
.
├── app/                  # Next.js app directory
├── components/           # React components
├── lib/                  # Utility libraries
├── hooks/                # Custom React hooks
└── public/               # Static assets
\`\`\`

## Contributing
1. Create a new branch for your feature
2. Make your changes
3. Test your code
4. Submit a pull request

## License
MIT
`;

    try {
      const filepath = `${repoPath}/README.md`;
      await writeFile(filepath, readmeContent);
      
      setFiles(prev => [...prev, { path: filepath, content: readmeContent }]);
      setSelectedFile(filepath);
      setCode(readmeContent);
      toast.success('README.md created successfully');
    } catch (error) {
      console.error('Failed to create README:', error);
      toast.error('Failed to create README');
    }
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput([]);
    setShowOutput(true);
    
    try {
      if (!session) {
        toast.error('Sandbox not initialized. Initializing...');
        await initializeSandbox();
        return;
      }

      const logs: string[] = [];
      logs.push(`Executing ${language} code in E2B sandbox...`);
      logs.push('---');
      
      // Execute code in E2B sandbox
      const result = await executeInSandbox(language, code);
      
      if (result.success) {
        logs.push('✓ Execution completed successfully');
        logs.push('');
        if (result.stdout) {
          logs.push('Output:');
          logs.push(result.stdout);
        }
        if (result.stderr && result.stderr.trim()) {
          logs.push('');
          logs.push('Warnings/Errors:');
          logs.push(result.stderr);
        }
      } else {
        logs.push('✗ Execution failed');
        logs.push('');
        if (result.stderr) {
          logs.push('Error:');
          logs.push(result.stderr);
        }
        if (result.error) {
          logs.push(result.error);
        }
      }
      
      logs.push('');
      logs.push(`Exit code: ${result.exitCode}`);
      
      setOutput(logs);
      
      if (result.success) {
        toast.success('Code executed successfully!');
      } else {
        toast.error('Code execution failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setOutput([
        '✗ Execution error',
        '',
        'Error:',
        errorMsg
      ]);
      toast.error('Execution error: ' + errorMsg);
    } finally {
      setIsRunning(false);
    }
  };

  // Save current code to sandbox
  const saveToSandbox = async () => {
    if (!session) {
      toast.error('Sandbox not initialized');
      return;
    }

    if (!selectedFile) {
      toast.error('No file selected. Create a new file first.');
      return;
    }

    try {
      await writeFile(selectedFile, code);
      
      // Update files list
      setFiles(prev => {
        const existing = prev.find(f => f.path === selectedFile);
        if (existing) {
          return prev.map(f => f.path === selectedFile ? { ...f, content: code } : f);
        }
        return [...prev, { path: selectedFile, content: code }];
      });
      
      toast.success(`File saved: ${selectedFile}`);
    } catch (error) {
      toast.error('Failed to save file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Clone repository to sandbox
  const handleCloneRepo = async (repoUrl: string) => {
    if (!session) {
      toast.error('Sandbox not initialized');
      return;
    }

    try {
      toast.info('Cloning repository...');
      const result = await cloneRepository(repoUrl, repoPath);
      
      if (result.success) {
        toast.success('Repository cloned successfully!');
        setOutput([
          '✓ Repository cloned',
          '',
          'Output:',
          result.stdout,
          '',
          `Path: ${repoPath}`
        ]);
        
        // List files in the cloned repo and update file tree
        try {
          console.log('Listing files in:', repoPath);
          const fileList = await listFiles(repoPath);
          console.log('Files in cloned repo:', fileList);
          console.log('Number of files found:', fileList.length);
          
          if (fileList.length === 0) {
            toast.warning('Repository cloned but no files found. It might be empty.');
            return;
          }
          
          // Update files state with the cloned files
          const filesWithContent = fileList.map(filepath => ({
            path: filepath,
            content: '' // Content will be loaded when file is opened
          }));
          
          console.log('Setting files state with:', filesWithContent);
          setFiles(filesWithContent);
          toast.success(`Found ${fileList.length} files in repository`);
        } catch (error) {
          console.error('Failed to list files:', error);
          toast.warning('Repository cloned but failed to list files');
        }
      } else {
        toast.error('Failed to clone repository');
        setOutput([
          '✗ Clone failed',
          '',
          'Error:',
          result.stderr || result.error || 'Unknown error'
        ]);
      }
    } catch (error) {
      toast.error('Clone error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Commit changes in sandbox
  const handleCommit = async (message: string) => {
    if (!session) {
      toast.error('Sandbox not initialized');
      return;
    }

    try {
      toast.info('Committing changes...');
      const result = await gitCommit(repoPath, message);
      
      if (result.success) {
        toast.success('Changes committed!');
        setOutput([
          '✓ Commit successful',
          '',
          'Output:',
          result.stdout
        ]);
      } else {
        toast.error('Commit failed');
        setOutput([
          '✗ Commit failed',
          '',
          'Error:',
          result.stderr || result.error || 'Unknown error'
        ]);
      }
    } catch (error) {
      toast.error('Commit error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Push changes from sandbox
  const handlePush = async () => {
    if (!session) {
      toast.error('Sandbox not initialized');
      return;
    }

    try {
      toast.info('Pushing to remote...');
      const result = await gitPush(repoPath);
      
      if (result.success) {
        toast.success('Pushed successfully!');
        setOutput([
          '✓ Push successful',
          '',
          'Output:',
          result.stdout
        ]);
      } else {
        toast.error('Push failed');
        setOutput([
          '✗ Push failed',
          '',
          'Error:',
          result.stderr || result.error || 'Unknown error'
        ]);
      }
    } catch (error) {
      toast.error('Push error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Pull changes to sandbox
  const handlePull = async () => {
    if (!session) {
      toast.error('Sandbox not initialized');
      return;
    }

    try {
      toast.info('Pulling from remote...');
      const result = await gitPull(repoPath);
      
      if (result.success) {
        toast.success('Pulled successfully!');
        setOutput([
          '✓ Pull successful',
          '',
          'Output:',
          result.stdout
        ]);
      } else {
        toast.error('Pull failed');
        setOutput([
          '✗ Pull failed',
          '',
          'Error:',
          result.stderr || result.error || 'Unknown error'
        ]);
      }
    } catch (error) {
      toast.error('Pull error: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
          {/* Sandbox Status Indicator */}
          <div className="flex items-center gap-2 px-2 py-1 rounded text-xs">
            {sandboxLoading ? (
              <span className="text-yellow-500">⏳ Initializing sandbox...</span>
            ) : session ? (
              <span className="text-green-500">✓ Sandbox ready: {session.sessionId.slice(0, 8)}...</span>
            ) : (
              <span className="text-red-500">✗ Sandbox not initialized</span>
            )}
          </div>
          <Separator orientation="vertical" className="h-6" />
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
                {/* Create New File Section */}
                <div className="mb-4 space-y-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="New file name..."
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createNewFile();
                      }}
                      className="flex-1 px-2 py-1 text-xs border rounded bg-background"
                      disabled={!session}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={createNewFile}
                      disabled={!session || !newFileName.trim()}
                      className="h-auto py-1 px-2"
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                  {!session && (
                    <p className="text-xs text-muted-foreground px-1">
                      Initialize sandbox to create files
                    </p>
                  )}
                </div>

                <Separator className="my-2" />

                {/* Files List */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1 flex items-center justify-between">
                    <span>Sandbox Files</span>
                    <span className="text-[10px]">{files.length}</span>
                  </div>
                  {files.length === 0 && (
                    <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                      No files yet. Create a new file or clone a repository.
                    </div>
                  )}
                  {files.map((file) => {
                    const fileName = file.path.split('/').pop() || file.path;
                    const isActive = selectedFile === file.path;
                    
                    // Determine file icon based on extension
                    const getFileIcon = () => {
                      if (fileName.endsWith('.json')) return <FileJson className="h-4 w-4 flex-shrink-0 text-yellow-500" />;
                      if (fileName.endsWith('.md')) return <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />;
                      if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return <Code className="h-4 w-4 flex-shrink-0 text-blue-400" />;
                      if (fileName.endsWith('.js')) return <Code className="h-4 w-4 flex-shrink-0 text-yellow-600" />;
                      if (fileName.endsWith('.py')) return <Code className="h-4 w-4 flex-shrink-0 text-blue-600" />;
                      if (fileName.endsWith('.java')) return <Code className="h-4 w-4 flex-shrink-0 text-red-600" />;
                      if (fileName.endsWith('.cpp')) return <Code className="h-4 w-4 flex-shrink-0 text-purple-600" />;
                      return <FileText className="h-4 w-4 flex-shrink-0" />;
                    };
                    
                    return (
                      <div
                        key={file.path}
                        className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 group ${
                          isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                        }`}
                      >
                        <button
                          className="flex-1 flex items-center gap-2 truncate"
                          onClick={() => loadFile(file.path)}
                        >
                          {getFileIcon()}
                          <span className="truncate">{fileName}</span>
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFile(file.path)}
                          className="h-auto p-1 opacity-0 group-hover:opacity-100"
                        >
                          <span className="text-xs">×</span>
                        </Button>
                      </div>
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
              <div className="flex flex-col h-full">
                {/* E2B Sandbox Git Controls */}
                <div className="p-4 border-b space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <FolderGit2 className="h-4 w-4" />
                      E2B Sandbox
                    </p>
                    {session && (
                      <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  
                  {!session && (
                    <Button 
                      size="sm" 
                      className="w-full gap-2"
                      onClick={initializeSandbox}
                      disabled={sandboxLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${sandboxLoading ? 'animate-spin' : ''}`} />
                      Initialize Sandbox
                    </Button>
                  )}
                  
                  {session && (
                    <>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Repository URL"
                          className="w-full px-3 py-1.5 text-sm border rounded-md bg-background"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value) {
                              handleCloneRepo(e.currentTarget.value);
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <CommitDialog 
                            onCommit={handleCommit}
                            disabled={!session}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="flex-1 gap-1"
                            onClick={handlePull}
                          >
                            Pull
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="flex-1 gap-1"
                            onClick={handlePush}
                          >
                            Push
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="text-xs text-muted-foreground">
                        <div>Session: {session.sessionId.slice(0, 8)}...</div>
                        {session.sandboxId && (
                          <div>Sandbox: {session.sandboxId.slice(0, 8)}...</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Browser Git Panel */}
                <div className="flex-1 overflow-auto">
                  <div className="p-2 border-b">
                    <p className="text-xs font-semibold text-muted-foreground uppercase px-2">
                      Browser Git
                    </p>
                  </div>
                  {gitClient && (
                    <GitPanel 
                      gitClient={gitClient}
                      onRefresh={() => {
                        console.log('Git operation completed');
                      }}
                    />
                  )}
                </div>
              </div>
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
                disabled={isRunning || !session}
                size="sm"
                className="h-7 gap-2"
                title={!session ? "Initialize sandbox first" : "Run code in E2B sandbox"}
              >
                <PlayIcon className="h-3 w-3" />
                {isRunning ? "Running..." : "Run"}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 gap-2"
                onClick={saveToSandbox}
                disabled={!session}
                title={!session ? "Initialize sandbox first" : "Save to E2B sandbox"}
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
              
              <Button variant="outline" size="sm" className="h-7 gap-2">
                <Upload className="h-3 w-3" />
                Import
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-2">
                <Download className="h-3 w-3" />
                Export
              </Button>
              
              {!session && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 gap-2 ml-2"
                  onClick={initializeSandbox}
                  disabled={sandboxLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${sandboxLoading ? 'animate-spin' : ''}`} />
                  Init Sandbox
                </Button>
              )}
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
