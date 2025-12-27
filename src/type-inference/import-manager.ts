import { SourceFile } from 'ts-morph';

export interface TypeImport {
  typeName: string;
  modulePath: string;
}

/**
 * Manage imports needed for inferred types
 */
export class ImportManager {
  /**
   * Extract imports needed for inferred types
   */
  extractNeededImports(
    inferredTypes: Map<string, string>,
    parentSourceFile: SourceFile
  ): TypeImport[] {
    const imports: TypeImport[] = [];

    for (const [_, typeText] of inferredTypes) {
      // Check if type is a custom interface/class
      if (this.isCustomType(typeText)) {
        const importInfo = this.findImportForType(typeText, parentSourceFile);
        if (importInfo) {
          imports.push(importInfo);
        }
      }
    }

    return imports;
  }

  /**
   * Check if type is custom (not primitive or built-in)
   */
  private isCustomType(typeText: string): boolean {
    const primitives = ['string', 'number', 'boolean', 'unknown', 'any', 'void'];
    const builtIns = ['Date', 'Array', 'Promise', 'Observable'];

    return !primitives.includes(typeText) && !builtIns.some(b => typeText.includes(b));
  }

  /**
   * Find import statement for a given type
   */
  private findImportForType(
    typeText: string,
    sourceFile: SourceFile
  ): TypeImport | null {
    const imports = sourceFile.getImportDeclarations();

    for (const importDecl of imports) {
      const namedImports = importDecl.getNamedImports();

      for (const namedImport of namedImports) {
        if (namedImport.getName() === typeText) {
          return {
            typeName: typeText,
            modulePath: importDecl.getModuleSpecifierValue(),
          };
        }
      }
    }

    return null;
  }

  /**
   * Generate import statements for the new component
   */
  generateImportStatements(imports: TypeImport[]): string {
    if (imports.length === 0) {return '';}

    const lines = imports.map(
      ({ typeName, modulePath }) => `import { ${typeName} } from '${modulePath}';`
    );

    return lines.join('\n') + '\n';
  }
}
