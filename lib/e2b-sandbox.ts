import { Sandbox } from 'e2b';

export interface SandboxFile {
  path: string;
  content: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
  command?: string; // The command that was executed
  actualPath?: string; // For git clone: the actual path where repo was cloned
}

// Template ID for deekshiharsha2185/codedebugger — visible in E2B dashboard
const E2B_TEMPLATE_ID = '94e6x6bza518cmqygprc';

export class E2BSandboxManager {
  private sandbox: Sandbox | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    if (this.sandbox) {
      return; // Already initialized
    }

    try {
      this.sandbox = await Sandbox.create(E2B_TEMPLATE_ID, {
        apiKey: this.apiKey,
        timeoutMs: 10 * 60 * 1000, // 10 minutes timeout
      });
      console.log('E2B Sandbox initialized:', this.sandbox.sandboxId);
    } catch (error) {
      console.error('Failed to initialize E2B sandbox:', error);
      // Preserve the original error message so callers can surface it
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize sandbox: ${msg}`);
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }

    await this.sandbox.files.write(path, content);
  }

  async readFile(path: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }

    const content = await this.sandbox.files.read(path);
    return content;
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }

    await this.sandbox.files.remove(path);
  }

  async listFiles(path: string = '/'): Promise<string[]> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }

    try {
      // First check if the path exists
      const checkCmd = `test -d ${path} && echo "exists" || echo "not exists"`;
      const checkProc = await this.sandbox.commands.run(checkCmd);
      
      if (checkProc.stdout.includes('not exists')) {
        console.warn(`Path ${path} does not exist`);
        return [];
      }
      
      // Use find command to recursively list all files, excluding .git directory
      const command = `find ${path} -type f ! -path "*/.git/*" 2>/dev/null | head -n 1000`;
      const proc = await this.sandbox.commands.run(command);
      
      if (proc.exitCode !== 0 && proc.stderr) {
        console.warn('listFiles command failed:', proc.stderr);
        return [];
      }
      
      const files = proc.stdout
        .split('\n')
        .filter(f => f.trim() && !f.includes('No files found'))
        .map(f => f.trim())
        .filter(f => !f.includes('.git/')); // Extra filter for .git files
      
      console.log(`Found ${files.length} files in ${path}`);
      return files;
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  async executeCode(
    language: string,
    code: string,
    filename?: string,
    stdin?: string
  ): Promise<ExecutionResult> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }

    try {
      let command: string;
      let filepath = filename || '';

      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          if (!filepath) {
            filepath = '/workspace/js/temp.js';
          }
          console.log(`[E2B] JavaScript filepath: ${filepath}`);
          // Ensure directory exists and write file
          const jsDir = filepath.substring(0, filepath.lastIndexOf('/'));
          await this.sandbox.commands.run(`mkdir -p ${jsDir}`);
          await this.writeFile(filepath, code);
          command = `node ${filepath}`;
          break;

        case 'python':
        case 'py':
          if (!filepath) {
            filepath = '/workspace/python/temp.py';
          }
          console.log(`[E2B] Python filepath: ${filepath}`);
          // Ensure directory exists and write file
          const pyDir = filepath.substring(0, filepath.lastIndexOf('/'));
          await this.sandbox.commands.run(`mkdir -p ${pyDir}`);
          await this.writeFile(filepath, code);
          command = `python3 ${filepath}`;
          break;

        case 'java':
          if (!filepath) {
            filepath = '/workspace/java/Temp.java';
          }
          console.log(`[E2B] Java filepath: ${filepath}`);
          // Ensure directory exists and write file
          const javaDir = filepath.substring(0, filepath.lastIndexOf('/'));
          await this.sandbox.commands.run(`mkdir -p ${javaDir}`);
          await this.writeFile(filepath, code);
          const className = filepath.split('/').pop()?.replace('.java', '') || 'Temp';
          command = `cd ${javaDir} && javac ${className}.java && java ${className}`;
          break;

        case 'cpp':
        case 'c++':
          // Use provided filepath or default to temp.cpp
          if (!filepath) {
            filepath = '/workspace/cpp/temp.cpp';
          }
          console.log(`[E2B] C++ filepath: ${filepath}`);
          
          // Ensure directory exists and write file
          const cppDir = filepath.substring(0, filepath.lastIndexOf('/'));
          await this.sandbox.commands.run(`mkdir -p ${cppDir}`);
          console.log(`[E2B] Writing C++ file to: ${filepath}`);
          await this.writeFile(filepath, code);
          console.log(`[E2B] File written successfully`);
          
          // Verify file exists
          const verifyResult = await this.sandbox.commands.run(`ls -la ${filepath}`);
          console.log(`[E2B] File verification:`, verifyResult.stdout);
          
          const cppFileName = filepath.split('/').pop()?.replace('.cpp', '') || 'temp';
          const sourceFile = filepath.split('/').pop() || 'temp.cpp';
          console.log(`[E2B] Compiling: ${sourceFile} -> ${cppFileName}`);
          command = `cd ${cppDir} && g++ -o ${cppFileName} ${sourceFile} && ./${cppFileName}`;
          console.log(`[E2B] Command: ${command}`);
          break;

        default:
          return {
            stdout: '',
            stderr: `Unsupported language: ${language}`,
            exitCode: 1,
            error: 'Unsupported language',
          };
      }

      console.log(`[E2B] Executing: ${command}`);
      console.log(`[E2B] Stdin provided: ${stdin ? 'Yes (' + stdin.length + ' chars)' : 'No'}`);
      
      // If stdin is provided, pipe it to the command
      let finalCommand = command;
      if (stdin && stdin.trim()) {
        // Escape single quotes in stdin and use echo with pipe
        const escapedStdin = stdin.replace(/'/g, "'\\''");
        finalCommand = `echo '${escapedStdin}' | ${command}`;
        console.log(`[E2B] Using stdin, final command: ${finalCommand}`);
      }
      
      const proc = await this.sandbox.commands.run(finalCommand, {
        timeoutMs: 60000, // 60 second timeout
      });
      console.log(`[E2B] Execution complete. Exit code: ${proc.exitCode}`);
      console.log(`[E2B] stdout length: ${proc.stdout.length} chars`);
      console.log(`[E2B] stderr length: ${proc.stderr.length} chars`);
      if (proc.stdout) console.log(`[E2B] stdout: ${proc.stdout}`);
      if (proc.stderr) console.log(`[E2B] stderr: ${proc.stderr}`);

      return {
        stdout: proc.stdout,
        stderr: proc.stderr,
        exitCode: proc.exitCode,
        command: finalCommand, // Include the final command that was executed (with stdin if provided)
      };
    } catch (error) {
      console.error('[E2B] Code execution error:', error);
      
      // Handle CommandExitError which contains stdout/stderr
      if (error && typeof error === 'object' && 'result' in error) {
        const result = (error as { result: ExecutionResult }).result;
        return {
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: result.exitCode || 1,
          error: result.stderr || (error instanceof Error ? error.message : 'Unknown error'),
        };
      }
      
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async runCommand(command: string): Promise<ExecutionResult> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }

    try {
      const proc = await this.sandbox.commands.run(command, {
        timeoutMs: 60000, // 60 second timeout
      });

      return {
        stdout: proc.stdout,
        stderr: proc.stderr,
        exitCode: proc.exitCode,
      };
    } catch (error) {
      // Handle CommandExitError which contains stdout/stderr
      if (error && typeof error === 'object' && 'result' in error) {
        const result = (error as { result: ExecutionResult }).result;
        return {
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: result.exitCode || 1,
          error: result.stderr || (error instanceof Error ? error.message : 'Unknown error'),
        };
      }
      
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async cloneRepository(repoUrl: string, targetPath: string = '/workspace/repo'): Promise<ExecutionResult> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }

    try {
      // First check if git is installed
      const gitCheckCmd = `which git`;
      const gitCheck = await this.sandbox.commands.run(gitCheckCmd);
      console.log('Git check:', gitCheck.stdout, gitCheck.stderr);
      
      if (gitCheck.exitCode !== 0) {
        console.error('Git is not installed in sandbox');
        return {
          stdout: '',
          stderr: 'Git is not installed in the sandbox. Please ensure git is included in your E2B template.',
          exitCode: 1,
          error: 'Git not found',
        };
      }
      
      // Extract repository name from URL
      const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
      const actualTargetPath = `${targetPath}/${repoName}`;
      
      // First, remove the target path if it exists to avoid conflicts
      const cleanupCmd = `rm -rf ${actualTargetPath}`;
      await this.sandbox.commands.run(cleanupCmd);
      
      // Ensure target directory exists
      const mkdirCmd = `mkdir -p ${targetPath}`;
      await this.sandbox.commands.run(mkdirCmd);
      
      // Clone with minimal depth for faster cloning - let git create the repo folder
      const cloneCmd = `cd ${targetPath} && git clone --depth 1 ${repoUrl}`;
      console.log('Executing clone command:', cloneCmd);
      console.log('Repository will be cloned to:', actualTargetPath);
      
      const result = await this.runCommand(cloneCmd);
      
      // Verify the clone by listing the directory
      if (result.exitCode === 0) {
        const lsCmd = `ls -la ${actualTargetPath}`;
        const lsResult = await this.sandbox.commands.run(lsCmd);
        console.log('Directory listing after clone:', lsResult.stdout);
        
        // Also find all files
        const findCmd = `find ${actualTargetPath} -type f ! -path '*/.git/*' | head -n 50`;
        const findResult = await this.sandbox.commands.run(findCmd);
        console.log('Files found after clone:', findResult.stdout);
        
        // Return the actual path in stdout for reference
        result.stdout = `${result.stdout}\nCloned to: ${actualTargetPath}\n${findResult.stdout}`;
        result.actualPath = actualTargetPath; // Add the actual cloned path
      }
      
      return result;
    } catch (error) {
      console.error('Clone repository error:', error);
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown clone error',
        exitCode: 1,
        error: error instanceof Error ? error.message : 'Unknown clone error',
      };
    }
  }

  async gitCommit(path: string, message: string): Promise<ExecutionResult> {
    const commands = [
      `cd ${path}`,
      `git add .`,
      `git commit -m "${message}"`,
    ].join(' && ');

    return await this.runCommand(commands);
  }

  async gitPush(path: string, remote: string = 'origin', branch: string = 'main'): Promise<ExecutionResult> {
    return await this.runCommand(`cd ${path} && git push ${remote} ${branch}`);
  }

  async gitPull(path: string, remote: string = 'origin', branch: string = 'main'): Promise<ExecutionResult> {
    return await this.runCommand(`cd ${path} && git pull ${remote} ${branch}`);
  }

  async startTerminal(): Promise<{ terminalId: string }> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }
    // E2B sandboxes have a built-in terminal, return the sandbox ID as terminal ID
    return { terminalId: this.sandbox.sandboxId };
  }

  getTerminalSession(): { onData: ((data: string) => void) | null; onExit: (() => void) | null } | null {
    if (!this.sandbox) {
      return null;
    }
    // Return a terminal session object for streaming
    return {
      onData: null,
      onExit: null
    };
  }

  async sendToTerminal(data: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }
    // Send command to terminal
    await this.runCommand(data);
  }

  async resizeTerminal(cols: number, rows: number): Promise<void> {
    // E2B terminal resize - not directly supported, this is a placeholder
    console.log(`Terminal resize requested: ${cols}x${rows}`);
  }

  async close(): Promise<void> {
    if (this.sandbox) {
      await this.sandbox.kill();
      this.sandbox = null;
      console.log('E2B Sandbox closed');
    }
  }

  getSandboxId(): string | null {
    return this.sandbox?.sandboxId || null;
  }

  static async reconnect(sandboxId: string, apiKey: string): Promise<E2BSandboxManager> {
    const manager = new E2BSandboxManager(apiKey);
    try {
      manager.sandbox = await Sandbox.connect(sandboxId, { apiKey });
      console.log('[E2BSandboxManager] Reconnected to sandbox:', sandboxId);
    } catch (error) {
      console.error('[E2BSandboxManager] Failed to reconnect to sandbox:', error);
      throw new Error(
        `Failed to reconnect to sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    return manager;
  }
}
