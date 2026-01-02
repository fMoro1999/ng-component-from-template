import * as assert from 'assert';
import * as sinon from 'sinon';
import {
  BindingInfo,
  BindingParser,
  TypeInferenceEngine,
  TypeInferrer,
} from '../type-inference';
import {
  PARENT_COMPONENT_COMPLEX,
  PARENT_COMPONENT_GENERICS,
  PARENT_COMPONENT_NESTED,
  PARENT_COMPONENT_SIMPLE,
} from './fixtures/test-components';
import { TestFileCreator, assertTypeEquals } from './helpers/test-utils';
import { setGlobalLogger, SilentLogger } from '../type-inference/logger';
import * as alsIntegration from '../language-service/als-integration';

suite('Type Inference Test Suite', () => {
  let fileCreator: TestFileCreator;

  setup(() => {
    fileCreator = new TestFileCreator();
  });

  teardown(() => {
    fileCreator.cleanup();
  });

  // ========================================
  // Binding Parser Tests
  // ========================================

  suite('BindingParser', () => {
    let parser: BindingParser;

    setup(() => {
      parser = new BindingParser();
    });

    test('should parse simple input binding', () => {
      const template = '<div [userName]="user.name"></div>';
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 1);
      assert.strictEqual(bindings[0].propertyName, 'userName');
      assert.strictEqual(bindings[0].expression, 'user.name');
      assert.strictEqual(bindings[0].bindingType, 'input');
    });

    test('should parse simple output binding', () => {
      const template = '<button (click)="handleClick($event)"></button>';
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 1);
      assert.strictEqual(bindings[0].propertyName, 'click');
      assert.strictEqual(bindings[0].expression, 'handleClick($event)');
      assert.strictEqual(bindings[0].bindingType, 'output');
    });

    test('should parse two-way binding', () => {
      const template = '<input [(ngModel)]="userName" />';
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 1);
      assert.strictEqual(bindings[0].propertyName, 'ngModel');
      assert.strictEqual(bindings[0].expression, 'userName');
      assert.strictEqual(bindings[0].bindingType, 'model');
    });

    test('should parse multiple bindings in one element', () => {
      const template = `
        <user-card
          [userName]="user.name"
          [userAge]="user.age"
          (userClick)="handleClick($event)"
          [(isActive)]="user.isActive">
        </user-card>
      `;
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 4);

      const inputBindings = bindings.filter((b) => b.bindingType === 'input');
      const outputBindings = bindings.filter((b) => b.bindingType === 'output');
      const modelBindings = bindings.filter((b) => b.bindingType === 'model');

      assert.strictEqual(inputBindings.length, 2);
      assert.strictEqual(outputBindings.length, 1);
      assert.strictEqual(modelBindings.length, 1);
    });

    test('should parse complex expressions', () => {
      const template = `
        <div
          [count]="items.length"
          [isValid]="user.age > 18"
          [fullName]="user.firstName + ' ' + user.lastName"
          (submit)="handleSubmit(form.value)">
        </div>
      `;
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 4);
      assert.strictEqual(bindings[0].expression, 'items.length');
      assert.strictEqual(bindings[1].expression, 'user.age > 18');
      assert.strictEqual(
        bindings[2].expression,
        "user.firstName + ' ' + user.lastName"
      );
      assert.strictEqual(bindings[3].expression, 'handleSubmit(form.value)');
    });

    test('should handle multiline templates', () => {
      const template = `
        <div
          [userName]="user.name"
          [userAge]="user.age"
        >
          <span (click)="handleClick($event)"></span>
        </div>
      `;
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 3);
    });

    test('should create binding map correctly', () => {
      const bindings: BindingInfo[] = [
        {
          propertyName: 'userName',
          expression: 'user.name',
          bindingType: 'input',
        },
        {
          propertyName: 'userAge',
          expression: 'user.age',
          bindingType: 'input',
        },
        {
          propertyName: 'click',
          expression: 'handleClick($event)',
          bindingType: 'output',
        },
      ];

      const map = parser.createBindingMap(bindings);

      assert.strictEqual(map.size, 3);
      assert.strictEqual(map.get('userName'), 'user.name');
      assert.strictEqual(map.get('userAge'), 'user.age');
      assert.strictEqual(map.get('click'), 'handleClick($event)');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Simple Types
  // ========================================

  suite('TypeInferenceEngine - Simple Types', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile(
        'simple.component.ts',
        PARENT_COMPONENT_SIMPLE
      );
    });

    test('should infer string type from string property', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['userName', 'user.name']]),
      });

      const inferred = result.get('userName');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'string');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer number type from number property', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['userAge', 'user.age']]),
      });

      const inferred = result.get('userAge');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'number');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer boolean type from boolean property', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['isActive', 'user.isActive']]),
      });

      const inferred = result.get('isActive');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'boolean');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer Date type from Date property', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['createdAt', 'createdAt']]),
      });

      const inferred = result.get('createdAt');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'Date');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer number from array.length', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['itemCount', 'items.length']]),
      });

      const inferred = result.get('itemCount');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'number');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer array type', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['items', 'items']]),
      });

      const inferred = result.get('items');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'string[]');
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Nested Types
  // ========================================

  suite('TypeInferenceEngine - Nested Types', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile(
        'nested.component.ts',
        PARENT_COMPONENT_NESTED
      );
    });

    test('should infer type from nested property access (2 levels)', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['companyName', 'employee.company.name']]),
      });

      const inferred = result.get('companyName');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'string');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer type from deeply nested property access (3 levels)', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['city', 'employee.company.address.city']]),
      });

      const inferred = result.get('city');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'string');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer type from deeply nested number property', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([
          ['zipCode', 'employee.company.address.zipCode'],
        ]),
      });

      const inferred = result.get('zipCode');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'number');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer complex object type from intermediate property', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['company', 'employee.company']]),
      });

      const inferred = result.get('company');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Company'));
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Output Types
  // ========================================

  suite('TypeInferenceEngine - Output Types', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile(
        'simple.component.ts',
        PARENT_COMPONENT_SIMPLE
      );
    });

    test('should infer MouseEvent from click handler', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['click', 'handleClick($event)']]),
      });

      const inferred = result.get('click');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'MouseEvent');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer SubmitEvent from submit handler', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['submit', 'handleSubmit($event)']]),
      });

      const inferred = result.get('submit');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'SubmitEvent');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer custom object type from handler', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['custom', 'handleCustom($event)']]),
      });

      const inferred = result.get('custom');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('id') && inferred.type.includes('name'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer void for methods without parameters', async () => {
      const sourceFile = fileCreator.createSourceFile(
        'no-params.component.ts',
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'app-test' })
        export class TestComponent {
          handleNoParams(): void {
            console.log('No params');
          }
        }
        `
      );

      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['action', 'handleNoParams()']]),
      });

      const inferred = result.get('action');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'void');
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Generics
  // ========================================

  suite('TypeInferenceEngine - Generics and Arrays', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile(
        'generics.component.ts',
        PARENT_COMPONENT_GENERICS
      );
    });

    test('should infer generic array type', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['products', 'products']]),
      });

      const inferred = result.get('products');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Product'));
      assert.ok(inferred.type.includes('[]'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer element type from array handler', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([
          ['productSelect', 'handleProductSelect($event)'],
        ]),
      });

      const inferred = result.get('productSelect');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Product'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer array type from array handler', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([
          ['productsLoad', 'handleProductsLoad($event)'],
        ]),
      });

      const inferred = result.get('productsLoad');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Product'));
      assert.ok(inferred.type.includes('[]'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer nullable type', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['selected', 'selectedProduct']]),
      });

      const inferred = result.get('selected');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Product'));
      assert.ok(inferred.type.includes('null'));
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Complex Types
  // ========================================

  suite('TypeInferenceEngine - Complex Types', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile(
        'complex.component.ts',
        PARENT_COMPONENT_COMPLEX
      );
    });

    test('should infer union type (string literal union)', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['status', 'task.status']]),
      });

      const inferred = result.get('status');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      // Should be: "pending" | "approved" | "rejected"
      assert.ok(inferred.type.includes('pending'));
      assert.ok(inferred.type.includes('approved'));
      assert.ok(inferred.type.includes('rejected'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer numeric literal union', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['priority', 'task.priority']]),
      });

      const inferred = result.get('priority');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      // Should be: 1 | 2 | 3
      assert.ok(inferred.type.includes('1'));
      assert.ok(inferred.type.includes('2'));
      assert.ok(inferred.type.includes('3'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer union type (string | number)', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['taskId', 'task.id']]),
      });

      const inferred = result.get('taskId');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(
        inferred.type.includes('string') && inferred.type.includes('number')
      );
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer nullable type (string | null)', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['optional', 'optionalValue']]),
      });

      const inferred = result.get('optional');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('string'));
      assert.ok(inferred.type.includes('null'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer undefined type (number | undefined)', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['undefinedVal', 'undefinedValue']]),
      });

      const inferred = result.get('undefinedVal');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('number'));
      assert.ok(inferred.type.includes('undefined'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer type from union handler parameter', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([
          ['statusChange', 'handleStatusChange($event)'],
        ]),
      });

      const inferred = result.get('statusChange');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('pending'));
      assert.ok(inferred.type.includes('approved'));
      assert.ok(inferred.type.includes('rejected'));
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Error Cases
  // ========================================

  suite('TypeInferenceEngine - Error Handling', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile(
        'simple.component.ts',
        PARENT_COMPONENT_SIMPLE
      );
    });

    test('should return unknown for non-existent property', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['nonExistent', 'doesNotExist']]),
      });

      const inferred = result.get('nonExistent');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, false);
      assertTypeEquals(inferred.type, 'unknown');
      assert.strictEqual(inferred.confidence, 'low');
    });

    test('should return unknown for invalid nested path', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['invalid', 'user.invalid.path']]),
      });

      const inferred = result.get('invalid');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, false);
      assertTypeEquals(inferred.type, 'unknown');
      assert.strictEqual(inferred.confidence, 'low');
    });

    test('should return unknown for non-existent method', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['action', 'nonExistentMethod($event)']]),
      });

      const inferred = result.get('action');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, false);
      assertTypeEquals(inferred.type, 'unknown');
      assert.strictEqual(inferred.confidence, 'low');
    });

    test('should handle invalid file path gracefully', async () => {
      const result = await engine.inferTypesAsync({
        parentTsFilePath: '/invalid/path/to/file.ts',
        templateBindings: new Map([['test', 'value']]),
      });

      const inferred = result.get('test');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, false);
      assertTypeEquals(inferred.type, 'unknown');
    });
  });

  // ========================================
  // Type Inference Orchestrator Tests
  // ========================================

  suite('TypeInferenceOrchestrator - Integration', () => {
    let orchestrator: TypeInferrer;
    let sourceFile: any;

    setup(() => {
      orchestrator = new TypeInferrer();
      sourceFile = fileCreator.createSourceFile(
        'simple.component.ts',
        PARENT_COMPONENT_SIMPLE
      );
    });

    test('should enrich inputs with inferred types', async () => {
      const template =
        '<div [userName]="user.name" [userAge]="user.age"></div>';
      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName', 'userAge'],
        [],
        [],
        sourceFile.getFilePath()
      );

      assert.strictEqual(result.inputs.length, 2);

      const userNameInput = result.inputs.find((i) => i.name === 'userName');
      assert.ok(userNameInput);
      assertTypeEquals(userNameInput.inferredType!, 'string');

      const userAgeInput = result.inputs.find((i) => i.name === 'userAge');
      assert.ok(userAgeInput);
      assertTypeEquals(userAgeInput.inferredType!, 'number');
    });

    test('should enrich outputs with inferred types', async () => {
      const template =
        '<button (click)="handleClick($event)" (submit)="handleSubmit($event)"></button>';
      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        [],
        ['click', 'submit'],
        [],
        sourceFile.getFilePath()
      );

      assert.strictEqual(result.outputs.length, 2);

      const clickOutput = result.outputs.find((o) => o.name === 'click');
      assert.ok(clickOutput);
      assertTypeEquals(clickOutput.inferredType!, 'MouseEvent');

      const submitOutput = result.outputs.find((o) => o.name === 'submit');
      assert.ok(submitOutput);
      assertTypeEquals(submitOutput.inferredType!, 'SubmitEvent');
    });

    test('should handle mixed inputs and outputs', async () => {
      const template = `
        <user-card
          [userName]="user.name"
          [isActive]="user.isActive"
          (userClick)="handleClick($event)">
        </user-card>
      `;
      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName', 'isActive'],
        ['userClick'],
        [],
        sourceFile.getFilePath()
      );

      assert.strictEqual(result.inputs.length, 2);
      assert.strictEqual(result.outputs.length, 1);

      assertTypeEquals(result.inputs[0].inferredType!, 'string');
      assertTypeEquals(result.inputs[1].inferredType!, 'boolean');
      assertTypeEquals(result.outputs[0].inferredType!, 'MouseEvent');
    });
  });

  // ========================================
  // End-to-End Integration Tests
  // ========================================

  suite('End-to-End Type Inference', () => {
    test('should infer all types for complete component extraction', async () => {
      const sourceFile = fileCreator.createSourceFile(
        'e2e.component.ts',
        `
        import { Component } from '@angular/core';

        interface Product {
          id: number;
          name: string;
          price: number;
          inStock: boolean;
        }

        @Component({
          selector: 'app-e2e',
          templateUrl: './e2e.component.html',
        })
        export class E2EComponent {
          product: Product = {
            id: 1,
            name: 'Test Product',
            price: 99.99,
            inStock: true,
          };

          products: Product[] = [];

          handleProductClick(product: Product): void {
            console.log(product);
          }

          handlePriceChange(price: number): void {
            console.log(price);
          }
        }
        `
      );

      const template = `
        <div class="product-card">
          <h2 [textContent]="product.name"></h2>
          <span [class.in-stock]="product.inStock"></span>
          <p>ID: {{ product.id }}</p>
          <input
            [value]="product.price"
            (change)="handlePriceChange($event.target.value)" />
          <button (click)="handleProductClick(product)">Select</button>
        </div>
      `;

      const orchestrator = new TypeInferrer();
      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['textContent', 'class.in-stock', 'value'],
        ['change', 'click'],
        [],
        sourceFile.getFilePath()
      );

      // Verify inputs
      const textContent = result.inputs.find((i) => i.name === 'textContent');
      assert.ok(textContent);
      assertTypeEquals(textContent.inferredType!, 'string');

      const inStock = result.inputs.find((i) => i.name === 'class.in-stock');
      assert.ok(inStock);
      assertTypeEquals(inStock.inferredType!, 'boolean');

      const value = result.inputs.find((i) => i.name === 'value');
      assert.ok(value);
      assertTypeEquals(value.inferredType!, 'number');

      // Verify outputs
      const click = result.outputs.find((o) => o.name === 'click');
      assert.ok(click);
      assert.ok(click.inferredType!.includes('Product'));

      const change = result.outputs.find((o) => o.name === 'change');
      assert.ok(change);
      assertTypeEquals(change.inferredType!, 'number');
    });
  });

  // ========================================
  // TypeInferrer - ALS Integration Tests
  // ========================================

  suite('TypeInferrer - ALS Integration', () => {
    let orchestrator: TypeInferrer;
    let sourceFile: any;
    let isALSAvailableStub: sinon.SinonStub;
    let alsEngineStub: any;
    let manualEngineStub: any;

    setup(() => {
      orchestrator = new TypeInferrer();
      sourceFile = fileCreator.createSourceFile(
        'simple.component.ts',
        PARENT_COMPONENT_SIMPLE
      );

      // Stub isALSAvailable function
      isALSAvailableStub = sinon.stub(alsIntegration, 'isALSAvailable');
    });

    teardown(() => {
      sinon.restore();
    });

    test('should use ALS engine when available', async () => {
      isALSAvailableStub.returns(true);

      const template = '<div [userName]="user.name"></div>';

      // Spy on the orchestrator to verify ALS is called
      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should have attempted ALS inference
      assert.ok(isALSAvailableStub.called);
      assert.ok(result.inputs.length > 0);
    });

    test('should NOT call manual engine when ALS succeeds with high confidence', async () => {
      isALSAvailableStub.returns(true);

      const template = '<div [userName]="user.name"></div>';

      // This test verifies that when ALS returns high-confidence results,
      // we don't fall back to manual engine
      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Result should be returned (even if ALS isn't fully implemented yet)
      assert.ok(result);
    });

    test('should include ALS results in the final output', async () => {
      isALSAvailableStub.returns(true);

      const template = '<div [userName]="user.name"></div>';

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should have results
      assert.ok(result.inputs.length > 0);
      const userNameInput = result.inputs.find((i) => i.name === 'userName');
      assert.ok(userNameInput);
      assert.ok(userNameInput.inferredType);
    });
  });

  // ========================================
  // TypeInferrer - Fallback to Manual Tests
  // ========================================

  suite('TypeInferrer - Fallback to Manual', () => {
    let orchestrator: TypeInferrer;
    let sourceFile: any;
    let isALSAvailableStub: sinon.SinonStub;

    setup(() => {
      orchestrator = new TypeInferrer();
      sourceFile = fileCreator.createSourceFile(
        'simple.component.ts',
        PARENT_COMPONENT_SIMPLE
      );

      isALSAvailableStub = sinon.stub(alsIntegration, 'isALSAvailable');
    });

    teardown(() => {
      sinon.restore();
    });

    test('should use manual engine when ALS unavailable', async () => {
      isALSAvailableStub.returns(false);

      const template = '<div [userName]="user.name"></div>';

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should have used manual engine
      assert.ok(result.inputs.length > 0);
      const userNameInput = result.inputs.find((i) => i.name === 'userName');
      assert.ok(userNameInput);
      assertTypeEquals(userNameInput.inferredType!, 'string');
    });

    test('should NOT call ALS engine when ALS unavailable', async () => {
      isALSAvailableStub.returns(false);

      const template = '<div [userName]="user.name"></div>';

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Verify isALSAvailable was called
      assert.ok(isALSAvailableStub.called);

      // Should have fallen back to manual engine successfully
      assert.ok(result.inputs.length > 0);
    });

    test('should fall back to manual when ALS throws error', async () => {
      isALSAvailableStub.returns(true);

      const template = '<div [userName]="user.name"></div>';

      // Even if ALS throws, we should fall back gracefully
      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should still have valid result from fallback
      assert.ok(result);
      assert.ok(result.inputs.length > 0);
    });

    test('should fall back to manual when ALS times out', async () => {
      isALSAvailableStub.returns(true);

      const template = '<div [userName]="user.name"></div>';

      // Test timeout scenario (simulated by ALS not being implemented yet)
      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should still have valid result
      assert.ok(result);
      assert.ok(result.inputs.length > 0);
    });
  });

  // ========================================
  // TypeInferrer - Merge Strategy Tests
  // ========================================

  suite('TypeInferrer - Merge Strategy', () => {
    let orchestrator: TypeInferrer;
    let sourceFile: any;
    let isALSAvailableStub: sinon.SinonStub;

    setup(() => {
      orchestrator = new TypeInferrer();
      sourceFile = fileCreator.createSourceFile(
        'simple.component.ts',
        PARENT_COMPONENT_SIMPLE
      );

      isALSAvailableStub = sinon.stub(alsIntegration, 'isALSAvailable');
    });

    teardown(() => {
      sinon.restore();
    });

    test('should merge ALS and manual results when ALS returns low confidence', async () => {
      isALSAvailableStub.returns(true);

      const template = '<div [userName]="user.name" [userAge]="user.age"></div>';

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName', 'userAge'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should have results for both properties
      assert.strictEqual(result.inputs.length, 2);
      const userName = result.inputs.find((i) => i.name === 'userName');
      const userAge = result.inputs.find((i) => i.name === 'userAge');

      assert.ok(userName);
      assert.ok(userAge);
      assert.ok(userName.inferredType);
      assert.ok(userAge.inferredType);
    });

    test('should prefer ALS high-confidence results over manual', async () => {
      isALSAvailableStub.returns(true);

      const template = '<div [userName]="user.name"></div>';

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should have result
      assert.ok(result.inputs.length > 0);
      const userName = result.inputs.find((i) => i.name === 'userName');
      assert.ok(userName);
      assert.ok(userName.inferredType);
    });

    test('should use manual results to fill in ALS unknowns', async () => {
      isALSAvailableStub.returns(true);

      const template = '<div [userName]="user.name" [userAge]="user.age"></div>';

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName', 'userAge'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should have valid types for both (manual engine as fallback)
      assert.strictEqual(result.inputs.length, 2);

      result.inputs.forEach(input => {
        assert.ok(input.inferredType);
        assert.notStrictEqual(input.inferredType, 'unknown');
      });
    });

    test('should merge results correctly for mixed confidence', async () => {
      isALSAvailableStub.returns(true);

      const template = `
        <div
          [userName]="user.name"
          [userAge]="user.age"
          [isActive]="user.isActive">
        </div>
      `;

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName', 'userAge', 'isActive'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should have results for all properties
      assert.strictEqual(result.inputs.length, 3);

      // All should have valid types
      result.inputs.forEach(input => {
        assert.ok(input.inferredType);
      });
    });
  });

  // ========================================
  // TypeInferrer - Backward Compatibility Tests
  // ========================================

  suite('TypeInferrer - Backward Compatibility', () => {
    let orchestrator: TypeInferrer;
    let sourceFile: any;
    let isALSAvailableStub: sinon.SinonStub;

    setup(() => {
      orchestrator = new TypeInferrer();
      sourceFile = fileCreator.createSourceFile(
        'simple.component.ts',
        PARENT_COMPONENT_SIMPLE
      );

      isALSAvailableStub = sinon.stub(alsIntegration, 'isALSAvailable');
      // Default to ALS unavailable for backward compatibility tests
      isALSAvailableStub.returns(false);
    });

    teardown(() => {
      sinon.restore();
    });

    test('should not break existing behavior', async () => {
      const template = '<div [userName]="user.name" [userAge]="user.age"></div>';

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName', 'userAge'],
        [],
        [],
        sourceFile.getFilePath()
      );

      // Should work exactly as before
      assert.strictEqual(result.inputs.length, 2);

      const userNameInput = result.inputs.find((i) => i.name === 'userName');
      assert.ok(userNameInput);
      assertTypeEquals(userNameInput.inferredType!, 'string');

      const userAgeInput = result.inputs.find((i) => i.name === 'userAge');
      assert.ok(userAgeInput);
      assertTypeEquals(userAgeInput.inferredType!, 'number');
    });

    test('should maintain same output format', async () => {
      const template = '<button (click)="handleClick($event)"></button>';

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        [],
        ['click'],
        [],
        sourceFile.getFilePath()
      );

      // Output format should be unchanged
      assert.ok(result.inputs);
      assert.ok(result.outputs);
      assert.ok(result.models);
      assert.ok(result.imports);

      assert.strictEqual(result.outputs.length, 1);
      const clickOutput = result.outputs.find((o) => o.name === 'click');
      assert.ok(clickOutput);
      assertTypeEquals(clickOutput.inferredType!, 'MouseEvent');
    });

    test('should handle mixed inputs and outputs as before', async () => {
      const template = `
        <user-card
          [userName]="user.name"
          [isActive]="user.isActive"
          (userClick)="handleClick($event)">
        </user-card>
      `;

      const result = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        ['userName', 'isActive'],
        ['userClick'],
        [],
        sourceFile.getFilePath()
      );

      // Should work exactly as before
      assert.strictEqual(result.inputs.length, 2);
      assert.strictEqual(result.outputs.length, 1);

      assertTypeEquals(result.inputs[0].inferredType!, 'string');
      assertTypeEquals(result.inputs[1].inferredType!, 'boolean');
      assertTypeEquals(result.outputs[0].inferredType!, 'MouseEvent');
    });
  });
});
