export interface DetectedPipe {
  name: string;
  module: string;
  isCustom: boolean;
}

/**
 * PipeDetector - Detects Angular pipes used in HTML templates
 *
 * This class uses regex-based pattern matching to identify Angular pipes
 * in template strings. It serves as a fallback when Angular Language Service
 * is unavailable.
 *
 * Detection Strategy:
 * 1. First, extract all Angular expressions (interpolations and bindings)
 * 2. Then, search for pipe syntax within those expressions only
 * 3. This avoids false positives from || operators and other non-pipe contexts
 *
 * Limitations:
 * - Cannot distinguish pipes from || operators in all edge cases
 * - May miss pipes in very complex nested expressions
 * - Limited to predefined Angular Common module pipes for non-custom detection
 * - Custom pipes need to be resolved by ALS for proper module info
 *
 * Edge Cases Handled:
 * - Chained pipes: {{ value | pipe1 | pipe2 }}
 * - Pipes with parameters: {{ value | date:'short' }}
 * - Pipes in property bindings: [attr]="value | pipe"
 * - Multiline expressions
 * - Pipes in structural directive expressions
 */
export class PipeDetector {
  /**
   * Map of Angular Common pipe names to their class names
   * All these pipes are exported from @angular/common
   */
  private readonly ANGULAR_PIPES = new Map<string, string>([
    ['async', 'AsyncPipe'],
    ['date', 'DatePipe'],
    ['uppercase', 'UpperCasePipe'],
    ['lowercase', 'LowerCasePipe'],
    ['currency', 'CurrencyPipe'],
    ['percent', 'PercentPipe'],
    ['json', 'JsonPipe'],
    ['slice', 'SlicePipe'],
    ['decimal', 'DecimalPipe'],
    ['number', 'DecimalPipe'],
    ['titlecase', 'TitleCasePipe'],
    ['keyvalue', 'KeyValuePipe'],
    // Additional built-in pipes
    ['i18nPlural', 'I18nPluralPipe'],
    ['i18nSelect', 'I18nSelectPipe'],
  ]);

  /**
   * Detects Angular pipes used in a template string
   *
   * @param template - The HTML template string to analyze
   * @returns Array of detected pipes with their module information
   *
   * Algorithm:
   * 1. Remove HTML comments to avoid false positives
   * 2. Extract all Angular expressions from the template
   * 3. Find pipe usage within each expression
   * 4. Map pipe names to their Angular class names
   * 5. Deduplicate and return results
   */
  detectPipes(template: string): DetectedPipe[] {
    const detected: DetectedPipe[] = [];
    const seenPipes = new Set<string>();

    // Remove HTML comments to avoid false positives
    const templateWithoutComments = this.stripHtmlComments(template);

    // Extract all Angular expressions where pipes could be used
    const expressions = this.extractAngularExpressions(templateWithoutComments);

    // Find pipes in each expression
    for (const expression of expressions) {
      const pipeNames = this.findPipesInExpression(expression);

      for (const pipeName of pipeNames) {
        if (seenPipes.has(pipeName)) {
          continue;
        }

        const angularPipeName = this.ANGULAR_PIPES.get(pipeName);

        if (angularPipeName) {
          detected.push({
            name: angularPipeName,
            module: '@angular/common',
            isCustom: false,
          });
        } else {
          // Custom pipe - capitalize first letter and add 'Pipe' suffix
          const customPipeName = this.toPipeName(pipeName);
          detected.push({
            name: customPipeName,
            module: '', // Will be resolved later by ALS or user
            isCustom: true,
          });
        }

        seenPipes.add(pipeName);
      }
    }

    return detected;
  }

