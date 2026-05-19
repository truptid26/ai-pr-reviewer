import { CommandRegistry } from './command-registry.js';
export class AgentService {
  constructor(private readonly commandRegistry: CommandRegistry) {}

  async handleRequest(prUrl: string, commandName: string): Promise<void> {
    const normalizedCommandName = commandName
      .trim()
      .replace(/^\//, '')
      .toLowerCase();
    const command = this.commandRegistry.get(normalizedCommandName);

    await command.execute({
      prUrl,
    });
  }
}
