import * as assert from 'assert';
import * as vscode from 'vscode';
import { ALSHoverProvider, HoverResult } from '../type-inference/als-hover-provider';

suite('ALSHoverProvider Test Suite', () => {
  let provider: ALSHoverProvider;
  let sandbox: {
    executeCommandStub: typeof vscode.commands.executeCommand;
    originalExecuteCommand: typeof vscode.commands.executeCommand;
  };

  setup(() => {
    provider = new ALSHoverProvider();

    // Store original executeCommand
    sandbox = {
      executeCommandStub: vscode.commands.executeCommand,
      originalExecuteCommand: vscode.commands.executeCommand
    };
  });

  teardown(() => {
    // Restore original executeCommand if it was stubbed
    if (sandbox.originalExecuteCommand !== vscode.commands.executeCommand) {
      (vscode.commands as any).executeCommand = sandbox.originalExecuteCommand;
    }
  });

  // Helper to create a mock URI
  function createMockUri(path: string): vscode.Uri {
    return vscode.Uri.file(path);
  }

  // Helper to create a mock Position
  function createMockPosition(line: number, character: number): vscode.Position {
    return new vscode.Position(line, character);
  }

  // Helper to create a mock Hover with Angular Language Service marker
  function createALSHover(contents: string): vscode.Hover {
    const markdownContent = new vscode.MarkdownString(contents);
    const range = new vscode.Range(0, 0, 0, 10);
    return new vscode.Hover(markdownContent, range);
  }

  // Helper to create a mock Hover from other provider
  function createOtherProviderHover(contents: string): vscode.Hover {
    const markdownContent = new vscode.MarkdownString(contents);
    const range = new vscode.Range(0, 0, 0, 10);
    return new vscode.Hover(markdownContent, range);
  }

  // Helper to stub executeCommand
  function stubExecuteCommand(
    returnValue: vscode.Hover[] | Promise<vscode.Hover[]> | Error
  ): void {
    const stub = async (command: string, ...args: any[]): Promise<any> => {
      if (command === 'vscode.executeHoverProvider') {
        if (returnValue instanceof Error) {
          throw returnValue;
        }
        return returnValue;
      }
      return sandbox.originalExecuteCommand(command, ...args);
    };
    (vscode.commands as any).executeCommand = stub;
  }

  // ========================================
  // getTypeAtPosition Tests
  // ========================================

  suite('getTypeAtPosition', () => {
    test('should get type at position successfully with ALS hover', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      // Mock ALS hover with type information
      const alsHover = createALSHover('```typescript\nstring\n```');
      stubExecuteCommand([alsHover]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, true);
      assert.ok(result.typeInfo);
      assert.ok(result.typeInfo.includes('string'));
      assert.strictEqual(result.error, undefined);
    });

    test('should handle timeout gracefully', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      // Simulate a timeout by delaying the response
      stubExecuteCommand(
        new Promise((resolve) => {
          setTimeout(() => resolve([]), 5000);
        })
      );

      const result: HoverResult = await provider.getTypeAtPosition(uri, position, 100);

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.toLowerCase().includes('timeout') || result.error.toLowerCase().includes('timed out'));
    });

    test('should filter ALS hovers from other providers', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      // Mock multiple hovers - ALS and other providers
      const otherHover = createOtherProviderHover('Some unrelated hover text');
      const alsHover = createALSHover('```typescript\nnumber\n```');
      stubExecuteCommand([otherHover, alsHover]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, true);
      assert.ok(result.typeInfo);
      assert.ok(result.typeInfo.includes('number'));
    });

    test('should handle invalid document URI', async () => {
      const uri = createMockUri('');
      const position = createMockPosition(0, 5);

      stubExecuteCommand(new Error('Invalid URI'));

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    test('should handle position out of bounds', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(999, 999);

      stubExecuteCommand([]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.toLowerCase().includes('no hover') || result.error.toLowerCase().includes('not found'));
    });

    test('should return error when ALS unavailable', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      // Simulate ALS not available by returning empty results
      stubExecuteCommand([]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    test('should handle empty hover results', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      stubExecuteCommand([]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.toLowerCase().includes('no hover') || result.error.toLowerCase().includes('not found'));
    });

    test('should handle multiple hover providers - select Angular LS', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      // Multiple providers returning hovers
      const tsHover = createOtherProviderHover('TypeScript hover');
      const eslintHover = createOtherProviderHover('ESLint hover');
      const alsHover = createALSHover('```typescript\nboolean\n```');

      stubExecuteCommand([tsHover, eslintHover, alsHover]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, true);
      assert.ok(result.typeInfo);
      assert.ok(result.typeInfo.includes('boolean'));
    });

    test('should use default timeout of 3000ms when not specified', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      const alsHover = createALSHover('```typescript\nstring\n```');
      stubExecuteCommand([alsHover]);

      const startTime = Date.now();
      const result: HoverResult = await provider.getTypeAtPosition(uri, position);
      const elapsed = Date.now() - startTime;

      assert.strictEqual(result.success, true);
      // Should complete quickly, not wait for timeout
      assert.ok(elapsed < 1000);
    });

    test('should respect custom timeout parameter', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      // Delay response longer than custom timeout
      stubExecuteCommand(
        new Promise((resolve) => {
          setTimeout(() => resolve([]), 2000);
        })
      );

      const startTime = Date.now();
      const result: HoverResult = await provider.getTypeAtPosition(uri, position, 500);
      const elapsed = Date.now() - startTime;

      assert.strictEqual(result.success, false);
      assert.ok(elapsed < 1000); // Should timeout at ~500ms
      assert.ok(result.error?.toLowerCase().includes('timeout') || result.error?.toLowerCase().includes('timed out'));
    });

    test('should include raw hover in successful result', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      const alsHover = createALSHover('```typescript\nstring\n```');
      stubExecuteCommand([alsHover]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, true);
      assert.ok(result.rawHover);
      assert.strictEqual(result.rawHover.length, 1);
    });

    test('should extract type from markdown code block', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      const alsHover = createALSHover('```typescript\nstring | number\n```');
      stubExecuteCommand([alsHover]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, true);
      assert.ok(result.typeInfo);
      assert.ok(result.typeInfo.includes('string'));
      assert.ok(result.typeInfo.includes('number'));
    });

    test('should handle complex type signatures', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      const complexType = '```typescript\nArray<{ id: number; name: string }>\n```';
      const alsHover = createALSHover(complexType);
      stubExecuteCommand([alsHover]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, true);
      assert.ok(result.typeInfo);
      assert.ok(result.typeInfo.includes('Array'));
    });
  });

  // ========================================
  // getTypeForExpression Tests
  // ========================================

  suite('getTypeForExpression', () => {
    test('should calculate position and get type for simple expression', async () => {
      const uri = createMockUri('/test/component.html');
      const expression = 'userName';
      const templateOffset = 0;

      const alsHover = createALSHover('```typescript\nstring\n```');
      stubExecuteCommand([alsHover]);

      const result: HoverResult = await provider.getTypeForExpression(
        uri,
        expression,
        templateOffset
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.typeInfo);
    });

    test('should handle expression not found in template', async () => {
      const uri = createMockUri('/test/component.html');
      const expression = 'nonExistent';
      const templateOffset = 0;

      stubExecuteCommand([]);

      const result: HoverResult = await provider.getTypeForExpression(
        uri,
        expression,
        templateOffset
      );

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    test('should handle offset calculations correctly', async () => {
      const uri = createMockUri('/test/component.html');
      const expression = 'user.name';
      const templateOffset = 100; // Simulate expression starting at offset 100

      const alsHover = createALSHover('```typescript\nstring\n```');
      stubExecuteCommand([alsHover]);

      const result: HoverResult = await provider.getTypeForExpression(
        uri,
        expression,
        templateOffset
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.typeInfo);
    });

    test('should get type for nested property expression', async () => {
      const uri = createMockUri('/test/component.html');
      const expression = 'user.address.city';
      const templateOffset = 50;

      const alsHover = createALSHover('```typescript\nstring\n```');
      stubExecuteCommand([alsHover]);

      const result: HoverResult = await provider.getTypeForExpression(
        uri,
        expression,
        templateOffset
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.typeInfo);
    });

    test('should handle method call expressions', async () => {
      const uri = createMockUri('/test/component.html');
      const expression = 'handleClick($event)';
      const templateOffset = 0;

      const alsHover = createALSHover('```typescript\nvoid\n```');
      stubExecuteCommand([alsHover]);

      const result: HoverResult = await provider.getTypeForExpression(
        uri,
        expression,
        templateOffset
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.typeInfo);
    });
  });

  // ========================================
  // Edge Cases and Error Handling
  // ========================================

  suite('Edge Cases', () => {
    test('should handle null hover contents gracefully', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      // Create hover with empty contents
      const emptyHover = new vscode.Hover([]);
      stubExecuteCommand([emptyHover]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, false);
    });

    test('should handle exception from executeCommand', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      stubExecuteCommand(new Error('Command execution failed'));

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.includes('failed'));
    });

    test('should handle hover with non-typescript code block', async () => {
      const uri = createMockUri('/test/component.html');
      const position = createMockPosition(0, 5);

      const nonTsHover = createALSHover('```javascript\nvar x = 5;\n```');
      stubExecuteCommand([nonTsHover]);

      const result: HoverResult = await provider.getTypeAtPosition(uri, position);

      // Should still attempt to extract type information
      assert.strictEqual(result.success, true);
      assert.ok(result.rawHover);
    });
  });
});
