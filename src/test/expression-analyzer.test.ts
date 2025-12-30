import * as assert from 'assert';
import { Project } from 'ts-morph';
import { ExpressionAnalyzer } from '../type-inference/expression-analyzer';

suite('Expression Analyzer Test Suite', () => {
  let analyzer: ExpressionAnalyzer;
  let project: Project;

  setup(() => {
    analyzer = new ExpressionAnalyzer();
    project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // ScriptTarget.Latest
      },
    });
  });

  suite('isComplexExpression', () => {
    test('should detect ternary expression', () => {
      assert.strictEqual(analyzer.isComplexExpression('a ? b : c'), true);
    });

    test('should detect array access', () => {
      assert.strictEqual(analyzer.isComplexExpression('items[0]'), true);
    });

    test('should detect method call', () => {
      assert.strictEqual(analyzer.isComplexExpression('getValue()'), true);
    });

    test('should detect pipe expression', () => {
      assert.strictEqual(analyzer.isComplexExpression('value | async'), true);
    });

    test('should detect logical operators', () => {
      assert.strictEqual(analyzer.isComplexExpression('a && b'), true);
      assert.strictEqual(analyzer.isComplexExpression('a || b'), true);
    });

    test('should detect arithmetic operators', () => {
      assert.strictEqual(analyzer.isComplexExpression('a + b'), true);
      assert.strictEqual(analyzer.isComplexExpression('a - b'), true);
      assert.strictEqual(analyzer.isComplexExpression('a * b'), true);
      assert.strictEqual(analyzer.isComplexExpression('a / b'), true);
    });

    test('should detect comparison operators', () => {
      assert.strictEqual(analyzer.isComplexExpression('a > b'), true);
      assert.strictEqual(analyzer.isComplexExpression('a === b'), true);
      assert.strictEqual(analyzer.isComplexExpression('a !== b'), true);
    });

    test('should return false for simple property access', () => {
      assert.strictEqual(analyzer.isComplexExpression('user.name'), false);
    });

    test('should return false for simple identifier', () => {
      assert.strictEqual(analyzer.isComplexExpression('value'), false);
    });
  });

  suite('analyzeExpression', () => {
    test('should return unknown for simple identifier', () => {
      const sourceFile = project.createSourceFile(
        'test.ts',
        `export class TestComponent { value = 'test'; }`
      );
      const result = analyzer.analyzeExpression('value', sourceFile);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.confidence, 'low');
      assert.strictEqual(result.isComplex, false);
    });

    test('should detect pipe expression', () => {
      const sourceFile = project.createSourceFile(
        'pipe-test.ts',
        `export class TestComponent { data$ = 'test'; }`
      );
      const result = analyzer.analyzeExpression('data$ | async', sourceFile);
      assert.strictEqual(result.isComplex, true);
    });

    test('should detect ternary expression', () => {
      const sourceFile = project.createSourceFile(
        'ternary-test.ts',
        `export class TestComponent { show = true; }`
      );
      const result = analyzer.analyzeExpression('show ? "yes" : "no"', sourceFile);
      assert.strictEqual(result.isComplex, true);
    });

    test('should detect array access', () => {
      const sourceFile = project.createSourceFile(
        'array-test.ts',
        `export class TestComponent { items: string[] = []; }`
      );
      const result = analyzer.analyzeExpression('items[0]', sourceFile);
      assert.strictEqual(result.isComplex, true);
    });

    test('should detect method call', () => {
      const sourceFile = project.createSourceFile(
        'method-test.ts',
        `export class TestComponent { getValue(): string { return 'test'; } }`
      );
      const result = analyzer.analyzeExpression('getValue()', sourceFile);
      assert.strictEqual(result.isComplex, true);
    });
  });

  suite('analyzeTernary', () => {
    test('should infer string type from both branches', () => {
      const sourceFile = project.createSourceFile(
        'ternary1.ts',
        `export class TestComponent { show = true; }`
      );
      const result = analyzer.analyzeTernary('show ? "yes" : "no"', sourceFile);
      assert.strictEqual(result.type, 'string');
      assert.strictEqual(result.confidence, 'medium');
      assert.strictEqual(result.isComplex, true);
    });

    test('should infer number type from both branches', () => {
      const sourceFile = project.createSourceFile(
        'ternary2.ts',
        `export class TestComponent { show = true; }`
      );
      const result = analyzer.analyzeTernary('show ? 1 : 0', sourceFile);
      assert.strictEqual(result.type, 'number');
      assert.strictEqual(result.confidence, 'medium');
    });

    test('should infer boolean type from both branches', () => {
      const sourceFile = project.createSourceFile(
        'ternary3.ts',
        `export class TestComponent { show = true; }`
      );
      const result = analyzer.analyzeTernary('show ? true : false', sourceFile);
      assert.strictEqual(result.type, 'boolean');
      assert.strictEqual(result.confidence, 'medium');
    });

    test('should infer union type for different branches', () => {
      const sourceFile = project.createSourceFile(
        'ternary4.ts',
        `export class TestComponent { show = true; }`
      );
      const result = analyzer.analyzeTernary('show ? "text" : 42', sourceFile);
      assert.ok(result.type.includes('string'));
      assert.ok(result.type.includes('number'));
      assert.strictEqual(result.confidence, 'medium');
    });

    test('should return unknown for invalid ternary', () => {
      const sourceFile = project.createSourceFile(
        'ternary5.ts',
        `export class TestComponent { show = true; }`
      );
      const result = analyzer.analyzeTernary('invalid expression', sourceFile);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.confidence, 'low');
    });
  });

  suite('analyzeArrayAccess', () => {
    test('should infer element type from array', () => {
      const sourceFile = project.createSourceFile(
        'array1.ts',
        `export class TestComponent { items: string[] = ['a', 'b', 'c']; }`
      );
      const result = analyzer.analyzeArrayAccess('items[0]', sourceFile);
      assert.strictEqual(result.type, 'string');
      assert.strictEqual(result.confidence, 'medium');
      assert.strictEqual(result.baseExpression, 'items');
      assert.strictEqual(result.isComplex, true);
    });

    test('should return unknown for invalid array access', () => {
      const sourceFile = project.createSourceFile(
        'array2.ts',
        `export class TestComponent { items: string[] = []; }`
      );
      const result = analyzer.analyzeArrayAccess('invalid', sourceFile);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.confidence, 'low');
    });

    test('should handle nested property access after array access', () => {
      const sourceFile = project.createSourceFile(
        'array3.ts',
        `interface User { name: string; }
         export class TestComponent { users: User[] = []; }`
      );
      const result = analyzer.analyzeArrayAccess('users[0].name', sourceFile);
      assert.strictEqual(result.isComplex, true);
      assert.strictEqual(result.baseExpression, 'users');
    });

    test('should return unknown when array not found', () => {
      const sourceFile = project.createSourceFile(
        'array4.ts',
        `export class TestComponent { }`
      );
      const result = analyzer.analyzeArrayAccess('nonexistent[0]', sourceFile);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.confidence, 'low');
    });
  });

  suite('analyzeMethodChain', () => {
    test('should infer return type from method', () => {
      const sourceFile = project.createSourceFile(
        'method1.ts',
        `export class TestComponent {
          getValue(): string { return 'test'; }
        }`
      );
      const result = analyzer.analyzeMethodChain('getValue()', sourceFile);
      assert.strictEqual(result.type, 'string');
      assert.strictEqual(result.confidence, 'medium');
      assert.strictEqual(result.baseExpression, 'getValue');
    });

    test('should return unknown for non-existent method', () => {
      const sourceFile = project.createSourceFile(
        'method2.ts',
        `export class TestComponent { }`
      );
      const result = analyzer.analyzeMethodChain('nonexistent()', sourceFile);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.confidence, 'low');
    });

    test('should handle method with property access after', () => {
      const sourceFile = project.createSourceFile(
        'method3.ts',
        `interface User { name: string; }
         export class TestComponent {
          getUser(): User { return { name: 'test' }; }
        }`
      );
      const result = analyzer.analyzeMethodChain('getUser().name', sourceFile);
      // Cannot resolve property access after method call
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.confidence, 'low');
    });

    test('should return unknown for invalid method expression', () => {
      const sourceFile = project.createSourceFile(
        'method4.ts',
        `export class TestComponent { }`
      );
      const result = analyzer.analyzeMethodChain('123', sourceFile);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.confidence, 'low');
    });
  });

  suite('analyzePipeExpression', () => {
    test('should handle async pipe', () => {
      const sourceFile = project.createSourceFile(
        'pipe1.ts',
        `export class TestComponent { data$ = 'test'; }`
      );
      const result = analyzer.analyzePipeExpression('data$ | async', sourceFile);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.baseExpression, 'data$');
      assert.strictEqual(result.isComplex, true);
    });

    test('should return string for date pipe', () => {
      const sourceFile = project.createSourceFile(
        'pipe2.ts',
        `export class TestComponent { date = new Date(); }`
      );
      const result = analyzer.analyzePipeExpression('date | date', sourceFile);
      assert.strictEqual(result.type, 'string');
      assert.strictEqual(result.confidence, 'medium');
    });

    test('should return string for uppercase pipe', () => {
      const sourceFile = project.createSourceFile(
        'pipe3.ts',
        `export class TestComponent { text = 'hello'; }`
      );
      const result = analyzer.analyzePipeExpression('text | uppercase', sourceFile);
      assert.strictEqual(result.type, 'string');
      assert.strictEqual(result.confidence, 'medium');
    });

    test('should return string for lowercase pipe', () => {
      const sourceFile = project.createSourceFile(
        'pipe4.ts',
        `export class TestComponent { text = 'HELLO'; }`
      );
      const result = analyzer.analyzePipeExpression('text | lowercase', sourceFile);
      assert.strictEqual(result.type, 'string');
      assert.strictEqual(result.confidence, 'medium');
    });

    test('should return string for currency pipe', () => {
      const sourceFile = project.createSourceFile(
        'pipe5.ts',
        `export class TestComponent { price = 99.99; }`
      );
      const result = analyzer.analyzePipeExpression('price | currency', sourceFile);
      assert.strictEqual(result.type, 'string');
      assert.strictEqual(result.confidence, 'medium');
    });

    test('should return string for json pipe', () => {
      const sourceFile = project.createSourceFile(
        'pipe6.ts',
        `export class TestComponent { data = {}; }`
      );
      const result = analyzer.analyzePipeExpression('data | json', sourceFile);
      assert.strictEqual(result.type, 'string');
      assert.strictEqual(result.confidence, 'medium');
    });

    test('should handle pipe with parameters', () => {
      const sourceFile = project.createSourceFile(
        'pipe7.ts',
        `export class TestComponent { date = new Date(); }`
      );
      const result = analyzer.analyzePipeExpression('date | date:"short"', sourceFile);
      assert.strictEqual(result.type, 'string');
    });

    test('should return unknown for custom pipe', () => {
      const sourceFile = project.createSourceFile(
        'pipe8.ts',
        `export class TestComponent { value = 'test'; }`
      );
      const result = analyzer.analyzePipeExpression('value | customPipe', sourceFile);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.confidence, 'low');
    });

    test('should handle chained pipes', () => {
      const sourceFile = project.createSourceFile(
        'pipe9.ts',
        `export class TestComponent { text = 'hello'; }`
      );
      const result = analyzer.analyzePipeExpression('text | uppercase | slice:0:3', sourceFile);
      // Returns type of first recognized pipe
      assert.strictEqual(result.type, 'string');
    });
  });

  suite('Edge Cases', () => {
    test('should handle empty string', () => {
      const sourceFile = project.createSourceFile(
        'empty.ts',
        `export class TestComponent { }`
      );
      const result = analyzer.analyzeExpression('', sourceFile);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.confidence, 'low');
    });

    test('should handle whitespace only', () => {
      const sourceFile = project.createSourceFile(
        'whitespace.ts',
        `export class TestComponent { }`
      );
      const result = analyzer.analyzeExpression('   ', sourceFile);
      assert.strictEqual(result.type, 'unknown');
    });

    test('should handle deeply nested expression', () => {
      const sourceFile = project.createSourceFile(
        'nested.ts',
        `export class TestComponent { items: string[][] = []; }`
      );
      const result = analyzer.analyzeExpression('items[0][1]', sourceFile);
      assert.strictEqual(result.isComplex, true);
    });

    test('should handle expression with both pipe and ternary', () => {
      const sourceFile = project.createSourceFile(
        'complex.ts',
        `export class TestComponent { show = true; }`
      );
      // Pipe takes precedence in detection
      const result = analyzer.analyzeExpression('show ? "yes" : "no" | uppercase', sourceFile);
      assert.strictEqual(result.isComplex, true);
    });
  });
});
