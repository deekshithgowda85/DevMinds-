    import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import FS from '@isomorphic-git/lightning-fs';

// Initialize filesystem for browser
const fs = new FS('git-fs');

// Type for git errors with code property
interface GitError extends Error {
  code?: string;
}

export interface GitConfig {
  name: string;
  email: string;
  token?: string;
}

export interface CommitInfo {
  oid: string;
  message: string;
  author: string;
  date: Date;
}

export class GitClient {
  private dir: string;
  private config: GitConfig;

  constructor(dir: string = '/workspace', config?: GitConfig) {
    this.dir = dir;
    this.config = config || {
      name: 'User',
      email: 'user@example.com',
    };
  }

  // Initialize a new repository
  async init(): Promise<void> {
    await git.init({
      fs,
      dir: this.dir,
      defaultBranch: 'main',
    });
  }

  // Clone a repository
  async clone(url: string, depth: number = 1): Promise<void> {
    try {
      await git.clone({
        fs,
        http,
        dir: this.dir,
        url,
        depth,
        singleBranch: true,
        corsProxy: 'https://cors.isomorphic-git.org',
        onAuth: () => ({
          username: this.config.token || '',
          password: 'x-oauth-basic',
        }),
      });
    } catch (error) {
      console.error('Clone error:', error);
      throw error;
    }
  }

  // Get current status
  async status(filepath: string): Promise<string> {
    return await git.status({
      fs,
      dir: this.dir,
      filepath,
    });
  }

  // Get all file statuses
  async statusMatrix(): Promise<Array<[string, number, number, number]>> {
    return await git.statusMatrix({
      fs,
      dir: this.dir,
    });
  }

  // Add files to staging
  async add(filepath: string): Promise<void> {
    await git.add({
      fs,
      dir: this.dir,
      filepath,
    });
  }

  // Add all files
  async addAll(): Promise<void> {
    const matrix = await this.statusMatrix();
    for (const [filepath, , worktreeStatus] of matrix) {
      if (worktreeStatus !== 1) {
        await this.add(filepath);
      }
    }
  }

  // Commit changes
  async commit(message: string): Promise<string> {
    return await git.commit({
      fs,
      dir: this.dir,
      message,
      author: {
        name: this.config.name,
        email: this.config.email,
      },
    });
  }

  // Push to remote
  async push(
    remote: string = 'origin',
    branch: string = 'main',
    force: boolean = false
  ): Promise<void> {
    try {
      await git.push({
        fs,
        http,
        dir: this.dir,
        remote,
        ref: branch,
        force,
        corsProxy: 'https://cors.isomorphic-git.org',
        onAuth: () => ({
          username: this.config.token || '',
          password: 'x-oauth-basic',
        }),
      });
    } catch (error) {
      console.error('Push error:', error);
      throw error;
    }
  }

