import 'dotenv/config';

import { AgentService } from './agent/agent.service.js';
import { CommandRegistry } from './agent/command-registry.js';
import { ReviewCommand } from './commands/review/review.command.js';
import { GithubProvider } from './git/github/github.provider.js';
import { DiffService } from './diff/diff.service.js';
import { AppError } from './common/app-error.js';
import { createAIProvider } from './ai/ai-provider.factory.js';

async function main() {
  const [, , prUrl, commandName, ...restArgs] = process.argv;
  if (!prUrl || !commandName) {
    throw new Error('Usage: npm run cli -- <github-pr-url> <command>');
  }

  const dryRun = restArgs.includes('--dry-run');

  const gitProvider = new GithubProvider();
  const aiProvider = createAIProvider();
  const diffService = new DiffService();

  const reviewCommand = new ReviewCommand(gitProvider, aiProvider, diffService);

  const registry = new CommandRegistry();
  registry.register(reviewCommand);

  const agent = new AgentService(registry);
  await agent.handleRequest(prUrl, commandName, {
    dryRun,
  });
  console.log('Command completed successfully');
}

main().catch((error) => {
  if (error instanceof AppError) {
    console.error(`Error: ${error.message}`);

    if (process.env.DEBUG === 'true' && error.cause) {
      console.error(error.cause);
    }

    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});
