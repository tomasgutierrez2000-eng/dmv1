/**
 * Capability Parser — extracts structured capabilities from agent markdown files.
 * Shared between the runtime parser (agent-parser.ts) and build-time catalog generator.
 */

import type { AgentCapability, CapabilityPhase } from './types';

/** Headers to skip when extracting capabilities */
const SKIP_HEADERS = ['Role', 'Context', 'Prerequisites', 'References', 'Notes'];

/** Maximum capabilities to extract per agent */
const MAX_CAPABILITIES = 15;

/** Strip markdown syntax for clean display text */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')       // remove code blocks
    .replace(/^#{1,6}\s+/gm, '')          // heading markers (### etc)
    .replace(/`([^`]+)`/g, '$1')          // inline code → plain text
    .replace(/\*\*([^*]+)\*\*/g, '$1')    // bold → plain
    .replace(/\*([^*]+)\*/g, '$1')        // italic → plain
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/^[-*]\s+/gm, '')            // list markers
    .replace(/^>\s+/gm, '')               // blockquotes
    .replace(/^\d+\.\s+/gm, '')           // numbered list markers
    .replace(/\n{2,}/g, ' ')              // collapse newlines
    .replace(/\n/g, ' ')
    .trim();
}

/** Extract first 2 sentences (~160 chars) from content */
export function extractDescription(sectionContent: string): string {
  const cleaned = stripMarkdown(sectionContent);
  if (!cleaned) return '';
  // Match up to 2 sentences (ending in . ! or ?)
  const sentences = cleaned.match(/[^.!?]*[.!?]/g);
  if (!sentences) return cleaned.slice(0, 160).trim();
  const twoSentences = sentences.slice(0, 2).join('').trim();
  return twoSentences.length > 200 ? twoSentences.slice(0, 200).trim() + '...' : twoSentences;
}

/** Infer capability phase from title keywords */
export function inferPhase(title: string): CapabilityPhase {
  const lower = title.toLowerCase();
  if (/context|loading|prerequisites?|setup|invocation|mode/.test(lower)) return 'context';
  if (/decompos|analy[sz]|engine|detection|check|process|intake|question|gap|mapping/.test(lower)) return 'analysis';
  if (/output|format|results?|report|gate|confirmation|present/.test(lower)) return 'output';
  if (/valid|audit|log|review|quality|sr[\s-]?11/.test(lower)) return 'validation';
  return 'general';
}

/** Extract capabilities from ## headers with descriptions and phase */
export function extractCapabilities(content: string): AgentCapability[] {
  const capabilities: AgentCapability[] = [];
  const headerRegex = /^##\s+(?:\d+\.\s+)?(.+)$/gm;
  let match;
  const headerPositions: { title: string; start: number }[] = [];

  while ((match = headerRegex.exec(content)) !== null) {
    const header = match[1].trim();
    if (!SKIP_HEADERS.some(s => header.startsWith(s))) {
      headerPositions.push({ title: header, start: match.index + match[0].length });
    }
  }

  for (let i = 0; i < headerPositions.length && capabilities.length < MAX_CAPABILITIES; i++) {
    const { title, start } = headerPositions[i];
    // Content between this header and the next (or end)
    const nextStart = i + 1 < headerPositions.length
      ? content.lastIndexOf('\n##', headerPositions[i + 1].start)
      : content.length;
    const sectionEnd = Math.min(
      nextStart > start ? nextStart : content.length,
      content.indexOf('\n---', start) > start ? content.indexOf('\n---', start) : content.length,
    );
    const sectionContent = content.slice(start, sectionEnd).trim();
    const description = extractDescription(sectionContent);

    capabilities.push({
      title,
      description,
      phase: inferPhase(title),
    });
  }

  return capabilities;
}
