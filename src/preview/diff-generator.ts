import * as path from 'path';

export interface FilePreview {
  path: string;
  content: string;
  language: 'typescript' | 'html' | 'scss';
}

export class DiffGenerator {
  /**
   * Generate a unified diff for a new file creation
   */
  generateCreationDiff(filePreview: FilePreview): string {
    const fileName = path.basename(filePreview.path);
    const lines = filePreview.content.split('\n');

    const header = [
      `+++ ${fileName}`,
      `@@ -0,0 +1,${lines.length} @@`
    ];

    const contentLines = lines.map(line => `+${line}`);

    return [...header, ...contentLines].join('\n');
  }

  /**
   * Generate a unified diff for a file modification
   */
  generateModificationDiff(filePath: string, before: string, after: string): string {
    const fileName = path.basename(filePath);
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');

    const header = [
      `--- ${fileName}`,
      `+++ ${fileName}`,
      `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`
    ];

    // Simple diff: show all removed lines then all added lines
    const removedLines = beforeLines.map(line => `-${line}`);
    const addedLines = afterLines.map(line => `+${line}`);

    return [...header, ...removedLines, ...addedLines].join('\n');
  }

  /**
   * Generate a more sophisticated side-by-side diff
   * This implementation uses a simple line-by-line comparison
   */
  generateDetailedDiff(filePath: string, before: string, after: string): string {
    const fileName = path.basename(filePath);
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');

    const diff: string[] = [
      `--- ${fileName}`,
      `+++ ${fileName}`,
      ''
    ];

    const maxLength = Math.max(beforeLines.length, afterLines.length);

    for (let i = 0; i < maxLength; i++) {
      const beforeLine = beforeLines[i] || '';
      const afterLine = afterLines[i] || '';

      if (beforeLine === afterLine) {
        diff.push(` ${beforeLine}`);
      } else {
        if (beforeLine) {
          diff.push(`-${beforeLine}`);
        }
        if (afterLine) {
          diff.push(`+${afterLine}`);
        }
      }
    }

    return diff.join('\n');
  }

  /**
   * Generate a summary of all changes
   */
  generateChangeSummary(filesToCreate: FilePreview[], filesToModify: Array<{path: string; before: string; after: string}>): string {
    const summary: string[] = ['Changes Summary:', ''];

    if (filesToCreate.length > 0) {
      summary.push(`Files to create (${filesToCreate.length}):`);
      filesToCreate.forEach(file => {
        summary.push(`  + ${path.basename(file.path)}`);
      });
      summary.push('');
    }

    if (filesToModify.length > 0) {
      summary.push(`Files to modify (${filesToModify.length}):`);
      filesToModify.forEach(file => {
        summary.push(`  ~ ${path.basename(file.path)}`);
      });
      summary.push('');
    }

    return summary.join('\n');
  }
}
