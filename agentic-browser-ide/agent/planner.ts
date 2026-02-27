// Agent Planner - Converts user intent into actionable steps
import 'dotenv/config';
import { AgentPlan, AgentStep, BrowserAction } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export class AgentPlanner {
  parseIntent(taskId: string, userIntent: string): AgentPlan {
    console.log(`[Planner] Parsing intent: ${userIntent}`);
    
    const steps = this.generateSteps(userIntent);
    
    return {
      taskId,
      intent: userIntent,
      steps,
      currentStepIndex: 0,
      status: 'planning',
    };
  }

  private generateSteps(intent: string): AgentStep[] {
    const steps: AgentStep[] = [];
    const lowerIntent = intent.toLowerCase();
    
    // Complex pattern: Multi-step workflows
    if (this.isComplexTask(intent)) {
      return this.planComplexTask(intent);
    }
    
    // Pattern 1: Search operations
    if (lowerIntent.includes('search') || lowerIntent.includes('find') || lowerIntent.includes('look for')) {
      return this.planSearch(intent);
    }
    
    // Pattern 2: Navigation + Action
    if (lowerIntent.includes('go to') && (lowerIntent.includes('and') || lowerIntent.includes('then'))) {
      return this.planNavigationWithAction(intent);
    }
    
    // Pattern 3: Form filling
    if (lowerIntent.includes('fill') || lowerIntent.includes('submit') || lowerIntent.includes('form')) {
      return this.planFormFill(intent);
    }
    
    // Pattern 4: Simple navigation
    if (lowerIntent.includes('go to') || lowerIntent.includes('navigate') || lowerIntent.includes('open') || lowerIntent.includes('visit')) {
      const url = this.extractUrl(intent);
      steps.push(this.createStep(
        `Navigate to ${url}`,
        { type: 'navigate', id: uuidv4(), url, timestamp: Date.now() }
      ));
    }
    
    // Pattern 5: Click operations
    else if (lowerIntent.includes('click')) {
      const selector = this.extractSelector(intent);
      steps.push(this.createStep(
        `Click on ${selector}`,
        { type: 'click', id: uuidv4(), selector, timestamp: Date.now() }
      ));
    }
    
    // Pattern 6: Type operations
    else if (lowerIntent.includes('type') || lowerIntent.includes('enter')) {
      const { selector, value } = this.extractFillParams(intent);
      steps.push(this.createStep(
        `Type "${value}" into ${selector}`,
        { type: 'type', id: uuidv4(), selector, value, timestamp: Date.now() }
      ));
    }
    
    // Pattern 7: Scroll
    else if (lowerIntent.includes('scroll')) {
      const direction = lowerIntent.includes('up') ? '-500' : '500';
      steps.push(this.createStep(
        `Scroll ${lowerIntent.includes('up') ? 'up' : 'down'}`,
        { type: 'scroll', id: uuidv4(), value: direction, timestamp: Date.now() }
      ));
    }
    
    // Default: Navigate to best guess
    else {
      const url = this.extractUrl(intent) || 'https://google.com';
      steps.push(this.createStep(
        `Navigate to ${url}`,
        { type: 'navigate', id: uuidv4(), url, timestamp: Date.now() }
      ));
    }
    
    // Always add observation step at the end
    steps.push(this.createStep(
      'Capture result',
      { type: 'screenshot', id: uuidv4(), timestamp: Date.now() }
    ));
    
    return steps;
  }

  private isComplexTask(intent: string): boolean {
    const complexIndicators = [
      'search for', 'and then', 'after that', 'followed by',
      'go to', 'login', 'sign in', 'purchase', 'buy',
      'steps:', '1.', '2.', '3.'
    ];
    
    const lowerIntent = intent.toLowerCase();
    let count = 0;
    
    for (const indicator of complexIndicators) {
      if (lowerIntent.includes(indicator)) count++;
    }
    
    return count >= 2;
  }

  private planComplexTask(intent: string): AgentStep[] {
    const steps: AgentStep[] = [];
    const lowerIntent = intent.toLowerCase();
    
    // Example: "Go to Google, search for AI agents, and click the first result"
    if (lowerIntent.includes('google') && lowerIntent.includes('search')) {
      const query = this.extractQuery(intent);
      
      steps.push(this.createStep(
        'Navigate to Google',
        { type: 'navigate', id: uuidv4(), url: 'https://www.google.com', timestamp: Date.now() }
      ));
      
      steps.push(this.createStep(
        'Wait for page to load',
        { type: 'wait', id: uuidv4(), value: '2000', timestamp: Date.now() }
      ));
      
      steps.push(this.createStep(
        `Type search query: "${query}"`,
        { type: 'type', id: uuidv4(), selector: 'textarea[name="q"], input[name="q"]', value: query, timestamp: Date.now() }
      ));
      
      steps.push(this.createStep(
        'Submit search',
        { type: 'submit', id: uuidv4(), selector: 'textarea[name="q"], input[name="q"]', timestamp: Date.now() }
      ));
      
      if (lowerIntent.includes('click') && lowerIntent.includes('first')) {
        steps.push(this.createStep(
          'Wait for results',
          { type: 'wait', id: uuidv4(), value: '3000', timestamp: Date.now() }
        ));
        
        steps.push(this.createStep(
          'Click first result',
          { type: 'click', id: uuidv4(), selector: 'h3', timestamp: Date.now() }
        ));
      }
    }
    
    // Add observation
    steps.push(this.createStep(
      'Capture final result',
      { type: 'screenshot', id: uuidv4(), timestamp: Date.now() }
    ));
    
    return steps;
  }

  private planSearch(intent: string): AgentStep[] {
    const query = this.extractQuery(intent);
    const engine = this.detectSearchEngine(intent);
    
    return [
      this.createStep(
        `Navigate to ${engine}`,
        { type: 'navigate', id: uuidv4(), url: this.getSearchEngineUrl(engine), timestamp: Date.now() }
      ),
      this.createStep(
        'Wait for page load',
        { type: 'wait', id: uuidv4(), value: '2000', timestamp: Date.now() }
      ),
      this.createStep(
        `Search for "${query}"`,
        { type: 'type', id: uuidv4(), selector: this.getSearchSelector(engine), value: query, timestamp: Date.now() }
      ),
      this.createStep(
        'Submit search',
        { type: 'submit', id: uuidv4(), selector: this.getSearchSelector(engine), timestamp: Date.now() }
      ),
      this.createStep(
        'Capture results',
        { type: 'screenshot', id: uuidv4(), timestamp: Date.now() }
      ),
    ];
  }

  private planNavigationWithAction(intent: string): AgentStep[] {
    const steps: AgentStep[] = [];
    const url = this.extractUrl(intent);
    
    steps.push(this.createStep(
      `Navigate to ${url}`,
      { type: 'navigate', id: uuidv4(), url, timestamp: Date.now() }
    ));
    
    steps.push(this.createStep(
      'Wait for page load',
      { type: 'wait', id: uuidv4(), value: '3000', timestamp: Date.now() }
    ));
    
    // Extract subsequent actions
    if (intent.toLowerCase().includes('click')) {
      const selector = this.extractSelector(intent);
      steps.push(this.createStep(
        `Click ${selector}`,
        { type: 'click', id: uuidv4(), selector, timestamp: Date.now() }
      ));
    }
    
    steps.push(this.createStep(
      'Capture result',
      { type: 'screenshot', id: uuidv4(), timestamp: Date.now() }
    ));
    
    return steps;
  }

  private planFormFill(intent: string): AgentStep[] {
    // Simplified form fill - would need more sophisticated parsing for real forms
    const { selector, value } = this.extractFillParams(intent);
    
    return [
      this.createStep(
        `Fill form field ${selector}`,
        { type: 'type', id: uuidv4(), selector, value, timestamp: Date.now() }
      ),
      this.createStep(
        'Submit form',
        { type: 'submit', id: uuidv4(), selector, timestamp: Date.now() }
      ),
      this.createStep(
        'Capture result',
        { type: 'screenshot', id: uuidv4(), timestamp: Date.now() }
      ),
    ];
  }

  private detectSearchEngine(intent: string): string {
    const lowerIntent = intent.toLowerCase();
    if (lowerIntent.includes('google')) return 'google';
    if (lowerIntent.includes('bing')) return 'bing';
    if (lowerIntent.includes('duckduckgo')) return 'duckduckgo';
    return 'google'; // default
  }

  private getSearchEngineUrl(engine: string): string {
    const urls: Record<string, string> = {
      google: 'https://www.google.com',
      bing: 'https://www.bing.com',
      duckduckgo: 'https://duckduckgo.com',
    };
    return urls[engine] || urls.google;
  }

  private getSearchSelector(engine: string): string {
    const selectors: Record<string, string> = {
      google: 'textarea[name="q"], input[name="q"]',
      bing: 'input[name="q"]',
      duckduckgo: 'input[name="q"]',
    };
    return selectors[engine] || selectors.google;
  }

  private createStep(description: string, action: BrowserAction): AgentStep {
    return {
      id: uuidv4(),
      description,
      action,
      status: 'pending',
    };
  }

  private extractQuery(intent: string): string {
    // Try to extract quoted text first
    const quotedMatch = intent.match(/"([^"]+)"/);
    if (quotedMatch) return quotedMatch[1];
    
    // Look for "search for X" pattern
    const searchMatch = intent.match(/search (?:for |about )?(.+?)(?:\s+(?:and|then|,|on|in)|\s*$)/i);
    if (searchMatch) return searchMatch[1].trim();
    
    // Look for "find X" pattern
    const findMatch = intent.match(/(?:find|look for) (.+?)(?:\s+(?:and|then|,|on|in)|\s*$)/i);
    if (findMatch) return findMatch[1].trim();
    
    return intent.trim();
  }

  private extractUrl(intent: string): string {
    // Look for URLs in the text
    const urlMatch = intent.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) return urlMatch[1];
    
    // Look for domain names
    const domainMatch = intent.match(/(?:go to|open|visit|navigate to)\s+([a-z0-9.-]+\.[a-z]{2,})/i);
    if (domainMatch) {
      const domain = domainMatch[1];
      return domain.startsWith('http') ? domain : `https://${domain}`;
    }
    
    // Extract quoted text
    const quotedMatch = intent.match(/"([^"]+)"/);
    if (quotedMatch && quotedMatch[1].includes('.')) {
      const url = quotedMatch[1];
      return url.startsWith('http') ? url : `https://${url}`;
    }
    
    // Look for common domains
    const commonDomains = ['google.com', 'github.com', 'youtube.com', 'example.com'];
    for (const domain of commonDomains) {
      if (intent.toLowerCase().includes(domain)) {
        return `https://${domain}`;
      }
    }
    
    return 'https://www.google.com';
  }

  private extractSelector(intent: string): string {
    // Try to extract quoted selector
    const quotedMatch = intent.match(/"([^"]+)"/);
    if (quotedMatch) return quotedMatch[1];
    
    // Common patterns
    if (intent.includes('button')) return 'button';
    if (intent.includes('link')) return 'a';
    if (intent.includes('input')) return 'input';
    if (intent.includes('submit')) return 'button[type="submit"], input[type="submit"]';
    
    return 'button'; // default
  }

  private extractFillParams(intent: string): { selector: string; value: string } {
    // Pattern: fill "selector" with "value"
    const match = intent.match(/(?:fill|type|enter)\s+(?:"([^"]+)"|into\s+([^\s]+))\s+(?:with\s+)?(?:"([^"]+)"|(.+?)(?:\s+and|\s+then|$))/i);
    
    if (match) {
      const selector = match[1] || match[2] || 'input';
      const value = match[3] || match[4] || '';
      return { selector, value: value.trim() };
    }
    
    // Fallback
    return { selector: 'input', value: '' };
  }
}
