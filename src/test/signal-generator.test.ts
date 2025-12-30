import * as assert from 'assert';
import {
  generateDecoratorInputs,
  generateDecoratorModels,
  generateDecoratorOutputs,
  generateSignalInputs,
  generateSignalModels,
  generateSignalOutputs,
} from '../signal-generator';
import { parseAngularVersion } from '../angular-version-detector';

suite('Signal Generator Test Suite', () => {
  suite('Signal API Generation (Angular 17+)', () => {
    test('Generate signal inputs with required and optional', () => {
      const result = generateSignalInputs([
        { name: 'userName', isRequired: true },
        { name: 'age', isRequired: false },
      ]);

      assert.ok(result.includes('userName = input.required<unknown>()'));
      assert.ok(result.includes('age = input<unknown>()'));
    });

    test('Generate signal inputs with inferred types', () => {
      const result = generateSignalInputs([
        { name: 'userName', isRequired: true, inferredType: 'string' },
        { name: 'count', isRequired: false, inferredType: 'number' },
      ]);

      assert.ok(result.includes('userName = input.required<string>()'));
      assert.ok(result.includes('count = input<number>()'));
    });

    test('Generate signal outputs', () => {
      const result = generateSignalOutputs([
        { name: 'userClick' },
        { name: 'itemSelected' },
      ]);

      assert.ok(result.includes('userClick = output<unknown>()'));
      assert.ok(result.includes('itemSelected = output<unknown>()'));
    });

    test('Generate signal outputs with inferred types', () => {
      const result = generateSignalOutputs([
        { name: 'userClick', inferredType: 'MouseEvent' },
        { name: 'itemSelected', inferredType: 'Item' },
      ]);

      assert.ok(result.includes('userClick = output<MouseEvent>()'));
      assert.ok(result.includes('itemSelected = output<Item>()'));
    });

    test('Generate signal models (model() API)', () => {
      const result = generateSignalModels([
        { name: 'value', isRequired: true },
        { name: 'optionalValue', isRequired: false },
      ]);

      assert.ok(result.includes('value = model.required<unknown>()'));
      assert.ok(result.includes('optionalValue = model<unknown>()'));
    });

    test('Generate signal models with inferred types', () => {
      const result = generateSignalModels([
        { name: 'selectedItem', isRequired: true, inferredType: 'Item' },
        { name: 'filter', isRequired: false, inferredType: 'string' },
      ]);

      assert.ok(result.includes('selectedItem = model.required<Item>()'));
      assert.ok(result.includes('filter = model<string>()'));
    });

    test('Empty inputs return empty string', () => {
      assert.strictEqual(generateSignalInputs([]), '');
      assert.strictEqual(generateSignalOutputs([]), '');
      assert.strictEqual(generateSignalModels([]), '');
    });
  });

  suite('Decorator API Generation (Angular 14-16)', () => {
    test('Generate decorator inputs with required', () => {
      const result = generateDecoratorInputs([
        { name: 'userName', isRequired: true },
      ]);

      assert.ok(result.includes('@Input({required: true}) userName!: unknown'));
    });

    test('Generate decorator inputs with optional', () => {
      const result = generateDecoratorInputs([
        { name: 'age', isRequired: false },
      ]);

      assert.ok(result.includes('@Input() age: unknown'));
      assert.ok(!result.includes('age!:')); // Should not have ! for optional
    });

    test('Generate decorator inputs with inferred types', () => {
      const result = generateDecoratorInputs([
        { name: 'userName', isRequired: true, inferredType: 'string' },
        { name: 'count', isRequired: false, inferredType: 'number' },
      ]);

      assert.ok(result.includes('@Input({required: true}) userName!: string'));
      assert.ok(result.includes('@Input() count: number'));
    });

    test('Generate decorator outputs', () => {
      const result = generateDecoratorOutputs([
        { name: 'userClick' },
        { name: 'itemSelected' },
      ]);

      assert.ok(result.includes('@Output() userClick = new EventEmitter<unknown>()'));
      assert.ok(result.includes('@Output() itemSelected = new EventEmitter<unknown>()'));
    });

    test('Generate decorator outputs with inferred types', () => {
      const result = generateDecoratorOutputs([
        { name: 'userClick', inferredType: 'MouseEvent' },
        { name: 'itemSelected', inferredType: 'Item' },
      ]);

      assert.ok(result.includes('@Output() userClick = new EventEmitter<MouseEvent>()'));
      assert.ok(result.includes('@Output() itemSelected = new EventEmitter<Item>()'));
    });

    test('Generate decorator models (Input + Output combo)', () => {
      const result = generateDecoratorModels([
        { name: 'value', isRequired: true },
      ]);

      assert.ok(result.includes('@Input({required: true}) value!: unknown'));
      assert.ok(result.includes('@Output() valueChange = new EventEmitter<unknown>()'));
    });

    test('Generate decorator models with inferred types', () => {
      const result = generateDecoratorModels([
        { name: 'selectedItem', isRequired: true, inferredType: 'Item' },
      ]);

      assert.ok(result.includes('@Input({required: true}) selectedItem!: Item'));
      assert.ok(result.includes('@Output() selectedItemChange = new EventEmitter<Item>()'));
    });

    test('Empty decorators return empty string', () => {
      assert.strictEqual(generateDecoratorInputs([]), '');
      assert.strictEqual(generateDecoratorOutputs([]), '');
      assert.strictEqual(generateDecoratorModels([]), '');
    });
  });

  suite('Angular Version Parsing', () => {
    test('Parse caret version (^17.2.0)', () => {
      assert.strictEqual(parseAngularVersion('^17.2.0'), 17);
    });

    test('Parse tilde version (~16.1.0)', () => {
      assert.strictEqual(parseAngularVersion('~16.1.0'), 16);
    });

    test('Parse exact version (17.2.0)', () => {
      assert.strictEqual(parseAngularVersion('17.2.0'), 17);
    });

    test('Parse range version (>=17.0.0)', () => {
      assert.strictEqual(parseAngularVersion('>=17.0.0'), 17);
    });

    test('Parse pre-release version (17.0.0-rc.1)', () => {
      assert.strictEqual(parseAngularVersion('17.0.0-rc.1'), 17);
    });

    test('Parse next version (18.0.0-next.5)', () => {
      assert.strictEqual(parseAngularVersion('18.0.0-next.5'), 18);
    });

    test('Parse workspace protocol version (workspace:^17.2.0)', () => {
      assert.strictEqual(parseAngularVersion('workspace:^17.2.0'), 17);
    });

    test('Handle invalid version (null)', () => {
      // @ts-expect-error - testing null handling
      assert.strictEqual(parseAngularVersion(null), null);
    });

    test('Handle empty string', () => {
      assert.strictEqual(parseAngularVersion(''), null);
    });

    test('Handle malformed version', () => {
      assert.strictEqual(parseAngularVersion('invalid'), null);
    });

    test('Handle version below Angular 14', () => {
      // Angular versions below 14 are not supported
      assert.strictEqual(parseAngularVersion('13.0.0'), null);
    });
  });
});
