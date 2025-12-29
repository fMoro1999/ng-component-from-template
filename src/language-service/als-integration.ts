import * as vscode from 'vscode';

/**
 * Angular Language Service Integration
 *
 * This module delegates template dependency resolution to the Angular Language Service (ALS)
 * using VS Code's public, stable APIs.
 *
 * Architecture:
 * 1. Generate component with empty imports: []
 * 2. Open generated file in editor
 * 3. Wait for ALS diagnostics to be ready
 * 4. Request Quick Fixes via vscode.executeCodeActionProvider
 * 5. Apply all "import" fixes from ALS
 *
 * Benefits:
 * - Always in sync with Angular version (14-20+)
 * - Supports custom library imports (PrimeNG, Material, etc.)
 * - No hardcoded symbol registries to maintain
 * - Future-proof against Angular syntax changes
 * - Uses public VS Code APIs (no brittle internals)
 */

export interface ALSQuickFixOptions {
  /** URI of the generated component file */
  componentUri: vscode.Uri;
  /** Timeout in milliseconds to wait for ALS diagnostics */
  timeout?: number;
  /** Whether to show progress notification to user */
  showProgress?: boolean;
  /** Number of fix passes to run (default: 2 for chained dependencies) */
  passes?: number;
}

export interface ALSQuickFixResult {
  /** Whether ALS quick fixes were successfully applied */
  success: boolean;
  /** Number of imports added by ALS */
  importsAdded: number;
  /** Error message if ALS failed */
  error?: string;
  /** Whether ALS was unavailable (not installed/not active) */
  alsUnavailable: boolean;
  /** Whether imports may still be missing after ALS (triggers fallback) */
  mayHaveMissingImports: boolean;
}

/**
 * Applies Angular Language Service quick fixes to resolve missing imports
 *
 * This function follows the correct VS Code API pattern:
 * 1. Opens the generated component file
 * 2. Waits for ALS to analyze and emit diagnostics
 * 3. Requests Quick Fixes via vscode.executeCodeActionProvider
 * 4. Filters for import-related fixes
 * 5. Applies them sequentially
 * 6. Optionally runs a second pass for chained dependencies
 *
 * @param options Configuration for ALS quick fix application
 * @returns Result indicating success and number of imports added
 */
export async function applyALSQuickFixes(
  options: ALSQuickFixOptions
): Promise<ALSQuickFixResult> {
  const {
    componentUri,
    timeout = 2000,
    showProgress = true,
    passes = 2,
  } = options;

  try {
    // Step 1: Open the generated component file
    // ALS does not reliably analyze unopened files
    const document = await vscode.workspace.openTextDocument(componentUri);
    await vscode.window.showTextDocument(document, {
      preview: false,
      preserveFocus: false,
    });

    let totalImportsAdded = 0;

    // Run multiple passes to catch chained dependencies
    for (let pass = 0; pass < passes; pass++) {
      // Step 2: Wait for ALS diagnostics to be ready
      await waitForDiagnostics(componentUri, timeout);

      // Step 3: Request Quick Fixes from ALS
      const quickFixes = await requestQuickFixesForDocument(document);

      if (!quickFixes || quickFixes.length === 0) {
        // No more fixes available
        break;
      }

      // Step 4: Filter for import-related quick fixes
      const importFixes = filterImportQuickFixes(quickFixes);

      if (importFixes.length === 0) {
        // No import fixes in this pass
        break;
      }

      // Step 5: Apply fixes sequentially
      const importsAdded = showProgress
        ? await applyQuickFixesWithProgress(importFixes)
        : await applyQuickFixes(importFixes);

      totalImportsAdded += importsAdded;

      // If no fixes were applied, stop iterating
      if (importsAdded === 0) {
        break;
      }
    }

    // Check if there might still be missing imports
    // (ALS succeeded but may not have resolved everything)
    const mayHaveMissingImports = totalImportsAdded === 0;

    return {
      success: true,
      importsAdded: totalImportsAdded,
      alsUnavailable: false,
      mayHaveMissingImports,
    };
  } catch (error) {
    return {
      success: false,
      importsAdded: 0,
      error: error instanceof Error ? error.message : String(error),
      alsUnavailable: false,
      mayHaveMissingImports: true,
    };
  }
}

/**
 * Waits for Angular Language Service to finish analyzing and emit diagnostics
 *
 * This is CRITICAL - ALS only provides quick fixes after diagnostics exist.
 *
 * Pattern:
 * - Listen for diagnostic changes on the specific file
 * - Resolve when diagnostics are emitted
 * - Fallback timeout if ALS is slow or no issues exist
 *
 * @param uri The component URI to wait for
 * @param timeout Maximum time to wait in milliseconds
 */
