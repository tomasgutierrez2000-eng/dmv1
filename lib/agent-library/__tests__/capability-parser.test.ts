import { describe, it, expect } from 'vitest';
import { stripMarkdown, extractDescription, inferPhase, extractCapabilities } from '../capability-parser';

/* ────────────────── stripMarkdown ────────────────── */

describe('stripMarkdown', () => {
  it('removes code blocks', () => {
    expect(stripMarkdown('before ```js\nconst x = 1;\n``` after')).toBe('before  after');
  });

  it('removes heading markers', () => {
    expect(stripMarkdown('### Heading Text')).toBe('Heading Text');
    expect(stripMarkdown('# H1\n## H2\n### H3')).toBe('H1 H2 H3');
  });

  it('strips inline code backticks', () => {
    expect(stripMarkdown('Use `extractCapabilities()` here')).toBe('Use extractCapabilities() here');
  });

  it('strips bold markdown', () => {
    expect(stripMarkdown('This is **bold** text')).toBe('This is bold text');
  });

  it('strips italic markdown', () => {
    expect(stripMarkdown('This is *italic* text')).toBe('This is italic text');
  });

  it('converts links to text', () => {
    expect(stripMarkdown('See [the docs](https://example.com) for more')).toBe('See the docs for more');
  });

  it('removes list markers', () => {
    expect(stripMarkdown('- item one\n- item two\n* item three')).toBe('item one item two item three');
  });

  it('removes blockquote markers', () => {
    expect(stripMarkdown('> quoted text\n> more quoted')).toBe('quoted text more quoted');
  });

  it('removes numbered list markers', () => {
    expect(stripMarkdown('1. First\n2. Second\n3. Third')).toBe('First Second Third');
  });

  it('collapses multiple newlines', () => {
    expect(stripMarkdown('para one\n\n\npara two')).toBe('para one para two');
  });

  it('trims whitespace', () => {
    expect(stripMarkdown('  hello  ')).toBe('hello');
  });

  it('handles empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });

  it('handles nested markdown', () => {
    expect(stripMarkdown('**`code in bold`**')).toBe('code in bold');
  });
});

/* ────────────────── extractDescription ────────────────── */

describe('extractDescription', () => {
  it('extracts first 2 sentences', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    expect(extractDescription(text)).toBe('First sentence. Second sentence.');
  });

  it('returns empty for empty content', () => {
    expect(extractDescription('')).toBe('');
  });

  it('handles content with no sentence endings', () => {
    const text = 'A long description without any period or question mark';
    expect(extractDescription(text)).toBe('A long description without any period or question mark');
  });

  it('truncates at 200 chars with ellipsis', () => {
    const long = 'This is a very long first sentence that goes on and on. ' +
      'This is another extremely verbose sentence that pushes us way past the two hundred character limit that we have set for descriptions in our system.';
    const result = extractDescription(long);
    expect(result.length).toBeLessThanOrEqual(203); // 200 + '...'
    expect(result).toMatch(/\.\.\.$/);
  });

  it('handles single sentence', () => {
    expect(extractDescription('Just one sentence.')).toBe('Just one sentence.');
  });

  it('handles sentences ending with ! and ?', () => {
    expect(extractDescription('Is this working? Yes it is!')).toBe('Is this working? Yes it is!');
  });

  it('strips markdown before extracting', () => {
    expect(extractDescription('**Bold** first. *Italic* second.')).toBe('Bold first. Italic second.');
  });

  it('truncates at 160 chars when no sentence endings found', () => {
    const noEnding = 'a'.repeat(200);
    expect(extractDescription(noEnding).length).toBe(160);
  });
});

/* ────────────────── inferPhase ────────────────── */

