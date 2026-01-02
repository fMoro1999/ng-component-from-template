import * as vscode from 'vscode';
import { Logger, getGlobalLogger } from './logger';
import { InferredType, TypeInferenceContext } from './type-inference-engine';
import { TypeExtractor } from './type-extractor';
import { ALSHoverProvider } from './als-hover-provider';
import { TemplateDocumentManager, TemplateContext } from './als-template-manager';

/**
 * ALSTypeInferenceEngine integrates Angular Language Service (ALS) components
 * to perform advanced type inference for Angular template bindings.
 *
 * This engine orchestrates three Phase 1 components:
 * - TemplateDocumentManager: Creates temporary component files for ALS analysis
 * - ALSHoverProvider: Queries ALS for type information at specific positions
 * - TypeExtractor: Extracts and normalizes type information from hover results
 *
 * Workflow:
 * 1. Create a temporary component with the template content
 * 2. For each binding:
 *    a. Calculate the position of the expression in the template
 *    b. Request hover information from ALS at that position
 *    c. Extract and normalize the type from the hover result
 * 3. Clean up temporary files (always executed via try-finally)
 *
 * Features:
 * - Graceful error handling: One binding failure doesn't stop others
 * - Proper resource cleanup: No file leaks even on errors
 * - Compatible interface: Returns same InferredType as manual engine
 * - Confidence levels: Based on success/failure of type extraction
 */
export class ALSTypeInferenceEngine {
  private logger: Logger;

  constructor(
    private templateManager: TemplateDocumentManager,
    private hoverProvider: ALSHoverProvider,
    private typeExtractor: TypeExtractor,
    logger?: Logger
  ) {
    this.logger = logger || getGlobalLogger();
  }

  /**
   * Infer types for all template bindings using Angular Language Service
   *
   * This method creates a temporary component with the template content,
   * queries ALS for type information at each binding position, and returns
   * inferred types for all bindings.
   *
   * @param context - Type inference context containing component path and bindings
   * @returns Map of property names to inferred types
   */
  async inferTypesAsync(
    context: TypeInferenceContext
  ): Promise<Map<string, InferredType>> {
    const results = new Map<string, InferredType>();

    // Early return for empty bindings
    if (context.templateBindings.size === 0) {
      return results;
    }

    // Validate context
    if (!context.parentTsFilePath || context.parentTsFilePath.trim() === '') {
      this.logger.warn('Invalid parent TypeScript file path provided');
      return this.createUnknownResultsForBindings(context.templateBindings);
    }

    let tempComponentUri: vscode.Uri | undefined;

    try {
      // Step 1: Create temporary component with template
      const templateContent = this.buildTemplateFromBindings(context.templateBindings);
      const templateContext: TemplateContext = {
        templateContent,
        isInlineTemplate: true,
        parentComponentPath: context.parentTsFilePath
      };

      tempComponentUri = await this.templateManager.createTemporaryComponent(templateContext);

      // Step 2: Infer type for each binding
      for (const [propertyName, expression] of context.templateBindings) {
        try {
          const inferredType = await this.inferTypeForBinding(
            tempComponentUri,
            propertyName,
            expression,
            templateContent
          );
          results.set(propertyName, inferredType);
        } catch (error) {
          // Don't let one binding failure stop others
          this.logger.error(`Error inferring type for binding '${propertyName}':`, error);
          results.set(propertyName, {
            propertyName,
            type: 'unknown',
            isInferred: false,
            confidence: 'low'
          });
        }
      }
    } catch (error) {
      // Fatal error (e.g., couldn't create temp component)
      this.logger.error('Fatal error in type inference:', error);
      return this.createUnknownResultsForBindings(context.templateBindings);
    } finally {
      // Step 3: Always cleanup temporary files
      if (tempComponentUri) {
        try {
          await this.templateManager.cleanup(tempComponentUri);
        } catch (cleanupError) {
          // Log but don't throw - cleanup errors shouldn't break the workflow
          this.logger.warn('Error cleaning up temporary component:', cleanupError);
        }
      }
    }

    return results;
  }

