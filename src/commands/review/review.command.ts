import { AIProvider } from '../../ai/ai-provider.interface.js';
import { Command, CommandContext } from '../command.interface.js';
import { GitProvider } from '../../git/git-provider.interface.js';
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from './review.prompt.js';
import { DiffService } from '../../diff/diff.service.js';
import { formatReviewMarkdown, parseReviewResult } from './review.parser.js';
import { buildReviewRepairPrompt } from './review.repair.js';
import { REVIEW_PROMPT_VERSION } from '../../constants/prompt.constants.js';

export class ReviewCommand implements Command {
  readonly name = 'review';

  constructor(
    private readonly gitProvider: GitProvider,
    private readonly aiProvider: AIProvider,
    private readonly diffService: DiffService,
  ) {}

  async execute(context: CommandContext): Promise<void> {
    const startTime = Date.now();
    let repairAttempted = false;
    let repairSucceeded = false;

    const pullRequest = await this.gitProvider.getPullRequest(context.prUrl);
    const files = await this.gitProvider.getDiffFiles(pullRequest);
    // const body = [
    //   `## AI Review`,
    //   ``,
    //   `PR: ${pullRequest.title}`,
    //   `Files changed: ${files.length}`,
    // ].join('\n');

    const limitedFiles = this.diffService.limitFiles(files, 20_000);

    const totalFiles = files.length;
    const reviewedFiles = limitedFiles.length;
    const skippedFiles = totalFiles - reviewedFiles;
    const messages = [
      {
        role: 'system' as const,
        content: buildReviewSystemPrompt(),
      },
      {
        role: 'user' as const,
        content: buildReviewUserPrompt(pullRequest, limitedFiles),
      },
    ];

    const rawReview = await this.aiProvider.chat(messages);
    console.log('Raw AI response:\n', rawReview);
    let markdown: string;
    try {
      const parsedReview = parseReviewResult(rawReview);
      markdown = formatReviewMarkdown(parsedReview);
    } catch (error) {
      console.log(error);
      repairAttempted = true;
      console.warn(
        'Initial AI response was not valid YAML. Attempting repair...',
      );
      const repairedRawReview = await this.aiProvider.chat([
        {
          role: 'system',
          content: 'You convert text into valid YAML. Return only YAML.',
        },
        {
          role: 'user',
          content: buildReviewRepairPrompt(rawReview),
        },
      ]);

      try {
        const repairedReview = parseReviewResult(repairedRawReview);
        markdown = formatReviewMarkdown(repairedReview);
        repairSucceeded = true;
      } catch {
        console.warn('Repair failed. Publishing raw AI response.');

        markdown = ['## AI Review', '', rawReview].join('\n');
      }
    }

    if (context.dryRun) {
      console.log('--- DRY RUN REVIEW OUTPUT ---');
      console.log(markdown);
    }

    if (!context.dryRun) {
      await this.gitProvider.publishComment(pullRequest, markdown);
    }

    const reviewDurationMs = Date.now() - startTime;
    console.log('\n=== Review Metrics ===');
    console.table({
      provider: this.aiProvider.getName(),
      promptVersion: REVIEW_PROMPT_VERSION,
      totalFiles,
      reviewedFiles,
      skippedFiles,
      repairAttempted,
      repairSucceeded,
      reviewDurationMs,
      dryRun: context.dryRun,
    });
  }
}
