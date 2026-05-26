import { describe, expect, it } from 'vitest';
import { MockAIProvider } from './mock-ai.provider.js';
import { OllamaProvider } from './ollama.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { createAIProvider } from './ai-provider.factory.js';
import { AppError } from '../common/app-error.js';

describe('createAIProvider', () => {
  it('creates a mock provider', () => {
    expect(createAIProvider('mock')).toBeInstanceOf(MockAIProvider);
  });

  it('creates an ollama provider', () => {
    expect(createAIProvider('ollama')).toBeInstanceOf(OllamaProvider);
  });

  it('creates an openai provider', () => {
    process.env.OPENAI_API_KEY = 'test-key';

    expect(createAIProvider('openai')).toBeInstanceOf(OpenAIProvider);
  });

  it('throws for unknown provider', () => {
    expect(() => createAIProvider('bad')).toThrow(AppError);
    expect(() => createAIProvider('bad')).toThrow('Unknown AI_PROVIDER: bad');
  });
});
