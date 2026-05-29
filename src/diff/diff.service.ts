import { DiffFile } from '../domain/pr.types.js';
import { estimateTokens } from '../common/token.utils.js';

export class DiffService {
  limitFiles(files: DiffFile[], maxTokens: number): DiffFile[] {
    let totalTokens = 0;
    const selectedFiles: DiffFile[] = [];

    for (const file of files) {
      if (!file.patch) {
        continue;
      }

      const diffSection = [
        `File: ${file.filename}`,
        `Status: ${file.status}`,
        'Patch:',
        file.patch,
      ].join('\n');

      const patchTokens = estimateTokens(diffSection);

      if (totalTokens + patchTokens > maxTokens) {
        continue;
      }

      selectedFiles.push(file);
      totalTokens += patchTokens;
    }

    console.log({
      totalTokens,
      includedFiles: selectedFiles.length,
    });
    return selectedFiles;
  }
}
