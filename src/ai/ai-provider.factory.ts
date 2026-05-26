import { AppError } from '../common/app-error.js';
import { AIProvider } from './ai-provider.interface.js';
import { MockAIProvider } from './mock-ai.provider.js';
import { OllamaProvider } from './ollama.provider.js';
import { OpenAIProvider } from './openai.provider.js';

export function createAIProvider(
  provider = process.env.AI_PROVIDER ?? 'mock',
): AIProvider {
  if (provider === 'mock') {
    return new MockAIProvider();
  }

  if (provider === 'openai') {
    return new OpenAIProvider();
  }

  if (provider === 'ollama') {
    return new OllamaProvider();
  }

  throw new AppError(`Unknown AI_PROVIDER: ${provider}`);
}
