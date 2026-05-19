import { GitProvider } from '../git-provider.interface.js';
import { DiffFile, PullRequest } from '../../domain/pr.types.js';
import { Octokit } from '@octokit/rest';

export class GithubProvider implements GitProvider {
  private readonly octokit: Octokit;

  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is required');
    }

    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  private parsePullRequestUrl(prUrl: string): {
    owner: string;
    repo: string;
    number: number;
  } {
    const url = new URL(prUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname !== 'github.com') {
      throw new Error('Only github.com pull request URLs are supported');
    }

    if (parts.length !== 4 || parts[2] !== 'pull') {
      throw new Error('Invalid GitHub pull request URL');
    }

    const number = Number(parts[3]);

    if (!Number.isInteger(number)) {
      throw new Error('Invalid GitHub pull request number');
    }

    return {
      owner: parts[0],
      repo: parts[1],
      number: Number(parts[3]),
    };
  }

  async getPullRequest(prUrl: string): Promise<PullRequest> {
    const { owner, repo, number } = this.parsePullRequestUrl(prUrl);
    const response = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: number,
    });
    const pr = response.data;
    return {
      owner,
      repo,
      number,
      title: pr.title,
      body: pr.body ?? '',
      url: pr.html_url,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
    };
  }
  async getDiffFiles(pullRequest: PullRequest): Promise<DiffFile[]> {
    const response = await this.octokit.pulls.listFiles({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      pull_number: pullRequest.number,
      per_page: 100,
    });

    return response.data.map((file) => ({
      filename: file.filename,
      status: file.status as DiffFile['status'],
      patch: file.patch,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    }));
  }
  async publishComment(pullRequest: PullRequest, body: string): Promise<void> {
    await this.octokit.issues.createComment({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      issue_number: pullRequest.number,
      body,
    });
  }
}
