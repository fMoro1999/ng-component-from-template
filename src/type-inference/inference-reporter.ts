import { InferredType } from './type-inference-engine';

export class InferenceReporter {
  /**
   * Report type inference results to user
   */
  async reportResults(inferredTypes: Map<string, InferredType>): Promise<string> {
    const total = inferredTypes.size;
    const inferred = Array.from(inferredTypes.values()).filter(t => t.isInferred).length;
    const high = Array.from(inferredTypes.values()).filter(t => t.confidence === 'high').length;

    if (inferred === 0) {
      return 'Could not infer any types. All properties will use "unknown" type.';
    }

    if (high === total) {
      return 'Successfully inferred all ' + total + ' types with high confidence!';
    } else if (inferred === total) {
      return 'Inferred ' + inferred + '/' + total + ' types (' + high + ' with high confidence)';
    } else {
      return 'Inferred ' + inferred + '/' + total + ' types. ' + (total - inferred) + ' remain as "unknown".';
    }
  }

  /**
   * Generate a detailed report for debugging
   */
  generateDetailedReport(inferredTypes: Map<string, InferredType>): string {
    const lines: string[] = ['Type Inference Report:', ''];

    for (const [name, info] of inferredTypes) {
      const status = info.isInferred ? '✓' : '✗';
      const confidence = info.confidence.toUpperCase();
      lines.push(status + ' ' + name + ': ' + info.type + ' [' + confidence + ']');
    }

    return lines.join('\n');
  }
}
