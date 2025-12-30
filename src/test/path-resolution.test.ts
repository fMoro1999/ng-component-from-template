import * as assert from 'assert';
import { isPathLike, getParentFolderPath } from '../path-resolution';

suite('Path Resolution Test Suite', () => {
  suite('isPathLike', () => {
    test('should match simple file path', () => {
      const result = isPathLike('/path/to/file.ts');
      assert.ok(result);
      assert.strictEqual(result![1], '/path/to');
      assert.strictEqual(result![2], 'file.ts');
    });

    test('should match path with multiple segments', () => {
      const result = isPathLike('/home/user/projects/my-app/src/component.ts');
      assert.ok(result);
      assert.strictEqual(result![1], '/home/user/projects/my-app/src');
      assert.strictEqual(result![2], 'component.ts');
    });

    test('should match relative path', () => {
      const result = isPathLike('src/components/button.ts');
      assert.ok(result);
      assert.strictEqual(result![1], 'src/components');
      assert.strictEqual(result![2], 'button.ts');
    });

    test('should not match string without slash', () => {
      const result = isPathLike('filename.ts');
      assert.strictEqual(result, null);
    });

    test('should not match empty string', () => {
      const result = isPathLike('');
      assert.strictEqual(result, null);
    });

    test('should handle path with spaces', () => {
      const result = isPathLike('/path/with spaces/file.ts');
      assert.ok(result);
      assert.strictEqual(result![1], '/path/with spaces');
      assert.strictEqual(result![2], 'file.ts');
    });

    test('should handle hidden files', () => {
      const result = isPathLike('/path/.hidden');
      assert.ok(result);
      assert.strictEqual(result![2], '.hidden');
    });

    test('should handle file without extension', () => {
      const result = isPathLike('/path/to/Makefile');
      assert.ok(result);
      assert.strictEqual(result![2], 'Makefile');
    });
  });

  suite('getParentFolderPath', () => {
    test('should return parent of file path', () => {
      const result = getParentFolderPath('/path/to/file.ts');
      assert.strictEqual(result, '/path/to');
    });

    test('should return parent of folder path', () => {
      const result = getParentFolderPath('/path/to/folder');
      assert.strictEqual(result, '/path/to');
    });

    test('should return root for single level path', () => {
      const result = getParentFolderPath('/root');
      assert.strictEqual(result, '/');
    });

    test('should handle relative paths', () => {
      const result = getParentFolderPath('src/components');
      assert.strictEqual(result, 'src');
    });

    test('should handle single segment relative path', () => {
      const result = getParentFolderPath('src');
      assert.strictEqual(result, '.');
    });

    test('should handle deep nested path', () => {
      const result = getParentFolderPath('/home/user/projects/app/src/components/button/button.component.ts');
      assert.strictEqual(result, '/home/user/projects/app/src/components/button');
    });

    test('should handle path with trailing slash', () => {
      const result = getParentFolderPath('/path/to/folder/');
      // path.dirname handles trailing slash by treating it as empty filename,
      // so the parent of '/path/to/folder/' is '/path/to'
      assert.strictEqual(result, '/path/to');
    });
  });
});
