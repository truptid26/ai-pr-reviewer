import { DiffFile, PullRequest } from '../../domain/pr.types.js';
import fs from 'node:fs';
import path from 'node:path';

export function buildReviewSystemPrompt(): string {
  return loadPrompt('review/system-${REVIEW_PROMPT_VERSION}.txt');
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

  const template = loadPrompt('review/user-${REVIEW_PROMPT_VERSION}.txt');
  return template
    .replace('{{TITLE}}', pullRequest.title)
    .replace('{{DESCRIPTION}}', pullRequest.body || '(no description)')
    .replace('{{FILE_COUNT}}', String(files.length))
    .replace('{{DIFF}}', diffText || '(No patch available)');
}

export function loadPrompt(filePath: string): string {
  const promptPath = path.join(process.cwd(), 'prompts', filePath);

  return fs.readFileSync(promptPath, 'utf-8');
}
