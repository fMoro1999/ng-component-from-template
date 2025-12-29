import * as vscode from 'vscode';
import { PreviewDataCollector, CollectOptions } from './preview-data-collector';
import { PreviewStateManager, PreviewState } from './preview-state-manager';
import { PreviewWebviewProvider } from './preview-webview-provider';

export interface PreviewModeResult {
  confirmed: boolean;
  state?: PreviewState;
}

/**
 * Main orchestrator for Interactive Preview Mode
 * Coordinates data collection, state management, and webview display
 */
export class PreviewModeOrchestrator {
  private dataCollector: PreviewDataCollector;
  private stateManager: PreviewStateManager;
  private webviewProvider: PreviewWebviewProvider | null = null;

  constructor() {
    this.dataCollector = new PreviewDataCollector();
    this.stateManager = new PreviewStateManager();
  }

  /**
   * Show the preview mode UI and wait for user confirmation or cancellation
   * @param options Collection options for preview data
   * @param context VSCode extension context
   * @returns Promise that resolves when user confirms or cancels
   */
  async showPreview(
    options: CollectOptions,
    context: vscode.ExtensionContext
  ): Promise<PreviewModeResult> {
    return new Promise(async (resolve) => {
      try {
        // Step 1: Collect preview data
        const previewData = await this.dataCollector.collect(options);

        // Step 2: Initialize state manager
        this.stateManager.initialize(previewData);

        // Step 3: Create and show webview
        this.webviewProvider = new PreviewWebviewProvider(this.stateManager);

        // Step 4: Setup callbacks
        this.webviewProvider.onConfirm((finalState: PreviewState) => {
          resolve({
            confirmed: true,
            state: finalState
          });
        });

        this.webviewProvider.onCancel(() => {
          resolve({
            confirmed: false
          });
        });

        // Step 5: Show the preview
        await this.webviewProvider.show(context);

      } catch (error) {
        console.error('Preview mode error:', error);
        vscode.window.showErrorMessage(`Preview mode failed: ${error}`);
        resolve({
          confirmed: false
        });
      }
    });
  }

  /**
   * Get the current state (useful for testing)
   */
  getCurrentState(): PreviewState | null {
    try {
      return this.stateManager.getState();
    } catch {
      return null;
    }
  }
}
