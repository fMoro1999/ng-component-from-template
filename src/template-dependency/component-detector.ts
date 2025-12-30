export interface DetectedComponent {
  selector: string;
  isCustom: boolean;
}

/**
 * ComponentDetector - Detects custom Angular components in HTML templates
 *
 * This class identifies custom component selectors (element selectors) that are
 * likely Angular components rather than native HTML elements. It serves as a
 * fallback when Angular Language Service is unavailable.
 *
 * Detection Strategy:
 * 1. Find all element tags in the template
 * 2. Filter out native HTML5 elements
 * 3. Filter out SVG elements
 * 4. Filter out Angular control flow syntax (@if, @for, @switch)
 * 5. Return remaining elements as custom components
 *
 * Limitations:
 * - Cannot detect attribute selectors (e.g., [myDirective])
 * - Cannot detect class selectors (e.g., .my-component)
 * - Cannot resolve component class names from selectors
 * - May include web components that are not Angular components
 * - Does not validate that the component actually exists
 *
 * Edge Cases Handled:
 * - HTML comments are stripped before detection
 * - Self-closing tags (e.g., <app-icon />)
 * - Tags with complex attributes spanning multiple lines
 * - Angular 17+ control flow syntax (@if, @for, etc.)
 */
export class ComponentDetector {
  /**
   * Comprehensive list of native HTML5 elements
   *
   * This list is used to filter out native elements and only detect custom components.
   * Updated for HTML5 specification completeness.
   */
  private readonly NATIVE_HTML_TAGS = new Set([
    // Document metadata
    'html', 'head', 'title', 'base', 'link', 'meta', 'style',

    // Sectioning
    'body', 'article', 'section', 'nav', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hgroup', 'header', 'footer', 'address', 'main',

    // Grouping content
    'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'menu', 'li', 'dl', 'dt', 'dd',
    'figure', 'figcaption', 'div',

    // Text-level semantics
    'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'ruby', 'rt', 'rp',
    'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark',
    'bdi', 'bdo', 'span', 'br', 'wbr',

    // Edits
    'ins', 'del',

    // Embedded content
    'picture', 'source', 'img', 'iframe', 'embed', 'object', 'param', 'video', 'audio',
    'track', 'map', 'area',

    // Tabular data
    'table', 'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th',

    // Forms
    'form', 'label', 'input', 'button', 'select', 'datalist', 'optgroup', 'option',
    'textarea', 'output', 'progress', 'meter', 'fieldset', 'legend',

    // Interactive
    'details', 'summary', 'dialog',

    // Scripting
    'script', 'noscript', 'template', 'slot', 'canvas',

    // Deprecated but still valid
    'acronym', 'applet', 'basefont', 'big', 'center', 'dir', 'font', 'frame',
    'frameset', 'isindex', 'noframes', 'strike', 'tt',
  ]);

  /**
   * SVG elements that should not be treated as custom components
   *
   * SVG has many elements that might look like custom components
   * but are actually part of the SVG specification.
   */
  private readonly SVG_ELEMENTS = new Set([
    'svg', 'g', 'defs', 'symbol', 'use', 'image',
    'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'text', 'tspan', 'textpath',
    'marker', 'clippath', 'mask', 'pattern',
    'lineargradient', 'radialgradient', 'stop',
    'filter', 'fegaussianblur', 'feoffset', 'feblend', 'fecolormatrix',
    'fecomponenttransfer', 'fecomposite', 'feconvolvematrix', 'fediffuselighting',
    'fedisplacementmap', 'fedropshadow', 'feflood', 'fefunca', 'fefuncb',
    'fefuncg', 'fefuncr', 'feimage', 'femerge', 'femergenode', 'femorphology',
    'fepointlight', 'fespecularlighting', 'fespotlight', 'fetile', 'feturbulence',
    'foreignobject',
    'animate', 'animatemotion', 'animatetransform', 'set',
    'desc', 'metadata', 'title',
    'switch', 'a',
  ]);

  /**
   * Angular control flow syntax introduced in Angular 17
   *
   * These are not components but built-in template syntax.
   * Pattern: @keyword (expression) { ... }
   */
  private readonly ANGULAR_CONTROL_FLOW = new Set([
    '@if', '@else', '@for', '@empty', '@switch', '@case', '@default',
    '@defer', '@placeholder', '@loading', '@error',
  ]);

  /**
   * Detects custom Angular components in a template
   *
   * @param template - The HTML template string to analyze
   * @returns Array of detected custom component selectors
   *
   * Algorithm:
   * 1. Strip HTML comments
   * 2. Find all element opening tags
   * 3. Filter out native HTML and SVG elements
   * 4. Deduplicate and return
   */
  detectComponents(template: string): DetectedComponent[] {
    const detected: DetectedComponent[] = [];
    const seenSelectors = new Set<string>();

    // Remove HTML comments to avoid false positives
    const templateWithoutComments = this.stripHtmlComments(template);

    // Regex to find custom element tags
    // Pattern breakdown:
    // <           - Opening angle bracket
    // ([a-z]      - Tag must start with a letter
    // [\w-]*)     - Followed by word chars or hyphens (for kebab-case)
    // (?:\s|>|/)  - Must be followed by whitespace, >, or / (for self-closing)
    //
    // This ensures we match actual tags, not strings containing < followed by letters
    const componentRegex = /<([a-z][\w-]*)(?=\s|>|\/)/gi;
    let match: RegExpExecArray | null;

    while ((match = componentRegex.exec(templateWithoutComments)) !== null) {
      const tagName = match[1].toLowerCase();

      // Skip if already detected
      if (seenSelectors.has(tagName)) {
        continue;
      }

      // Skip native HTML elements
      if (this.NATIVE_HTML_TAGS.has(tagName)) {
        continue;
      }

      // Skip SVG elements
      if (this.SVG_ELEMENTS.has(tagName)) {
        continue;
      }

      // Skip ng-template and ng-container (Angular structural elements)
      if (tagName === 'ng-template' || tagName === 'ng-container' || tagName === 'ng-content') {
        continue;
      }

      // This is likely a custom component
      detected.push({
        selector: tagName,
        isCustom: true,
      });

      seenSelectors.add(tagName);
    }

    return detected;
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
   * Checks if a selector is likely an Angular component
   *
   * Heuristic: Angular components often follow naming conventions:
   * - app-* (application components)
   * - mat-* (Angular Material)
   * - ngx-* (Angular third-party libraries)
   * - Custom prefixes (lib-*, my-*, etc.)
   *
   * @param selector - The element selector to check
   * @returns True if the selector follows common Angular component patterns
   */
  isLikelyAngularComponent(selector: string): boolean {
    // Common Angular component prefixes
    const angularPrefixes = [
      'app-', 'mat-', 'ngx-', 'cdk-', 'nz-', 'p-',  // Common library prefixes
      'lib-', 'my-', 'custom-',  // Common custom prefixes
    ];

    // Components with hyphen in name are very likely custom components
    // (HTML5 spec requires custom elements to have a hyphen)
    if (selector.includes('-')) {
      return true;
    }

    // Check for common prefixes
    return angularPrefixes.some(prefix => selector.startsWith(prefix));
  }
}
