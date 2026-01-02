import { Project } from 'ts-morph';
import { BindingParser } from './binding-parser';
import { ImportManager, TypeImport } from './import-manager';
import { InferenceReporter } from './inference-reporter';
import { TypeInferenceEngine, InferredType } from './type-inference-engine';
import { ALSTypeInferenceEngine } from './als-type-inference-engine';
import { Logger, getGlobalLogger } from './logger';
import { getProjectCache, ProjectCache } from './project-cache';
import { isALSAvailable } from '../language-service/als-integration';
import { ALSHoverProvider } from './als-hover-provider';
import { TypeExtractor } from './type-extractor';
import { TemplateDocumentManager } from './als-template-manager';

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
  private manualEngine: TypeInferenceEngine;
  private alsEngine: ALSTypeInferenceEngine;
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

    // Initialize manual engine (always available)
    this.manualEngine = new TypeInferenceEngine(this.logger, project);

    // Initialize ALS engine components
    const templateManager = new TemplateDocumentManager();
    const hoverProvider = new ALSHoverProvider();
    const typeExtractor = new TypeExtractor();
    this.alsEngine = new ALSTypeInferenceEngine(
      templateManager,
      hoverProvider,
      typeExtractor,
      this.logger
    );

    this.parser = new BindingParser();
    this.importManager = new ImportManager();
    this.reporter = new InferenceReporter(this.logger);
  }

  /**
   * Enrich properties with types given a parent file path
   *
   * This method implements a dual-engine strategy:
   * 1. ALS-first: Try Angular Language Service for advanced type inference
   * 2. Fallback: Use manual TypeScript AST-based inference if ALS unavailable or fails
   * 3. Merge: Combine both results when ALS returns partial/low-confidence results
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

      // Infer types using dual-engine strategy
      let inferredTypes: Map<string, InferredType>;

      // Check if ALS is available
      if (isALSAvailable()) {
        try {
          this.logger.log('Using Angular Language Service for type inference...');

          // Try ALS-based inference
          const alsResults = await this.alsEngine.inferTypesAsync({
            parentTsFilePath,
            templateBindings: bindingMap,
          });

          // Check if results are satisfactory (high confidence)
          if (this.hasHighConfidenceResults(alsResults)) {
            this.logger.log('ALS inference successful with high confidence');
            inferredTypes = alsResults;
          } else {
            // Partial fallback: Fill missing types with manual inference
            this.logger.log('ALS returned partial results, merging with manual inference...');
            const manualResults = await this.manualEngine.inferTypesAsync({
              parentTsFilePath,
              templateBindings: bindingMap,
            });
            inferredTypes = this.mergeResults(alsResults, manualResults);
          }
        } catch (error) {
          this.logger.warn('ALS inference failed, falling back to manual:', error);
          // Fall through to manual mode
          inferredTypes = await this.manualEngine.inferTypesAsync({
            parentTsFilePath,
            templateBindings: bindingMap,
          });
        }
      } else {
        // Manual mode (when ALS unavailable)
        this.logger.log('Using manual TypeScript AST-based inference...');
        inferredTypes = await this.manualEngine.inferTypesAsync({
          parentTsFilePath,
          templateBindings: bindingMap,
        });
      }

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

  /**
   * Check if results have high confidence
   *
   * Criteria for high confidence:
   * - At least 80% of results have high confidence
   * - No results have type 'unknown' or 'any'
   */
  private hasHighConfidenceResults(results: Map<string, InferredType>): boolean {
    if (results.size === 0) {
      return false;
    }

    let highConfidenceCount = 0;
    let unknownCount = 0;

    for (const [, inferredType] of results) {
      if (inferredType.type === 'unknown' || inferredType.type === 'any') {
        unknownCount++;
      }

      if (inferredType.confidence === 'high') {
        highConfidenceCount++;
      }
    }

    // If more than 20% are unknown, don't consider this high confidence
    if (unknownCount / results.size > 0.2) {
      return false;
    }

    // At least 80% should be high confidence
    return highConfidenceCount / results.size >= 0.8;
  }

  /**
   * Merge ALS and manual results
   *
   * Strategy:
   * - Prefer ALS high-confidence results
   * - Use manual results to fill in ALS unknowns or low-confidence results
   * - For conflicts, prefer the result with higher confidence
   */
  private mergeResults(
    alsResults: Map<string, InferredType>,
    manualResults: Map<string, InferredType>
  ): Map<string, InferredType> {
    const merged = new Map<string, InferredType>();

    // Get all unique property names from both results
    const allPropertyNames = new Set([
      ...alsResults.keys(),
      ...manualResults.keys(),
    ]);

    for (const propertyName of allPropertyNames) {
      const alsResult = alsResults.get(propertyName);
      const manualResult = manualResults.get(propertyName);

      // If only one result exists, use it
      if (!alsResult) {
        merged.set(propertyName, manualResult!);
        continue;
      }
      if (!manualResult) {
        merged.set(propertyName, alsResult);
        continue;
      }

      // Both results exist - apply merge strategy
      const alsType = alsResult.type;
      const alsConfidence = alsResult.confidence;

      // Prefer ALS if it has high confidence and is not unknown
      if (
        alsConfidence === 'high' &&
        alsType !== 'unknown' &&
        alsType !== 'any'
      ) {
        merged.set(propertyName, alsResult);
      } else {
        // Otherwise use manual result
        merged.set(propertyName, manualResult);
      }
    }

    return merged;
  }
}
