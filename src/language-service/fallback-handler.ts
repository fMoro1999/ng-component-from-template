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
 *
 * Improvements in this version:
 * - Better heuristic detection for common patterns
 * - Expanded symbol recognition
 * - More robust import insertion
 * - Detailed feedback to user
 */

export interface FallbackResult {
  /** Whether fallback was applied */
  applied: boolean;
  /** Number of imports added by fallback */
  importsAdded: number;
  /** Warning message for user */
  warning?: string;
  /** Detailed breakdown of what was detected */
  details?: {
    directivesFound: string[];
    pipesFound: string[];
    customComponentsFound: string[];
    potentiallyMissing: string[];
  };
}

/**
 * Applies fallback template dependency detection
 *
 * This function should ONLY be called when:
 * - ALS is unavailable (not installed/not active)
 * - ALS failed to provide quick fixes
 * - ALS timeout occurred
 *
 * The function performs conservative detection and clearly communicates
 * limitations to the user.
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

    // Collect detailed info for feedback
    const directivesFound = dependencies.directives.map(d => d.name);
    const pipesFound = dependencies.pipes.map(p => p.name);
    const customComponentsFound = dependencies.components
      .filter(c => c.isCustom)
      .map(c => c.selector);
    const potentiallyMissing: string[] = [];

    // Check for custom components/pipes that can't be auto-imported
    const customPipes = dependencies.pipes.filter(p => p.isCustom);
    if (customPipes.length > 0) {
      potentiallyMissing.push(
        ...customPipes.map(p => `Pipe: ${p.name} (custom - needs manual import)`)
      );
    }

    if (customComponentsFound.length > 0) {
      potentiallyMissing.push(
        ...customComponentsFound.map(c => `Component: ${c} (custom - needs manual import)`)
      );
    }

    // Step 2: Generate import statements
    const importGenerator = new DependencyImportGenerator();
    const dependencyImports = importGenerator.generateImports(dependencies);
    const dependencyImportsArray =
      importGenerator.generateImportsArray(dependencies);

    // If no dependencies detected, return with details
    if (dependencyImportsArray === '[]') {
      return {
        applied: false,
        importsAdded: 0,
        details: {
          directivesFound: [],
          pipesFound: [],
          customComponentsFound,
          potentiallyMissing,
        },
      };
    }

    // Step 3: Open document and apply imports cautiously
    const document = await vscode.workspace.openTextDocument(componentUri);
    const text = document.getText();

    // Check if imports are already present (ALS may have added them)
    // Use more robust checking - check for individual symbols
    const existingImports = extractExistingImports(text);
    const newSymbols = [...directivesFound, ...pipesFound.filter(p =>
      !dependencies.pipes.find(pipe => pipe.name === p && pipe.isCustom)
    )];
    const symbolsToAdd = newSymbols.filter(s => !existingImports.has(s));

    if (symbolsToAdd.length === 0) {
      return {
        applied: false,
        importsAdded: 0,
        warning: 'All detectable imports already present',
        details: {
          directivesFound,
          pipesFound,
          customComponentsFound,
          potentiallyMissing,
        },
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
        details: {
          directivesFound,
          pipesFound,
          customComponentsFound,
          potentiallyMissing,
        },
      };
    }

    // Find last import statement before @Component
    const importInsertPosition = findImportInsertPosition(document, text, componentDecoratorIndex);

    // Only add imports that aren't already present
    if (dependencyImports.trim() && !hasAllImportsPresent(text, symbolsToAdd)) {
      edit.insert(componentUri, importInsertPosition, `\n${dependencyImports}\n`);
    }

    // Step 5: Update @Component imports array
    const importsArrayUpdateResult = updateComponentImportsArray(
      edit,
      componentUri,
      document,
      text,
      dependencyImportsArray,
      existingImports
    );

    if (!importsArrayUpdateResult.success) {
      return {
        applied: false,
        importsAdded: 0,
        warning: importsArrayUpdateResult.error,
        details: {
          directivesFound,
          pipesFound,
          customComponentsFound,
          potentiallyMissing,
        },
      };
    }

    // Apply edit
    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      const importCount = symbolsToAdd.length;
      const warningParts: string[] = [];

      warningParts.push('Fallback heuristic applied.');

      if (potentiallyMissing.length > 0) {
        warningParts.push(`${potentiallyMissing.length} custom symbol(s) need manual import.`);
      }

      warningParts.push('Please verify imports manually.');

      return {
        applied: true,
        importsAdded: importCount,
        warning: warningParts.join(' '),
        details: {
          directivesFound,
          pipesFound,
          customComponentsFound,
          potentiallyMissing,
        },
      };
    }

    return {
      applied: false,
      importsAdded: 0,
      warning: 'Failed to apply fallback imports',
      details: {
        directivesFound,
        pipesFound,
        customComponentsFound,
        potentiallyMissing,
      },
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
 * Extracts existing import symbols from the file text
 */
