import { DiffFile } from '../domain/pr.types.js';

export class DiffService {
  limitFiles(files: DiffFile[], maxCharacters: number): DiffFile[] {
    let totalCharacters = 0;
    const selectedFiles: DiffFile[] = [];

    for (const file of files) {
      if (!file.patch) {
        continue;
      }

      const patchLength = file.patch.length;

      if (totalCharacters + patchLength > maxCharacters) {
        continue;
      }

      selectedFiles.push(file);
      totalCharacters += patchLength;
    }

    return selectedFiles;
  }
}
