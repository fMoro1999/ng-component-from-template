import { SourceFile, ClassDeclaration } from 'ts-morph';

/**
 * Result of expression analysis
 */
export interface ExpressionAnalysisResult {
  type: string;
  confidence: 'high' | 'medium' | 'low';
  baseExpression?: string;
  isComplex: boolean;
}

/**
 * Analyze complex template expressions to determine types.
 * Handles ternary expressions, array access, method chains, and pipes.
 */
export class ExpressionAnalyzer {
  /**
   * Analyze an expression and return its type information
   */
  analyzeExpression(expression: string, sourceFile: SourceFile): ExpressionAnalysisResult {
    const trimmed = expression.trim();

    // Check for pipe expressions first
    if (trimmed.includes('|')) {
      return this.analyzePipeExpression(trimmed, sourceFile);
    }

    // Check for ternary expression
    if (trimmed.includes('?') && trimmed.includes(':')) {
      return this.analyzeTernary(trimmed, sourceFile);
    }

    // Check for array access
    if (trimmed.includes('[') && trimmed.includes(']')) {
      return this.analyzeArrayAccess(trimmed, sourceFile);
    }

    // Check for method chain
    if (trimmed.includes('()')) {
      return this.analyzeMethodChain(trimmed, sourceFile);
    }

    // Simple property access or identifier
    return {
      type: 'unknown',
      confidence: 'low',
      isComplex: false,
    };
  }

  /**
   * Analyze ternary expressions: condition ? trueValue : falseValue
   * Attempts to determine the common type of both branches
   */
  analyzeTernary(expression: string, sourceFile: SourceFile): ExpressionAnalysisResult {
    // Match ternary pattern: condition ? trueValue : falseValue
    const ternaryMatch = expression.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
    if (!ternaryMatch) {
      return {
        type: 'unknown',
        confidence: 'low',
        isComplex: true,
      };
    }

    const [, _condition, trueExpr, falseExpr] = ternaryMatch;

    // Try to infer types from literal values
    const trueType = this.inferLiteralType(trueExpr.trim());
    const falseType = this.inferLiteralType(falseExpr.trim());

    if (trueType && falseType) {
      if (trueType === falseType) {
        return {
          type: trueType,
          confidence: 'medium',
          baseExpression: expression,
          isComplex: true,
        };
      }
      // Union type
      return {
        type: `${trueType} | ${falseType}`,
        confidence: 'medium',
        baseExpression: expression,
        isComplex: true,
      };
    }

    if (trueType) {
      return {
        type: trueType,
        confidence: 'low',
        baseExpression: trueExpr.trim(),
        isComplex: true,
      };
    }

    return {
      type: 'unknown',
      confidence: 'low',
      baseExpression: expression,
      isComplex: true,
    };
  }

  /**
   * Analyze array access: items[0], items[index]
   * Returns the base expression for further type analysis
   */
  analyzeArrayAccess(expression: string, sourceFile: SourceFile): ExpressionAnalysisResult {
    // Match array access pattern
    const arrayMatch = expression.match(/^([^[]+)\[([^\]]+)\](.*)$/);
    if (!arrayMatch) {
      return {
        type: 'unknown',
        confidence: 'low',
        isComplex: true,
      };
    }

    const [, arrayExpr, _indexExpr, rest] = arrayMatch;
    const baseExpression = arrayExpr.trim();

    // If there's more after the array access (e.g., users[0].name)
    if (rest && rest.startsWith('.')) {
      return {
        type: 'unknown',
        confidence: 'low',
        baseExpression: baseExpression,
        isComplex: true,
      };
    }

    // Try to find the array type in the source file
    const classDeclaration = sourceFile.getClasses()[0];
    if (classDeclaration) {
      const arrayType = this.findPropertyType(classDeclaration, baseExpression);
      if (arrayType && arrayType.endsWith('[]')) {
        // Extract element type
        const elementType = arrayType.slice(0, -2);
        return {
          type: elementType,
          confidence: 'medium',
          baseExpression,
          isComplex: true,
        };
      }
    }

    return {
      type: 'unknown',
      confidence: 'low',
      baseExpression,
      isComplex: true,
    };
  }

