import { AIProvider, ChatMessage } from './ai-provider.interface.js';

export class MockAIProvider implements AIProvider {
  async chat(messages: ChatMessage[]): Promise<string> {
    void messages;

    return Promise.resolve(
      [
        'summary: "Mock review generated successfully."',
        'findings:',
        '  - severity: "low"',
        '    file: "example.ts"',
        '    line: 1',
        '    message: "This is a mock finding so you can test the full pipeline."',
        '    suggestion: "Replace MockAIProvider with OpenAIProvider when quota is available."',
      ].join('\n'),
    );
  }
}
