export type CommandContext = {
  prUrl: string;
  dryRun?: boolean;
};

export interface Command {
  name: string;
  execute(context: CommandContext): Promise<void>;
}
