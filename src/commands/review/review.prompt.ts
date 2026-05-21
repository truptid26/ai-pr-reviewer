import { DiffFile, PullRequest } from '../../domain/pr.types.js';

export function buildReviewSystemPrompt(): string {
  return [
    'You are a code review engine.',
    'You must output only valid YAML.',
    'Do not output Markdown.',
    'Do not output explanations.',
    'Do not output code fences.',
    'Do not explain how to generate YAML.',
    'Your entire response must be parseable by js-yaml.',
  ].join('\n');
}

export function buildReviewUserPrompt(
  pullRequest: PullRequest,
  files: DiffFile[],
): string {
  const diffText = files
    .filter((file) => file.patch)
    .map((file) =>
      [
        `File: ${file.filename}`,
        `Status: ${file.status}`,
        'Patch:',
        file.patch,
      ].join('\n'),
    )
    .join('\n\n');

  return [
    `Review this pull request.`,
    ``,
    `Title: ${pullRequest.title}`,
    `Description: ${pullRequest.body || '(no description)'}`,
    ``,
    `Changed files: ${files.length}`,
    ``,
    `Diff:`,
    diffText || '(No patch available)',
    ``,
    `Return only valid YAML with this shape:
summary: string
findings:
  - severity: low | medium | high
    file: string
    line: number
    message: string
    suggestion: string

If there are no findings, return findings: [].
Do not wrap the YAML in markdown fences.
Return only this YAML shape:

summary: "short summary"
findings:
  - severity: "low"
    file: "path/to/file.ts"
    line: 1
    message: "specific issue"
    suggestion: "specific fix"

If there are no findings, return exactly:

summary: "No major issues found."
findings: []`,
  ].join('\n');
}
