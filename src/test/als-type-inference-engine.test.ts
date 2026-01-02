import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ALSTypeInferenceEngine } from '../type-inference/als-type-inference-engine';
import { TypeInferenceContext, InferredType } from '../type-inference/type-inference-engine';
import { TemplateDocumentManager, TemplateContext } from '../type-inference/als-template-manager';
import { ALSHoverProvider, HoverResult } from '../type-inference/als-hover-provider';
import { TypeExtractor, ExtractedType } from '../type-inference/type-extractor';

suite('ALSTypeInferenceEngine Integration Test Suite', () => {
  let engine: ALSTypeInferenceEngine;
  let templateManager: TemplateDocumentManager;
  let hoverProvider: ALSHoverProvider;
  let typeExtractor: TypeExtractor;
  let tempComponentUri: vscode.Uri | undefined;

  setup(() => {
    templateManager = new TemplateDocumentManager();
    hoverProvider = new ALSHoverProvider();
    typeExtractor = new TypeExtractor();
    engine = new ALSTypeInferenceEngine(templateManager, hoverProvider, typeExtractor);
  });

  teardown(async () => {
    // Cleanup any created temporary files
    if (tempComponentUri) {
      await templateManager.cleanup(tempComponentUri);
      tempComponentUri = undefined;
    }
    await templateManager.cleanupAll();
  });

  // ========================================
  // Basic Type Inference Tests
  // ========================================

  suite('Basic Type Inference', () => {
    test('should infer type for simple property binding', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      // Mock successful hover and type extraction
      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) name: string'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const userNameResult = results.get('userName');
      assert.ok(userNameResult);
      assert.strictEqual(userNameResult.propertyName, 'userName');
      assert.strictEqual(userNameResult.type, 'string');
      assert.strictEqual(userNameResult.isInferred, true);
      assert.strictEqual(userNameResult.confidence, 'high');
    });

    test('should infer type for output binding', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['click', 'handleClick($event)']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(method) handleClick(event: MouseEvent): void'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const clickResult = results.get('click');
      assert.ok(clickResult);
      assert.strictEqual(clickResult.propertyName, 'click');
      assert.strictEqual(clickResult.type, 'MouseEvent');
      assert.strictEqual(clickResult.isInferred, true);
      assert.strictEqual(clickResult.confidence, 'high');
    });

    test('should infer type for two-way binding', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['ngModel', 'userName']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) userName: string'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const ngModelResult = results.get('ngModel');
      assert.ok(ngModelResult);
      assert.strictEqual(ngModelResult.type, 'string');
      assert.strictEqual(ngModelResult.isInferred, true);
    });

    test('should return unknown when hover fails', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      stubHoverProvider(hoverProvider, {
        success: false,
        error: 'No hover information found'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const userNameResult = results.get('userName');
      assert.ok(userNameResult);
      assert.strictEqual(userNameResult.type, 'unknown');
      assert.strictEqual(userNameResult.isInferred, false);
      assert.strictEqual(userNameResult.confidence, 'low');
    });

    test('should return unknown when type extraction fails', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['data', 'someData']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: 'Invalid hover content without type'
      });

      // Mock type extractor to return null
      const originalExtract = typeExtractor.extractTypeFromHover;
      typeExtractor.extractTypeFromHover = () => null;

      const results = await engine.inferTypesAsync(context);

      // Restore
      typeExtractor.extractTypeFromHover = originalExtract;

      assert.strictEqual(results.size, 1);
      const dataResult = results.get('data');
      assert.ok(dataResult);
      assert.strictEqual(dataResult.type, 'unknown');
      assert.strictEqual(dataResult.isInferred, false);
      assert.strictEqual(dataResult.confidence, 'low');
    });
  });

  // ========================================
  // Complex Expression Tests
  // ========================================

  suite('Complex Expressions', () => {
    test('should handle ternary expressions', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['value', 'condition ? trueVal : falseVal']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) value: string | number'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const valueResult = results.get('value');
      assert.ok(valueResult);
      assert.ok(valueResult.type.includes('string') || valueResult.type.includes('number'));
      assert.strictEqual(valueResult.isInferred, true);
    });

    test('should handle pipe expressions', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['displayName', 'name | uppercase']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) name: string'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const displayNameResult = results.get('displayName');
      assert.ok(displayNameResult);
      assert.strictEqual(displayNameResult.type, 'string');
    });

    test('should handle method call expressions', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userData', 'getUser().name']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) name: string'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const userDataResult = results.get('userData');
      assert.ok(userDataResult);
      assert.strictEqual(userDataResult.type, 'string');
    });

    test('should handle array access expressions', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['firstItem', 'items[0]']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) item: string'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const firstItemResult = results.get('firstItem');
      assert.ok(firstItemResult);
      assert.strictEqual(firstItemResult.type, 'string');
    });

    test('should handle complex union types', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['status', 'currentStatus']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) currentStatus: "active" | "inactive" | "pending" | null'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const statusResult = results.get('status');
      assert.ok(statusResult);
      assert.ok(statusResult.type.includes('active'));
      assert.ok(statusResult.type.includes('null'));
    });

    test('should handle generic types', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['users', 'userList']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) userList: Array<User>'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const usersResult = results.get('users');
      assert.ok(usersResult);
      assert.ok(usersResult.type.includes('Array'));
      assert.ok(usersResult.type.includes('User'));
    });
  });

  // ========================================
  // Error Handling Tests
  // ========================================

  suite('Error Handling', () => {
    test('should handle template document creation failure', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      // Mock templateManager to throw error
      const originalCreate = templateManager.createTemporaryComponent;
      templateManager.createTemporaryComponent = async () => {
        throw new Error('Failed to create temporary component');
      };

      const results = await engine.inferTypesAsync(context);

      // Restore
      templateManager.createTemporaryComponent = originalCreate;

      // Should return unknown for all bindings
      assert.strictEqual(results.size, 1);
      const userNameResult = results.get('userName');
      assert.ok(userNameResult);
      assert.strictEqual(userNameResult.type, 'unknown');
      assert.strictEqual(userNameResult.confidence, 'low');
    });

    test('should handle hover provider timeout', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['data', 'someData']])
      };

      stubHoverProvider(hoverProvider, {
        success: false,
        error: 'Hover provider request timed out after 3000ms'
      });

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 1);
      const dataResult = results.get('data');
      assert.ok(dataResult);
      assert.strictEqual(dataResult.type, 'unknown');
      assert.strictEqual(dataResult.confidence, 'low');
    });

    test('should handle cleanup errors gracefully', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) name: string'
      });

      // Mock cleanup to throw error
      const originalCleanup = templateManager.cleanup;
      templateManager.cleanup = async () => {
        throw new Error('Cleanup failed');
      };

      // Should not throw, should complete successfully
      const results = await engine.inferTypesAsync(context);

      // Restore
      templateManager.cleanup = originalCleanup;

      assert.strictEqual(results.size, 1);
      const userNameResult = results.get('userName');
      assert.ok(userNameResult);
      assert.strictEqual(userNameResult.type, 'string');
    });

    test('should continue processing other bindings if one fails', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([
          ['userName', 'user.name'],
          ['failingBinding', 'invalid.property'],
          ['count', 'userCount']
        ])
      };

      // Mock hover provider to fail on second call
      let callCount = 0;
      const originalGetType = hoverProvider.getTypeAtPosition;
      hoverProvider.getTypeAtPosition = async (): Promise<HoverResult> => {
        callCount++;
        if (callCount === 2) {
          return { success: false, error: 'Failed to get hover' };
        }
        return { success: true, typeInfo: '```typescript\n(property) value: string\n```' };
      };

      const results = await engine.inferTypesAsync(context);

      // Restore
      hoverProvider.getTypeAtPosition = originalGetType;

      // Should have results for all three bindings
      assert.strictEqual(results.size, 3);

      const userNameResult = results.get('userName');
      assert.ok(userNameResult);
      assert.strictEqual(userNameResult.type, 'string');
      assert.strictEqual(userNameResult.confidence, 'high');

      const failingResult = results.get('failingBinding');
      assert.ok(failingResult);
      assert.strictEqual(failingResult.type, 'unknown');
      assert.strictEqual(failingResult.confidence, 'low');

      const countResult = results.get('count');
      assert.ok(countResult);
      assert.strictEqual(countResult.type, 'string');
      assert.strictEqual(countResult.confidence, 'high');
    });

    test('should handle empty template bindings', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map()
      };

      const results = await engine.inferTypesAsync(context);

      assert.strictEqual(results.size, 0);
    });

    test('should handle invalid TypeInferenceContext', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '',
        templateBindings: new Map([['userName', 'user.name']])
      };

      const results = await engine.inferTypesAsync(context);

      // Should handle gracefully and return unknown
      assert.strictEqual(results.size, 1);
      const userNameResult = results.get('userName');
      assert.ok(userNameResult);
      assert.strictEqual(userNameResult.type, 'unknown');
    });
  });

  // ========================================
  // Confidence Level Tests
  // ========================================

  suite('Confidence Levels', () => {
    test('should assign high confidence for successful ALS extraction', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) name: string'
      });

      const results = await engine.inferTypesAsync(context);

      const userNameResult = results.get('userName');
      assert.ok(userNameResult);
      assert.strictEqual(userNameResult.confidence, 'high');
      assert.strictEqual(userNameResult.isInferred, true);
    });

    test('should assign low confidence for fallback scenarios', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['data', 'someData']])
      };

      stubHoverProvider(hoverProvider, {
        success: false,
        error: 'No hover found'
      });

      const results = await engine.inferTypesAsync(context);

      const dataResult = results.get('data');
      assert.ok(dataResult);
      assert.strictEqual(dataResult.confidence, 'low');
      assert.strictEqual(dataResult.isInferred, false);
    });

    test('should assign medium confidence for partial results', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['value', 'getValue()']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: 'any'
      });

      const results = await engine.inferTypesAsync(context);

      const valueResult = results.get('value');
      assert.ok(valueResult);
      // When type is 'any', it might be medium confidence
      assert.ok(['medium', 'low'].includes(valueResult.confidence));
    });

    test('should maintain high confidence for complex but valid types', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['config', 'appConfig']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) appConfig: { apiUrl: string; timeout: number; retries: number }'
      });

      const results = await engine.inferTypesAsync(context);

      const configResult = results.get('config');
      assert.ok(configResult);
      assert.strictEqual(configResult.confidence, 'high');
      assert.strictEqual(configResult.isInferred, true);
    });
  });

  // ========================================
  // Multiple Bindings Tests
  // ========================================

  suite('Multiple Bindings', () => {
    test('should infer types for multiple bindings simultaneously', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([
          ['userName', 'user.name'],
          ['userAge', 'user.age'],
          ['isActive', 'user.isActive']
        ])
      };

      let callCount = 0;
      const originalGetType = hoverProvider.getTypeAtPosition;
      hoverProvider.getTypeAtPosition = async (): Promise<HoverResult> => {
        callCount++;
        if (callCount === 1) {
          return { success: true, typeInfo: '```typescript\n(property) name: string\n```' };
        } else if (callCount === 2) {
          return { success: true, typeInfo: '```typescript\n(property) age: number\n```' };
        } else {
          return { success: true, typeInfo: '```typescript\n(property) isActive: boolean\n```' };
        }
      };

      const results = await engine.inferTypesAsync(context);

      // Restore
      hoverProvider.getTypeAtPosition = originalGetType;

      assert.strictEqual(results.size, 3);

      const userNameResult = results.get('userName');
      assert.ok(userNameResult);
      assert.strictEqual(userNameResult.type, 'string');

      const userAgeResult = results.get('userAge');
      assert.ok(userAgeResult);
      assert.strictEqual(userAgeResult.type, 'number');

      const isActiveResult = results.get('isActive');
      assert.ok(isActiveResult);
      assert.strictEqual(isActiveResult.type, 'boolean');
    });

    test('should handle mix of successful and failed bindings', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([
          ['success1', 'validProperty'],
          ['failed', 'invalidProperty'],
          ['success2', 'anotherValidProperty']
        ])
      };

      let callCount = 0;
      const originalGetType = hoverProvider.getTypeAtPosition;
      hoverProvider.getTypeAtPosition = async (): Promise<HoverResult> => {
        callCount++;
        if (callCount === 2) {
          return { success: false, error: 'Failed' };
        }
        return { success: true, typeInfo: '```typescript\n(property) value: string\n```' };
      };

      const results = await engine.inferTypesAsync(context);

      // Restore
      hoverProvider.getTypeAtPosition = originalGetType;

      assert.strictEqual(results.size, 3);

      const success1 = results.get('success1');
      assert.ok(success1);
      assert.strictEqual(success1.type, 'string');
      assert.strictEqual(success1.confidence, 'high');

      const failed = results.get('failed');
      assert.ok(failed);
      assert.strictEqual(failed.type, 'unknown');
      assert.strictEqual(failed.confidence, 'low');

      const success2 = results.get('success2');
      assert.ok(success2);
      assert.strictEqual(success2.type, 'string');
      assert.strictEqual(success2.confidence, 'high');
    });
  });

  // ========================================
  // Integration with Phase 1 Components
  // ========================================

  suite('Phase 1 Integration', () => {
    test('should properly integrate TemplateDocumentManager', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) name: string'
      });

      // Track if template manager was called
      let templateCreated = false;
      const originalCreate = templateManager.createTemporaryComponent;
      templateManager.createTemporaryComponent = async (ctx: TemplateContext) => {
        templateCreated = true;
        return originalCreate.call(templateManager, ctx);
      };

      await engine.inferTypesAsync(context);

      // Restore
      templateManager.createTemporaryComponent = originalCreate;

      assert.strictEqual(templateCreated, true, 'TemplateDocumentManager should be called');
    });

    test('should properly integrate ALSHoverProvider', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      let hoverCalled = false;
      const originalGetType = hoverProvider.getTypeAtPosition;
      hoverProvider.getTypeAtPosition = async (uri, position, timeout) => {
        hoverCalled = true;
        return { success: true, typeInfo: '(property) name: string' };
      };

      await engine.inferTypesAsync(context);

      // Restore
      hoverProvider.getTypeAtPosition = originalGetType;

      assert.strictEqual(hoverCalled, true, 'ALSHoverProvider should be called');
    });

    test('should properly integrate TypeExtractor', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) name: string'
      });

      let extractorCalled = false;
      const originalExtract = typeExtractor.extractTypeFromHover;
      typeExtractor.extractTypeFromHover = (hover) => {
        extractorCalled = true;
        return originalExtract.call(typeExtractor, hover);
      };

      await engine.inferTypesAsync(context);

      // Restore
      typeExtractor.extractTypeFromHover = originalExtract;

      assert.strictEqual(extractorCalled, true, 'TypeExtractor should be called');
    });
  });

  // ========================================
  // Cleanup Tests
  // ========================================

  suite('Cleanup', () => {
    test('should cleanup temporary files after inference', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      stubHoverProvider(hoverProvider, {
        success: true,
        typeInfo: '(property) name: string'
      });

      let cleanupCalled = false;
      const originalCleanup = templateManager.cleanup;
      templateManager.cleanup = async (uri) => {
        cleanupCalled = true;
        return originalCleanup.call(templateManager, uri);
      };

      await engine.inferTypesAsync(context);

      // Restore
      templateManager.cleanup = originalCleanup;

      assert.strictEqual(cleanupCalled, true, 'Cleanup should be called');
    });

    test('should cleanup even when inference fails', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      // Mock hover to fail
      stubHoverProvider(hoverProvider, {
        success: false,
        error: 'Hover failed'
      });

      let cleanupCalled = false;
      const originalCleanup = templateManager.cleanup;
      templateManager.cleanup = async (uri) => {
        cleanupCalled = true;
        return originalCleanup.call(templateManager, uri);
      };

      await engine.inferTypesAsync(context);

      // Restore
      templateManager.cleanup = originalCleanup;

      assert.strictEqual(cleanupCalled, true, 'Cleanup should be called even on failure');
    });

    test('should not leak files on exception', async () => {
      const context: TypeInferenceContext = {
        parentTsFilePath: '/test/component.ts',
        templateBindings: new Map([['userName', 'user.name']])
      };

      // Mock hover provider to throw
      const originalGetType = hoverProvider.getTypeAtPosition;
      hoverProvider.getTypeAtPosition = async () => {
        throw new Error('Unexpected error');
      };

      let cleanupCalled = false;
      const originalCleanup = templateManager.cleanup;
      templateManager.cleanup = async (uri) => {
        cleanupCalled = true;
        return originalCleanup.call(templateManager, uri);
      };

      await engine.inferTypesAsync(context);

      // Restore
      hoverProvider.getTypeAtPosition = originalGetType;
      templateManager.cleanup = originalCleanup;

      assert.strictEqual(cleanupCalled, true, 'Cleanup should be called even on exception');
    });
  });
});

// ========================================
// Helper Functions
// ========================================

/**
 * Stub hover provider to return predefined results
 */
function stubHoverProvider(provider: ALSHoverProvider, result: HoverResult): void {
  provider.getTypeAtPosition = async (): Promise<HoverResult> => {
    // If the typeInfo doesn't contain markdown code block, wrap it
    if (result.success && result.typeInfo && !result.typeInfo.includes('```')) {
      // Wrap in markdown code block for TypeExtractor
      return {
        ...result,
        typeInfo: `\`\`\`typescript\n${result.typeInfo}\n\`\`\``
      };
    }
    return result;
  };
}
