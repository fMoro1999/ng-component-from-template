import { Project, SourceFile } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Helper to create temporary TypeScript files for testing
 */
export class TestFileCreator {
  private tempDir: string;
  private project: Project;

  constructor() {
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ng-test-'));
    this.project = new Project({
      compilerOptions: {
        target: 99, // ESNext
        module: 99, // ESNext
        strict: true,
        esModuleInterop: true,
      },
    });
  }

  /**
   * Create a temporary TypeScript file with given content
   */
  createTempFile(fileName: string, content: string): string {
    const filePath = path.join(this.tempDir, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create a source file in the ts-morph project
   */
  createSourceFile(fileName: string, content: string): SourceFile {
    const filePath = this.createTempFile(fileName, content);
    return this.project.addSourceFileAtPath(filePath);
  }

  /**
   * Clean up temporary files
   */
  cleanup(): void {
    try {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  getProject(): Project {
    return this.project;
  }
}

/**
 * Assert that inferred type matches expected type
 */
export function assertTypeEquals(
  actual: string,
  expected: string,
  message?: string
): void {
  // Normalize type strings for comparison
  const normalizeType = (type: string) => {
    return type
      .replace(/\s+/g, ' ')
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/\s*&\s*/g, ' & ')
      .trim();
  };

  const normalizedActual = normalizeType(actual);
  const normalizedExpected = normalizeType(expected);

  if (normalizedActual !== normalizedExpected) {
    throw new Error(
      message ||
        `Type mismatch:\n  Expected: ${normalizedExpected}\n  Actual:   ${normalizedActual}`
    );
  }
}

/**
 * Assert that type is one of the expected types (for union types)
 */
export function assertTypeIncludes(
  actual: string,
  expectedOptions: string[],
  message?: string
): void {
  const matches = expectedOptions.some(expected => {
    try {
      assertTypeEquals(actual, expected);
      return true;
    } catch {
      return false;
    }
  });

  if (!matches) {
    throw new Error(
      message ||
        `Type not in expected options:\n  Actual: ${actual}\n  Expected one of: ${expectedOptions.join(', ')}`
    );
  }
}
