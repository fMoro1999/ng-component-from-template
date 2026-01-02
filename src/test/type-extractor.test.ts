import * as assert from 'assert';
import * as vscode from 'vscode';
import { TypeExtractor, ExtractedType } from '../type-inference/type-extractor';

suite('TypeExtractor Test Suite', () => {
  let extractor: TypeExtractor;

  setup(() => {
    extractor = new TypeExtractor();
  });

  suite('extractTypeFromHover', () => {
    test('should extract type from property hover', () => {
      const hover = createMockHover('```typescript\n(property) userName: string\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.type, 'string');
      assert.strictEqual(result?.confidence, 'high');
    });

    test('should extract parameter type from method hover', () => {
      const hover = createMockHover('```typescript\n(method) handleClick(event: MouseEvent): void\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.type, 'MouseEvent');
      assert.strictEqual(result?.confidence, 'high');
    });

    test('should extract complex union types', () => {
      const hover = createMockHover('```typescript\n(property) status: string | number | null\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.type, 'string | number | null');
      assert.strictEqual(result?.isNullable, true);
    });

    test('should extract generic types', () => {
      const hover = createMockHover('```typescript\n(property) users: Array<User>\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.type, 'Array<User>');
    });

    test('should handle nullable types', () => {
      const hover = createMockHover('```typescript\n(property) user: User | null | undefined\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.type, 'User | null');
      assert.strictEqual(result?.isNullable, true);
    });

    test('should handle optional types', () => {
      const hover = createMockHover('```typescript\n(property) email?: string\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.type, 'string');
      assert.strictEqual(result?.isOptional, true);
    });

    test('should return null for empty hovers', () => {
      const hover = createMockHover('');
      const result = extractor.extractTypeFromHover(hover);

      assert.strictEqual(result, null);
    });

    test('should return null for hovers without type information', () => {
      const hover = createMockHover('Some random text without types');
      const result = extractor.extractTypeFromHover(hover);

      assert.strictEqual(result, null);
    });
  });

  suite('normalizeTypeString', () => {
    test('should remove import paths', () => {
      const result = extractor.normalizeTypeString('import("/path/to/module").User');
      assert.strictEqual(result, 'User');
    });

    test('should preserve union types while removing import paths', () => {
      const result = extractor.normalizeTypeString('import("./types").User | null');
      assert.strictEqual(result, 'User | null');
    });

    test('should handle multiple import paths', () => {
      const result = extractor.normalizeTypeString('import("a").TypeA | import("b").TypeB');
      assert.strictEqual(result, 'TypeA | TypeB');
    });

    test('should simplify undefined unions', () => {
      const result = extractor.normalizeTypeString('string | null | undefined');
      assert.strictEqual(result, 'string | null');
    });

    test('should handle complex nested generics', () => {
      const result = extractor.normalizeTypeString('Promise<import("./user").User>');
      assert.strictEqual(result, 'Promise<User>');
    });
  });

  suite('parseMarkdownCodeBlock', () => {
    test('should extract TypeScript code block', () => {
      const markdown = '```typescript\n(property) name: string\n```';
      const result = extractor.parseMarkdownCodeBlock(markdown);

      assert.strictEqual(result, '(property) name: string');
    });

    test('should handle code blocks without language specifier', () => {
      const markdown = '```\n(property) count: number\n```';
      const result = extractor.parseMarkdownCodeBlock(markdown);

      assert.strictEqual(result, '(property) count: number');
    });

    test('should return null for non-code-block markdown', () => {
      const markdown = 'Just some plain text';
      const result = extractor.parseMarkdownCodeBlock(markdown);

      assert.strictEqual(result, null);
    });

    test('should handle multiline code blocks', () => {
      const markdown = '```typescript\n(method) process(\n  data: string,\n  options: Options\n): void\n```';
      const result = extractor.parseMarkdownCodeBlock(markdown);

      assert.ok(result?.includes('process'));
      assert.ok(result?.includes('data: string'));
    });
  });

  suite('extractTypeFromSignature', () => {
    test('should extract type from property signature', () => {
      const result = extractor.extractTypeFromSignature('(property) userName: string');
      assert.strictEqual(result, 'string');
    });

    test('should extract type from method parameter', () => {
      const result = extractor.extractTypeFromSignature('(method) onClick(event: MouseEvent): void');
      assert.strictEqual(result, 'MouseEvent');
    });

    test('should handle optional parameters', () => {
      const result = extractor.extractTypeFromSignature('(property) email?: string');
      assert.strictEqual(result, 'string');
    });

    test('should extract type from complex signatures', () => {
      const result = extractor.extractTypeFromSignature('(property) data: Array<User | Admin>');
      assert.strictEqual(result, 'Array<User | Admin>');
    });

    test('should return empty string for empty signature', () => {
      const result = extractor.extractTypeFromSignature('');
      assert.strictEqual(result, '');
    });

    test('should extract from simple type annotation', () => {
      const result = extractor.extractTypeFromSignature('count: number');
      assert.strictEqual(result, 'number');
    });
  });

  suite('Additional edge cases', () => {
    test('should handle hover with multiple contents', () => {
      const hover = new vscode.Hover([
        new vscode.MarkdownString('Some documentation'),
        new vscode.MarkdownString('```typescript\n(property) value: boolean\n```')
      ]);
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.type, 'boolean');
    });

    test('should handle string content format', () => {
      const hover = new vscode.Hover('```typescript\n(property) id: number\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.type, 'number');
    });

    test('should return null for hover without contents', () => {
      const hover = new vscode.Hover([]);
      const result = extractor.extractTypeFromHover(hover);

      assert.strictEqual(result, null);
    });

    test('should handle normalizeTypeString with empty string', () => {
      const result = extractor.normalizeTypeString('');
      assert.strictEqual(result, 'unknown');
    });

    test('should handle code block with ts language identifier', () => {
      const markdown = '```ts\n(property) data: string\n```';
      const result = extractor.parseMarkdownCodeBlock(markdown);

      assert.strictEqual(result, '(property) data: string');
    });

    test('should handle whitespace in optional property signature', () => {
      const hover = createMockHover('```typescript\n(property) value? : string\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.isOptional, true);
    });

    test('should detect nullable type with pipe null', () => {
      const hover = createMockHover('```typescript\n(property) data: string | null\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.isNullable, true);
    });

    test('should detect nullable type with pipe undefined', () => {
      const hover = createMockHover('```typescript\n(property) data: string | undefined\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.isNullable, true);
    });

    test('should handle non-nullable, non-optional types', () => {
      const hover = createMockHover('```typescript\n(property) required: string\n```');
      const result = extractor.extractTypeFromHover(hover);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.isNullable, false);
      assert.strictEqual(result?.isOptional, false);
    });
  });
});

// Helper function to create mock VSCode Hover objects
function createMockHover(content: string): vscode.Hover {
  const markdownString = new vscode.MarkdownString(content);
  return new vscode.Hover(markdownString);
}
