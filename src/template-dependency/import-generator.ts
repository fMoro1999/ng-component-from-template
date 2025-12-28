import { TemplateDependencies } from './template-dependency-analyzer';

export class DependencyImportGenerator {
  generateImports(dependencies: TemplateDependencies): string {
    const imports: string[] = [];

    // Group Angular common imports
    const commonImports = [
      ...dependencies.directives.filter((d) => !d.isCustom).map((d) => d.name),
      ...dependencies.pipes.filter((p) => !p.isCustom).map((p) => p.name),
    ];

    if (commonImports.length > 0) {
      const uniqueCommonImports = Array.from(new Set(commonImports));
      imports.push(
        `import { ${uniqueCommonImports.join(', ')} } from '@angular/common';`
      );
    }

    return imports.join('\n');
  }

  generateImportsArray(dependencies: TemplateDependencies): string {
    const importsArray = [
      ...dependencies.directives.map((d) => d.name),
      ...dependencies.pipes.map((p) => p.name),
      // Components would be added here if resolved
    ];

    if (importsArray.length === 0) {
      return '[]';
    }

    const uniqueImports = Array.from(new Set(importsArray));
    return `[${uniqueImports.join(', ')}]`;
  }
}
