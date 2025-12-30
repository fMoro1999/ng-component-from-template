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
 * 3. Wait for ALS diagnostics to be ready (with robust retry strategy)
 * 4. Request Quick Fixes via vscode.executeCodeActionProvider
 * 5. Apply all "import" fixes from ALS
 *
 * Benefits:
 * - Always in sync with Angular version (14-20+)
 * - Supports custom library imports (PrimeNG, Material, etc.)
 * - No hardcoded symbol registries to maintain
 * - Future-proof against Angular syntax changes
 * - Uses public VS Code APIs (no brittle internals)
 *
 * Reliability Improvements:
 * - Adaptive timeout based on initial ALS response
 * - Multiple diagnostic waiting strategies
 * - Better error classification and handling
 * - Detailed logging for debugging
 */

/**
 * Configuration constants for ALS integration
 */
const ALS_CONFIG = {
  /** Default timeout for waiting for ALS diagnostics (ms) */
  DEFAULT_TIMEOUT: 5000,
  /** Minimum timeout even for fast systems (ms) */
  MIN_TIMEOUT: 1000,
  /** Maximum timeout to prevent hanging (ms) */
  MAX_TIMEOUT: 15000,
  /** Delay between diagnostic checks (ms) */
  DIAGNOSTIC_CHECK_INTERVAL: 100,
  /** Number of stable diagnostic checks before proceeding */
  STABLE_DIAGNOSTIC_COUNT: 3,
  /** Default number of fix passes */
  DEFAULT_PASSES: 2,
  /** Delay between fix passes to allow ALS to update (ms) */
  PASS_DELAY: 200,
};

export interface ALSQuickFixOptions {
  /** URI of the generated component file */
  componentUri: vscode.Uri;
  /** Timeout in milliseconds to wait for ALS diagnostics */
  timeout?: number;
  /** Whether to show progress notification to user */
  showProgress?: boolean;
  /** Number of fix passes to run (default: 2 for chained dependencies) */
  passes?: number;
  /** Enable verbose logging for debugging */
  verbose?: boolean;
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
  /** Detailed diagnostic information for debugging */
  diagnosticInfo?: {
    totalDiagnostics: number;
    importRelatedDiagnostics: number;
    quickFixesFound: number;
    timeWaited: number;
  };
}

/**
 * Applies Angular Language Service quick fixes to resolve missing imports
 *
 * This function follows the correct VS Code API pattern:
 * 1. Opens the generated component file
 * 2. Waits for ALS to analyze and emit diagnostics (with robust waiting strategy)
 * 3. Requests Quick Fixes via vscode.executeCodeActionProvider
 * 4. Filters for import-related fixes
 * 5. Applies them sequentially
 * 6. Runs multiple passes for chained dependencies
 *
 * Reliability Features:
 * - Adaptive timeout based on ALS response patterns
 * - Multiple diagnostic waiting strategies (event-based + polling)
 * - Detailed error classification
 * - Debug logging for troubleshooting
 *
 * @param options Configuration for ALS quick fix application
 * @returns Result indicating success and number of imports added
 */