  /**
   * Extracts Angular expressions from a template
   *
   * This method finds expressions in:
   * - Interpolations: {{ expression }}
   * - Property bindings: [property]="expression"
   * - Event bindings: (event)="expression" (rarely use pipes, but included)
   * - Two-way bindings: [(property)]="expression"
   * - Structural directives: *ngIf="expression", *ngFor="let item of items | pipe"
   *
   * @param template - The template to extract expressions from
   * @returns Array of expression strings
   */
  private extractAngularExpressions(template: string): string[] {
    const expressions: string[] = [];

    // 1. Interpolations: {{ ... }}
    // Handles multiline and nested braces
    const interpolationRegex = /\{\{([\s\S]*?)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = interpolationRegex.exec(template)) !== null) {
      expressions.push(match[1]);
    }

    // 2. Property bindings: [property]="..." or [attr.property]="..."
    // Capture the expression inside quotes
    const propertyBindingRegex = /\[[^\]]+\]\s*=\s*"([^"]*)"/g;

    while ((match = propertyBindingRegex.exec(template)) !== null) {
      expressions.push(match[1]);
    }

    // Also handle single quotes: [property]='...'
    const propertyBindingSingleQuoteRegex = /\[[^\]]+\]\s*=\s*'([^']*)'/g;

    while ((match = propertyBindingSingleQuoteRegex.exec(template)) !== null) {
      expressions.push(match[1]);
    }

    // 3. Structural directives: *ngIf="...", *ngFor="..."
    const structuralDirectiveRegex = /\*\w+\s*=\s*"([^"]*)"/g;

    while ((match = structuralDirectiveRegex.exec(template)) !== null) {
      expressions.push(match[1]);
    }

    // Also handle single quotes for structural directives
    const structuralDirectiveSingleQuoteRegex = /\*\w+\s*=\s*'([^']*)'/g;

    while ((match = structuralDirectiveSingleQuoteRegex.exec(template)) !== null) {
      expressions.push(match[1]);
    }

    return expressions;
  }

  /**
   * Finds pipe names within an Angular expression
   *
   * This method distinguishes pipes from || operators by checking:
   * 1. Single | followed by identifier (pipe)
   * 2. || followed by expression (logical OR)
   *
   * The regex requires:
   * - A single pipe character (not preceded by another pipe)
   * - Followed by optional whitespace
   * - Followed by a valid identifier (pipe name)
   * - Not part of a || operator
   *
   * @param expression - The Angular expression to search
   * @returns Array of pipe names found
   */
  private findPipesInExpression(expression: string): string[] {
    const pipeNames: string[] = [];

    // This regex matches:
    // - Single pipe (|) not followed by another pipe (negative lookahead for ||)
    // - Not preceded by another pipe (we check this by context)
    // - Followed by whitespace and a valid identifier
    //
    // Pattern breakdown:
    // (?<!\|)   - Negative lookbehind: not preceded by |
    // \|        - Match single pipe
    // (?!\|)    - Negative lookahead: not followed by |
    // \s*       - Optional whitespace
    // (\w+)     - Capture pipe name (word characters)
    const pipeRegex = /(?<!\|)\|(?!\|)\s*(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = pipeRegex.exec(expression)) !== null) {
      const pipeName = match[1];
      // Skip if it looks like it could be part of an identifier
      // (pipes are always preceded by a value/expression, not a letter)
      if (pipeName && !this.isLikelyLogicalOr(expression, match.index)) {
        pipeNames.push(pipeName);
      }
    }

    return pipeNames;
  }

  /**
   * Heuristic check to determine if a pipe match is likely a logical OR
   *
   * Checks if there's another | immediately after (||) which would indicate
   * logical OR operator rather than a pipe.
   *
   * @param expression - The full expression
   * @param pipeIndex - Index of the | character
   * @returns True if this is likely a logical OR, false if likely a pipe
   */
  private isLikelyLogicalOr(expression: string, pipeIndex: number): boolean {
    // Check if there's a | right after (this is handled by regex, but double-check)
    if (expression[pipeIndex + 1] === '|') {
      return true;
    }

    // Check if there's a | right before (also handled by regex lookbehind)
    if (pipeIndex > 0 && expression[pipeIndex - 1] === '|') {
      return true;
    }

    return false;
  }

  /**
   * Strips HTML comments from template string
   *
   * @param template - The template string to process
   * @returns Template string with HTML comments removed
   */
  private stripHtmlComments(template: string): string {
    return template.replace(/<!--[\s\S]*?-->/g, '');
  }

  /**
   * Converts a pipe name to its class name
   *
   * Convention: camelCase pipe name -> PascalCasePipe class name
   *
   * Examples:
   * - 'myCustomFilter' -> 'MyCustomFilterPipe'
   * - 'custom' -> 'CustomPipe'
   * - 'customPipe' -> 'CustomPipe' (no double 'Pipe' suffix)
   *
   * @param pipeName - The pipe name as used in templates
   * @returns The pipe class name
   */
  private toPipeName(pipeName: string): string {
    const pascalCase = pipeName.charAt(0).toUpperCase() + pipeName.slice(1);

    if (pascalCase.endsWith('Pipe')) {
      return pascalCase;
    }

    return pascalCase + 'Pipe';
  }
}
