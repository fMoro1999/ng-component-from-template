/**
 * Template Generators Module
 *
 * Contains functions for generating Angular component templates and TypeScript code:
 * - Component TypeScript file generation
 * - Input/Output property stringification
 */

import { Project } from 'ts-morph';
import { shouldUseSignalApisAsync } from './angular-version-detector';
import { getExtensionConfig } from './config';
import { generateNgCoreImports } from './import-generator';
import {
  generateDecoratorInputs,
  generateDecoratorModels,
  generateDecoratorOutputs,
  generateSignalInputs,
  generateSignalModels,
  generateSignalOutputs,
} from './signal-generator';
import { toComponentClassName, uniquesOf } from './string-utilities';
import {
  DependencyImportGenerator,
  TemplateDependencyAnalyzer,
} from './template-dependency';
import {
  ImportManager,
  SignalInput,
  SignalModel,
  SignalOutput,
  TypeInferrer,
} from './type-inference';
import { getHighlightedTextPathAsync } from './ui-interactions';

/**
 * Generates TypeScript content for a new Angular component
 */
export const createComponentTsAsync = async ({
  dasherizedComponentName,
  bindingProperties,
  template,
  project,
  parentFilePath,
  inferredInputs,
  inferredOutputs,
  inferredModels,
  customTypeImports: providedCustomTypeImports,
}: {
  dasherizedComponentName: string;
  bindingProperties: Map<'inputs' | 'outputs' | 'models', string[]>;
  template: string;
  project?: Project;
  parentFilePath?: string;
  inferredInputs?: SignalInput[];
  inferredOutputs?: SignalOutput[];
  inferredModels?: SignalModel[];
  customTypeImports?: string;
}): Promise<string> => {
  const component = toComponentClassName(dasherizedComponentName);

  const config = getExtensionConfig();
  const useSignals = await shouldUseSignalApisAsync(
    config.useSignalApis,
    config.detectAngularVersion,
    config.minimumAngularVersion
  );

  const inputProps = bindingProperties.get('inputs') || [];
  const outputProps = bindingProperties.get('outputs') || [];
  const modelProps = bindingProperties.get('models') || [];

  // Template dependency analysis - conditionally applied based on ALS setting
  let dependencyImports = '';
  let dependencyImportsArray = '[]';

  if (!config.useAngularLanguageService) {
    // Fallback mode: use built-in template dependency detection
    const dependencyAnalyzer = new TemplateDependencyAnalyzer();
    const templateDependencies = dependencyAnalyzer.analyze(template);
    const importGenerator = new DependencyImportGenerator();
    dependencyImports =
      importGenerator.generateImports(templateDependencies);
    dependencyImportsArray =
      importGenerator.generateImportsArray(templateDependencies);
  }
  // When ALS is enabled, we generate empty imports: []
  // The ALS integration will populate them via quick fixes after generation

  // Type inference - CONDITIONALLY applied
  let signalInputs: SignalInput[];
  let signalOutputs: SignalOutput[];
  let signalModels: SignalModel[];
  let customTypeImports: string = '';

  // If types already provided, use them (skip inference)
  if (inferredInputs && inferredOutputs && inferredModels) {
    signalInputs = inferredInputs;
    signalOutputs = inferredOutputs;
    signalModels = inferredModels;
    customTypeImports = providedCustomTypeImports || '';
  } else {
    // Otherwise, perform type inference (current logic)
    try {
      const orchestrator = new TypeInferrer(undefined, project);

      // Get parent file path from parameter or editor
      const parentPath = parentFilePath || getHighlightedTextPathAsync();
      const parentTsPath = parentPath ? parentPath.replace('.html', '.ts') : '';

      // Only attempt type inference if we have a valid file path
      if (!parentTsPath) {
        throw new Error('No parent file path available for type inference');
      }

      const enriched = await orchestrator.enrichPropertiesWithTypesFromFileAsync(
        template,
        inputProps,
        outputProps,
        modelProps,
        parentTsPath
      );

      signalInputs = enriched.inputs;
      signalOutputs = enriched.outputs;
      signalModels = enriched.models;

      // Generate import statements for custom types
      if (enriched.imports && enriched.imports.length > 0) {
        const importManager = new ImportManager();
        customTypeImports = importManager.generateImportStatements(
          enriched.imports
        );
      }
    } catch (error) {
      // Silently fall back to unknown types (error is expected during tests)
      // Fallback to unknown types
      signalInputs = inputProps.map((name) => ({
        name,
        isRequired: true,
      }));
      signalOutputs = outputProps.map((name) => ({ name }));
      signalModels = modelProps.map((name) => ({
        name,
        isRequired: true,
      }));
    }
  }

  const hasAnyInput = signalInputs.length > 0;
  const hasAnyOutput = signalOutputs.length > 0;
  const hasAnyModel = signalModels.length > 0;

  const imports = generateNgCoreImports(
    hasAnyInput,
    hasAnyOutput,
    hasAnyModel,
    useSignals
  );

  let inputs = '';
  let outputs = '';
  let models = '';

  if (useSignals) {
    inputs = generateSignalInputs(signalInputs);
    outputs = generateSignalOutputs(signalOutputs);
    models = generateSignalModels(signalModels);
  } else {
    inputs = generateDecoratorInputs(signalInputs);
    outputs = generateDecoratorOutputs(signalOutputs);
    models = generateDecoratorModels(signalModels);
  }

  // Use configured change detection strategy
  const changeDetection = config.changeDetectionStrategy;

  return `
  ${imports}
  ${customTypeImports}
  ${dependencyImports}

  @Component({
    standalone: true,
    imports: ${dependencyImportsArray},
    selector: '${dasherizedComponentName}',
    templateUrl: './${dasherizedComponentName}.component.html',
    styleUrls: ['./${dasherizedComponentName}.component.scss'],
    changeDetection: ChangeDetectionStrategy.${changeDetection},
  })
  export class ${component} {
    ${inputs}

    ${outputs}

    ${models}
  }
  `.trim();
};

/**
 * Converts output properties to decorator format string
 */
export const stringifyOutputProps = (outputsProperties: string[]): string =>
  uniquesOf(outputsProperties).reduce(
    (accumulator, current) =>
      accumulator + `@Output() ${current} = new EventEmitter<unknown>();\n\t\t`,
    '// Outputs\n\t\t'
  ) ?? '';

/**
 * Converts input properties to decorator format string
 */
export const stringifyInputProps = (inputsProperties: string[]): string =>
  uniquesOf(inputsProperties).reduce(
    (accumulator, current) =>
      accumulator + `@Input({required: true}) ${current}!: unknown;\n\t\t`,
    '// Inputs\n\t\t'
  ) ?? '';
