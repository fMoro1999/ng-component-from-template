import { InferredType } from './type-inference-engine';

/**
 * Pattern definition for heuristic type inference
 */
interface TypePattern {
  /** Pattern to match (can be string or regex) */
  pattern: RegExp;
  /** Type to infer when pattern matches */
  type: string;
  /** Confidence level for this pattern */
  confidence: 'high' | 'medium' | 'low';
  /** Optional description for debugging */
  description?: string;
}

/**
 * Fallback strategy for type inference when AST analysis fails.
 * Uses heuristic patterns to guess types based on naming conventions.
 */
export class FallbackStrategy {
  /**
   * Ordered list of type patterns (more specific patterns first)
   */
  private static readonly TYPE_PATTERNS: TypePattern[] = [
    // High confidence patterns (very specific naming)
    { pattern: /\.length$/i, type: 'number', confidence: 'medium', description: 'Array length property' },
    { pattern: /\.size$/i, type: 'number', confidence: 'medium', description: 'Collection size property' },
    { pattern: /\.count$/i, type: 'number', confidence: 'medium', description: 'Count property' },
    { pattern: /\$event$/i, type: 'Event', confidence: 'medium', description: 'Event binding' },

    // Medium confidence patterns (common conventions)
    { pattern: /^is[A-Z]|\.is[A-Z]/i, type: 'boolean', confidence: 'medium', description: 'Boolean is-prefix' },
    { pattern: /^has[A-Z]|\.has[A-Z]/i, type: 'boolean', confidence: 'medium', description: 'Boolean has-prefix' },
    { pattern: /^can[A-Z]|\.can[A-Z]/i, type: 'boolean', confidence: 'medium', description: 'Boolean can-prefix' },
    { pattern: /^should[A-Z]|\.should[A-Z]/i, type: 'boolean', confidence: 'medium', description: 'Boolean should-prefix' },
    { pattern: /Enabled$|Disabled$/i, type: 'boolean', confidence: 'medium', description: 'Boolean enabled/disabled suffix' },
    { pattern: /Visible$|Hidden$/i, type: 'boolean', confidence: 'medium', description: 'Boolean visibility suffix' },
    { pattern: /Active$|Inactive$/i, type: 'boolean', confidence: 'medium', description: 'Boolean active suffix' },
    { pattern: /Valid$|Invalid$/i, type: 'boolean', confidence: 'medium', description: 'Boolean valid suffix' },
    { pattern: /Loading$|Loaded$/i, type: 'boolean', confidence: 'medium', description: 'Boolean loading suffix' },

    // Number patterns
    { pattern: /Index$|Idx$/i, type: 'number', confidence: 'medium', description: 'Index suffix' },
    { pattern: /Total$/i, type: 'number', confidence: 'medium', description: 'Total suffix' },
    { pattern: /Amount$/i, type: 'number', confidence: 'medium', description: 'Amount suffix' },
    { pattern: /Price$/i, type: 'number', confidence: 'medium', description: 'Price suffix' },
    { pattern: /Quantity$|Qty$/i, type: 'number', confidence: 'medium', description: 'Quantity suffix' },
    { pattern: /Width$|Height$|Size$/i, type: 'number', confidence: 'low', description: 'Dimension suffix' },
    { pattern: /Age$|Year$/i, type: 'number', confidence: 'low', description: 'Age/Year suffix' },

    // String patterns
    { pattern: /Name$/i, type: 'string', confidence: 'low', description: 'Name suffix' },
    { pattern: /Title$/i, type: 'string', confidence: 'low', description: 'Title suffix' },
    { pattern: /Text$/i, type: 'string', confidence: 'low', description: 'Text suffix' },
    { pattern: /Label$/i, type: 'string', confidence: 'low', description: 'Label suffix' },
    { pattern: /Description$/i, type: 'string', confidence: 'low', description: 'Description suffix' },
    { pattern: /Message$/i, type: 'string', confidence: 'low', description: 'Message suffix' },
    { pattern: /Email$/i, type: 'string', confidence: 'low', description: 'Email suffix' },
    { pattern: /Url$|URL$/i, type: 'string', confidence: 'low', description: 'URL suffix' },
    { pattern: /Path$/i, type: 'string', confidence: 'low', description: 'Path suffix' },
    { pattern: /Id$|ID$/i, type: 'string', confidence: 'low', description: 'ID suffix' },

    // Date patterns
    { pattern: /Date$/i, type: 'Date', confidence: 'low', description: 'Date suffix' },
    { pattern: /Time$/i, type: 'Date', confidence: 'low', description: 'Time suffix' },
    { pattern: /CreatedAt$|UpdatedAt$|DeletedAt$/i, type: 'Date', confidence: 'medium', description: 'Timestamp suffix' },
    { pattern: /Timestamp$/i, type: 'Date', confidence: 'medium', description: 'Timestamp suffix' },

    // Array patterns
    { pattern: /List$|Items$|Array$/i, type: 'unknown[]', confidence: 'low', description: 'Array suffix' },
    { pattern: /s$/i, type: 'unknown[]', confidence: 'low', description: 'Plural suffix (may be array)' },
  ];

