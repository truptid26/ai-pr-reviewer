import { describe, expect, it } from 'vitest';
import { DiffService } from './diff.service.js';
import { DiffFile } from '../domain/pr.types.js';

function createFile(filename: string, patch?: string): DiffFile {
  return {
    filename,
    status: 'modified',
    patch,
    additions: 1,
    deletions: 1,
    changes: 2,
  };
}

describe('DiffService', () => {
  it('keeps files under the character limit', () => {
    const service = new DiffService();

    const files = [createFile('a.ts', '12345'), createFile('b.ts', '12345')];

    const result = service.limitFiles(files, 10);

    expect(result.map((file) => file.filename)).toEqual(['a.ts', 'b.ts']);
  });

  it('skips files without a patch', () => {
    const service = new DiffService();

    const files = [createFile('a.ts'), createFile('b.ts', '12345')];

    const result = service.limitFiles(files, 10);

    expect(result.map((file) => file.filename)).toEqual(['b.ts']);
  });

  it('skips files that would exceed the character limit', () => {
    const service = new DiffService();

    const files = [
      createFile('a.ts', '12345'),
      createFile('b.ts', '123456'),
      createFile('c.ts', '12'),
    ];

    const result = service.limitFiles(files, 10);

    expect(result.map((file) => file.filename)).toEqual(['a.ts', 'c.ts']);
  });
});