function extractExistingImports(text: string): Set<string> {
  const imports = new Set<string>();

  // Match import statements: import { A, B, C } from '...'
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(text)) !== null) {
    const symbols = match[1].split(',').map(s => s.trim());
    symbols.forEach(s => {
      // Handle 'Symbol as Alias' pattern
      const actualSymbol = s.split(/\s+as\s+/)[0].trim();
      if (actualSymbol) {
        imports.add(actualSymbol);
      }
    });
  }

  return imports;
}

/**
 * Finds the appropriate position to insert new import statements
 */
function findImportInsertPosition(
  document: vscode.TextDocument,
  text: string,
  componentDecoratorIndex: number
): vscode.Position {
  const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm;
  let lastImportMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(text.substring(0, componentDecoratorIndex))) !== null) {
    lastImportMatch = match;
  }

  if (lastImportMatch) {
    return document.positionAt(lastImportMatch.index + lastImportMatch[0].length);
  }

  return document.positionAt(0);
}

/**
 * Checks if all specified imports are already present in the file
 */
function hasAllImportsPresent(text: string, symbols: string[]): boolean {
  return symbols.every(symbol => text.includes(symbol));
}

/**
 * Updates the @Component imports array with new dependencies
 */
function updateComponentImportsArray(
  edit: vscode.WorkspaceEdit,
  componentUri: vscode.Uri,
  document: vscode.TextDocument,
  text: string,
  dependencyImportsArray: string,
  existingImports: Set<string>
): { success: boolean; error?: string } {
  // Match imports array in @Component decorator
  // Handle multiline imports arrays
  const importsArrayRegex = /imports:\s*\[([\s\S]*?)\]/;
  const importsArrayMatch = text.match(importsArrayRegex);

  if (!importsArrayMatch) {
    // No imports array found - this might be okay if the component doesn't have one yet
    return { success: true };
  }

  const currentImportsContent = importsArrayMatch[1].trim();
  const newImports = dependencyImportsArray.slice(1, -1).trim(); // Remove [ ]

  if (!newImports) {
    return { success: true };
  }

  // Parse new imports to filter out already existing ones
  const newImportSymbols = newImports.split(',').map(s => s.trim()).filter(Boolean);
  const symbolsToAdd = newImportSymbols.filter(s => !existingImports.has(s));

  if (symbolsToAdd.length === 0) {
    return { success: true };
  }

  const symbolsToAddStr = symbolsToAdd.join(', ');

  // Find the position of the imports array content
  const importsArrayIndex = text.indexOf(importsArrayMatch[0]);
  const contentStartIndex = importsArrayIndex + importsArrayMatch[0].indexOf('[') + 1;

  if (currentImportsContent === '') {
    // Replace empty array content with new imports
    const range = new vscode.Range(
      document.positionAt(contentStartIndex),
      document.positionAt(contentStartIndex + importsArrayMatch[1].length)
    );
    edit.replace(componentUri, range, symbolsToAddStr);
  } else {
    // Append to existing imports
    const insertPos = document.positionAt(contentStartIndex + currentImportsContent.length);
    edit.insert(componentUri, insertPos, `, ${symbolsToAddStr}`);
  }

  return { success: true };
}

