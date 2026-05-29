import { describe, expect, it } from 'vitest';
import { AIProvider, ChatMessage } from '../../ai/ai-provider.interface.js';
import { DiffFile, PullRequest } from '../../domain/pr.types.js';
import { DiffService } from '../../diff/diff.service.js';
import { GitProvider } from '../../git/git-provider.interface.js';
import { ReviewCommand } from './review.command.js';

class FakeGitProvider implements GitProvider {
  publishedComment?: string;

  private readonly pullRequest: PullRequest = {
    owner: 'test-owner',
    repo: 'test-repo',
    number: 1,
    title: 'Test PR',
    body: 'Test body',
    url: 'https://github.com/test-owner/test-repo/pull/1',
    baseBranch: 'main',
    headBranch: 'feature/test',
  };

  private readonly files: DiffFile[] = [
    {
      filename: 'src/example.ts',
      status: 'modified',
      patch: '@@ test patch',
      additions: 1,
      deletions: 1,
      changes: 2,
    },
  ];

  getPullRequest(_prUrl: string): Promise<PullRequest> {
    void _prUrl;
    return Promise.resolve(this.pullRequest);
  }

  getDiffFiles(_pullRequest: PullRequest): Promise<DiffFile[]> {
    void _pullRequest;
    return Promise.resolve(this.files);
  }

  publishComment(_pullRequest: PullRequest, body: string): Promise<void> {
    this.publishedComment = body;
    return Promise.resolve();
  }
}

class FakeAIProvider implements AIProvider {
  lastMessages?: ChatMessage[];

  chat(messages: ChatMessage[]): Promise<string> {
    this.lastMessages = messages;

    return Promise.resolve(
      [
        'summary: "The PR looks good overall."',
        'findings:',
        '  - severity: "low"',
        '    file: "src/example.ts"',
        '    line: 1',
        '    message: "Small readability improvement."',
        '    suggestion: "Consider renaming the variable."',
      ].join('\n'),
    );
  }

  getName(): string {
    return 'FAKE';
  }
}
describe('ReviewCommand', () => {
  it('publishes a formatted AI review comment', async () => {
    const gitProvider = new FakeGitProvider();
    const aiProvider = new FakeAIProvider();
    const diffService = new DiffService();

    const command = new ReviewCommand(gitProvider, aiProvider, diffService);

    await command.execute({
      prUrl: 'https://github.com/test-owner/test-repo/pull/1',
    });

    expect(aiProvider.lastMessages).toBeDefined();
    expect(gitProvider.publishedComment).toContain('## AI Review');
    expect(gitProvider.publishedComment).toContain(
      'The PR looks good overall.',
    );
    expect(gitProvider.publishedComment).toContain(
      '**LOW** Small readability improvement.',
    );
  });

  it('does not publish a comment in dry-run mode', async () => {
    const gitProvider = new FakeGitProvider();
    const aiProvider = new FakeAIProvider();
    const diffService = new DiffService();

    const command = new ReviewCommand(gitProvider, aiProvider, diffService);

    await command.execute({
      prUrl: 'https://github.com/test-owner/test-repo/pull/1',
      dryRun: true,
    });

    expect(gitProvider.publishedComment).toBeUndefined();
  });
  it('falls back to raw AI output when review YAML cannot be parsed', async () => {
    const gitProvider = new FakeGitProvider();
    const aiProvider = new InvalidYamlAIProvider();
    const diffService = new DiffService();

    const command = new ReviewCommand(gitProvider, aiProvider, diffService);

    await command.execute({
      prUrl: 'https://github.com/test-owner/test-repo/pull/1',
    });

    expect(gitProvider.publishedComment).toContain('## AI Review');
    expect(gitProvider.publishedComment).toContain('This is not YAML.');
    expect(gitProvider.publishedComment).toContain('**Code Review**');
  });
  it('does not publish fallback output in dry-run mode', async () => {
    const gitProvider = new FakeGitProvider();
    const aiProvider = new InvalidYamlAIProvider();
    const diffService = new DiffService();

    const command = new ReviewCommand(gitProvider, aiProvider, diffService);

    await command.execute({
      prUrl: 'https://github.com/test-owner/test-repo/pull/1',
      dryRun: true,
    });

    expect(gitProvider.publishedComment).toBeUndefined();
  });
  it('propagates AI provider errors', async () => {
    const gitProvider = new FakeGitProvider();
    const aiProvider = new ThrowingAIProvider();
    const diffService = new DiffService();

    const command = new ReviewCommand(gitProvider, aiProvider, diffService);

    await expect(
      command.execute({
        prUrl: 'https://github.com/test-owner/test-repo/pull/1',
      }),
    ).rejects.toThrow('AI provider failed');

    expect(gitProvider.publishedComment).toBeUndefined();
  });
});

class InvalidYamlAIProvider implements AIProvider {
  chat(_messages: ChatMessage[]): Promise<string> {
    void _messages;
    return Promise.resolve(
      [
        'This is not YAML.',
        '',
        '**Code Review**',
        '',
        '- Looks mostly okay.',
      ].join('\n'),
    );
  }
  getName(): string {
    return '';
  }
}
class ThrowingAIProvider implements AIProvider {
  chat(_messages: ChatMessage[]): Promise<string> {
    void _messages;
    return Promise.reject(new Error('AI provider failed'));
  }
  getName(): string {
    return '';
  }
}