describe('inferPhase', () => {
  it('detects context phase', () => {
    expect(inferPhase('Context Loading')).toBe('context');
    expect(inferPhase('Prerequisites Check')).toBe('context');
    expect(inferPhase('Prerequisite Verification')).toBe('context');
    expect(inferPhase('Setup & Configuration')).toBe('context');
    expect(inferPhase('Invocation Mode')).toBe('context');
  });

  it('detects analysis phase', () => {
    expect(inferPhase('Decomposition Engine')).toBe('analysis');
    expect(inferPhase('Gap Detection')).toBe('analysis');
    expect(inferPhase('Analysis Pipeline')).toBe('analysis');
    expect(inferPhase('Schema Check')).toBe('analysis');
    expect(inferPhase('Processing Steps')).toBe('analysis');
    expect(inferPhase('Intake Questions')).toBe('analysis');
    expect(inferPhase('Regulatory Mapping')).toBe('analysis');
  });

  it('detects output phase', () => {
    expect(inferPhase('Output Format')).toBe('output');
    expect(inferPhase('Results Summary')).toBe('output');
    expect(inferPhase('Report Generation')).toBe('output');
    expect(inferPhase('Gate Confirmation')).toBe('output');
    expect(inferPhase('Present Findings')).toBe('output');
  });

  it('detects validation phase', () => {
    expect(inferPhase('Validation Rules')).toBe('validation');
    expect(inferPhase('Audit Trail')).toBe('validation');
    expect(inferPhase('Log Management')).toBe('validation');
    expect(inferPhase('Quality Controls')).toBe('validation');
    expect(inferPhase('SR 11-7 Compliance')).toBe('validation');
    // 'SR-11 Check' matches analysis ('check' keyword) before validation ('sr-11')
    expect(inferPhase('SR-11 Check')).toBe('analysis');
    expect(inferPhase('Review Protocol')).toBe('validation');
  });

  it('defaults to general for unmatched titles', () => {
    expect(inferPhase('Overview')).toBe('general');
    expect(inferPhase('Architecture')).toBe('general');
    expect(inferPhase('Dependencies')).toBe('general');
    expect(inferPhase('Something Random')).toBe('general');
  });

  it('is case insensitive', () => {
    expect(inferPhase('CONTEXT LOADING')).toBe('context');
    expect(inferPhase('validation rules')).toBe('validation');
  });
});

/* ────────────────── extractCapabilities ────────────────── */

describe('extractCapabilities', () => {
  it('extracts capabilities from ## headers', () => {
    const content = `# Agent Title

## Decomposition Engine
Breaks down metrics into atomic components.

## Output Format
Produces structured JSON output.
`;
    const caps = extractCapabilities(content);
    expect(caps).toHaveLength(2);
    expect(caps[0].title).toBe('Decomposition Engine');
    expect(caps[0].phase).toBe('analysis');
    expect(caps[1].title).toBe('Output Format');
    expect(caps[1].phase).toBe('output');
  });

  it('extracts descriptions from section content', () => {
    const content = `## Analysis Pipeline
This performs deep analysis of the data model. It checks for gaps and inconsistencies.

## Results Summary
Generates a comprehensive report.
`;
    const caps = extractCapabilities(content);
    expect(caps[0].description).toContain('deep analysis');
    expect(caps[1].description).toContain('comprehensive report');
  });

  it('skips Role, Context, Prerequisites, References, Notes headers', () => {
    const content = `## Role
You are an expert.

## Context
Background info.

## Prerequisites
Check stuff.

## Actual Capability
Does real work.

## References
See docs.

## Notes
Misc notes.
`;
    const caps = extractCapabilities(content);
    expect(caps).toHaveLength(1);
    expect(caps[0].title).toBe('Actual Capability');
  });

  it('handles numbered headers', () => {
    const content = `## 1. First Step
Description of first step.

## 2. Second Step
Description of second step.
`;
    const caps = extractCapabilities(content);
    expect(caps).toHaveLength(2);
    expect(caps[0].title).toBe('First Step');
    expect(caps[1].title).toBe('Second Step');
  });

  it('caps at 15 capabilities', () => {
    let content = '';
    for (let i = 0; i < 20; i++) {
      content += `## Capability ${i}\nDescription ${i}.\n\n`;
    }
    const caps = extractCapabilities(content);
    expect(caps).toHaveLength(15);
  });

  it('returns empty for content with no ## headers', () => {
    const content = '# Title\nSome content without any H2 headers.';
    const caps = extractCapabilities(content);
    expect(caps).toHaveLength(0);
  });

  it('stops at --- divider', () => {
    const content = `## Analysis
First sentence of analysis.

Second paragraph.

---

Some other content below the divider.

## Next Section
Content here.
`;
    const caps = extractCapabilities(content);
    expect(caps[0].description).toContain('First sentence');
    expect(caps[0].description).not.toContain('divider');
  });

  it('handles empty sections gracefully', () => {
    const content = `## Empty Section

## Has Content
Some actual content here.
`;
    const caps = extractCapabilities(content);
    expect(caps).toHaveLength(2);
    expect(caps[0].description).toBe('');
    expect(caps[1].description).toContain('actual content');
  });

  it('strips markdown from descriptions', () => {
    const content = `## Analysis Engine
This uses **bold** and \`code\` and [links](http://example.com) in descriptions.
`;
    const caps = extractCapabilities(content);
    expect(caps[0].description).not.toContain('**');
    expect(caps[0].description).not.toContain('`');
    expect(caps[0].description).not.toContain('](');
  });
});