/**
 * Checks if a document likely has missing imports
 *
 * Enhanced heuristic that checks for common Angular symbols in template
 * and compares against imports in the component file.
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

  // Comprehensive mapping of template patterns to required imports
  const templatePatternToImport: Array<{ pattern: RegExp; importName: string }> = [
    // Structural directives
    { pattern: /\*ngIf(?:\s*=|\s+|>)/g, importName: 'NgIf' },
    { pattern: /\*ngFor(?:\s*=|\s+|>)/g, importName: 'NgFor' },
    { pattern: /\*ngSwitch(?:\s*=|\s+|>)/g, importName: 'NgSwitch' },
    { pattern: /\*ngSwitchCase(?:\s*=|\s+|>)/g, importName: 'NgSwitchCase' },
    { pattern: /\*ngSwitchDefault/g, importName: 'NgSwitchDefault' },

    // Property binding directives
    { pattern: /\[\s*ngClass\s*\]/g, importName: 'NgClass' },
    { pattern: /\[\s*ngStyle\s*\]/g, importName: 'NgStyle' },
    { pattern: /\[\s*ngSwitch\s*\]/g, importName: 'NgSwitch' },
    { pattern: /\[\s*ngTemplateOutlet\s*\]/g, importName: 'NgTemplateOutlet' },

    // Two-way binding directives
    { pattern: /\[\(\s*ngModel\s*\)\]/g, importName: 'NgModel' },
    { pattern: /\[\s*ngModel\s*\](?!\))/g, importName: 'NgModel' },

    // Common pipes (detected in interpolations)
    { pattern: /\|\s*async(?:\s|$|\|)/g, importName: 'AsyncPipe' },
    { pattern: /\|\s*date(?:\s*:|$|\||\s)/g, importName: 'DatePipe' },
    { pattern: /\|\s*uppercase(?:\s|$|\|)/g, importName: 'UpperCasePipe' },
    { pattern: /\|\s*lowercase(?:\s|$|\|)/g, importName: 'LowerCasePipe' },
    { pattern: /\|\s*currency(?:\s*:|$|\||\s)/g, importName: 'CurrencyPipe' },
    { pattern: /\|\s*percent(?:\s*:|$|\||\s)/g, importName: 'PercentPipe' },
    { pattern: /\|\s*json(?:\s|$|\|)/g, importName: 'JsonPipe' },
    { pattern: /\|\s*slice(?:\s*:|$|\||\s)/g, importName: 'SlicePipe' },
    { pattern: /\|\s*number(?:\s*:|$|\||\s)/g, importName: 'DecimalPipe' },
    { pattern: /\|\s*titlecase(?:\s|$|\|)/g, importName: 'TitleCasePipe' },
    { pattern: /\|\s*keyvalue(?:\s|$|\|)/g, importName: 'KeyValuePipe' },
  ];

  // Extract existing imports from the file
  const existingImports = extractExistingImports(text);

  // Also check the @Component imports array
  const componentImportsMatch = text.match(/imports:\s*\[([\s\S]*?)\]/);
  const componentImports = new Set<string>();
  if (componentImportsMatch) {
    const importsContent = componentImportsMatch[1];
    // Extract symbol names from the array
    const symbols = importsContent.split(',').map(s => s.trim()).filter(Boolean);
    symbols.forEach(s => componentImports.add(s));
  }

  // Check each pattern against the template
  for (const { pattern, importName } of templatePatternToImport) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;

    if (pattern.test(template)) {
      // Check if the import is present in either file imports or component imports array
      const hasImport = existingImports.has(importName) || componentImports.has(importName);

      if (!hasImport) {
        return true;
      }
    }
  }

  // Also check for custom components (elements with hyphens not in imports)
  const customComponentRegex = /<([a-z][\w-]*-[\w-]*)(?=\s|>|\/)/gi;
  let componentMatch: RegExpExecArray | null;

  while ((componentMatch = customComponentRegex.exec(template)) !== null) {
    const selector = componentMatch[1].toLowerCase();

    // Skip Angular built-in structural elements
    if (selector === 'ng-template' || selector === 'ng-container' || selector === 'ng-content') {
      continue;
    }

    // For custom components, we can't reliably check imports
    // but we can flag that there might be missing imports
    // This is a conservative check
    return true;
  }

  return false;
}

/**
 * Gets a list of potentially missing imports with their details
 *
 * More detailed version of likelyHasMissingImports that returns
 * specific information about what might be missing.
 *
 * @param document The component document
 * @param template The HTML template
 * @returns Array of potentially missing imports with details
 */
export function getPotentiallyMissingImports(
  document: vscode.TextDocument,
  template: string
): Array<{ symbol: string; type: 'directive' | 'pipe' | 'component'; reason: string }> {
  const text = document.getText();
  const missing: Array<{ symbol: string; type: 'directive' | 'pipe' | 'component'; reason: string }> = [];

  // Extract existing imports
  const existingImports = extractExistingImports(text);

  // Analyze template
  const analyzer = new TemplateDependencyAnalyzer();
  const dependencies = analyzer.analyze(template);

  // Check directives
  for (const directive of dependencies.directives) {
    if (!existingImports.has(directive.name)) {
      missing.push({
        symbol: directive.name,
        type: 'directive',
        reason: `Used in template but not imported from ${directive.module}`,
      });
    }
  }

  // Check pipes
  for (const pipe of dependencies.pipes) {
    if (!existingImports.has(pipe.name)) {
      missing.push({
        symbol: pipe.name,
        type: 'pipe',
        reason: pipe.isCustom
          ? 'Custom pipe - needs manual import'
          : `Used in template but not imported from ${pipe.module}`,
      });
    }
  }

  // Check custom components
  for (const component of dependencies.components) {
    if (component.isCustom) {
      missing.push({
        symbol: component.selector,
        type: 'component',
        reason: 'Custom component - needs manual import',
      });
    }
  }

  return missing;
}
