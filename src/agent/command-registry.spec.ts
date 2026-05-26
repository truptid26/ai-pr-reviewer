import { describe, expect, it } from 'vitest';
import { CommandRegistry } from './command-registry.js';
import { Command } from '../commands/command.interface.js';

describe('CommandRegistry', () => {
  it('returns a registered command', () => {
    const registry = new CommandRegistry();

    const command: Command = {
      name: 'review',
      execute: () => Promise.resolve(),
    };

    registry.register(command);

    expect(registry.get('review')).toBe(command);
  });

  it('throws for an unknown command', () => {
    const registry = new CommandRegistry();

    expect(() => registry.get('missing')).toThrow('Unknown command: missing');
  });
});
