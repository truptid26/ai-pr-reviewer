export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface AIProvider {
  chat(messages: ChatMessage[]): Promise<string>;
}
