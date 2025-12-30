import * as assert from 'assert';
import { generateNgCoreImports } from '../import-generator';

suite('Import Generator Test Suite', () => {
  suite('generateNgCoreImports', () => {
    suite('Signal APIs (Angular 17+)', () => {
      const useSignals = true;

      test('should generate import for inputs only', () => {
        const result = generateNgCoreImports(true, false, false, useSignals);
        assert.ok(result.includes('input'));
        assert.ok(!result.includes('output'));
        assert.ok(!result.includes('model'));
        assert.ok(result.includes('ChangeDetectionStrategy'));
        assert.ok(result.includes('Component'));
      });

      test('should generate import for outputs only', () => {
        const result = generateNgCoreImports(false, true, false, useSignals);
        assert.ok(!result.includes('input'));
        assert.ok(result.includes('output'));
        assert.ok(!result.includes('model'));
      });

      test('should generate import for models only', () => {
        const result = generateNgCoreImports(false, false, true, useSignals);
        assert.ok(!result.includes('input'));
        assert.ok(!result.includes('output'));
        assert.ok(result.includes('model'));
      });

      test('should generate imports for all', () => {
        const result = generateNgCoreImports(true, true, true, useSignals);
        assert.ok(result.includes('input'));
        assert.ok(result.includes('output'));
        assert.ok(result.includes('model'));
      });

      test('should generate minimal imports when no properties', () => {
        const result = generateNgCoreImports(false, false, false, useSignals);
        assert.ok(result.includes('ChangeDetectionStrategy'));
        assert.ok(result.includes('Component'));
        assert.ok(!result.includes('input'));
        assert.ok(!result.includes('output'));
        assert.ok(!result.includes('model'));
      });

      test('should use correct import syntax', () => {
        const result = generateNgCoreImports(true, true, true, useSignals);
        assert.ok(result.startsWith("import {"));
        assert.ok(result.includes("} from '@angular/core';"));
      });
    });

    suite('Decorator APIs (Angular 14-16)', () => {
      const useSignals = false;

      test('should generate import for inputs only', () => {
        const result = generateNgCoreImports(true, false, false, useSignals);
        assert.ok(result.includes('Input'));
        assert.ok(!result.includes('Output'));
        assert.ok(!result.includes('EventEmitter'));
      });

      test('should generate import for outputs only', () => {
        const result = generateNgCoreImports(false, true, false, useSignals);
        assert.ok(!result.includes('Input'));
        assert.ok(result.includes('Output'));
        assert.ok(result.includes('EventEmitter'));
      });

      test('should generate imports for inputs and outputs', () => {
        const result = generateNgCoreImports(true, true, false, useSignals);
        assert.ok(result.includes('Input'));
        assert.ok(result.includes('Output'));
        assert.ok(result.includes('EventEmitter'));
      });

      test('should generate minimal imports when no properties', () => {
        const result = generateNgCoreImports(false, false, false, useSignals);
        assert.ok(result.includes('ChangeDetectionStrategy'));
        assert.ok(result.includes('Component'));
        assert.ok(!result.includes('Input'));
        assert.ok(!result.includes('Output'));
      });

      test('should not include model import for decorators', () => {
        // For decorators, models are just Input + Output combo
        const result = generateNgCoreImports(false, false, true, useSignals);
        // Models should not add extra imports in decorator mode
        assert.ok(!result.includes('model'));
      });

      test('should use correct decorator imports', () => {
        const result = generateNgCoreImports(true, true, false, useSignals);
        // Decorator imports use capital I for Input
        assert.ok(result.includes('Input'));
        // Signal imports use lowercase i for input
        assert.ok(!result.match(/[^a-zA-Z]input[^a-zA-Z]/));
      });
    });

    suite('Edge Cases', () => {
      test('should always include ChangeDetectionStrategy and Component', () => {
        const combinations = [
          [true, true, true, true],
          [true, true, true, false],
          [false, false, false, true],
          [false, false, false, false],
        ];

        for (const [hasInputs, hasOutputs, hasModels, useSignals] of combinations) {
          const result = generateNgCoreImports(
            hasInputs as boolean,
            hasOutputs as boolean,
            hasModels as boolean,
            useSignals as boolean
          );
          assert.ok(
            result.includes('ChangeDetectionStrategy'),
            `Missing ChangeDetectionStrategy for ${JSON.stringify(combinations)}`
          );
          assert.ok(
            result.includes('Component'),
            `Missing Component for ${JSON.stringify(combinations)}`
          );
        }
      });

      test('should not have duplicate imports', () => {
        const result = generateNgCoreImports(true, true, true, true);
        const componentMatches = result.match(/Component/g);
        assert.strictEqual(componentMatches?.length, 1);
      });

      test('should format imports correctly with commas', () => {
        const result = generateNgCoreImports(true, true, false, true);
        // Check that imports are comma-separated
        assert.ok(result.includes(', '));
      });
    });
  });
});
