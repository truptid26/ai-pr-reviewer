import { describe, expect, it } from 'vitest';
import { AppError } from '../../common/app-error.js';
import { parseGithubPullRequestUrl } from './github-url.js';

describe('parseGithubPullRequestUrl', () => {
  it('parses a valid GitHub PR URL', () => {
    expect(
      parseGithubPullRequestUrl(
        'https://github.com/octocat/hello-world/pull/42',
      ),
    ).toEqual({
      owner: 'octocat',
      repo: 'hello-world',
      number: 42,
    });
  });

  it('rejects non-GitHub URLs', () => {
    expect(() =>
      parseGithubPullRequestUrl(
        'https://gitlab.com/group/project/-/merge_requests/1',
      ),
    ).toThrow(AppError);
  });

  it('rejects GitHub URLs that are not pull requests', () => {
    expect(() =>
      parseGithubPullRequestUrl(
        'https://github.com/octocat/hello-world/issues/42',
      ),
    ).toThrow('Invalid GitHub pull request URL');
  });

  it('rejects invalid pull request numbers', () => {
    expect(() =>
      parseGithubPullRequestUrl(
        'https://github.com/octocat/hello-world/pull/not-a-number',
      ),
    ).toThrow('Invalid GitHub pull request number');
  });
});
