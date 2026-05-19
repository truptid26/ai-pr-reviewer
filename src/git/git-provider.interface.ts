import { DiffFile, PullRequest } from '../domain/pr.types.js';
export interface GitProvider {
  getPullRequest(prUrl: string): Promise<PullRequest>;
  getDiffFiles(pullRequest: PullRequest): Promise<DiffFile[]>;
  publishComment(pullRequest: PullRequest, body: string): Promise<void>;
}