function waitForDiagnostics(uri: vscode.Uri, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    const timeoutHandle = setTimeout(() => {
      disposable.dispose();
      resolve();
    }, timeout);

    const disposable = vscode.languages.onDidChangeDiagnostics((event) => {
      // Check if diagnostics changed for our file
      const hasOurFile = event.uris.some(
        (u) => u.toString() === uri.toString()
      );

      if (hasOurFile) {
        clearTimeout(timeoutHandle);
        disposable.dispose();
        resolve();
      }
    });
  });
}

/**
 * Requests all Quick Fixes for a document using VS Code's public API
 *
 * This is the correct way to get ALS quick fixes:
 * - Use vscode.executeCodeActionProvider
 * - Request over entire document range
 * - Filter for QuickFix kind only
 *
 * @param document The document to get quick fixes for
 * @returns Array of code actions (quick fixes) from ALS and other providers
 */
async function requestQuickFixesForDocument(
  document: vscode.TextDocument
): Promise<vscode.CodeAction[]> {
  // Create range covering entire document
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length)
  );

  // Execute code action provider (this triggers ALS)
  const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
    'vscode.executeCodeActionProvider',
    document.uri,
    fullRange,
    vscode.CodeActionKind.QuickFix // Only request quick fixes, not refactorings
  );

  return actions || [];
}

/**
 * Filters code actions to find import-related quick fixes from ALS
 *
 * ALS quick fixes for imports typically have titles containing:
 * - "Import" + symbol name
 * - "Add" + "to imports"
 * - References to Angular modules (@angular/common, etc.)
 *
 * We use light filtering to avoid brittleness across ALS versions.
 *
 * @param codeActions All available code actions
 * @returns Filtered array of import-related quick fixes
 */
function filterImportQuickFixes(
  codeActions: vscode.CodeAction[]
): vscode.CodeAction[] {
  return codeActions.filter((action) => {
    const title = action.title.toLowerCase();

    // Match common ALS import quick fix patterns
    // Keep this broad to avoid breaking across ALS versions
    return (
      title.includes('import') ||
      (title.includes('add') && title.includes('imports'))
    );
  });
}

/**
 * Applies a list of quick fixes sequentially
 *
 * Each CodeAction may contain:
 * - edit: WorkspaceEdit to apply directly
 * - command: Command to execute (which applies the edit)
 *
 * Both patterns must be handled (ALS uses both).
 *
 * @param quickFixes Array of code actions to apply
 * @returns Number of quick fixes successfully applied
 */
async function applyQuickFixes(
  quickFixes: vscode.CodeAction[]
): Promise<number> {
  let applied = 0;

  for (const quickFix of quickFixes) {
    try {
      // Handle direct workspace edits
      if (quickFix.edit) {
        const success = await vscode.workspace.applyEdit(quickFix.edit);
        if (success) {
          applied++;
        }
      }

      // Handle command-based fixes
      if (quickFix.command) {
        await vscode.commands.executeCommand(
          quickFix.command.command,
          ...(quickFix.command.arguments || [])
        );
        applied++;
      }
    } catch (error) {
      console.error('Failed to apply ALS quick fix:', quickFix.title, error);
    }
  }

  return applied;
}

/**
 * Applies quick fixes with a progress notification
 *
 * @param quickFixes Array of code actions to apply
 * @returns Number of quick fixes successfully applied
 */
async function applyQuickFixesWithProgress(
  quickFixes: vscode.CodeAction[]
): Promise<number> {
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Resolving imports via Angular Language Service',
      cancellable: false,
    },
    async () => {
      return await applyQuickFixes(quickFixes);
    }
  );
}

/**
 * Checks if Angular Language Service is available in the workspace
 *
 * @returns True if ALS extension is installed and active
 */
export function isALSAvailable(): boolean {
  console.log('Checking for Angular Language Service extension');

  console.log(
    'Installed extensions:',
    vscode.extensions.all.map((ext) => ext.id)
  );

  // Check if Angular Language Service extension is installed
  const alsExtension = vscode.extensions.getExtension('Angular.ng-template');
  const alsExtensionExistsAndActive =
    alsExtension !== undefined && alsExtension.isActive;

  console.log(`ALS extension found: ${alsExtensionExistsAndActive}`);

  return alsExtensionExistsAndActive;
}
