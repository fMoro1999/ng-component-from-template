export interface DetectedPipe {
  name: string;
  module: string;
  isCustom: boolean;
}

export class PipeDetector {
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
  ]);

  detectPipes(template: string): DetectedPipe[] {
    const detected: DetectedPipe[] = [];
    const seenPipes = new Set<string>();

    // Regex to find pipe usage: {{ value | pipeName }} or {{ value | pipeName:param }}
    const pipeRegex = /\|\s*(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = pipeRegex.exec(template)) !== null) {
      const pipeName = match[1];

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
          module: '', // Will be resolved later
          isCustom: true,
        });
      }

      seenPipes.add(pipeName);
    }

    return detected;
  }

  private toPipeName(pipeName: string): string {
    // Convert camelCase to PascalCase and add 'Pipe' suffix
    // e.g., 'myCustomFilter' -> 'MyCustomFilterPipe'
    // But if it already ends with 'Pipe', don't add it again
    const pascalCase = pipeName.charAt(0).toUpperCase() + pipeName.slice(1);

    if (pascalCase.endsWith('Pipe')) {
      return pascalCase;
    }

    return pascalCase + 'Pipe';
  }
}