  /**
   * Analyze method chain: getUser().name, calculate(x).result
   */
  analyzeMethodChain(expression: string, sourceFile: SourceFile): ExpressionAnalysisResult {
    // Extract the method name (first part before parentheses)
    const methodMatch = expression.match(/^(\w+)\(/);
    if (!methodMatch) {
      return {
        type: 'unknown',
        confidence: 'low',
        isComplex: true,
      };
    }

    const methodName = methodMatch[1];
    const classDeclaration = sourceFile.getClasses()[0];

    if (classDeclaration) {
      const method = classDeclaration.getMethod(methodName);
      if (method) {
        const returnType = method.getReturnType();
        const typeText = this.simplifyTypeText(returnType.getText());

        // If there's more property access after the method call
        if (expression.includes(').')) {
          return {
            type: 'unknown',
            confidence: 'low',
            baseExpression: methodName,
            isComplex: true,
          };
        }

        return {
          type: typeText,
          confidence: 'medium',
          baseExpression: methodName,
          isComplex: true,
        };
      }
    }

    return {
      type: 'unknown',
      confidence: 'low',
      baseExpression: methodName,
      isComplex: true,
    };
  }

  /**
   * Analyze pipe expressions: date | date:'short', value | async
   * Returns the base expression that should be analyzed for type
   */
  analyzePipeExpression(expression: string, sourceFile: SourceFile): ExpressionAnalysisResult {
    const parts = expression.split('|');
    const baseExpression = parts[0].trim();
    const pipes = parts.slice(1).map(p => p.trim().split(':')[0].trim());

    // Handle async pipe specially
    if (pipes.includes('async')) {
      return {
        type: 'unknown', // Would need Observable<T> unwrapping
        confidence: 'low',
        baseExpression,
        isComplex: true,
      };
    }

    // Common pipe type transformations
    const pipeTypes: Record<string, string> = {
      date: 'string',
      uppercase: 'string',
      lowercase: 'string',
      titlecase: 'string',
      currency: 'string',
      percent: 'string',
      number: 'string',
      json: 'string',
      slice: 'unknown[]',
      keyvalue: 'unknown[]',
    };

    // Check if any pipe transforms the output to a known type
    for (const pipe of pipes) {
      if (pipe in pipeTypes) {
        return {
          type: pipeTypes[pipe],
          confidence: 'medium',
          baseExpression,
          isComplex: true,
        };
      }
    }

    return {
      type: 'unknown',
      confidence: 'low',
      baseExpression,
      isComplex: true,
    };
  }

  /**
   * Infer type from literal value
   */
  private inferLiteralType(value: string): string | null {
    const trimmed = value.trim();

    // String literal
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return 'string';
    }

    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return 'number';
    }

    // Boolean literal
    if (trimmed === 'true' || trimmed === 'false') {
      return 'boolean';
    }

    // Null
    if (trimmed === 'null') {
      return 'null';
    }

    // Undefined
    if (trimmed === 'undefined') {
      return 'undefined';
    }

    return null;
  }

  /**
   * Find property type in a class declaration
   */
  private findPropertyType(classDecl: ClassDeclaration, propertyPath: string): string | null {
    const parts = propertyPath.split('.');
    const property = classDecl.getProperty(parts[0]);

    if (!property) {
      return null;
    }

    const typeNode = property.getTypeNode();
    if (typeNode) {
      return this.simplifyTypeText(typeNode.getText());
    }

    return this.simplifyTypeText(property.getType().getText());
  }

  /**
   * Simplify type text by removing import paths
   */
  private simplifyTypeText(typeText: string): string {
    return typeText.replace(/import\([^)]+\)\./g, '');
  }

  /**
   * Check if an expression is complex (contains operators, method calls, etc.)
   */
  isComplexExpression(expression: string): boolean {
    const complexPatterns = [
      /\s*\?\s*.*\s*:\s*/,  // Ternary
      /\[.*\]/,             // Array access
      /\(\)/,               // Method call
      /\|/,                 // Pipe
      /&&|\|\|/,            // Logical operators
      /[+\-*/%]/,           // Arithmetic operators
      /[<>=!]+/,            // Comparison operators
    ];

    return complexPatterns.some(pattern => pattern.test(expression));
  }
}
