import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from 'e2b';

interface FileNode {
  id: string;
  type: string;
  data: {
    label: string;
    type: string;
    path?: string;
  };
  position: { x: number; y: number };
  style?: Record<string, string | number>;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export async function POST(request: NextRequest) {
  let sandbox: Sandbox | null = null;

  try {
    const { repoUrl } = await request.json();

    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Invalid repository URL' },
        { status: 400 }
      );
    }

    // Validate GitHub URL format
    const urlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!urlPattern.test(repoUrl.replace(/\.git$/, ''))) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL format. Use: https://github.com/username/repository' },
        { status: 400 }
      );
    }

    // Create E2B sandbox
    sandbox = await Sandbox.create('codedebugger', {
      apiKey: process.env.E2B_API_KEY,
    });

    console.log('Cloning repository:', repoUrl);

    // Clone repository with better error handling
    const cloneResult = await sandbox.commands.run(
      `git clone --depth 1 ${repoUrl} /home/user/repo 2>&1`,
      { timeoutMs: 60000 }
    );

    if (cloneResult.exitCode !== 0) {
      const errorMessage = cloneResult.stderr || cloneResult.stdout;
      
      if (errorMessage.includes('not found') || errorMessage.includes('Could not find')) {
        throw new Error('Repository not found. Please check the URL and make sure it\'s public.');
      } else if (errorMessage.includes('Authentication') || errorMessage.includes('Permission denied')) {
        throw new Error('Cannot access private repository. Please use a public repository.');
      } else if (errorMessage.includes('already exists')) {
        // Try to use existing repo
        console.log('Using existing repository');
      } else {
        throw new Error(`Failed to clone: ${errorMessage.substring(0, 200)}`);
      }
    }

    console.log('Repository cloned successfully');

    // Verify repository exists
    const lsResult = await sandbox.commands.run('ls -la /home/user/repo');
    if (lsResult.exitCode !== 0) {
      throw new Error('Repository directory not found after clone');
    }

    // Read project structure
    const nodes: FileNode[] = [];
    const edges: Edge[] = [];
    let nodeIndex = 0;

    // List all files
    const findResult = await sandbox.commands.run(
      'find /home/user/repo -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" | head -500'
    );

    const files = findResult.stdout.split('\n').filter(f => f.trim());
    console.log(`Found ${files.length} files`);

    // Read package.json for dependencies
    let dependencies: string[] = [];
    try {
      const pkgResult = await sandbox.files.read('/home/user/repo/package.json');
      const pkg = JSON.parse(pkgResult);
      dependencies = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {})
      ];
    } catch {
      console.log('No package.json found');
    }

    // Add dependency nodes
    dependencies.forEach((dep, i) => {
      nodes.push({
        id: `dep-${dep}`,
        type: 'default',
        data: { label: dep, type: 'dependency' },
        position: { x: i * 200, y: 900 },
        style: { background: '#94a3b8', color: 'white' }
      });
    });

    // Process files
    const filesByType: Record<string, FileNode[]> = {
      page: [],
      component: [],
      api: [],
      lib: [],
      config: [],
      model: [],
      hook: [],
      util: [],
      other: []
    };

    for (const filepath of files) {
      const filename = filepath.split('/').pop() || '';
      const ext = filename.split('.').pop() || '';
      
      // Include more file types
      const codeExtensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'prisma', 'sql', 'json', 'yaml', 'yml'];
      if (!codeExtensions.includes(ext)) {
        continue;
      }

      let nodeType = 'other';
      let color = '#64748b';
      
      // Enhanced categorization
      if (filepath.includes('/pages/') || filepath.includes('/app/') && filename.includes('page.')) {
        nodeType = 'page';
        color = '#ec4899'; // Pink for pages
      } else if (filepath.includes('/components/') && (ext === 'tsx' || ext === 'jsx')) {
        nodeType = 'component';
        color = '#8b5cf6'; // Purple
      } else if (filepath.includes('/api/') || filepath.includes('/routes/') || filepath.includes('route.ts')) {
        nodeType = 'api';
        color = '#f97316'; // Orange
      } else if (filepath.includes('/lib/') || filepath.includes('/utils/') || filepath.includes('/helpers/')) {
        nodeType = 'lib';
        color = '#10b981'; // Green
      } else if (filepath.includes('/models/') || filepath.includes('/schema/') || ext === 'prisma') {
        nodeType = 'model';
        color = '#06b6d4'; // Cyan
      } else if (filepath.includes('/hooks/') || filename.startsWith('use-') || filename.startsWith('use')) {
        nodeType = 'hook';
        color = '#a855f7'; // Purple variant
      } else if (filename.includes('config') || filename.includes('.config.') || ext === 'json' || ext === 'yaml' || ext === 'yml') {
        nodeType = 'config';
        color = '#3b82f6'; // Blue
      }

      const node: FileNode = {
        id: `file-${nodeIndex}`,
        type: 'default',
        data: {
          label: filename.length > 25 ? filename.substring(0, 22) + '...' : filename,
          type: nodeType,
          path: filepath
        },
        position: { x: 0, y: 0 },
        style: { 
          background: color, 
          color: 'white', 
          borderRadius: 8, 
          padding: 10,
          fontSize: 12,
          fontWeight: 500,
          border: '2px solid rgba(255,255,255,0.2)'
        }
      };

      filesByType[nodeType].push(node);
      nodes.push(node);

      // Try to read file and extract imports
      try {
        const content = await sandbox.files.read(filepath);
        
        // Extract imports with more comprehensive patterns
        const importMatches: string[] = [];
        
        // Pattern 1: import ... from "..."
        const importFromRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*)?)+\s+from\s+['"](.*?)['"]/g;
        let match;
        while ((match = importFromRegex.exec(content)) !== null) {
          importMatches.push(match[1]);
        }
        
        // Pattern 2: import "..."
        const importDirectRegex = /import\s+['"](.*?)['"]/g;
        while ((match = importDirectRegex.exec(content)) !== null) {
          if (!importMatches.includes(match[1])) {
            importMatches.push(match[1]);
          }
        }
        
        // Pattern 3: require("...")
        const requireRegex = /require\s*\(['"](.*?)['"]\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
          if (!importMatches.includes(match[1])) {
            importMatches.push(match[1]);
          }
        }
        
        // Process each import
        for (const importPath of importMatches) {
          // Check if it's a local import
          if (importPath.startsWith('.') || importPath.startsWith('@/')) {
            // Clean and normalize the path
            const cleanPath = importPath
              .replace(/^\.\//, '')
              .replace(/^\.\.\//, '')
              .replace(/^@\//, '')
              .replace(/\.(ts|tsx|js|jsx|json)$/, '');
            
            // Get the filename from the import path
            const importFileName = cleanPath.split('/').pop() || '';
            
            // Find matching file node with better matching logic
            const targetNode = nodes.find(n => {
              if (!n.data.path) return false;
              
              const targetPath = n.data.path.toLowerCase();
              const targetFileName = n.data.label.replace(/\.(ts|tsx|js|jsx|json)$/, '').toLowerCase();
              
              // Match by full path
              if (targetPath.includes(cleanPath.toLowerCase())) return true;
              
              // Match by filename
              if (targetFileName === importFileName.toLowerCase()) return true;
              
              // Match if paths end similarly
              const pathParts = cleanPath.toLowerCase().split('/');
              if (pathParts.length > 1) {
                const lastTwoParts = pathParts.slice(-2).join('/');
                if (targetPath.includes(lastTwoParts)) return true;
              }
              
              return false;
            });

            if (targetNode && targetNode.id !== node.id) {
              const edgeId = `edge-${node.id}-${targetNode.id}`;
              if (!edges.find(e => e.id === edgeId)) {
                edges.push({
                  id: edgeId,
                  source: node.id,
                  target: targetNode.id,
                  type: 'smoothstep'
                } as Edge);
              }
            }
          } else {
            // External dependency
            const depName = importPath.split('/')[0];
            const depNode = nodes.find(n => n.id === `dep-${depName}`);
            if (depNode) {
              const edgeId = `edge-${node.id}-${depNode.id}`;
              if (!edges.find(e => e.id === edgeId)) {
                edges.push({
                  id: edgeId,
                  source: node.id,
                  target: depNode.id,
                  type: 'default'
                } as Edge);
              }
            }
          }
        }
        
        // Log import connections for debugging
        if (importMatches.length > 0) {
          console.log(`${filename}: Found ${importMatches.length} imports`);
        }

        // Extract React components
        const componentRegex = /(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z]\w+)/g;
        let compMatch;
        let compIndex = 0;
        while ((compMatch = componentRegex.exec(content)) !== null && compIndex < 2) {
          const compName = compMatch[1];
          if (compName && compName !== 'Component') {
            const compNode: FileNode = {
              id: `comp-${nodeIndex}-${compIndex}`,
              type: 'default',
              data: {
                label: compName,
                type: 'component-fn'
              },
              position: { x: 0, y: 0 },
              style: { 
                background: '#c084fc', 
                color: 'white', 
                fontSize: 10, 
                padding: 6, 
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.3)'
              }
            };
            nodes.push(compNode);
            edges.push({
              id: `edge-${node.id}-${compNode.id}`,
              source: node.id,
              target: compNode.id,
              label: 'exports',
              type: 'default'
            } as Edge);
            compIndex++;
          }
        }

        // Extract function definitions
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-z]\w+)/g;
        let funcMatch;
        let funcIndex = 0;
        while ((funcMatch = functionRegex.exec(content)) !== null && funcIndex < 2) {
          const funcName = funcMatch[1];
          if (funcName && !['default', 'render', 'constructor'].includes(funcName)) {
            const funcNode: FileNode = {
              id: `func-${nodeIndex}-${funcIndex}`,
              type: 'default',
              data: {
                label: funcName,
                type: 'function'
              },
              position: { x: 0, y: 0 },
              style: { 
                background: '#34d399', 
                color: 'white', 
                fontSize: 10, 
                padding: 6, 
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.3)'
              }
            };
            nodes.push(funcNode);
            edges.push({
              id: `edge-${node.id}-${funcNode.id}`,
              source: node.id,
              target: funcNode.id,
              label: 'exports',
              type: 'default'
            } as Edge);
            funcIndex++;
          }
        }
      } catch {
        // Skip files that can't be read
        console.log(`Could not read ${filepath}`);
      }

      nodeIndex++;

      // Increased limit
      if (nodeIndex > 150) break;
    }

    // Improved positioning by type
    let yOffset = 0;
    const typeOrder = ['page', 'component', 'api', 'lib', 'model', 'hook', 'config', 'util', 'other'];
    
    typeOrder.forEach(type => {
      const typeNodes = filesByType[type];
      if (typeNodes.length === 0) return;
      
      typeNodes.forEach((node, i) => {
        node.position = {
          x: (i % 6) * 280,
          y: yOffset + Math.floor(i / 6) * 120
        };
      });
      yOffset += Math.ceil(typeNodes.length / 6) * 120 + 80;
    });

    // Position dependencies at the bottom
    dependencies.forEach((dep, i) => {
      const depNode = nodes.find(n => n.id === `dep-${dep}`);
      if (depNode) {
        depNode.position = {
          x: (i % 10) * 150,
          y: yOffset + Math.floor(i / 10) * 60
        };
      }
    });

    console.log(`Generated ${nodes.length} nodes and ${edges.length} edges`);

    return NextResponse.json({
      nodes,
      edges
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  } finally {
    // Clean up sandbox
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch (e) {
        console.error('Error closing sandbox:', e);
      }
    }
  }
}
