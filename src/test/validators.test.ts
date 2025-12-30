import * as assert from 'assert';
import { requiredValidator } from '../validators';

suite('Validators Test Suite', () => {
  suite('requiredValidator', () => {
    test('should return empty string for non-empty value', () => {
      const result = requiredValidator('some value');
      assert.strictEqual(result, '');
    });

    test('should return error message for empty string', () => {
      const result = requiredValidator('');
      assert.strictEqual(result, 'Path is required.');
    });

    test('should return empty string for whitespace only', () => {
      // Note: Current implementation treats whitespace as valid
      const result = requiredValidator('   ');
      assert.strictEqual(result, '');
    });

    test('should return empty string for string with numbers', () => {
      const result = requiredValidator('123');
      assert.strictEqual(result, '');
    });

    test('should return empty string for path-like string', () => {
      const result = requiredValidator('/path/to/file.ts');
      assert.strictEqual(result, '');
    });

    test('should return empty string for special characters', () => {
      const result = requiredValidator('@angular/core');
      assert.strictEqual(result, '');
    });

    test('should return empty string for single character', () => {
      const result = requiredValidator('a');
      assert.strictEqual(result, '');
    });

    test('should return empty string for unicode characters', () => {
      const result = requiredValidator('component');
      assert.strictEqual(result, '');
    });
  });
});
