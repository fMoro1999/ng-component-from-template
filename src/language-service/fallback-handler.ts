import * as vscode from 'vscode';
import {
  DependencyImportGenerator,
  TemplateDependencyAnalyzer,
} from '../template-dependency';

/**
 * Fallback Import Handler
 *
 * This module provides best-effort template dependency detection when
 * Angular Language Service is unavailable or fails to resolve imports.
 *
 * **Important:** This is NOT a replacement for ALS. It's a safety net.
 *
 * Pipeline:
 * 1. Primary: Angular Language Service (authoritative, future-proof)
 * 2. Fallback: This module (best-effort, heuristic-based)
 *
 * Limitations:
 * - Only detects hardcoded Angular Common symbols
 * - Cannot resolve custom library imports reliably
 * - May produce false positives/negatives
 * - User should verify imports manually
 */

export interface FallbackResult {
  /** Whether fallback was applied */
  applied: boolean;
  /** Number of imports added by fallback */
  importsAdded: number;
  /** Warning message for user */
  warning?: string;
}

/**
 * Applies fallback template dependency detection
 *
 * This function should ONLY be called when:
 * - ALS is unavailable (not installed/not active)
 * - ALS failed to provide quick fixes
 * - ALS timeout occurred
 *
 * @param componentUri URI of the generated component
 * @param template The HTML template string
 * @returns Result indicating fallback application
 */
export async function applyFallbackImports(
  componentUri: vscode.Uri,
  template: string
): Promise<FallbackResult> {
  try {
    // Step 1: Analyze template using regex-based detection
    const analyzer = new TemplateDependencyAnalyzer();
    const dependencies = analyzer.analyze(template);

    // Step 2: Generate import statements
    const importGenerator = new DependencyImportGenerator();
    const dependencyImports = importGenerator.generateImports(dependencies);
    const dependencyImportsArray =
      importGenerator.generateImportsArray(dependencies);

    // If no dependencies detected, skip
    if (dependencyImportsArray === '[]') {
      return {
        applied: false,
        importsAdded: 0,
      };
    }

    // Step 3: Open document and apply imports cautiously
    const document = await vscode.workspace.openTextDocument(componentUri);
    const text = document.getText();

    // Check if imports are already present (ALS may have added them)
    if (text.includes(dependencyImports.trim())) {
      return {
        applied: false,
        importsAdded: 0,
        warning: 'Imports already present',
      };
    }

    // Step 4: Insert imports using workspace edit
    const edit = new vscode.WorkspaceEdit();

    // Find insertion point (after existing imports, before @Component)
    const componentDecoratorIndex = text.indexOf('@Component');
    if (componentDecoratorIndex === -1) {
      return {
        applied: false,
        importsAdded: 0,
        warning: 'Cannot find @Component decorator',
      };
    }

    // Find last import statement before @Component
    const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm;
    let lastImportMatch;
    let match;

    while ((match = importRegex.exec(text.substring(0, componentDecoratorIndex)))) {
      lastImportMatch = match;
    }

    const insertPosition = lastImportMatch
      ? document.positionAt(lastImportMatch.index + lastImportMatch[0].length)
      : document.positionAt(0);

    // Insert dependency imports
    edit.insert(componentUri, insertPosition, `\n${dependencyImports}\n`);

    // Step 5: Update @Component imports array
    const importsArrayRegex = /imports:\s*\[(.*?)\]/s;
    const importsArrayMatch = text.match(importsArrayRegex);

    if (importsArrayMatch) {
      const currentImports = importsArrayMatch[1].trim();
      const newImports = dependencyImportsArray.slice(1, -1); // Remove [ ]

      if (currentImports === '') {
        // Replace empty array with new imports
        const range = new vscode.Range(
          document.positionAt(text.indexOf(importsArrayMatch[1])),
          document.positionAt(
            text.indexOf(importsArrayMatch[1]) + importsArrayMatch[1].length
          )
        );
        edit.replace(componentUri, range, newImports);
      } else {
        // Append to existing imports
        const insertPos = document.positionAt(
          text.indexOf(importsArrayMatch[1]) + importsArrayMatch[1].length
        );
        edit.insert(componentUri, insertPos, `, ${newImports}`);
      }
    }

    // Apply edit
    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      // Count imports added
      const importCount = dependencies.directives.length + dependencies.pipes.length;

      return {
        applied: true,
        importsAdded: importCount,
        warning:
          'Fallback heuristic applied. Please verify imports manually for custom components/pipes.',
      };
    }

    return {
      applied: false,
      importsAdded: 0,
      warning: 'Failed to apply fallback imports',
    };
  } catch (error) {
    return {
      applied: false,
      importsAdded: 0,
      warning: `Fallback error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Checks if a document likely has missing imports
 *
 * Simple heuristic: look for common Angular symbols in template
 * that aren't in the imports array
 *
 * @param document The component document
 * @param template The HTML template
 * @returns True if missing imports are likely
 */
export function likelyHasMissingImports(
  document: vscode.TextDocument,
  template: string
): boolean {
  const text = document.getText();

  // Common Angular symbols that would appear in templates
  const commonSymbols = [
    '*ngIf',
    '*ngFor',
    'async',
    'date',
    '[ngClass]',
    '[ngStyle]',
  ];

  // Check if any symbol is in template but not in imports
  for (const symbol of commonSymbols) {
    if (template.includes(symbol)) {
      // Simple check: is the corresponding import present?
      const symbolToImport: Record<string, string> = {
        '*ngIf': 'NgIf',
        '*ngFor': 'NgFor',
        'async': 'AsyncPipe',
        'date': 'DatePipe',
        '[ngClass]': 'NgClass',
        '[ngStyle]': 'NgStyle',
      };

      const importName = symbolToImport[symbol];
      if (importName && !text.includes(importName)) {
        return true;
      }
    }
  }

  return false;
}
