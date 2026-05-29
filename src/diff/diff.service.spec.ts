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
  it('keeps all files when the token budget is sufficiently large', () => {
    const service = new DiffService();

    const files = [createFile('a.ts', '12345'), createFile('b.ts', '12345')];

    const result = service.limitFiles(files, 1000);

    expect(result.map((file) => file.filename)).toEqual(['a.ts', 'b.ts']);
  });

  it('skips files without a patch', () => {
    const service = new DiffService();

    const files = [createFile('a.ts'), createFile('b.ts', '12345')];

    const result = service.limitFiles(files, 1000);

    expect(result.map((file) => file.filename)).toEqual(['b.ts']);
  });

  it('skips files that would exceed the token budget', () => {
    const service = new DiffService();

    const files = [
      createFile('a.ts', 'small patch'),
      createFile('b.ts', 'x'.repeat(5000)),
      createFile('c.ts', 'small patch'),
    ];

    const result = service.limitFiles(files, 100);

    expect(result.map((file) => file.filename)).toEqual(['a.ts', 'c.ts']);
  });
});
