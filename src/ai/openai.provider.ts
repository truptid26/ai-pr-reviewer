import OpenAI from 'openai';
import { AIProvider, ChatMessage } from './ai-provider.interface.js';

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });
    return response.choices[0]?.message?.content ?? '';
  }

  getName(): string {
    return 'OPENAI';
  }
}