  /**
   * Determine fallback type based on expression patterns
   */
  inferFromExpression(expression: string, propertyName?: string): InferredType {
    const targetName = propertyName || expression;

    // Try each pattern in order
    for (const { pattern, type, confidence, description } of FallbackStrategy.TYPE_PATTERNS) {
      if (pattern.test(expression)) {
        return {
          propertyName: targetName,
          type,
          isInferred: true,
          confidence,
        };
      }
    }

    // No pattern matched
    return {
      propertyName: targetName,
      type: 'unknown',
      isInferred: false,
      confidence: 'low',
    };
  }

  /**
   * Infer type from literal value in expression
   * Example: "'hello'" -> string, "42" -> number, "true" -> boolean
   */
  inferFromLiteral(expression: string, propertyName: string): InferredType | null {
    const trimmed = expression.trim();

    // String literal
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith('`') && trimmed.endsWith('`'))) {
      return {
        propertyName,
        type: 'string',
        isInferred: true,
        confidence: 'high',
      };
    }

    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return {
        propertyName,
        type: 'number',
        isInferred: true,
        confidence: 'high',
      };
    }

    // Boolean literal
    if (trimmed === 'true' || trimmed === 'false') {
      return {
        propertyName,
        type: 'boolean',
        isInferred: true,
        confidence: 'high',
      };
    }

    // Null/undefined
    if (trimmed === 'null') {
      return {
        propertyName,
        type: 'null',
        isInferred: true,
        confidence: 'high',
      };
    }

    if (trimmed === 'undefined') {
      return {
        propertyName,
        type: 'undefined',
        isInferred: true,
        confidence: 'high',
      };
    }

    return null;
  }

  /**
   * Provide user with type inference confidence feedback
   */
  shouldWarnUser(inferredTypes: Map<string, InferredType>): boolean {
    if (inferredTypes.size === 0) {
      return false;
    }

    const lowConfidenceCount = Array.from(inferredTypes.values())
      .filter(t => t.confidence === 'low').length;

    return lowConfidenceCount > inferredTypes.size * 0.5; // More than 50% low confidence
  }

  /**
   * Generate a detailed warning message for low confidence results
   */
  generateWarningMessage(inferredTypes: Map<string, InferredType>): string | null {
    const lowConfidence = Array.from(inferredTypes.entries())
      .filter(([_, info]) => info.confidence === 'low' || !info.isInferred);

    if (lowConfidence.length === 0) {
      return null;
    }

    const propertyList = lowConfidence
      .map(([name, info]) => `  - ${name}: ${info.type}`)
      .join('\n');

    return `Warning: The following properties have low confidence type inference:\n${propertyList}\n\nConsider reviewing and adjusting these types manually.`;
  }

  /**
   * Get confidence statistics for a set of inferred types
   */
  getConfidenceStats(inferredTypes: Map<string, InferredType>): {
    high: number;
    medium: number;
    low: number;
    total: number;
    successRate: number;
  } {
    const values = Array.from(inferredTypes.values());
    const high = values.filter(t => t.confidence === 'high').length;
    const medium = values.filter(t => t.confidence === 'medium').length;
    const low = values.filter(t => t.confidence === 'low').length;
    const total = values.length;
    const successRate = total > 0 ? (high + medium) / total : 0;

    return { high, medium, low, total, successRate };
  }
}
