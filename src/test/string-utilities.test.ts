import * as assert from 'assert';
import {
  clearAndUpper,
  camelize,
  pascalize,
  toComponentClassName,
  uniquesOf,
} from '../string-utilities';

suite('String Utilities Test Suite', () => {
  suite('clearAndUpper', () => {
    test('should replace dash and uppercase the character', () => {
      assert.strictEqual(clearAndUpper('-a'), 'A');
    });

    test('should handle single character', () => {
      assert.strictEqual(clearAndUpper('a'), 'A');
    });

    test('should uppercase without dash', () => {
      assert.strictEqual(clearAndUpper('abc'), 'ABC');
    });

    test('should handle empty string', () => {
      assert.strictEqual(clearAndUpper(''), '');
    });
  });

  suite('camelize', () => {
    test('should convert dash-case to camelCase', () => {
      assert.strictEqual(camelize('my-component'), 'myComponent');
    });

    test('should convert multiple dashes', () => {
      assert.strictEqual(camelize('my-awesome-component'), 'myAwesomeComponent');
    });

    test('should handle single word', () => {
      assert.strictEqual(camelize('component'), 'component');
    });

    test('should handle empty string', () => {
      assert.strictEqual(camelize(''), '');
    });

    test('should handle already camelCase string', () => {
      assert.strictEqual(camelize('myComponent'), 'myComponent');
    });

    test('should handle string with numbers', () => {
      assert.strictEqual(camelize('my-component-2'), 'myComponent2');
    });
  });

  suite('pascalize', () => {
    test('should convert dash-case to PascalCase', () => {
      assert.strictEqual(pascalize('my-component'), 'MyComponent');
    });

    test('should convert multiple dashes', () => {
      assert.strictEqual(pascalize('my-awesome-component'), 'MyAwesomeComponent');
    });

    test('should handle single word', () => {
      assert.strictEqual(pascalize('component'), 'Component');
    });

    test('should handle empty string', () => {
      assert.strictEqual(pascalize(''), '');
    });

    test('should handle already PascalCase string', () => {
      assert.strictEqual(pascalize('MyComponent'), 'MyComponent');
    });

    test('should handle string with numbers', () => {
      assert.strictEqual(pascalize('my-component-2'), 'MyComponent2');
    });
  });

  suite('toComponentClassName', () => {
    test('should convert dash-case to component class name', () => {
      assert.strictEqual(toComponentClassName('my-component'), 'MyComponentComponent');
    });

    test('should handle single word', () => {
      assert.strictEqual(toComponentClassName('button'), 'ButtonComponent');
    });

    test('should handle complex names', () => {
      assert.strictEqual(toComponentClassName('user-profile-card'), 'UserProfileCardComponent');
    });

    test('should handle empty string', () => {
      assert.strictEqual(toComponentClassName(''), 'Component');
    });

    test('should handle name already containing "component"', () => {
      // It will still append Component
      const result = toComponentClassName('my-button');
      assert.strictEqual(result, 'MyButtonComponent');
    });
  });

  suite('uniquesOf', () => {
    test('should remove duplicate strings', () => {
      const result = uniquesOf(['a', 'b', 'a', 'c', 'b']);
      assert.deepStrictEqual(result, ['a', 'b', 'c']);
    });

    test('should remove duplicate numbers', () => {
      const result = uniquesOf([1, 2, 3, 1, 2]);
      assert.deepStrictEqual(result, [1, 2, 3]);
    });

    test('should remove duplicate booleans', () => {
      const result = uniquesOf([true, false, true, false]);
      assert.deepStrictEqual(result, [true, false]);
    });

    test('should handle empty array', () => {
      const result = uniquesOf([]);
      assert.deepStrictEqual(result, []);
    });

    test('should handle null input', () => {
      const result = uniquesOf(null);
      assert.deepStrictEqual(result, []);
    });

    test('should handle array with single element', () => {
      const result = uniquesOf(['single']);
      assert.deepStrictEqual(result, ['single']);
    });

    test('should handle array with all unique elements', () => {
      const result = uniquesOf(['a', 'b', 'c', 'd']);
      assert.deepStrictEqual(result, ['a', 'b', 'c', 'd']);
    });

    test('should handle array with all duplicate elements', () => {
      const result = uniquesOf(['x', 'x', 'x', 'x']);
      assert.deepStrictEqual(result, ['x']);
    });
  });
});