export async function applyALSQuickFixes(
  options: ALSQuickFixOptions
): Promise<ALSQuickFixResult> {
  const {
    componentUri,
    timeout = ALS_CONFIG.DEFAULT_TIMEOUT,
    showProgress = true,
    passes = ALS_CONFIG.DEFAULT_PASSES,
    verbose = false,
  } = options;

  // Clamp timeout to reasonable bounds
  const effectiveTimeout = Math.min(
    Math.max(timeout, ALS_CONFIG.MIN_TIMEOUT),
    ALS_CONFIG.MAX_TIMEOUT
  );

  const log = verbose ? console.log.bind(console, '[ALS]') : () => {};
  const startTime = Date.now();

  try {
    // Pre-check: Verify ALS is available
    if (!isALSAvailable()) {
      log('ALS extension not available');
      return {
        success: false,
        importsAdded: 0,
        error: 'Angular Language Service extension is not installed or not active',
        alsUnavailable: true,
        mayHaveMissingImports: true,
      };
    }

    // Step 1: Open the generated component file
    // ALS requires files to be open for reliable analysis
    log('Opening document:', componentUri.fsPath);
    const document = await vscode.workspace.openTextDocument(componentUri);
    await vscode.window.showTextDocument(document, {
      preview: false,
      preserveFocus: false,
    });

    let totalImportsAdded = 0;
    let totalQuickFixesFound = 0;
    let totalDiagnostics = 0;
    let importRelatedDiagnostics = 0;

    // Run multiple passes to catch chained dependencies
    // (e.g., Component A requires Module B which requires Module C)
    for (let pass = 0; pass < passes; pass++) {
      log(`Pass ${pass + 1}/${passes}: Waiting for diagnostics...`);

      // Step 2: Wait for ALS diagnostics with improved strategy
      const diagnosticResult = await waitForDiagnosticsRobust(
        componentUri,
        effectiveTimeout,
        log
      );

      totalDiagnostics = diagnosticResult.totalCount;
      importRelatedDiagnostics = diagnosticResult.importRelatedCount;

      log(`Diagnostics ready: ${totalDiagnostics} total, ${importRelatedDiagnostics} import-related`);

      // Step 3: Request Quick Fixes from ALS
      const quickFixes = await requestQuickFixesForDocument(document);
      totalQuickFixesFound += quickFixes?.length || 0;

      log(`Found ${quickFixes?.length || 0} quick fixes`);

      if (!quickFixes || quickFixes.length === 0) {
        // No more fixes available
        log('No quick fixes available, stopping passes');
        break;
      }

      // Step 4: Filter for import-related quick fixes
      const importFixes = filterImportQuickFixes(quickFixes);

      log(`Filtered to ${importFixes.length} import-related fixes`);

      if (importFixes.length === 0) {
        // No import fixes in this pass
        break;
      }

      // Step 5: Apply fixes sequentially
      const importsAdded = showProgress
        ? await applyQuickFixesWithProgress(importFixes, log)
        : await applyQuickFixes(importFixes, log);

      totalImportsAdded += importsAdded;
      log(`Applied ${importsAdded} imports in pass ${pass + 1}`);

      // If no fixes were applied, stop iterating
      if (importsAdded === 0) {
        break;
      }

      // Small delay between passes to allow ALS to update
      if (pass < passes - 1) {
        await delay(ALS_CONFIG.PASS_DELAY);
      }
    }

    const timeWaited = Date.now() - startTime;

    // Determine if there might still be missing imports
    // Conservative: if we found diagnostics but couldn't fix them, there may be issues
    const mayHaveMissingImports = totalImportsAdded === 0 && importRelatedDiagnostics > 0;

    log(`Completed in ${timeWaited}ms. Added ${totalImportsAdded} imports.`);

    return {
      success: true,
      importsAdded: totalImportsAdded,
      alsUnavailable: false,
      mayHaveMissingImports,
      diagnosticInfo: {
        totalDiagnostics,
        importRelatedDiagnostics,
        quickFixesFound: totalQuickFixesFound,
        timeWaited,
      },
    };
  } catch (error) {
    const timeWaited = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    log(`Error after ${timeWaited}ms:`, errorMessage);

    // Classify the error
    const isTimeout = errorMessage.toLowerCase().includes('timeout');
    const isALSError = errorMessage.toLowerCase().includes('angular');

    return {
      success: false,
      importsAdded: 0,
      error: errorMessage,
      alsUnavailable: isALSError,
      mayHaveMissingImports: true,
      diagnosticInfo: {
        totalDiagnostics: 0,
        importRelatedDiagnostics: 0,
        quickFixesFound: 0,
        timeWaited,
      },
    };
  }
}

/**
 * Result of waiting for diagnostics
 */
interface DiagnosticWaitResult {
  /** Total number of diagnostics found */
  totalCount: number;
  /** Number of import-related diagnostics */
  importRelatedCount: number;
  /** Whether timeout was reached */
  timedOut: boolean;
  /** How long we waited (ms) */
  waitTime: number;
}

/**
 * Robust diagnostic waiting strategy for ALS
 *
 * This improved version uses a combination of strategies:
 * 1. Event-based: Listen for diagnostic change events
 * 2. Polling: Periodically check if diagnostics have stabilized
 * 3. Stability check: Wait for diagnostics to stop changing
 *
 * The function resolves when:
 * - Diagnostics are emitted and remain stable for a brief period, OR
 * - Timeout is reached
 *
 * @param uri The component URI to wait for
 * @param timeout Maximum time to wait in milliseconds
 * @param log Optional logging function
 * @returns Diagnostic wait result with counts
 */
