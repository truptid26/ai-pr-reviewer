import { AIProvider } from '../../ai/ai-provider.interface.js';
import { Command, CommandContext } from '../command.interface.js';
import { GitProvider } from '../../git/git-provider.interface.js';

export class ReviewCommand implements Command {
  readonly name = 'review';

  constructor(
    private readonly gitProvider: GitProvider,
    private readonly aiProvider: AIProvider,
  ) {}

  async execute(context: CommandContext): Promise<void> {
    const pullRequest = await this.gitProvider.getPullRequest(context.prUrl);
    const files = await this.gitProvider.getDiffFiles(pullRequest);
    const body = [
      `## AI Review`,
      ``,
      `PR: ${pullRequest.title}`,
      `Files changed: ${files.length}`,
    ].join('\n');

    await this.gitProvider.publishComment(pullRequest, body);
  }
}
