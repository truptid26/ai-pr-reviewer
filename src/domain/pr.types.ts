export type PullRequest = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  url: string;
  baseBranch: string;
  headBranch: string;
};

export type DiffFile = {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  patch?: string;
  additions: number;
  deletions: number;
  changes: number;
};

export type ReviewRequest = {
  pullRequest: PullRequest;
  files: DiffFile[];
};

export type ReviewFinding = {
  file?: string;
  line?: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
};

export type ReviewResult = {
  summary: string;
  findings: ReviewFinding[];
};
