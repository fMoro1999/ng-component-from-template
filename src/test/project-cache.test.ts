import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectCache, getProjectCache } from '../type-inference/project-cache';

suite('Project Cache Test Suite', () => {
  let tempDir: string;
  let testFilePath: string;

  setup(() => {
    // Reset singleton before each test
    ProjectCache.resetInstance();

    // Create temp directory with package.json to act as workspace root
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-cache-test-'));
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');

    // Create a test TypeScript file
    testFilePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(testFilePath, 'export const test = 1;');
  });

  teardown(() => {
    // Reset singleton after each test
    ProjectCache.resetInstance();

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  suite('Singleton Pattern', () => {
    test('should return same instance on multiple calls', () => {
      const instance1 = ProjectCache.getInstance();
      const instance2 = ProjectCache.getInstance();
      assert.strictEqual(instance1, instance2);
    });

    test('should return different instance after reset', () => {
      const instance1 = ProjectCache.getInstance();
      ProjectCache.resetInstance();
      const instance2 = ProjectCache.getInstance();
      assert.notStrictEqual(instance1, instance2);
    });

    test('getProjectCache should return singleton', () => {
      const instance1 = getProjectCache();
      const instance2 = getProjectCache();
      assert.strictEqual(instance1, instance2);
    });
  });

  suite('getOrCreateProject', () => {
    test('should create project for valid file path', () => {
      const cache = ProjectCache.getInstance();
      const project = cache.getOrCreateProject(testFilePath);
      assert.ok(project);
    });

    test('should return same project for same workspace', () => {
      const cache = ProjectCache.getInstance();
      const project1 = cache.getOrCreateProject(testFilePath);

      // Create another file in same workspace
      const anotherFile = path.join(tempDir, 'another.ts');
      fs.writeFileSync(anotherFile, 'export const another = 2;');

      const project2 = cache.getOrCreateProject(anotherFile);
      assert.strictEqual(project1, project2);
    });

    test('should create different projects for different workspaces', () => {
      // Create second temp workspace
      const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'project-cache-test2-'));
      fs.writeFileSync(path.join(tempDir2, 'package.json'), '{}');
      const testFile2 = path.join(tempDir2, 'test2.ts');
      fs.writeFileSync(testFile2, 'export const test2 = 2;');

      try {
        const cache = ProjectCache.getInstance();
        const project1 = cache.getOrCreateProject(testFilePath);
        const project2 = cache.getOrCreateProject(testFile2);

        assert.notStrictEqual(project1, project2);
      } finally {
        fs.rmSync(tempDir2, { recursive: true, force: true });
      }
    });

    test('should update lastAccessed on cache hit', () => {
      const cache = ProjectCache.getInstance();
      cache.getOrCreateProject(testFilePath);

      // Wait a bit and access again
      const before = Date.now();
      cache.getOrCreateProject(testFilePath);
      const after = Date.now();

      // Stats should reflect recent access
      const stats = cache.getStats();
      assert.strictEqual(stats.cachedProjects, 1);
    });
  });

  suite('getOrAddSourceFile', () => {
    test('should add source file to project', () => {
      const cache = ProjectCache.getInstance();
      const sourceFile = cache.getOrAddSourceFile(testFilePath);

      assert.ok(sourceFile);
      assert.strictEqual(sourceFile?.getFilePath(), testFilePath);
    });

    test('should return undefined for non-existent file', () => {
      const cache = ProjectCache.getInstance();
      const sourceFile = cache.getOrAddSourceFile('/non/existent/file.ts');

      assert.strictEqual(sourceFile, undefined);
    });

    test('should return same source file on second call', () => {
      const cache = ProjectCache.getInstance();
      const sourceFile1 = cache.getOrAddSourceFile(testFilePath);
      const sourceFile2 = cache.getOrAddSourceFile(testFilePath);

      assert.strictEqual(sourceFile1, sourceFile2);
    });

    test('should track added source files', () => {
      const cache = ProjectCache.getInstance();
      cache.getOrAddSourceFile(testFilePath);

      const stats = cache.getStats();
      assert.strictEqual(stats.totalSourceFiles, 1);
    });

    test('should add multiple source files', () => {
      const cache = ProjectCache.getInstance();

      // Create multiple files
      const files: string[] = [];
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(tempDir, `file${i}.ts`);
        fs.writeFileSync(filePath, `export const file${i} = ${i};`);
        files.push(filePath);
      }

      // Add all files
      for (const file of files) {
        cache.getOrAddSourceFile(file);
      }

      const stats = cache.getStats();
      assert.strictEqual(stats.totalSourceFiles, 5);
    });
  });

  suite('Cache Management', () => {
    test('should clear all cached projects', () => {
      const cache = ProjectCache.getInstance();
      cache.getOrCreateProject(testFilePath);

      const statsBefore = cache.getStats();
      assert.strictEqual(statsBefore.cachedProjects, 1);

      cache.clearAll();

      const statsAfter = cache.getStats();
      assert.strictEqual(statsAfter.cachedProjects, 0);
    });

    test('should clear specific workspace', () => {
      const cache = ProjectCache.getInstance();
      cache.getOrCreateProject(testFilePath);

      cache.clearWorkspace(tempDir);

      const stats = cache.getStats();
      assert.strictEqual(stats.cachedProjects, 0);
    });

    test('should not affect other workspaces when clearing specific one', () => {
      // Create second temp workspace
      const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'project-cache-test2-'));
      fs.writeFileSync(path.join(tempDir2, 'package.json'), '{}');
      const testFile2 = path.join(tempDir2, 'test2.ts');
      fs.writeFileSync(testFile2, 'export const test2 = 2;');

      try {
        const cache = ProjectCache.getInstance();
        cache.getOrCreateProject(testFilePath);
        cache.getOrCreateProject(testFile2);

        assert.strictEqual(cache.getStats().cachedProjects, 2);

        cache.clearWorkspace(tempDir);

        assert.strictEqual(cache.getStats().cachedProjects, 1);
      } finally {
        fs.rmSync(tempDir2, { recursive: true, force: true });
      }
    });
  });

  suite('getStats', () => {
    test('should return correct stats for empty cache', () => {
      const cache = ProjectCache.getInstance();
      const stats = cache.getStats();

      assert.strictEqual(stats.cachedProjects, 0);
      assert.strictEqual(stats.totalSourceFiles, 0);
    });

    test('should return correct stats after adding files', () => {
      const cache = ProjectCache.getInstance();

      // Add project
      cache.getOrCreateProject(testFilePath);

      // Add source files
      const files: string[] = [];
      for (let i = 0; i < 3; i++) {
        const filePath = path.join(tempDir, `stat-file${i}.ts`);
        fs.writeFileSync(filePath, `export const stat${i} = ${i};`);
        files.push(filePath);
        cache.getOrAddSourceFile(filePath);
      }

      const stats = cache.getStats();
      assert.strictEqual(stats.cachedProjects, 1);
      assert.strictEqual(stats.totalSourceFiles, 3);
    });
  });

  suite('Edge Cases', () => {
    test('should handle file path without package.json in hierarchy', () => {
      // Create a temp directory without package.json
      const noPkgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-pkg-test-'));
      const noPkgFile = path.join(noPkgDir, 'test.ts');
      fs.writeFileSync(noPkgFile, 'export const noPkg = 1;');

      try {
        const cache = ProjectCache.getInstance();
        const project = cache.getOrCreateProject(noPkgFile);
        assert.ok(project);
      } finally {
        fs.rmSync(noPkgDir, { recursive: true, force: true });
      }
    });

    test('should handle tsconfig.json when present', () => {
      // Create tsconfig.json
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
          },
        })
      );

      const cache = ProjectCache.getInstance();
      const project = cache.getOrCreateProject(testFilePath);
      assert.ok(project);
    });

    test('should handle deep nested file paths', () => {
      const deepPath = path.join(tempDir, 'src', 'app', 'components', 'button');
      fs.mkdirSync(deepPath, { recursive: true });
      const deepFile = path.join(deepPath, 'button.component.ts');
      fs.writeFileSync(deepFile, 'export class ButtonComponent {}');

      const cache = ProjectCache.getInstance();
      const sourceFile = cache.getOrAddSourceFile(deepFile);
      assert.ok(sourceFile);
    });
  });
});
