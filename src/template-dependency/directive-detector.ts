export interface DetectedDirective {
  name: string;
  module: string;
  isCustom: boolean;
}

export class DirectiveDetector {
  private readonly ANGULAR_DIRECTIVES = new Map<string, string>([
    ['*ngIf', 'NgIf'],
    ['*ngFor', 'NgFor'],
    ['*ngSwitch', 'NgSwitch'],
    ['*ngSwitchCase', 'NgSwitchCase'],
    ['*ngSwitchDefault', 'NgSwitchDefault'],
    ['[ngSwitch]', 'NgSwitch'],
    ['[ngClass]', 'NgClass'],
    ['[ngStyle]', 'NgStyle'],
    ['[(ngModel)]', 'NgModel'],
    ['[ngModel]', 'NgModel'],
  ]);

  detectDirectives(template: string): DetectedDirective[] {
    const detected: DetectedDirective[] = [];
    const seenDirectives = new Set<string>();

    for (const [pattern, directiveName] of this.ANGULAR_DIRECTIVES) {
      if (template.includes(pattern) && !seenDirectives.has(directiveName)) {
        detected.push({
          name: directiveName,
          module: '@angular/common',
          isCustom: false,
        });
        seenDirectives.add(directiveName);
      }
    }

    return detected;
  }
}
