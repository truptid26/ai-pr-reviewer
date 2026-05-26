import { GitProvider } from '../git-provider.interface.js';
import { DiffFile, PullRequest } from '../../domain/pr.types.js';
import { Octokit } from '@octokit/rest';
import { AppError } from '../../common/app-error.js';
import { parseGithubPullRequestUrl } from './github-url.js';

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

  async getPullRequest(prUrl: string): Promise<PullRequest> {
    const { owner, repo, number } = parseGithubPullRequestUrl(prUrl);
    try {
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
    } catch (error) {
      throw new AppError('Failed to fetch pull request from GitHub', error);
    }
  }
  async getDiffFiles(pullRequest: PullRequest): Promise<DiffFile[]> {
    try {
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
    } catch (error) {
      throw new AppError('Failed to fetch diff files from GitHub', error);
    }
  }
  async publishComment(pullRequest: PullRequest, body: string): Promise<void> {
    try {
      await this.octokit.issues.createComment({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        issue_number: pullRequest.number,
        body,
      });
    } catch (error) {
      throw new AppError('Failed to publish comment to GitHub', error);
    }
  }
}
