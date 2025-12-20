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
      // Use find command to recursively list all files
      const command = `find ${path} -type f 2>/dev/null || echo "No files found"`;
      const proc = await this.sandbox.commands.run(command);
      
      if (proc.exitCode !== 0 && !proc.stdout.includes('No files found')) {
        console.warn('listFiles command failed:', proc.stderr);
        return [];
      }
      
      const files = proc.stdout
        .split('\n')
        .filter(f => f.trim() && !f.includes('No files found'))
        .map(f => f.trim());
      
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
    return await this.runCommand(`git clone ${repoUrl} ${targetPath}`);
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
