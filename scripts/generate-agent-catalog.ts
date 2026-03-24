/**
 * Pre-generate agent catalog JSON from .claude/commands/*.md files.
 * This runs at build time so the agent library works on Vercel
 * where .claude/ is gitignored and not available at runtime.
 *
 * Usage: tsx scripts/generate-agent-catalog.ts
 */

import fs from 'fs';
import path from 'path';

// Inline the parser logic here since we need to resolve from main repo root,
// not from the Next.js process.cwd()

type AgentCategory = 'expert' | 'builder' | 'reviewer' | 'workflow' | 'session';
type AgentStatus = 'built' | 'planned' | 'deprecated';

interface AgentDefinition {
  name: string;
  slug: string;
  description: string;
  filePath: string;
  category: AgentCategory;
  status: AgentStatus;
  sessionId: string | null;
  capabilities: string[];
  prerequisites: string[];
  dependencies: string[];
  version: string | null;
  inputFormat: string | null;
  lastRunAt: string | null;
  totalRuns: number;
  successRate: number | null;
}

function inferCategory(filePath: string): AgentCategory {
  if (filePath.includes('/experts/')) return 'expert';
  if (filePath.includes('/builders/')) return 'builder';
  if (filePath.includes('/reviewers/')) return 'reviewer';
  const basename = path.basename(filePath, '.md');
  if (basename.startsWith('session-')) return 'session';
  return 'workflow';
}

function extractSessionId(filename: string): string | null {
  const match = filename.match(/session-s(\d+(?:-\d+)?)/i);
  return match ? `S${match[1].toUpperCase()}` : null;
}

function inferStatus(content: string, filename: string): AgentStatus {
  const lower = content.toLowerCase();
  if (lower.includes('status: active') || lower.includes('## 1.') || lower.includes('## role')) {
    return 'built';
  }
  if (lower.includes('status: planned') || lower.includes('todo') || lower.includes('placeholder')) {
    return 'planned';
  }
  if (filename.startsWith('session-')) {
    return content.length > 500 ? 'built' : 'planned';
  }
  return content.length > 200 ? 'built' : 'planned';
}

function extractCapabilities(content: string): string[] {
  const capabilities: string[] = [];
  const headerRegex = /^##\s+(?:\d+\.\s+)?(.+)$/gm;
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    const header = match[1].trim();
    if (!['Role', 'Context', 'Prerequisites', 'References', 'Notes'].some(s => header.startsWith(s))) {
      capabilities.push(header);
    }
  }
  return capabilities.slice(0, 10);
}

function extractPrerequisites(content: string): string[] {
  const prereqs: string[] = [];
  const prereqSection = content.match(/(?:Prerequisites|Context Loading)[^\n]*\n([\s\S]*?)(?=\n##|\n---|\Z)/i);
  if (prereqSection) {
    const lines = prereqSection[1].split('\n');
    for (const line of lines) {
      const item = line.match(/^\d+\.\s+(?:Read\s+)?[`']?([^`'\n]+)[`']?/);
      if (item) prereqs.push(item[1].trim());
    }
  }
  return prereqs;
}

function extractDependencies(content: string): string[] {
  const deps: string[] = [];
  const patterns = [
    /(?:from|by|after)\s+(?:the\s+)?(\w[\w\s-]*?)\s+(?:agent|expert|builder|reviewer)/gi,
    /(?:requires|depends on|needs)\s+(?:the\s+)?(\w[\w\s-]*?)\s+(?:agent|to)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const dep = match[1].trim().toLowerCase().replace(/\s+/g, '-');
      if (dep.length > 2 && dep.length < 50 && !deps.includes(dep)) {
        deps.push(dep);
      }
    }
  }
  return deps;
}

function toSlug(filePath: string, category: AgentCategory): string {
  const base = path.basename(filePath, '.md');
  if (category === 'expert' || category === 'builder' || category === 'reviewer') {
    return `${category}s/${base}`;
  }
  return base;
}

function findMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(full));
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

// --- Main ---

const projectRoot = path.resolve(__dirname, '..');
const commandsDir = path.join(projectRoot, '.claude', 'commands');
const outputPath = path.join(projectRoot, 'data', 'agent-library', 'agents.json');

console.log(`Scanning ${commandsDir} for agent definitions...`);

const files = findMarkdownFiles(commandsDir);

if (files.length === 0) {
  console.error('No .md files found in .claude/commands/. Is the directory present?');
  process.exit(1);
}

const agents: AgentDefinition[] = files.map(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath, '.md');
  const category = inferCategory(filePath);
  const firstLine = content.split('\n')[0].trim();
  const description = firstLine.length > 10 ? firstLine : filename.replace(/-/g, ' ');
  const dashIdx = firstLine.indexOf(' — ');
  const name = dashIdx > 0 ? firstLine.substring(0, dashIdx).trim() : firstLine.trim();
  const hasArguments = content.includes('$ARGUMENTS');

  return {
    name: name || filename.replace(/-/g, ' '),
    slug: toSlug(filePath, category),
    description,
    filePath: path.relative(projectRoot, filePath),
    category,
    status: inferStatus(content, filename),
    sessionId: extractSessionId(filename),
    capabilities: extractCapabilities(content),
    prerequisites: extractPrerequisites(content),
    dependencies: extractDependencies(content),
    version: null,
    inputFormat: hasArguments ? '$ARGUMENTS' : null,
    lastRunAt: null,
    totalRuns: 0,
    successRate: null,
  };
}).sort((a, b) => {
  const order: Record<AgentCategory, number> = { expert: 0, builder: 1, reviewer: 2, workflow: 3, session: 4 };
  const diff = order[a.category] - order[b.category];
  if (diff !== 0) return diff;
  return a.name.localeCompare(b.name);
});

// Ensure output directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(agents, null, 2));

console.log(`Generated ${agents.length} agent definitions → ${path.relative(projectRoot, outputPath)}`);
