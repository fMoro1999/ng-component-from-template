export interface DetectedDirective {
  name: string;
  module: string;
  isCustom: boolean;
}

/**
 * Directive Pattern Configuration
 *
 * Maps Angular directive syntax patterns to their corresponding directive names and modules.
 * This allows for proper module resolution (e.g., NgModel comes from @angular/forms, not @angular/common).
 */
interface DirectiveConfig {
  name: string;
  module: string;
}

/**
 * DirectiveDetector - Detects Angular directives in HTML templates
 *
 * This class uses regex-based pattern matching to identify Angular directives
 * in template strings. It serves as a fallback when Angular Language Service
 * is unavailable.
 *
 * Limitations:
 * - Cannot detect directives inside HTML comments
 * - May produce false positives in complex string literals
 * - Limited to predefined Angular Common and Forms module directives
 * - Does not detect custom directives (those should be resolved by ALS)
 *
 * Edge Cases Handled:
 * - Multiline attributes
 * - Whitespace variations in attribute syntax
 * - Structural directives (*ngIf, *ngFor, etc.)
 * - Property binding directives ([ngClass], [ngStyle], etc.)
 * - Two-way binding directives ([(ngModel)])
 */
export class DirectiveDetector {
  /**
   * Mapping of directive names to their configuration (module source)
   * Note: NgModel is from @angular/forms, not @angular/common
   */
  private readonly DIRECTIVE_CONFIG = new Map<string, DirectiveConfig>([
    ['NgIf', { name: 'NgIf', module: '@angular/common' }],
    ['NgFor', { name: 'NgFor', module: '@angular/common' }],
    ['NgSwitch', { name: 'NgSwitch', module: '@angular/common' }],
    ['NgSwitchCase', { name: 'NgSwitchCase', module: '@angular/common' }],
    ['NgSwitchDefault', { name: 'NgSwitchDefault', module: '@angular/common' }],
    ['NgClass', { name: 'NgClass', module: '@angular/common' }],
    ['NgStyle', { name: 'NgStyle', module: '@angular/common' }],
    ['NgTemplateOutlet', { name: 'NgTemplateOutlet', module: '@angular/common' }],
    ['NgComponentOutlet', { name: 'NgComponentOutlet', module: '@angular/common' }],
    ['NgPlural', { name: 'NgPlural', module: '@angular/common' }],
    ['NgPluralCase', { name: 'NgPluralCase', module: '@angular/common' }],
    // NgModel is from @angular/forms
    ['NgModel', { name: 'NgModel', module: '@angular/forms' }],
  ]);

  /**
   * Regex patterns for detecting Angular directives
   *
   * Pattern Structure:
   * - Structural directives: *directiveName followed by = or > or whitespace
   * - Property bindings: [directiveName] with optional whitespace
   * - Two-way bindings: [(directiveName)] with optional whitespace
   *
   * Each pattern captures the directive name for mapping to the config.
   *
   * Design Note: Patterns use [^>]* to limit scope within a single tag,
   * reducing false positives from matching content outside attributes.
   */
  private readonly DIRECTIVE_PATTERNS: Array<{ regex: RegExp; directive: string }> = [
    // Structural directives: *ngIf, *ngFor, etc.
    // Matches: *ngIf="condition" or *ngIf (with following space, =, or >)
    { regex: /\*ngIf(?:\s*=|\s+|>)/g, directive: 'NgIf' },
    { regex: /\*ngFor(?:\s*=|\s+|>)/g, directive: 'NgFor' },
    { regex: /\*ngSwitch(?:\s*=|\s+|>)/g, directive: 'NgSwitch' },
    { regex: /\*ngSwitchCase(?:\s*=|\s+|>)/g, directive: 'NgSwitchCase' },
    { regex: /\*ngSwitchDefault(?:\s*|>)/g, directive: 'NgSwitchDefault' },

    // Property binding directives: [ngClass], [ngStyle], etc.
    // Handles whitespace variations: [ngClass], [ ngClass ], [ngClass ]
    { regex: /\[\s*ngSwitch\s*\]/g, directive: 'NgSwitch' },
    { regex: /\[\s*ngClass\s*\]/g, directive: 'NgClass' },
    { regex: /\[\s*ngStyle\s*\]/g, directive: 'NgStyle' },
    { regex: /\[\s*ngTemplateOutlet\s*\]/g, directive: 'NgTemplateOutlet' },
    { regex: /\[\s*ngComponentOutlet\s*\]/g, directive: 'NgComponentOutlet' },
    { regex: /\[\s*ngPlural\s*\]/g, directive: 'NgPlural' },
    { regex: /\*ngPluralCase(?:\s*=|\s+|>)/g, directive: 'NgPluralCase' },

    // Two-way binding: [(ngModel)]
    // Handles whitespace: [(ngModel)], [( ngModel )], etc.
    { regex: /\[\(\s*ngModel\s*\)\]/g, directive: 'NgModel' },

    // One-way ngModel binding: [ngModel]
    { regex: /\[\s*ngModel\s*\](?!\))/g, directive: 'NgModel' },

    // Event binding for ngModel: (ngModelChange)
    { regex: /\(\s*ngModelChange\s*\)/g, directive: 'NgModel' },
  ];

  /**
   * Detects Angular directives used in a template string
   *
   * @param template - The HTML template string to analyze
   * @returns Array of detected directives with their module information
   *
   * Algorithm:
   * 1. Strip HTML comments to avoid false positives
   * 2. Test each directive pattern against the cleaned template
   * 3. Map matched patterns to directive configurations
   * 4. Deduplicate results
   */
  detectDirectives(template: string): DetectedDirective[] {
    const detected: DetectedDirective[] = [];
    const seenDirectives = new Set<string>();

    // Remove HTML comments to avoid false positives
    // Comments may contain directive-like syntax in documentation
    const templateWithoutComments = this.stripHtmlComments(template);

    for (const { regex, directive } of this.DIRECTIVE_PATTERNS) {
      // Reset regex lastIndex for global patterns
      regex.lastIndex = 0;

      if (regex.test(templateWithoutComments) && !seenDirectives.has(directive)) {
        const config = this.DIRECTIVE_CONFIG.get(directive);
        if (config) {
          detected.push({
            name: config.name,
            module: config.module,
            isCustom: false,
          });
          seenDirectives.add(directive);
        }
      }
    }

    return detected;
  }

  /**
   * Strips HTML comments from template string
   *
   * This prevents false positive matches from directive syntax
   * that may appear in comments (e.g., documentation examples).
   *
   * @param template - The template string to process
   * @returns Template string with HTML comments removed
   */
  private stripHtmlComments(template: string): string {
    // Match HTML comments: <!-- ... -->
    // Use non-greedy match to handle multiple comments correctly
    return template.replace(/<!--[\s\S]*?-->/g, '');
  }
}
