import * as assert from 'assert';
import {
  generateDecoratorInputs,
  generateSignalInputs,
  generateSignalOutputs,
} from '../signal-generator';

suite('Signal Generator Test Suite', () => {
  test('Generate signal inputs', () => {
    const result = generateSignalInputs([
      { name: 'userName', isRequired: true },
      { name: 'age', isRequired: false },
    ]);

    assert.ok(result.includes('userName = input.required<unknown>()'));
    assert.ok(result.includes('age = input<unknown>()'));
  });

  test('Generate signal outputs', () => {
    const result = generateSignalOutputs([
      { name: 'userClick' },
      { name: 'itemSelected' },
    ]);

    assert.ok(result.includes('userClick = output<unknown>()'));
    assert.ok(result.includes('itemSelected = output<unknown>()'));
  });

  test('Generate decorator inputs', () => {
    const result = generateDecoratorInputs([
      { name: 'userName', isRequired: true },
    ]);

    assert.ok(result.includes('@Input({required: true}) userName!: unknown'));
  });
});
