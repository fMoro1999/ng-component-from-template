import { InferredType } from './type-inference-engine';

export class FallbackStrategy {
  /**
   * Determine fallback type based on expression patterns
   */
  inferFromExpression(expression: string): InferredType {
    // Heuristic-based type inference
    if (expression.includes('length') || expression.includes('count')) {
      return {
        propertyName: expression,
        type: 'number',
        isInferred: true,
        confidence: 'medium',
      };
    }

    if (expression.includes('name') || expression.includes('title') || expression.includes('text')) {
      return {
        propertyName: expression,
        type: 'string',
        isInferred: true,
        confidence: 'low',
      };
    }

    if (expression.includes('is') || expression.includes('has') || expression.includes('enabled')) {
      return {
        propertyName: expression,
        type: 'boolean',
        isInferred: true,
        confidence: 'low',
      };
    }

    if (expression.includes('Date') || expression.includes('date')) {
      return {
        propertyName: expression,
        type: 'Date',
        isInferred: true,
        confidence: 'low',
      };
    }

    return {
      propertyName: expression,
      type: 'unknown',
      isInferred: false,
      confidence: 'low',
    };
  }

  /**
   * Provide user with type inference confidence feedback
   */
  shouldWarnUser(inferredTypes: Map<string, InferredType>): boolean {
    const lowConfidenceCount = Array.from(inferredTypes.values())
      .filter(t => t.confidence === 'low').length;

    return lowConfidenceCount > inferredTypes.size * 0.5; // More than 50% low confidence
  }
}
