export type CommandContext = {
  prUrl: string;
};

export interface Command {
  name: string;
  execute(context: CommandContext): Promise<void>;
}
