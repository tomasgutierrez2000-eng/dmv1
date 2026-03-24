/**
 * Agent Parser — reads .claude/commands/*.md files and extracts AgentDefinition metadata.
 * Handles both frontmatter-based and structure-based parsing.
 */

import fs from 'fs';
import path from 'path';
import type { AgentDefinition, AgentCategory, AgentStatus } from './types';

const COMMANDS_DIR = path.join(process.cwd(), '.claude', 'commands');

/** Infer category from directory structure */
function inferCategory(filePath: string): AgentCategory {
  if (filePath.includes('/experts/')) return 'expert';
  if (filePath.includes('/builders/')) return 'builder';
  if (filePath.includes('/reviewers/')) return 'reviewer';
  const basename = path.basename(filePath, '.md');
  if (basename.startsWith('session-')) return 'session';
  return 'workflow';
}

/** Extract session ID from filename (e.g., "session-s1.md" → "S1") */
function extractSessionId(filename: string): string | null {
  const match = filename.match(/session-s(\d+(?:-\d+)?)/i);
  return match ? `S${match[1].toUpperCase()}` : null;
}

/** Infer agent status from content */
function inferStatus(content: string, filename: string): AgentStatus {
  const lower = content.toLowerCase();
  if (lower.includes('status: active') || lower.includes('## 1.') || lower.includes('## role')) {
    return 'built';
  }
  if (lower.includes('status: planned') || lower.includes('todo') || lower.includes('placeholder')) {
    return 'planned';
  }
  if (filename.startsWith('session-')) {
    // Sessions with substantial content are built
    if (content.length > 500) return 'built';
    return 'planned';
  }
  // Default: if file has meaningful content (>200 chars of instructions), it's built
  return content.length > 200 ? 'built' : 'planned';
}

/** Extract capabilities from ## headers */
function extractCapabilities(content: string): string[] {
  const capabilities: string[] = [];
  const headerRegex = /^##\s+(?:\d+\.\s+)?(.+)$/gm;
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    const header = match[1].trim();
    // Skip generic headers
    if (!['Role', 'Context', 'Prerequisites', 'References', 'Notes'].some(s => header.startsWith(s))) {
      capabilities.push(header);
    }
  }
  return capabilities.slice(0, 10); // cap at 10
}

/** Extract prerequisites from content */
function extractPrerequisites(content: string): string[] {
  const prereqs: string[] = [];
  // Look for "Context Loading" or "Prerequisites" sections
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

/** Extract agent dependencies from content */
function extractDependencies(content: string): string[] {
  const deps: string[] = [];
  // Look for references to other agents
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

/** Create a URL-safe slug from filename */
function toSlug(filename: string, category: AgentCategory): string {
  const base = path.basename(filename, '.md');
  if (category === 'expert' || category === 'builder' || category === 'reviewer') {
    return `${category}s/${base}`;
  }
  return base;
}

/** Parse a single agent markdown file into an AgentDefinition */
export function parseAgentFile(filePath: string): AgentDefinition {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath, '.md');
  const category = inferCategory(filePath);

  // Extract first line as description
  const firstLine = content.split('\n')[0].trim();
  const description = firstLine.length > 10 ? firstLine : filename.replace(/-/g, ' ');

  // Extract name: use first line up to first " — " or the whole line
  const dashIdx = firstLine.indexOf(' — ');
  const name = dashIdx > 0 ? firstLine.substring(0, dashIdx).trim() : firstLine.trim();

  // Check for $ARGUMENTS
  const hasArguments = content.includes('$ARGUMENTS');

  return {
    name: name || filename.replace(/-/g, ' '),
    slug: toSlug(filePath, category),
    description,
    filePath,
    category,
    status: inferStatus(content, filename),
    sessionId: extractSessionId(filename),
    capabilities: extractCapabilities(content),
    prerequisites: extractPrerequisites(content),
    dependencies: extractDependencies(content),
    version: null, // Could parse from frontmatter if added
    inputFormat: hasArguments ? '$ARGUMENTS' : null,
    lastRunAt: null,   // Populated from audit data
    totalRuns: 0,
    successRate: null,
  };
}

/** Recursively find all .md files in a directory */
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

/** Parse all agent files from .claude/commands/ */
export function parseAllAgents(): AgentDefinition[] {
  const files = findMarkdownFiles(COMMANDS_DIR);
  return files.map(parseAgentFile).sort((a, b) => {
    // Sort: experts first, then builders, reviewers, workflows, sessions
    const order: Record<AgentCategory, number> = { expert: 0, builder: 1, reviewer: 2, workflow: 3, session: 4 };
    const diff = order[a.category] - order[b.category];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}
