import { AIProvider, ChatMessage } from './ai-provider.interface.js';
import { z } from 'zod';
import { AppError } from '../common/app-error.js';

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL ?? 'llama3.1:8b';
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      throw new AppError(
        `Ollama request failed: ${response.status} ${response.statusText}`,
      );
    }

    const OllamaChatResponseSchema = z.object({
      message: z.object({
        content: z.string(),
      }),
    });

    const rawData: unknown = await response.json();
    const data = OllamaChatResponseSchema.parse(rawData);
    return data.message?.content ?? '';
  }

  getName(): string {
    return 'OLLAMA';
  }
}
