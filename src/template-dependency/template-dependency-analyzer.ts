import { DirectiveDetector, DetectedDirective } from './directive-detector';
import { PipeDetector, DetectedPipe } from './pipe-detector';
import { ComponentDetector, DetectedComponent } from './component-detector';

export interface TemplateDependencies {
  directives: DetectedDirective[];
  pipes: DetectedPipe[];
  components: DetectedComponent[];
}

/**
 * Template Dependency Analyzer (Fallback Mode)
 *
 * @deprecated This module is now used ONLY as a fallback when Angular Language Service
 * is not available or disabled.
 *
 * **Primary Mode (Default):**
 * The extension delegates template dependency resolution to Angular Language Service (ALS)
 * via VS Code Quick Fixes. This provides:
 * - Automatic support for all Angular versions
 * - Custom library imports (PrimeNG, Material, etc.)
 * - Future-proof against Angular syntax changes
 * - No hardcoded symbol registries to maintain
 *
 * **Fallback Mode (This Class):**
 * When ALS is unavailable or `useAngularLanguageService` is disabled, this analyzer
 * provides basic template dependency detection for common Angular symbols from @angular/common.
 *
 * Limitations:
 * - Only detects hardcoded Angular Common symbols
 * - Cannot resolve custom library imports
 * - Requires manual maintenance for new Angular directives/pipes
 * - Limited to predefined registries
 *
 * Usage:
 * This class should only be instantiated when `config.useAngularLanguageService === false`
 *
 * @see {@link ../language-service/als-integration.ts} for the primary ALS integration
 */
export class TemplateDependencyAnalyzer {
  private directiveDetector: DirectiveDetector;
  private pipeDetector: PipeDetector;
  private componentDetector: ComponentDetector;

  constructor() {
    this.directiveDetector = new DirectiveDetector();
    this.pipeDetector = new PipeDetector();
    this.componentDetector = new ComponentDetector();
  }

  /**
   * Analyzes template for dependencies using hardcoded registries
   *
   * @param template The HTML template string to analyze
   * @returns Detected directives, pipes, and components
   *
   * @remarks
   * This method uses regex-based pattern matching and hardcoded symbol registries.
   * It is less robust than ALS but provides basic functionality when ALS is unavailable.
   */
  analyze(template: string): TemplateDependencies {
    return {
      directives: this.directiveDetector.detectDirectives(template),
      pipes: this.pipeDetector.detectPipes(template),
      components: this.componentDetector.detectComponents(template),
    };
  }
}
