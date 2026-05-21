import { Command } from '../commands/command.interface.js';
export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  get(commandName: string): Command {
    const command = this.commands.get(commandName);

    if (!command) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    return command;
  }
}
