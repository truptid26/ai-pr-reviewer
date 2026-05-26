import { AppError } from '../../common/app-error.js';

export type ParsedGithubPullRequestUrl = {
  owner: string;
  repo: string;
  number: number;
};

export function parseGithubPullRequestUrl(
  prUrl: string,
): ParsedGithubPullRequestUrl {
  const url = new URL(prUrl);

  if (url.hostname !== 'github.com') {
    throw new AppError('Only github.com pull request URLs are supported');
  }

  const parts = url.pathname.split('/').filter(Boolean);

  if (parts.length !== 4 || parts[2] !== 'pull') {
    throw new AppError('Invalid GitHub pull request URL');
  }

  const number = Number(parts[3]);

  if (!Number.isInteger(number) || number <= 0) {
    throw new AppError('Invalid GitHub pull request number');
  }

  return {
    owner: parts[0],
    repo: parts[1],
    number,
  };
}
