import { describe, expect, it } from 'vitest';
import { formatReviewMarkdown, parseReviewResult } from './review.parser.js';

describe('review.parser', () => {
  it('parses valid YAML review output', () => {
    const raw = [
      'summary: "Looks good overall."',
      'findings:',
      '  - severity: "low"',
      '    file: "src/example.ts"',
      '    line: 10',
      '    message: "Consider renaming this variable."',
      '    suggestion: "Use a more descriptive name."',
    ].join('\n');

    const result = parseReviewResult(raw);

    expect(result.summary).toBe('Looks good overall.');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.severity).toBe('low');
    expect(result.findings[0]?.file).toBe('src/example.ts');
  });

  it('throws when severity is outside the allowed values', () => {
    const raw = [
      'summary: "Has an issue."',
      'findings:',
      '  - severity: "critical"',
      '    message: "Unsupported severity value."',
    ].join('\n');

    expect(() => parseReviewResult(raw)).toThrow();
  });

  it('formats review with no findings', () => {
    const markdown = formatReviewMarkdown({
      summary: 'No risky changes found.',
      findings: [],
    });

    expect(markdown).toContain('## AI Review');
    expect(markdown).toContain('No risky changes found.');
    expect(markdown).toContain('No major issues found.');
  });

  it('formats review findings as Markdown', () => {
    const markdown = formatReviewMarkdown({
      summary: 'One issue found.',
      findings: [
        {
          severity: 'medium',
          file: 'src/auth.ts',
          line: 42,
          message: 'Missing null check.',
          suggestion: 'Check user before reading user.id.',
        },
      ],
    });

    expect(markdown).toContain('## AI Review');
    expect(markdown).toContain('### Findings');
    expect(markdown).toContain('**MEDIUM** Missing null check.');
    expect(markdown).toContain('`src/auth.ts`');
    expect(markdown).toContain('Line: 42');
    expect(markdown).toContain('Check user before reading user.id.');
  });
});