  /**
   * Infer type for a single binding expression
   *
   * This method:
   * 1. Calculates the position of the expression in the template
   * 2. Queries ALS for hover information at that position
   * 3. Extracts the type from the hover result
   * 4. Normalizes the type and determines confidence level
   *
   * @param documentUri - URI of the temporary component document
   * @param propertyName - Name of the binding property
   * @param expression - Binding expression (e.g., 'user.name')
   * @param templateContent - Full template content
   * @returns Inferred type information
   */
  private async inferTypeForBinding(
    documentUri: vscode.Uri,
    propertyName: string,
    expression: string,
    templateContent: string
  ): Promise<InferredType> {
    const defaultResult = this.createUnknownResult(propertyName);

    try {
      // Calculate position of expression in template
      const position = this.templateManager.calculatePositionInTemplate(
        expression,
        templateContent
      );

      // Get hover information from ALS
      const hoverResult = await this.hoverProvider.getTypeAtPosition(
        documentUri,
        position
      );

      if (!hoverResult.success || !hoverResult.typeInfo) {
        this.logger.warn(
          `Failed to get hover for '${propertyName}': ${hoverResult.error || 'Unknown error'}`
        );
        return defaultResult;
      }

      // Create a mock hover object for the type extractor
      const mockHover = new vscode.Hover(
        new vscode.MarkdownString(hoverResult.typeInfo)
      );

      // Extract type information
      const extractedType = this.typeExtractor.extractTypeFromHover(mockHover);

      if (!extractedType) {
        this.logger.warn(`Failed to extract type for '${propertyName}' from hover`);
        return defaultResult;
      }

      // Determine confidence based on extracted type
      const confidence = this.determineConfidence(extractedType);

      return {
        propertyName,
        type: extractedType.type,
        isInferred: true,
        confidence
      };
    } catch (error) {
      this.logger.error(`Error inferring type for binding '${propertyName}':`, error);
      return defaultResult;
    }
  }

  /**
   * Build template content from bindings for ALS analysis
   *
   * Creates a simple template that includes all binding expressions
   * so ALS can analyze them in context.
   *
   * @param bindings - Map of property names to binding expressions
   * @returns Template content string
   */
  private buildTemplateFromBindings(bindings: Map<string, string>): string {
    const lines: string[] = ['<div>'];

    for (const [propertyName, expression] of bindings) {
      // Determine binding type based on expression
      if (expression.includes('(') && expression.includes(')')) {
        // Output binding: (click)="handleClick($event)"
        lines.push(`  <button (${propertyName})="${expression}">Button</button>`);
      } else if (propertyName === 'ngModel') {
        // Two-way binding: [(ngModel)]="userName"
        lines.push(`  <input [(ngModel)]="${expression}" />`);
      } else {
        // Input binding: [userName]="user.name"
        lines.push(`  <span [${propertyName}]="${expression}">Text</span>`);
      }
    }

    lines.push('</div>');
    return lines.join('\n');
  }

  /**
   * Create unknown result for a single binding
   *
   * @param propertyName - Name of the binding property
   * @returns Unknown InferredType result
   */
  private createUnknownResult(propertyName: string): InferredType {
    return {
      propertyName,
      type: 'unknown',
      isInferred: false,
      confidence: 'low'
    };
  }

  /**
   * Create unknown results for all bindings (used for error cases)
   *
   * @param bindings - Map of property names to binding expressions
   * @returns Map of property names to unknown InferredType results
   */
  private createUnknownResultsForBindings(
    bindings: Map<string, string>
  ): Map<string, InferredType> {
    const results = new Map<string, InferredType>();
    for (const [propertyName] of bindings) {
      results.set(propertyName, this.createUnknownResult(propertyName));
    }
    return results;
  }

  /**
   * Determine confidence level based on extracted type information
   *
   * Confidence levels:
   * - High: Concrete types successfully extracted from ALS
   * - Medium: Extracted type has medium confidence (from TypeExtractor)
   * - Low: Type is 'any' or 'unknown', indicating weak type information
   *
   * @param extractedType - Type information extracted from hover
   * @returns Confidence level
   */
  private determineConfidence(
    extractedType: { type: string; confidence: 'high' | 'medium' | 'low' }
  ): 'high' | 'medium' | 'low' {
    // Low confidence for 'any' or 'unknown' types
    if (extractedType.type === 'any' || extractedType.type === 'unknown') {
      return 'low';
    }

    // Use the confidence from TypeExtractor
    return extractedType.confidence;
  }
}
