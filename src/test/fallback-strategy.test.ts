import * as assert from 'assert';
import { FallbackStrategy } from '../type-inference/fallback-strategy';
import { InferredType } from '../type-inference/type-inference-engine';

suite('Fallback Strategy Test Suite', () => {
  let strategy: FallbackStrategy;

  setup(() => {
    strategy = new FallbackStrategy();
  });

  suite('inferFromExpression', () => {
    suite('Boolean Patterns', () => {
      test('should infer boolean for "is" prefix', () => {
        const result = strategy.inferFromExpression('isActive');
        assert.strictEqual(result.type, 'boolean');
        assert.strictEqual(result.confidence, 'medium');
        assert.strictEqual(result.isInferred, true);
      });

      test('should infer boolean for "has" prefix', () => {
        const result = strategy.inferFromExpression('hasPermission');
        assert.strictEqual(result.type, 'boolean');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer boolean for "can" prefix', () => {
        const result = strategy.inferFromExpression('canEdit');
        assert.strictEqual(result.type, 'boolean');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer boolean for "should" prefix', () => {
        const result = strategy.inferFromExpression('shouldDisplay');
        assert.strictEqual(result.type, 'boolean');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer boolean for "Enabled" suffix', () => {
        const result = strategy.inferFromExpression('featureEnabled');
        assert.strictEqual(result.type, 'boolean');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer boolean for "Visible" suffix', () => {
        const result = strategy.inferFromExpression('menuVisible');
        assert.strictEqual(result.type, 'boolean');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer boolean for nested property with "is" prefix', () => {
        const result = strategy.inferFromExpression('user.isAdmin');
        assert.strictEqual(result.type, 'boolean');
        assert.strictEqual(result.confidence, 'medium');
      });
    });

    suite('Number Patterns', () => {
      test('should infer number for ".length" property', () => {
        const result = strategy.inferFromExpression('items.length');
        assert.strictEqual(result.type, 'number');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer number for ".size" property', () => {
        const result = strategy.inferFromExpression('collection.size');
        assert.strictEqual(result.type, 'number');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer number for ".count" property', () => {
        const result = strategy.inferFromExpression('users.count');
        assert.strictEqual(result.type, 'number');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer number for "Index" suffix', () => {
        const result = strategy.inferFromExpression('currentIndex');
        assert.strictEqual(result.type, 'number');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer number for "Total" suffix', () => {
        const result = strategy.inferFromExpression('orderTotal');
        assert.strictEqual(result.type, 'number');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer number for "Price" suffix', () => {
        const result = strategy.inferFromExpression('itemPrice');
        assert.strictEqual(result.type, 'number');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer number for "Quantity" suffix', () => {
        const result = strategy.inferFromExpression('productQuantity');
        assert.strictEqual(result.type, 'number');
        assert.strictEqual(result.confidence, 'medium');
      });
    });

    suite('String Patterns', () => {
      test('should infer string for "Name" suffix', () => {
        const result = strategy.inferFromExpression('userName');
        assert.strictEqual(result.type, 'string');
        assert.strictEqual(result.confidence, 'low');
      });

      test('should infer string for "Title" suffix', () => {
        const result = strategy.inferFromExpression('pageTitle');
        assert.strictEqual(result.type, 'string');
        assert.strictEqual(result.confidence, 'low');
      });

      test('should infer string for "Email" suffix', () => {
        const result = strategy.inferFromExpression('userEmail');
        assert.strictEqual(result.type, 'string');
        assert.strictEqual(result.confidence, 'low');
      });

      test('should infer string for "URL" suffix', () => {
        const result = strategy.inferFromExpression('profileURL');
        assert.strictEqual(result.type, 'string');
        assert.strictEqual(result.confidence, 'low');
      });
    });

    suite('Date Patterns', () => {
      test('should infer Date for "Date" suffix', () => {
        const result = strategy.inferFromExpression('startDate');
        assert.strictEqual(result.type, 'Date');
        assert.strictEqual(result.confidence, 'low');
      });

      test('should infer Date for "CreatedAt" suffix', () => {
        const result = strategy.inferFromExpression('userCreatedAt');
        assert.strictEqual(result.type, 'Date');
        assert.strictEqual(result.confidence, 'medium');
      });

      test('should infer Date for "Timestamp" suffix', () => {
        const result = strategy.inferFromExpression('lastLoginTimestamp');
        assert.strictEqual(result.type, 'Date');
        assert.strictEqual(result.confidence, 'medium');
      });
    });

    suite('Event Patterns', () => {
      test('should infer Event for "$event"', () => {
        const result = strategy.inferFromExpression('$event');
        assert.strictEqual(result.type, 'Event');
        assert.strictEqual(result.confidence, 'medium');
      });
    });

    suite('Unknown Patterns', () => {
      test('should return unknown for unrecognized expression', () => {
        const result = strategy.inferFromExpression('xyz');
        assert.strictEqual(result.type, 'unknown');
        assert.strictEqual(result.confidence, 'low');
        assert.strictEqual(result.isInferred, false);
      });

      test('should return unknown for simple property name', () => {
        const result = strategy.inferFromExpression('data');
        assert.strictEqual(result.type, 'unknown');
        assert.strictEqual(result.confidence, 'low');
      });
    });

    suite('Property Name Override', () => {
      test('should use provided propertyName', () => {
        const result = strategy.inferFromExpression('items.length', 'itemCount');
        assert.strictEqual(result.propertyName, 'itemCount');
        assert.strictEqual(result.type, 'number');
      });

      test('should use expression as propertyName when not provided', () => {
        const result = strategy.inferFromExpression('items.length');
        assert.strictEqual(result.propertyName, 'items.length');
      });
    });
  });

  suite('inferFromLiteral', () => {
    suite('String Literals', () => {
      test('should infer string from single-quoted literal', () => {
        const result = strategy.inferFromLiteral("'hello'", 'greeting');
        assert.ok(result);
        assert.strictEqual(result!.type, 'string');
        assert.strictEqual(result!.confidence, 'high');
        assert.strictEqual(result!.propertyName, 'greeting');
      });

      test('should infer string from double-quoted literal', () => {
        const result = strategy.inferFromLiteral('"world"', 'message');
        assert.ok(result);
        assert.strictEqual(result!.type, 'string');
        assert.strictEqual(result!.confidence, 'high');
      });

      test('should infer string from backtick literal', () => {
        const result = strategy.inferFromLiteral('`template`', 'template');
        assert.ok(result);
        assert.strictEqual(result!.type, 'string');
        assert.strictEqual(result!.confidence, 'high');
      });
    });

    suite('Number Literals', () => {
      test('should infer number from integer', () => {
        const result = strategy.inferFromLiteral('42', 'count');
        assert.ok(result);
        assert.strictEqual(result!.type, 'number');
        assert.strictEqual(result!.confidence, 'high');
      });

      test('should infer number from negative integer', () => {
        const result = strategy.inferFromLiteral('-10', 'offset');
        assert.ok(result);
        assert.strictEqual(result!.type, 'number');
        assert.strictEqual(result!.confidence, 'high');
      });

      test('should infer number from decimal', () => {
        const result = strategy.inferFromLiteral('3.14', 'pi');
        assert.ok(result);
        assert.strictEqual(result!.type, 'number');
        assert.strictEqual(result!.confidence, 'high');
      });

      test('should infer number from negative decimal', () => {
        const result = strategy.inferFromLiteral('-99.99', 'discount');
        assert.ok(result);
        assert.strictEqual(result!.type, 'number');
        assert.strictEqual(result!.confidence, 'high');
      });
    });

    suite('Boolean Literals', () => {
      test('should infer boolean from true', () => {
        const result = strategy.inferFromLiteral('true', 'isActive');
        assert.ok(result);
        assert.strictEqual(result!.type, 'boolean');
        assert.strictEqual(result!.confidence, 'high');
      });

      test('should infer boolean from false', () => {
        const result = strategy.inferFromLiteral('false', 'isDisabled');
        assert.ok(result);
        assert.strictEqual(result!.type, 'boolean');
        assert.strictEqual(result!.confidence, 'high');
      });
    });

    suite('Null and Undefined', () => {
      test('should infer null from null literal', () => {
        const result = strategy.inferFromLiteral('null', 'value');
        assert.ok(result);
        assert.strictEqual(result!.type, 'null');
        assert.strictEqual(result!.confidence, 'high');
      });

      test('should infer undefined from undefined literal', () => {
        const result = strategy.inferFromLiteral('undefined', 'value');
        assert.ok(result);
        assert.strictEqual(result!.type, 'undefined');
        assert.strictEqual(result!.confidence, 'high');
      });
    });

    suite('Non-Literals', () => {
      test('should return null for variable name', () => {
        const result = strategy.inferFromLiteral('myVariable', 'prop');
        assert.strictEqual(result, null);
      });

      test('should return null for property access', () => {
        const result = strategy.inferFromLiteral('user.name', 'prop');
        assert.strictEqual(result, null);
      });

      test('should return null for method call', () => {
        const result = strategy.inferFromLiteral('getValue()', 'prop');
        assert.strictEqual(result, null);
      });
    });
  });

  suite('shouldWarnUser', () => {
    test('should return false for empty map', () => {
      const result = strategy.shouldWarnUser(new Map());
      assert.strictEqual(result, false);
    });

    test('should return false when most are high confidence', () => {
      const types = new Map<string, InferredType>([
        ['prop1', { propertyName: 'prop1', type: 'string', isInferred: true, confidence: 'high' }],
        ['prop2', { propertyName: 'prop2', type: 'number', isInferred: true, confidence: 'high' }],
        ['prop3', { propertyName: 'prop3', type: 'boolean', isInferred: true, confidence: 'medium' }],
      ]);
      const result = strategy.shouldWarnUser(types);
      assert.strictEqual(result, false);
    });

    test('should return true when most are low confidence', () => {
      const types = new Map<string, InferredType>([
        ['prop1', { propertyName: 'prop1', type: 'unknown', isInferred: false, confidence: 'low' }],
        ['prop2', { propertyName: 'prop2', type: 'unknown', isInferred: false, confidence: 'low' }],
        ['prop3', { propertyName: 'prop3', type: 'string', isInferred: true, confidence: 'high' }],
      ]);
      const result = strategy.shouldWarnUser(types);
      assert.strictEqual(result, true);
    });
  });

  suite('generateWarningMessage', () => {
    test('should return null when all high confidence', () => {
      const types = new Map<string, InferredType>([
        ['prop1', { propertyName: 'prop1', type: 'string', isInferred: true, confidence: 'high' }],
      ]);
      const result = strategy.generateWarningMessage(types);
      assert.strictEqual(result, null);
    });

    test('should generate warning for low confidence types', () => {
      const types = new Map<string, InferredType>([
        ['prop1', { propertyName: 'prop1', type: 'unknown', isInferred: false, confidence: 'low' }],
        ['prop2', { propertyName: 'prop2', type: 'unknown', isInferred: false, confidence: 'low' }],
      ]);
      const result = strategy.generateWarningMessage(types);
      assert.ok(result);
      assert.ok(result!.includes('prop1'));
      assert.ok(result!.includes('prop2'));
      assert.ok(result!.includes('low confidence'));
    });

    test('should include not-inferred types in warning', () => {
      const types = new Map<string, InferredType>([
        ['prop1', { propertyName: 'prop1', type: 'string', isInferred: false, confidence: 'medium' }],
      ]);
      const result = strategy.generateWarningMessage(types);
      assert.ok(result);
      assert.ok(result!.includes('prop1'));
    });
  });

  suite('getConfidenceStats', () => {
    test('should return zeros for empty map', () => {
      const stats = strategy.getConfidenceStats(new Map());
      assert.strictEqual(stats.high, 0);
      assert.strictEqual(stats.medium, 0);
      assert.strictEqual(stats.low, 0);
      assert.strictEqual(stats.total, 0);
      assert.strictEqual(stats.successRate, 0);
    });

    test('should count confidence levels correctly', () => {
      const types = new Map<string, InferredType>([
        ['prop1', { propertyName: 'prop1', type: 'string', isInferred: true, confidence: 'high' }],
        ['prop2', { propertyName: 'prop2', type: 'number', isInferred: true, confidence: 'high' }],
        ['prop3', { propertyName: 'prop3', type: 'boolean', isInferred: true, confidence: 'medium' }],
        ['prop4', { propertyName: 'prop4', type: 'unknown', isInferred: false, confidence: 'low' }],
      ]);
      const stats = strategy.getConfidenceStats(types);
      assert.strictEqual(stats.high, 2);
      assert.strictEqual(stats.medium, 1);
      assert.strictEqual(stats.low, 1);
      assert.strictEqual(stats.total, 4);
    });

    test('should calculate success rate correctly', () => {
      const types = new Map<string, InferredType>([
        ['prop1', { propertyName: 'prop1', type: 'string', isInferred: true, confidence: 'high' }],
        ['prop2', { propertyName: 'prop2', type: 'number', isInferred: true, confidence: 'medium' }],
        ['prop3', { propertyName: 'prop3', type: 'unknown', isInferred: false, confidence: 'low' }],
        ['prop4', { propertyName: 'prop4', type: 'unknown', isInferred: false, confidence: 'low' }],
      ]);
      const stats = strategy.getConfidenceStats(types);
      // (2 high + 1 medium) / 4 total = 0.75
      assert.strictEqual(stats.successRate, 0.5);
    });
  });
});