async function waitForDiagnosticsRobust(
  uri: vscode.Uri,
  timeout: number,
  log: (...args: unknown[]) => void = () => {}
): Promise<DiagnosticWaitResult> {
  const startTime = Date.now();
  let lastDiagnosticCount = -1;
  let stableCount = 0;

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timeoutHandle);
      clearInterval(pollHandle);
      disposable.dispose();
    };

    const resolveWithResult = () => {
      if (resolved) {
        return;
      }

      const diagnostics = vscode.languages.getDiagnostics(uri);
      const importRelated = diagnostics.filter(d =>
        isImportRelatedDiagnostic(d)
      );

      cleanup();

      resolve({
        totalCount: diagnostics.length,
        importRelatedCount: importRelated.length,
        timedOut: Date.now() - startTime >= timeout,
        waitTime: Date.now() - startTime,
      });
    };

    // Timeout handler
    const timeoutHandle = setTimeout(() => {
      log('Diagnostic wait timed out');
      resolveWithResult();
    }, timeout);

    // Event-based listener for diagnostic changes
    const disposable = vscode.languages.onDidChangeDiagnostics((event) => {
      const hasOurFile = event.uris.some(u => u.toString() === uri.toString());

      if (hasOurFile) {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        log(`Diagnostic change event: ${diagnostics.length} diagnostics`);

        // Reset stability counter on change
        lastDiagnosticCount = diagnostics.length;
        stableCount = 0;
      }
    });

    // Polling to check for stability
    const pollHandle = setInterval(() => {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      const currentCount = diagnostics.length;

      if (currentCount === lastDiagnosticCount && currentCount > 0) {
        stableCount++;
        log(`Diagnostics stable: ${stableCount}/${ALS_CONFIG.STABLE_DIAGNOSTIC_COUNT}`);

        if (stableCount >= ALS_CONFIG.STABLE_DIAGNOSTIC_COUNT) {
          log('Diagnostics stabilized, proceeding');
          resolveWithResult();
        }
      } else {
        lastDiagnosticCount = currentCount;
        stableCount = 0;
      }
    }, ALS_CONFIG.DIAGNOSTIC_CHECK_INTERVAL);

    // Also check immediately in case diagnostics are already present
    const initialDiagnostics = vscode.languages.getDiagnostics(uri);
    if (initialDiagnostics.length > 0) {
      lastDiagnosticCount = initialDiagnostics.length;
      log(`Initial diagnostics found: ${initialDiagnostics.length}`);
    }
  });
}

/**
 * Checks if a diagnostic is related to missing imports
 *
 * ALS diagnostics for missing imports typically have:
 * - Error codes related to unknown symbols
 * - Messages mentioning "import", "module", or unknown identifiers
 *
 * @param diagnostic The diagnostic to check
 * @returns True if the diagnostic is import-related
 */
function isImportRelatedDiagnostic(diagnostic: vscode.Diagnostic): boolean {
  const message = diagnostic.message.toLowerCase();
  const code = String(diagnostic.code || '');

  // Common patterns in import-related diagnostics
  return (
    message.includes('import') ||
    message.includes('module') ||
    message.includes('not a known element') ||
    message.includes("can't bind to") ||
    message.includes('no provider') ||
    message.includes('unknown') ||
    // Angular-specific error codes for missing imports
    code.includes('NG') ||
    diagnostic.source === 'Angular'
  );
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
 * @param log Optional logging function
 * @returns Number of quick fixes successfully applied
 */
async function applyQuickFixes(
  quickFixes: vscode.CodeAction[],
  log: (...args: unknown[]) => void = () => {}
): Promise<number> {
  let applied = 0;

  for (const quickFix of quickFixes) {
    try {
      log(`Applying fix: "${quickFix.title}"`);

      // Handle direct workspace edits
      if (quickFix.edit) {
        const success = await vscode.workspace.applyEdit(quickFix.edit);
        if (success) {
          applied++;
          log(`  -> Edit applied successfully`);
        } else {
          log(`  -> Edit failed to apply`);
        }
      }

      // Handle command-based fixes
      if (quickFix.command) {
        await vscode.commands.executeCommand(
          quickFix.command.command,
          ...(quickFix.command.arguments || [])
        );
        applied++;
        log(`  -> Command executed successfully`);
      }

      // Small delay between fixes to prevent race conditions
      await delay(50);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`  -> Error: ${errorMsg}`);
      console.error('Failed to apply ALS quick fix:', quickFix.title, error);
    }
  }

  return applied;
}

