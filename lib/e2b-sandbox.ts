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
}

export class E2BSandboxManager {
  private sandbox: Sandbox | null = null;
  private apiKey: string;
  private templateId: string = 'codedebugger';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    if (this.sandbox) {
      return; // Already initialized
    }

    try {
      this.sandbox = await Sandbox.create(this.templateId, {
        apiKey: this.apiKey,
        timeoutMs: 10 * 60 * 1000, // 10 minutes timeout
      });
      console.log('E2B Sandbox initialized:', this.sandbox.sandboxId);
    } catch (error) {
      console.error('Failed to initialize E2B sandbox:', error);
      throw new Error('Failed to initialize sandbox');
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
    filename?: string
  ): Promise<ExecutionResult> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }

    try {
      let command: string;
      let filepath: string;

      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          filepath = filename || '/workspace/js/temp.js';
          await this.writeFile(filepath, code);
          command = `node ${filepath}`;
          break;

        case 'python':
        case 'py':
          filepath = filename || '/workspace/python/temp.py';
          await this.writeFile(filepath, code);
          command = `python3 ${filepath}`;
          break;

        case 'java':
          filepath = filename || '/workspace/java/Temp.java';
          await this.writeFile(filepath, code);
          const className = filepath.split('/').pop()?.replace('.java', '') || 'Temp';
          const dir = filepath.substring(0, filepath.lastIndexOf('/'));
          command = `cd ${dir} && javac ${className}.java && java ${className}`;
          break;

        case 'cpp':
        case 'c++':
          filepath = filename || '/workspace/cpp/temp.cpp';
          await this.writeFile(filepath, code);
          command = `cd /workspace/cpp && g++ -o temp temp.cpp && ./temp`;
          break;

        default:
          return {
            stdout: '',
            stderr: `Unsupported language: ${language}`,
            exitCode: 1,
            error: 'Unsupported language',
          };
      }

      const proc = await this.sandbox.commands.run(command);

      return {
        stdout: proc.stdout,
        stderr: proc.stderr,
        exitCode: proc.exitCode,
      };
    } catch (error) {
      console.error('Code execution error:', error);
      
      // Handle CommandExitError which contains stdout/stderr
      if (error && typeof error === 'object' && 'result' in error) {
        const result = (error as any).result;
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
      const proc = await this.sandbox.commands.run(command);

      return {
        stdout: proc.stdout,
        stderr: proc.stderr,
        exitCode: proc.exitCode,
      };
    } catch (error) {
      // Handle CommandExitError which contains stdout/stderr
      if (error && typeof error === 'object' && 'result' in error) {
        const result = (error as any).result;
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
}
