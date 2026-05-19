import 'dotenv/config';
import { GithubProvider } from './git/github/github.provider.js';

async function main() {
  const prUrl = process.argv[2];

  if (!prUrl) {
    throw new Error('Usage: npm run manual:test -- <github-pr-url>');
  }

  const provider = new GithubProvider();

  const pullRequest = await provider.getPullRequest(prUrl);
  console.log('Pull request:', {
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    number: pullRequest.number,
    title: pullRequest.title,
    baseBranch: pullRequest.baseBranch,
    headBranch: pullRequest.headBranch,
  });

  const files = await provider.getDiffFiles(pullRequest);
  console.log(`Changed files: ${files.length}`);

  console.log(
    files.slice(0, 5).map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      hasPatch: Boolean(file.patch),
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
