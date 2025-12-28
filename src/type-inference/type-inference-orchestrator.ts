import { BindingParser } from './binding-parser';
import { TypeInferenceEngine } from './type-inference-engine';

export interface SignalInput {
  name: string;
  isRequired: boolean;
  inferredType?: string;
}

export interface SignalOutput {
  name: string;
  inferredType?: string;
}

export class TypeInferenceOrchestrator {
  private engine: TypeInferenceEngine;
  private parser: BindingParser;

  constructor() {
    this.engine = new TypeInferenceEngine();
    this.parser = new BindingParser();
  }

  /**
   * Enrich properties with types given a parent file path
   */
  async enrichPropertiesWithTypesFromFileAsync(
    template: string,
    inputNames: string[],
    outputNames: string[],
    parentTsFilePath: string
  ): Promise<{
    inputs: SignalInput[];
    outputs: SignalOutput[];
  }> {
    try {
      // Parse template to get binding expressions
      const bindings = this.parser.parseTemplate(template);
      const bindingMap = this.parser.createBindingMap(bindings);

      // Infer types
      const inferredTypes = await this.engine.inferTypesAsync({
        parentTsFilePath,
        templateBindings: bindingMap,
      });

      // Enrich inputs with inferred types
      const enrichedInputs: SignalInput[] = inputNames.map((name) => ({
        name,
        isRequired: true,
        inferredType: inferredTypes.get(name)?.type || 'unknown',
      }));

      // Enrich outputs with inferred types
      const enrichedOutputs: SignalOutput[] = outputNames.map((name) => ({
        name,
        inferredType: inferredTypes.get(name)?.type || 'unknown',
      }));

      return {
        inputs: enrichedInputs,
        outputs: enrichedOutputs,
      };
    } catch (error) {
      console.error('Type inference orchestration failed:', error);

      // Fallback: return properties without inferred types
      return {
        inputs: inputNames.map((name) => ({ name, isRequired: true })),
        outputs: outputNames.map((name) => ({ name })),
      };
    }
  }
}
