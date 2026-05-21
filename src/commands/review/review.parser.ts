import yaml from 'js-yaml';
import { z } from 'zod';
import { ReviewResult } from '../../domain/pr.types.js';

const ReviewFindingSchema = z.object({
  severity: z.enum(['low', 'medium', 'high']),
  file: z.string().optional(),
  line: z.number().optional(),
  message: z.string(),
  suggestion: z.string().optional(),
});

const ReviewResultSchema = z.object({
  summary: z.string(),
  findings: z.array(ReviewFindingSchema),
});

export function parseReviewResult(rawText: string): ReviewResult {
  const parsed = yaml.load(rawText);
  return ReviewResultSchema.parse(parsed);
}
export function formatReviewMarkdown(result: ReviewResult): string {
  const lines: string[] = [];

  lines.push('## AI Review');
  lines.push('');
  lines.push(result.summary);
  lines.push('');

  if (result.findings.length === 0) {
    lines.push('No major issues found.');
    return lines.join('\n');
  }

  lines.push('### Findings');
  lines.push('');

  for (const finding of result.findings) {
    lines.push(`- **${finding.severity.toUpperCase()}** ${finding.message}`);

    if (finding.file) {
      lines.push(`  - File: \`${finding.file}\``);
    }

    if (finding.line) {
      lines.push(`  - Line: ${finding.line}`);
    }

    if (finding.suggestion) {
      lines.push(`  - Suggestion: ${finding.suggestion}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}
