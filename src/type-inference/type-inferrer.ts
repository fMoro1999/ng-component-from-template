import { Project } from 'ts-morph';
import { BindingParser } from './binding-parser';
import { ImportManager, TypeImport } from './import-manager';
import { InferenceReporter } from './inference-reporter';
import { TypeInferenceEngine } from './type-inference-engine';
import { Logger, getGlobalLogger } from './logger';
import { getProjectCache, ProjectCache } from './project-cache';

export interface SignalInput {
  name: string;
  isRequired: boolean;
  inferredType?: string;
}

export interface SignalOutput {
  name: string;
  inferredType?: string;
}

export interface SignalModel {
  name: string;
  isRequired: boolean;
  inferredType?: string;
}

export interface TypeInferenceResult {
  inputs: SignalInput[];
  outputs: SignalOutput[];
  models: SignalModel[];
  imports: TypeImport[];
  report?: string;
}

export class TypeInferrer {
  private engine: TypeInferenceEngine;
  private parser: BindingParser;
  private importManager: ImportManager;
  private reporter: InferenceReporter;
  private logger: Logger;
  private externalProject?: Project;
  private projectCache: ProjectCache;

  constructor(logger?: Logger, project?: Project) {
    this.logger = logger || getGlobalLogger();
    this.externalProject = project;
    this.projectCache = getProjectCache();
    this.engine = new TypeInferenceEngine(this.logger, project);
    this.parser = new BindingParser();
    this.importManager = new ImportManager();
    this.reporter = new InferenceReporter(this.logger);
  }

  /**
   * Enrich properties with types given a parent file path
   */
  async enrichPropertiesWithTypesFromFileAsync(
    template: string,
    inputNames: string[],
    outputNames: string[],
    modelNames: string[],
    parentTsFilePath: string
  ): Promise<TypeInferenceResult> {
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

      // Enrich models with inferred types
      const enrichedModels: SignalModel[] = modelNames.map((name) => ({
        name,
        isRequired: true,
        inferredType: inferredTypes.get(name)?.type || 'unknown',
      }));

      // Extract needed imports for custom types
      const typeMap = new Map<string, string>();
      for (const [name, info] of inferredTypes) {
        typeMap.set(name, info.type);
      }

      // Get the parent source file for import analysis
      let customImports: TypeImport[] = [];
      try {
        // Use external project if available (for testing), otherwise use cached project
        const parentSourceFile = this.externalProject
          ? this.externalProject.getSourceFile(parentTsFilePath) ||
            this.externalProject.addSourceFileAtPath(parentTsFilePath)
          : this.projectCache.getOrAddSourceFile(parentTsFilePath);

        if (parentSourceFile) {
          customImports = this.importManager.extractNeededImports(
            typeMap,
            parentSourceFile
          );
        }
      } catch (error) {
        this.logger.warn('Failed to extract custom type imports:', error);
      }

      // Generate report for user feedback (console logging)
      const report = this.reporter.generateDetailedReport(inferredTypes);
      this.logger.log(report);

      // Report results to user
      await this.reporter.reportResults(inferredTypes);

      return {
        inputs: enrichedInputs,
        outputs: enrichedOutputs,
        models: enrichedModels,
        imports: customImports,
        report,
      };
    } catch (error) {
      this.logger.error('Type inference orchestration failed:', error);

      // Fallback: return properties without inferred types
      return {
        inputs: inputNames.map((name) => ({ name, isRequired: true })),
        outputs: outputNames.map((name) => ({ name })),
        models: modelNames.map((name) => ({ name, isRequired: true })),
        imports: [],
      };
    }
  }
}
