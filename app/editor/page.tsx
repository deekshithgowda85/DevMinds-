"use client";

import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useSearchParams, useRouter } from "next/navigation";
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
  Moon,
  Sun,
  FileJson,
  Code,
  FolderGit2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  const [showAiAgent, setShowAiAgent] = useState(true);
  const [selectedFile, setSelectedFile] = useState("");
  const [files, setFiles] = useState<Array<{path: string, content: string}>>([]);
  const [newFileName, setNewFileName] = useState("");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const repoPath = '/workspace/repo';
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [repoUrlInput, setRepoUrlInput] = useState("");
  const [terminalCommand, setTerminalCommand] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasClonedRef = useRef(false);
  
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
    runCommand,
    gitCommit,
    gitPush,
    gitPull,
  } = useE2BSandbox();

  // Initialize on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle sidebar resize
  const startResizing = () => setIsResizing(true);
  const stopResizing = () => setIsResizing(false);

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX - 48;
        if (newWidth >= 200 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResizing);
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

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

  // Auto-clone repository from URL params
  useEffect(() => {
    const autoClone = async () => {
      const repoUrl = searchParams.get('repo');
      if (repoUrl && session && !sandboxLoading && !hasClonedRef.current) {
        hasClonedRef.current = true;
        console.log('Auto-cloning repository from URL param:', repoUrl);
        // Decode the URL in case it's encoded
        const decodedUrl = decodeURIComponent(repoUrl);
        setRepoUrlInput(decodedUrl);
        await handleCloneRepo(decodedUrl);
      }
    };

    autoClone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sandboxLoading]);

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
      console.log('Loading file:', filepath);
      
      // Verify file exists before trying to read
      const verifyResult = await runCommand(`test -f "${filepath}" && echo "exists" || echo "not found"`);
      if (verifyResult.stdout.includes('not found')) {
        console.error('File not found:', filepath);
        toast.error(`File not found: ${filepath}`);
        return;
      }
      
      const content = await readFile(filepath);
      console.log('File content loaded, length:', content.length);
      setCode(content);
      setSelectedFile(filepath);
      
      // Update files array with content
      setFiles(prev => prev.map(f => 
        f.path === filepath ? { ...f, content } : f
      ));
      
      // Update language based on file extension
      const ext = filepath.split('.').pop()?.toLowerCase();
      if (ext === 'js' || ext === 'ts' || ext === 'tsx') setLanguage('javascript');
      else if (ext === 'py') setLanguage('python');
      else if (ext === 'java') setLanguage('java');
      else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'h' || ext === 'hpp') setLanguage('cpp');
      
      const fileName = filepath.split('/').pop() || filepath;
      toast.success(`Loaded ${fileName}`);
    } catch (error) {
      console.error('Failed to load file:', error);
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

    if (!repoUrl.trim()) {
      toast.error('Please enter a repository URL');
      return;
    }

    try {
      // Extract repo name
      const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
      
      setOutput(['⏳ Cloning repository...', '', `URL: ${repoUrl}`, `Target: ${repoPath}`]);
      toast.info('Cloning repository...');
      console.log('Starting clone:', repoUrl, 'to', repoPath);
      
      // Clean up any existing repo directory
      try {
        const checkResult = await runCommand(`test -d ${repoPath}/${repoName} && echo "exists" || echo "not exists"`);
        if (checkResult.stdout.includes('exists')) {
          console.log('Directory exists, cleaning up...');
          await runCommand(`rm -rf ${repoPath}/${repoName}`);
          console.log('Cleanup complete');
        }
      } catch (cleanupError) {
        console.log('Cleanup check skipped:', cleanupError);
      }
      
      // Clone directly to repoPath (git will create repoName directory inside)
      const result = await cloneRepository(repoUrl, repoPath);
      console.log('Clone result:', result);
      
      if (result.success || result.exitCode === 0) {
        // The actual cloned path will be repoPath/repoName
        const clonedPath = `${repoPath}/${repoName}`;
        
        setOutput([
          '✓ Repository cloned successfully!',
          '',
          'Output:',
          result.stdout || 'Clone completed',
          result.stderr || '',
          '',
          `Path: ${clonedPath}`,
          '',
          '⏳ Loading files...'
        ]);
        toast.success('Repository cloned! Loading files...');
        
        // Wait for filesystem to sync
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Attempting to load files from cloned repository');
        console.log('Repository name:', repoName);
        console.log('Cloned path:', clonedPath);
        
        // Try to find files in the cloned repository
        const pathsToTry = [
          clonedPath,
          repoPath,
          '/workspace',
        ];
        
        let filesFound = false;
        for (const tryPath of pathsToTry) {
          try {
            console.log('===== Trying path:', tryPath, '=====');
            const fileList = await listFiles(tryPath);
            console.log(`Found ${fileList.length} files in ${tryPath}:`, fileList.slice(0, 10));
            
            if (fileList.length > 0) {
              const filesWithContent = fileList.map(filepath => ({
                path: filepath,
                content: ''
              }));
              
              console.log('Setting files state with', filesWithContent.length, 'files');
              console.log('Sample file paths:', fileList.slice(0, 3));
              setFiles(filesWithContent);
              console.log('Switching to files view');
              
              setOutput(prev => [
                ...prev, 
                '', 
                `✓ Found ${fileList.length} files!`,
                `📁 Location: ${tryPath}`,
                '',
                'Sample files:',
                ...fileList.slice(0, 5).map(f => `  - ${f}`),
                fileList.length > 5 ? `  ... and ${fileList.length - 5} more` : '',
                '',
                'Files loaded in Explorer. Click on any file to view.'
              ]);
              toast.success(`Loaded ${fileList.length} files from ${repoName}`);
              setRepoUrlInput('');
              setActiveView('files');
              filesFound = true;
              break;
            }
          } catch (error) {
            console.error(`Failed to list files in ${tryPath}:`, error);
          }
        }
        
        if (!filesFound) {
          setOutput(prev => [
            ...prev, 
            '', 
            '⚠ No files found in any of these paths:',
            ...pathsToTry.map(p => `  - ${p}`),
            '',
            'Repository might be empty or using a different structure.',
            'Check the Terminal Output tab for git command results.'
          ]);
          toast.warning('Clone completed but no files found. Check Terminal Output for details.');
        }
      } else {
        toast.error('Failed to clone repository');
        setOutput([
          '✗ Clone failed',
          '',
          'Exit code:', String(result.exitCode),
          '',
          'Error:',
          result.stderr || result.error || 'Unknown error',
          '',
          'Possible reasons:',
          '- Git is not installed in the E2B sandbox',
          '- Repository URL is incorrect or inaccessible',
          '- Repository is private (public access required)',
          '- Network issues',
          '',
          'Tip: Make sure the repository URL is correct and publicly accessible',
          'Example: https://github.com/username/repository'
        ]);
        console.error('Clone failed:', result);
      }
    } catch (error) {
      console.error('Clone error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Clone error: ' + errorMsg);
      setOutput([
        '✗ Clone error',
        '',
        'Error:',
        errorMsg,
        '',
        'Please check:',
        '- Repository URL is correct',
        '- Repository is public or you have access',
        '- Internet connection is stable',
        '- E2B sandbox has git installed'
      ]);
    }
  };

  const handleTerminalCommand = async () => {
    if (!terminalCommand.trim() || !session) {
      return;
    }

    const cmd = terminalCommand.trim();
    setOutput(prev => [...prev, `$ ${cmd}`]);
    setTerminalCommand('');

    try {
      const result = await runCommand(cmd);
      
      const outputLines: string[] = [];
      if (result.stdout) outputLines.push(result.stdout);
      if (result.stderr) outputLines.push(result.stderr);
      if (result.exitCode !== 0) {
        outputLines.push(`Exit code: ${result.exitCode}`);
      }
      
      setOutput(prev => [...prev, ...outputLines]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Command failed';
      setOutput(prev => [...prev, `Error: ${errorMsg}`]);
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
          <div className="flex gap-1 text-sm relative">
            <Button
              ref={fileButtonRef}
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setShowFileMenu((v) => !v)}
            >
              File
            </Button>
            {showFileMenu && (
              <div
                className="absolute top-8 left-0 z-50 w-44 rounded border bg-popover text-popover-foreground shadow-md"
                onMouseLeave={() => setShowFileMenu(false)}
              >
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => {
                    setShowFileMenu(false);
                    fileInputRef.current?.click();
                  }}
                >
                  Import from Zip...
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  onClick={async () => {
                    setShowFileMenu(false);
                    try {
                      if (!session) {
                        toast.error('Sandbox not initialized');
                        return;
                      }
                      if (files.length === 0) {
                        toast.warning('No files to export');
                        return;
                      }
                      const zip = new JSZip();
                      for (const f of files) {
                        const content = await readFile(f.path);
                        const relPath = f.path.replace(repoPath + '/', '');
                        zip.file(relPath, content);
                      }
                      const blob = await zip.generateAsync({ type: 'blob' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'workspace.zip';
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      toast.success('Exported project as zip');
                    } catch (err) {
                      toast.error('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
                    }
                  }}
                >
                  Export as Zip
                </button>
              </div>
            )}
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
            suppressHydrationWarning
          >
            {mounted && (resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => router.push('/my-projects')}
            title="Back to Projects"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden file input for Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (!session) {
            toast.error('Sandbox not initialized');
            return;
          }
          try {
            const zip = await JSZip.loadAsync(file);
            const entries = Object.keys(zip.files);
            if (entries.length === 0) {
              toast.warning('Zip is empty');
              return;
            }
            // Write each file to sandbox, preserve structure under repoPath
            for (const entryName of entries) {
              const entry = zip.files[entryName];
              if (!entry || entry.dir) continue; // skip directories
              const content = await entry.async('string');
              const target = `${repoPath}/${entryName.replace(/^\/+/, '')}`;
              await writeFile(target, content);
            }
            // Refresh files list
            const fileList = await listFiles(repoPath);
            setFiles(fileList.map((p) => ({ path: p, content: '' })));
            toast.success('Imported zip into workspace');
          } catch (err) {
            toast.error('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
          } finally {
            e.target.value = '';
          }
        }}
      />

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
            variant={showAiAgent ? "secondary" : "ghost"}
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setShowAiAgent(!showAiAgent)}
            title="Toggle AI Agent"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            variant={showOutput ? "secondary" : "ghost"}
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setShowOutput(!showOutput)}
            title="Toggle Terminal"
          >
            <Terminal className="h-4 w-4" />
          </Button>
        </div>

        {/* Sidebar - File Explorer/Search/etc */}
        <div className="border-r flex flex-col bg-background overflow-hidden" style={{ width: sidebarWidth }}>
          <div className="h-10 border-b flex items-center px-3 font-semibold text-sm justify-between">
            <span>
              {activeView === "files" && "EXPLORER"}
              {activeView === "search" && "SEARCH"}
              {activeView === "git" && "SOURCE CONTROL"}
              {activeView === "debug" && "DEBUG"}
            </span>
            {activeView === "files" && session && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={async () => {
                  try {
                    const fileList = await listFiles(repoPath);
                    setFiles(fileList.map(p => ({ path: p, content: '' })));
                    toast.success(`Refreshed: ${fileList.length} files found`);
                  } catch (error) {
                    toast.error('Failed to refresh files');
                  }
                }}
                title="Refresh files"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {activeView === "files" && (
            <ScrollArea className="flex-1">
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
            </ScrollArea>
            )}
            {activeView === "search" && (
            <ScrollArea className="flex-1">
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
            </ScrollArea>
            )}
            {activeView === "git" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* E2B Sandbox Git Controls */}
                <div className="flex-shrink-0 border-b overflow-y-auto max-h-96">
                  <div className="p-3 space-y-2">
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
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Repository URL"
                            className="flex-1 px-2 py-1 text-xs border rounded bg-background"
                            value={repoUrlInput}
                            onChange={(e) => setRepoUrlInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && repoUrlInput) {
                                handleCloneRepo(repoUrlInput);
                              }
                            }}
                          />
                          <Button 
                            size="sm"
                            variant="secondary"
                            onClick={() => repoUrlInput && handleCloneRepo(repoUrlInput)}
                            disabled={!session || !repoUrlInput}
                            className="h-7 px-2 text-xs"
                          >
                            Clone
                          </Button>
                        </div>
                        <div className="flex gap-1.5">
                          <CommitDialog 
                            onCommit={handleCommit}
                            disabled={!session}
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="flex-1 gap-1 h-7 text-xs"
                            onClick={handlePull}
                          >
                            Pull
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="flex-1 gap-1 h-7 text-xs"
                            onClick={handlePush}
                          >
                            Push
                          </Button>
                        </div>
                      </div>
                      
                      <Separator className="my-1" />
                      
                      <div className="text-[10px] text-muted-foreground space-y-0.5">
                        <div>Session: {session.sessionId.slice(0, 8)}...</div>
                        {session.sandboxId && (
                          <div>Sandbox: {session.sandboxId.slice(0, 8)}...</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                </div>
              </div>
            )}
            {activeView === "debug" && (
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Debugger</p>
                  <Button size="sm" className="w-full gap-2">
                    <PlayIcon className="h-4 w-4" />
                    Start Debugging
                  </Button>
                </div>
              </div>
            </ScrollArea>
            )}
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 hover:w-1.5 bg-border hover:bg-primary cursor-col-resize transition-all"
          onMouseDown={startResizing}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Section - Editor and AI Agent */}
          <div className="flex-1 flex overflow-hidden">
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
              
              {/* Import/Export moved under File menu */}
              
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

              {/* Panel Toggle Buttons */}
              <div className="flex gap-1 ml-2 border-l pl-2">
                {!showAiAgent && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2"
                    onClick={() => setShowAiAgent(true)}
                    title="Open AI Agent"
                  >
                    <Code className="h-3 w-3" />
                    <span className="text-xs">AI Agent</span>
                  </Button>
                )}
                {!showOutput && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2"
                    onClick={() => setShowOutput(true)}
                    title="Open Terminal"
                  >
                    <Terminal className="h-3 w-3" />
                    <span className="text-xs">Terminal</span>
                  </Button>
                )}
              </div>
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

            {/* AI Agent Panel - Right Side */}
            {showAiAgent && (
              <div className="w-80 border-l flex flex-col bg-muted/20 overflow-hidden">
                <div className="h-10 border-b flex items-center justify-between px-3 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Code className="h-4 w-4" />
                    AI AGENT
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowAiAgent(false)}
                    title="Close AI Agent"
                  >
                    <span className="text-xs">×</span>
                  </Button>
                </div>
                
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg bg-background">
                      <h3 className="text-sm font-semibold mb-2">Multi-Agent System</h3>
                      <p className="text-xs text-muted-foreground">
                        AI agents will appear here to help with debugging and code analysis.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 border rounded bg-background">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs">System Ready</span>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg bg-background">
                      <h4 className="text-xs font-semibold mb-2">Available Agents:</h4>
                      <div className="space-y-1.5">
                        <div className="text-xs p-2 rounded border">
                          <div className="font-medium">Code Analyzer</div>
                          <div className="text-muted-foreground text-[10px]">Analyzes code structure</div>
                        </div>
                        <div className="text-xs p-2 rounded border">
                          <div className="font-medium">Debugger Agent</div>
                          <div className="text-muted-foreground text-[10px]">Finds and fixes bugs</div>
                        </div>
                        <div className="text-xs p-2 rounded border">
                          <div className="font-medium">Test Generator</div>
                          <div className="text-muted-foreground text-[10px]">Creates test cases</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="border-t p-2 bg-muted/30">
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>Multi-Agent Debugger</span>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${session ? 'bg-green-500' : 'bg-gray-500'}`} />
                      {session ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

        {/* Terminal Panel - Bottom */}
        {showOutput && (
          <div className="h-64 border-t flex flex-col bg-muted/20 overflow-hidden">
            <div className="h-10 border-b flex items-center justify-between px-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Terminal className="h-4 w-4" />
                TERMINAL
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setOutput([])}
                >
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowOutput(false)}
                  title="Close Terminal"
                >
                  <span className="text-xs">×</span>
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-3">
              {output.length === 0 ? (
                <div className="text-muted-foreground text-sm italic">
                  Interactive terminal. Type commands below or click &quot;Run&quot; to execute code.
                </div>
              ) : (
                <div className="space-y-0.5 font-mono text-xs">
                  {output.map((line, index) => (
                    <div 
                      key={index} 
                      className={`
                        ${line.startsWith('$') ? 'text-green-400 font-semibold' : ''}
                        ${line.startsWith('ERROR:') || line.startsWith('Error:') ? 'text-red-500' : ''}
                        ${line.startsWith('WARNING:') ? 'text-yellow-500' : ''}
                        ${line.startsWith('✓') ? 'text-green-500' : ''}
                        ${line.startsWith('✗') || line.startsWith('⚠') ? 'text-yellow-500' : ''}
                        ${line.startsWith('⏳') ? 'text-blue-500' : ''}
                        whitespace-pre-wrap break-words
                      `}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Terminal Input */}
            <div className="border-t p-2 bg-muted/30">
              <div className="flex gap-2 items-center mb-2">
                <span className="text-green-400 font-mono text-sm">$</span>
                <input
                  type="text"
                  value={terminalCommand}
                  onChange={(e) => setTerminalCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTerminalCommand();
                    }
                  }}
                  placeholder="Type command (e.g., ls, pwd, git status)..."
                  className="flex-1 px-2 py-1 text-xs font-mono border rounded bg-background"
                  disabled={!session}
                />
                <Button
                  size="sm"
                  onClick={handleTerminalCommand}
                  disabled={!session || !terminalCommand.trim()}
                  className="h-7 px-2 text-xs"
                >
                  Run
                </Button>
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {language === "javascript" && "JavaScript Runtime"}
                  {language === "python" && "Python 3.11"}
                  {language === "java" && "Java JDK 17"}
                  {language === "cpp" && "G++ Compiler"}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${session ? 'bg-green-500' : 'bg-gray-500'}`} />
                  {session ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        )}
        </div>
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
