import 'dotenv/config';

import { AgentService } from './agent/agent.service.js';
import { CommandRegistry } from './agent/command-registry.js';
import { ReviewCommand } from './commands/review/review.command.js';
import { OpenAIProvider } from './ai/openai.provider.js';
import { GithubProvider } from './git/github/github.provider.js';
import { DiffService } from './diff/diff.service.js';
import { MockAIProvider } from './ai/mock-ai.provider.js';
import { AIProvider } from './ai/ai-provider.interface.js';
import { OllamaProvider } from './ai/ollama.provider.js';

const [, , prUrl, commandName] = process.argv;
if (!prUrl || !commandName) {
  throw new Error('Usage: npm run cli -- <github-pr-url> <command>');
}

const gitProvider = new GithubProvider();
const aiProvider = createAIProvider();
const diffService = new DiffService();

const reviewCommand = new ReviewCommand(gitProvider, aiProvider, diffService);

const registry = new CommandRegistry();
registry.register(reviewCommand);

const agent = new AgentService(registry);

await agent.handleRequest(prUrl, commandName);
console.log('Command completed successfully');

function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? 'mock';

  if (provider === 'mock') {
    return new MockAIProvider();
  }

  if (provider === 'openai') {
    return new OpenAIProvider();
  }

  if (provider === 'ollama') {
    return new OllamaProvider();
  }

  throw new Error(`Unknown AI_PROVIDER: ${provider}`);
}