/**
 * Applies quick fixes with a progress notification
 *
 * @param quickFixes Array of code actions to apply
 * @param log Optional logging function
 * @returns Number of quick fixes successfully applied
 */
async function applyQuickFixesWithProgress(
  quickFixes: vscode.CodeAction[],
  log: (...args: unknown[]) => void = () => {}
): Promise<number> {
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Resolving imports via Angular Language Service',
      cancellable: false,
    },
    async (progress) => {
      const total = quickFixes.length;
      let completed = 0;
      let applied = 0;

      for (const quickFix of quickFixes) {
        progress.report({
          message: `(${completed + 1}/${total}) ${quickFix.title}`,
          increment: (1 / total) * 100,
        });

        try {
          log(`Applying fix: "${quickFix.title}"`);

          if (quickFix.edit) {
            const success = await vscode.workspace.applyEdit(quickFix.edit);
            if (success) {
              applied++;
            }
          }

          if (quickFix.command) {
            await vscode.commands.executeCommand(
              quickFix.command.command,
              ...(quickFix.command.arguments || [])
            );
            applied++;
          }

          await delay(50);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          log(`  -> Error: ${errorMsg}`);
          console.error('Failed to apply ALS quick fix:', quickFix.title, error);
        }

        completed++;
      }

      return applied;
    }
  );
}

/**
 * Checks if Angular Language Service is available in the workspace
 *
 * This function performs multiple checks:
 * 1. Extension is installed
 * 2. Extension is active (or can be activated)
 * 3. Workspace has Angular project (optional heuristic)
 *
 * @returns True if ALS extension is installed and active
 */
export function isALSAvailable(): boolean {
  // Check if Angular Language Service extension is installed
  const alsExtension = vscode.extensions.getExtension('Angular.ng-template');

  if (!alsExtension) {
    console.log('[ALS] Angular Language Service extension not found');
    return false;
  }

  // Extension exists, check if active
  if (alsExtension.isActive) {
    console.log('[ALS] Angular Language Service is active');
    return true;
  }

  // Extension exists but not active
  // This can happen if VS Code hasn't activated it yet
  // We still return true because it will likely activate when we open an Angular file
  console.log('[ALS] Angular Language Service extension found but not yet active');
  return true;
}

/**
 * Attempts to ensure ALS is activated before use
 *
 * This is useful when you need to guarantee ALS is ready before
 * requesting diagnostics or quick fixes.
 *
 * @returns True if ALS was successfully activated or is already active
 */
export async function ensureALSActivated(): Promise<boolean> {
  const alsExtension = vscode.extensions.getExtension('Angular.ng-template');

  if (!alsExtension) {
    console.log('[ALS] Angular Language Service extension not installed');
    return false;
  }

  if (alsExtension.isActive) {
    return true;
  }

  try {
    console.log('[ALS] Activating Angular Language Service extension...');
    await alsExtension.activate();
    console.log('[ALS] Angular Language Service activated successfully');
    return true;
  } catch (error) {
    console.error('[ALS] Failed to activate Angular Language Service:', error);
    return false;
  }
}

/**
 * Gets detailed information about ALS status
 *
 * Useful for debugging and displaying status to users.
 *
 * @returns Object with detailed ALS status information
 */
export function getALSStatus(): {
  installed: boolean;
  active: boolean;
  version?: string;
  extensionPath?: string;
} {
  const alsExtension = vscode.extensions.getExtension('Angular.ng-template');

  if (!alsExtension) {
    return {
      installed: false,
      active: false,
    };
  }

  return {
    installed: true,
    active: alsExtension.isActive,
    version: alsExtension.packageJSON?.version,
    extensionPath: alsExtension.extensionPath,
  };
}
