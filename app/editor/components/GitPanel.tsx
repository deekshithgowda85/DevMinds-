'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GitBranch,
  GitCommit,
  Upload,
  Download,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { GitClient, type CommitInfo } from '@/lib/git-client';

interface GitPanelProps {
  gitClient: GitClient;
  onRefresh?: () => void;
}

export function GitPanel({ gitClient, onRefresh }: GitPanelProps) {
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const [isCloneOpen, setIsCloneOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [token, setToken] = useState('');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Load initial data
  const loadGitData = async () => {
    try {
      const branch = await gitClient.currentBranch();
      setCurrentBranch(branch || 'main');
      
      const log = await gitClient.log(5);
      setCommits(log);
    } catch (error) {
      console.error('Failed to load git data:', error);
    }
  };

  // Clone repository
  const handleClone = async () => {
    if (!cloneUrl) return;
    
    setLoading(true);
    setStatus('Cloning repository...');
    try {
      await gitClient.clone(cloneUrl);
      setStatus('Repository cloned successfully!');
      setIsCloneOpen(false);
      setCloneUrl('');
      await loadGitData();
      onRefresh?.();
    } catch (error) {
      setStatus(`Clone failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Commit changes
  const handleCommit = async () => {
    if (!commitMessage) return;
    
    setLoading(true);
    setStatus('Committing changes...');
    try {
      await gitClient.addAll();
      const oid = await gitClient.commit(commitMessage);
      setStatus(`Committed: ${oid.slice(0, 7)}`);
      setIsCommitOpen(false);
      setCommitMessage('');
      await loadGitData();
    } catch (error) {
      setStatus(`Commit failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Push to remote
  const handlePush = async () => {
    setLoading(true);
    setStatus('Pushing to remote...');
    try {
      await gitClient.push('origin', currentBranch);
      setStatus('Pushed successfully!');
    } catch (error) {
      setStatus(`Push failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Pull from remote
  const handlePull = async () => {
    setLoading(true);
    setStatus('Pulling from remote...');
    try {
      await gitClient.pull('origin', currentBranch);
      setStatus('Pulled successfully!');
      await loadGitData();
      onRefresh?.();
    } catch (error) {
      setStatus(`Pull failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Update config
  const handleConfigSave = () => {
    gitClient.setConfig({
      name: userName,
      email: userEmail,
      token: token,
    });
    setStatus('Configuration saved!');
    setIsConfigOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          <span className="text-sm font-medium">{currentBranch}</span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={loadGitData}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsConfigOpen(true)}
            title="Git Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className="px-2 py-1 text-xs bg-muted text-muted-foreground">
          {status}
        </div>
      )}

      {/* Actions */}
      <div className="p-2 space-y-2">
        <Button
          className="w-full justify-start"
          variant="outline"
          size="sm"
          onClick={() => setIsCloneOpen(true)}
        >
          <Download className="w-4 h-4 mr-2" />
          Clone Repository
        </Button>
        
        <Button
          className="w-full justify-start"
          variant="outline"
          size="sm"
          onClick={() => setIsCommitOpen(true)}
        >
          <GitCommit className="w-4 h-4 mr-2" />
          Commit Changes
        </Button>

        <div className="flex gap-2">
          <Button
            className="flex-1 justify-start"
            variant="outline"
            size="sm"
            onClick={handlePull}
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            Pull
          </Button>
          <Button
            className="flex-1 justify-start"
            variant="outline"
            size="sm"
            onClick={handlePush}
            disabled={loading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Push
          </Button>
        </div>
      </div>

      {/* Commit History */}
      <div className="flex-1 overflow-hidden">
        <div className="px-2 py-1 text-xs font-semibold">Recent Commits</div>
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {commits.map((commit) => (
              <div
                key={commit.oid}
                className="p-2 text-xs border rounded hover:bg-accent"
              >
                <div className="font-mono text-muted-foreground">
                  {commit.oid.slice(0, 7)}
                </div>
                <div className="font-medium">{commit.message}</div>
                <div className="text-muted-foreground">
                  {commit.author} • {commit.date.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Clone Dialog */}
      <Dialog open={isCloneOpen} onOpenChange={setIsCloneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Repository</DialogTitle>
            <DialogDescription>
              Enter the GitHub repository URL to clone
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-url">Repository URL</Label>
              <Input
                id="clone-url"
                placeholder="https://github.com/username/repo.git"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCloneOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={loading}>
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commit Dialog */}
      <Dialog open={isCommitOpen} onOpenChange={setIsCommitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commit Changes</DialogTitle>
            <DialogDescription>
              Enter a commit message for your changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commit-message">Commit Message</Label>
              <Textarea
                id="commit-message"
                placeholder="feat: add new feature"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCommitOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCommit} disabled={loading}>
              Commit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Git Configuration</DialogTitle>
            <DialogDescription>
              Set your Git user details and GitHub token
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                placeholder="Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="your.email@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">GitHub Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Generate a token at{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  github.com/settings/tokens
                </a>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfigOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfigSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
