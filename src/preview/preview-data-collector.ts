import * as path from 'path';
import { TemplateDependencyAnalyzer } from '../template-dependency/template-dependency-analyzer';
import { DependencyImportGenerator } from '../template-dependency/import-generator';
import { TypeInferrer } from '../type-inference/type-inferrer';
import { createComponentTsAsync } from '../utils';

export interface PropertyPreview {
  name: string;
  type: string;
  isRequired?: boolean;
  inferenceConfidence: 'high' | 'medium' | 'low';
  enabled: boolean;
}

export interface FilePreview {
  path: string;
  content: string;
  language: 'typescript' | 'html' | 'scss';
}

export interface FileModification {
  path: string;
  before: string;
  after: string;
}

export interface PreviewData {
  componentName: string;
  template: string;
  inputs: PropertyPreview[];
  outputs: PropertyPreview[];
  models: PropertyPreview[];
  imports: string[];
  filesToCreate: FilePreview[];
  filesToModify: FileModification[];
}

export interface CollectOptions {
  componentName: string;
  template: string;
  bindingProperties: Map<'inputs' | 'outputs' | 'models', string[]>;
  parentFilePath: string;
}

export class PreviewDataCollector {
  private templateDependencyAnalyzer: TemplateDependencyAnalyzer;
  private dependencyImportGenerator: DependencyImportGenerator;
  private typeInferrer: TypeInferrer;

  constructor() {
    this.templateDependencyAnalyzer = new TemplateDependencyAnalyzer();
    this.dependencyImportGenerator = new DependencyImportGenerator();
    this.typeInferrer = new TypeInferrer();
  }

  async collect(options: CollectOptions): Promise<PreviewData> {
    const { componentName, template, bindingProperties, parentFilePath } = options;

    // Infer types for all bindings
    const inputNames = bindingProperties.get('inputs') || [];
    const outputNames = bindingProperties.get('outputs') || [];
    const modelNames = bindingProperties.get('models') || [];

    const inferredTypesResult = await this.typeInferrer.enrichPropertiesWithTypesFromFileAsync(
      template,
      inputNames,
      outputNames,
      modelNames,
      parentFilePath
    );

    // Convert to a simple map for easier lookup
    const inferredTypes = new Map<string, { type: string; confidence: 'high' | 'medium' | 'low' }>();
    inferredTypesResult.inputs.forEach(input => {
      inferredTypes.set(input.name, { type: input.inferredType || 'unknown', confidence: 'high' });
    });
    inferredTypesResult.outputs.forEach(output => {
      inferredTypes.set(output.name, { type: output.inferredType || 'unknown', confidence: 'high' });
    });
    inferredTypesResult.models.forEach(model => {
      inferredTypes.set(model.name, { type: model.inferredType || 'unknown', confidence: 'high' });
    });

    // Collect inputs with inferred types
    const inputs: PropertyPreview[] = (bindingProperties.get('inputs') || []).map(name => ({
      name,
      type: inferredTypes.get(name)?.type || 'unknown',
      isRequired: true,
      inferenceConfidence: inferredTypes.get(name)?.confidence || 'low',
      enabled: true
    }));

    // Collect outputs with inferred types
    const outputs: PropertyPreview[] = (bindingProperties.get('outputs') || []).map(name => ({
      name,
      type: inferredTypes.get(name)?.type || 'unknown',
      inferenceConfidence: inferredTypes.get(name)?.confidence || 'low',
      enabled: true
    }));

    // Collect models with inferred types
    const models: PropertyPreview[] = (bindingProperties.get('models') || []).map(name => ({
      name,
      type: inferredTypes.get(name)?.type || 'unknown',
      isRequired: true,
      inferenceConfidence: inferredTypes.get(name)?.confidence || 'low',
      enabled: true
    }));

    // Analyze template dependencies
    const templateDependencies = this.templateDependencyAnalyzer.analyze(template);
    const dependencyImports = this.dependencyImportGenerator.generateImports(templateDependencies);
    const imports: string[] = dependencyImports ? [dependencyImports] : [];

    // Generate file previews
    const componentPath = path.dirname(parentFilePath);
    const filesToCreate = await this.generateFilePreviews(
      componentName,
      template,
      inputs,
      outputs,
      models,
      componentPath
    );

    // Detect files to modify
    const filesToModify = await this.detectFilesToModify(
      componentName,
      parentFilePath,
      componentPath
    );

    return {
      componentName,
      template,
      inputs,
      outputs,
      models,
      imports,
      filesToCreate,
      filesToModify
    };
  }

  private async generateFilePreviews(
    componentName: string,
    template: string,
    inputs: PropertyPreview[],
    outputs: PropertyPreview[],
    models: PropertyPreview[],
    componentPath: string
  ): Promise<FilePreview[]> {
    const previews: FilePreview[] = [];

    // TypeScript component file
    const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
      ['inputs', inputs.filter(i => i.enabled).map(i => i.name)],
      ['outputs', outputs.filter(o => o.enabled).map(o => o.name)],
      ['models', models.filter(m => m.enabled).map(m => m.name)]
    ]);

    const tsContent = await createComponentTsAsync({
      dasherizedComponentName: componentName,
      bindingProperties,
      template
    });

    previews.push({
      path: path.join(componentPath, `${componentName}.component.ts`),
      content: tsContent,
      language: 'typescript'
    });

    // HTML template file
    previews.push({
      path: path.join(componentPath, `${componentName}.component.html`),
      content: template,
      language: 'html'
    });

    // SCSS file
    previews.push({
      path: path.join(componentPath, `${componentName}.component.scss`),
      content: '',
      language: 'scss'
    });

    return previews;
  }

  private async detectFilesToModify(
    componentName: string,
    parentFilePath: string,
    componentPath: string
  ): Promise<FileModification[]> {
    const modifications: FileModification[] = [];

    // Parent component modification (adding import)
    modifications.push({
      path: parentFilePath,
      before: 'imports: []',
      after: `imports: [${this.toComponentClassName(componentName)}]`
    });

    // Barrel export modification (index.ts)
    const indexPath = path.join(componentPath, 'index.ts');
    modifications.push({
      path: indexPath,
      before: '',
      after: `export * from './${componentName}.component';`
    });

    return modifications;
  }

  private toComponentClassName(dasherizedName: string): string {
    const parts = dasherizedName.split('-');
    const pascalCase = parts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    return `${pascalCase}Component`;
  }
}
