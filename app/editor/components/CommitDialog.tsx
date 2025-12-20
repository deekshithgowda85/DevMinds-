"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitCommit } from "lucide-react";

interface CommitDialogProps {
  onCommit: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function CommitDialog({ onCommit, disabled }: CommitDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      await onCommit(message);
      setMessage("");
      setOpen(false);
    } catch (error) {
      console.error("Commit error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          className="w-full gap-2"
          disabled={disabled}
        >
          <GitCommit className="h-4 w-4" />
          Commit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Commit Changes</DialogTitle>
            <DialogDescription>
              Commit your changes to the repository in E2B sandbox.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="message">Commit Message</Label>
              <Input
                id="message"
                placeholder="Update code..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !message.trim()}>
              {loading ? "Committing..." : "Commit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
