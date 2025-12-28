export interface DetectedComponent {
  selector: string;
  isCustom: boolean;
}

export class ComponentDetector {
  private readonly NATIVE_HTML_TAGS = new Set([
    'div',
    'span',
    'p',
    'a',
    'button',
    'input',
    'form',
    'label',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'li',
    'ol',
    'table',
    'tr',
    'td',
    'th',
    'thead',
    'tbody',
    'tfoot',
    'img',
    'section',
    'article',
    'nav',
    'header',
    'footer',
    'main',
    'aside',
    'select',
    'option',
    'textarea',
    'fieldset',
    'legend',
    'canvas',
    'svg',
    'path',
    'circle',
    'rect',
    'line',
    'polygon',
    'video',
    'audio',
    'source',
    'iframe',
    'embed',
    'object',
    'param',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'small',
    'sub',
    'sup',
    'code',
    'pre',
    'blockquote',
    'cite',
    'q',
    'abbr',
    'address',
    'time',
    'mark',
    'del',
    'ins',
    'br',
    'hr',
    'dl',
    'dt',
    'dd',
  ]);

  detectComponents(template: string): DetectedComponent[] {
    const detected: DetectedComponent[] = [];
    const seenSelectors = new Set<string>();

    // Regex to find custom element tags: <app-something> or <mat-button>
    // Matches opening tags with or without attributes
    const componentRegex = /<([a-z][\w-]*)/gi;
    let match: RegExpExecArray | null;

    while ((match = componentRegex.exec(template)) !== null) {
      const tagName = match[1].toLowerCase();

      // Skip native HTML tags
      if (this.NATIVE_HTML_TAGS.has(tagName)) {
        continue;
      }

      // Skip already detected
      if (seenSelectors.has(tagName)) {
        continue;
      }

      detected.push({
        selector: tagName,
        isCustom: true,
      });

      seenSelectors.add(tagName);
    }

    return detected;
  }
}
