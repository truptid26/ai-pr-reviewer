import 'dotenv/config';

import { AgentService } from './agent/agent.service.js';
import { CommandRegistry } from './agent/command-registry.js';
import { ReviewCommand } from './commands/review/review.command.js';
import { OpenAIProvider } from './ai/openai.provider.js';
import { GithubProvider } from './git/github/github.provider.js';

const [, , prUrl, commandName] = process.argv;
if (!prUrl || !commandName) {
  throw new Error('Usage: npm run cli -- <github-pr-url> <command>');
}

const gitProvider = new GithubProvider();
const aiProvider = new OpenAIProvider();

const reviewCommand = new ReviewCommand(gitProvider, aiProvider);

const registry = new CommandRegistry();
registry.register(reviewCommand);

const agent = new AgentService(registry);

await agent.handleRequest(prUrl, commandName);
console.log('Command completed successfully');