  // Fetch from remote
  async fetch(remote: string = 'origin'): Promise<void> {
    try {
      await git.fetch({
        fs,
        http,
        dir: this.dir,
        remote,
        corsProxy: 'https://cors.isomorphic-git.org',
        onAuth: () => ({
          username: this.config.token || '',
          password: 'x-oauth-basic',
        }),
      });
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  // Pull from remote (preserves local changes)
  async pull(remote: string = 'origin', branch: string = 'main'): Promise<void> {
    try {
      await git.pull({
        fs,
        http,
        dir: this.dir,
        remote,
        ref: branch,
        singleBranch: true,
        corsProxy: 'https://cors.isomorphic-git.org',
        author: {
          name: this.config.name,
          email: this.config.email,
        },
        onAuth: () => ({
          username: this.config.token || '',
          password: 'x-oauth-basic',
        }),
      });
    } catch (error) {
      console.error('Pull error:', error);
      throw error;
    }
  }

  // Pull with local changes preserved (stash -> pull -> unstash)
  async pullWithLocalChanges(remote: string = 'origin', branch: string = 'main'): Promise<{
    success: boolean;
    hasConflicts: boolean;
    message: string;
  }> {
    try {
      // 1. Check if there are local changes
      const hasChanges = await this.hasUncommittedChanges();
      
      if (hasChanges) {
        // 2. Commit local changes to temporary commit
        const tempCommitOid = await this.commit('[TEMP] Local changes before pull');
        console.log('Saved local changes to temporary commit:', tempCommitOid);
      }

      // 3. Fetch from remote
      await this.fetch(remote);

      // 4. Merge remote changes
      try {
        await git.merge({
          fs,
          dir: this.dir,
          ours: branch,
          theirs: `${remote}/${branch}`,
          author: {
            name: this.config.name,
            email: this.config.email,
          },
        });

        return {
          success: true,
          hasConflicts: false,
          message: hasChanges 
            ? 'Pulled successfully with local changes preserved'
            : 'Pulled successfully',
        };
      } catch (mergeError: unknown) {
        // Check if it's a merge conflict
        if (mergeError instanceof Error && 'code' in mergeError && (mergeError as GitError).code === 'MergeNotSupportedError') {
          return {
            success: false,
            hasConflicts: true,
            message: 'Merge conflicts detected. Please resolve manually.',
          };
        }
        throw mergeError;
      }
    } catch (error) {
      console.error('Pull with local changes error:', error);
      return {
        success: false,
        hasConflicts: false,
        message: `Pull failed: ${error}`,
      };
    }
  }

  // Check if there are uncommitted changes
  async hasUncommittedChanges(): Promise<boolean> {
    const matrix = await this.statusMatrix();
    return matrix.some(([, head, workdir, stage]) => {
      return workdir !== head || stage !== head;
    });
  }

  // Merge remote branch into current branch
  async merge(branch: string, remote: string = 'origin'): Promise<void> {
    await git.merge({
      fs,
      dir: this.dir,
      ours: await this.currentBranch() || 'main',
      theirs: `${remote}/${branch}`,
      author: {
        name: this.config.name,
        email: this.config.email,
      },
    });
  }

  // Get commit history
  async log(depth: number = 10): Promise<CommitInfo[]> {
    const commits = await git.log({
      fs,
      dir: this.dir,
      depth,
    });

    return commits.map((commit) => ({
      oid: commit.oid,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: new Date(commit.commit.author.timestamp * 1000),
    }));
  }

  // Get current branch
  async currentBranch(): Promise<string | undefined> {
    const branch = await git.currentBranch({
      fs,
      dir: this.dir,
      fullname: false,
    });
    return branch || undefined;
  }

  // List branches
  async listBranches(): Promise<string[]> {
    return await git.listBranches({
      fs,
      dir: this.dir,
    });
  }

  // Create and checkout new branch
  async checkout(branch: string, create: boolean = false): Promise<void> {
    await git.checkout({
      fs,
      dir: this.dir,
      ref: branch,
      force: create,
    });

    if (create) {
      await git.branch({
        fs,
        dir: this.dir,
        ref: branch,
        checkout: true,
      });
    }
  }

  // Add remote
  async addRemote(name: string, url: string): Promise<void> {
    await git.addRemote({
      fs,
      dir: this.dir,
      remote: name,
      url,
    });
  }

  // List remotes
  async listRemotes(): Promise<Array<{ remote: string; url: string }>> {
    return await git.listRemotes({
      fs,
      dir: this.dir,
    });
  }

  // Write file
  async writeFile(filepath: string, content: string): Promise<void> {
    await fs.promises.writeFile(`${this.dir}/${filepath}`, content, 'utf8');
  }

  // Read file
  async readFile(filepath: string): Promise<string> {
    const data = await fs.promises.readFile(`${this.dir}/${filepath}`, 'utf8');
    return data as string;
  }

  // List files
  async listFiles(dirPath: string = ''): Promise<string[]> {
    const fullPath = dirPath ? `${this.dir}/${dirPath}` : this.dir;
    return await fs.promises.readdir(fullPath);
  }

  // Update config
  setConfig(config: Partial<GitConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const createGitClient = (config?: GitConfig) => new GitClient('/workspace', config);
