// ─── DevMind Utility Functions ───────────────────────────────

/**
 * Generate a simple user ID for demo purposes.
 * In production, this would come from auth.
 */
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'server-user';
  
  let userId = localStorage.getItem('devmind-userId');
  if (!userId) {
    userId = `user-${Date.now().toString(36)}`;
    localStorage.setItem('devmind-userId', userId);
  }
  return userId;
}

/**
 * Truncate text to a max length for embeddings/display.
 */
export function truncateText(text: string, maxLength: number = 2000): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Build an error context string for embedding generation.
 * Combines code, error, and language into a single string.
 */
export function buildErrorContext(
  language: string,
  code: string,
  errorMessage: string
): string {
  return `Language: ${language}\nError: ${errorMessage}\nCode:\n${truncateText(code, 1500)}`;
}

/**
 * Safely parse JSON from LLM output.
 * Handles cases where LLM wraps JSON in markdown code blocks.
 */
export function safeParseJSON<T>(text: string): T | null {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        return null;
      }
    }
    
    // Try finding JSON object in the text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        return null;
      }
    }
    
    return null;
  }
}

/**
 * Format a date for display.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
