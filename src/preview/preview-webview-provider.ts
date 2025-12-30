import * as vscode from 'vscode';
import { PreviewState, PreviewStateManager } from './preview-state-manager';
import { WebviewHtmlBuilder } from './webview-builders';
import {
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
  isWebviewToExtensionMessage,
  isConfirmMessage,
  isCancelMessage,
  isUpdateComponentNameMessage,
  isTogglePropertyMessage,
  isUpdatePropertyTypeMessage,
  isToggleLifecycleHookMessage,
  isAddServiceMessage,
  isRemoveServiceMessage,
} from './webview-messages';

/**
 * PreviewWebviewProvider - Manages the preview webview panel.
 *
 * This class handles:
 * - Webview panel lifecycle management
 * - Communication between extension and webview
 * - State updates and rendering
 *
 * Memory Management:
 * - All event listeners are properly registered with context.subscriptions
 * - The panel disposal is handled to clean up resources
 * - Callbacks are cleared on disposal to prevent memory leaks
 */
export class PreviewWebviewProvider {
  private panel: vscode.WebviewPanel | null = null;
  private stateManager: PreviewStateManager;
  private onConfirmCallback: ((state: PreviewState) => void) | null = null;
  private onCancelCallback: (() => void) | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor(stateManager: PreviewStateManager) {
    this.stateManager = stateManager;
  }

  async show(context: vscode.ExtensionContext): Promise<void> {
    const state = this.stateManager.getState();

    // Create webview panel
    this.panel = vscode.window.createWebviewPanel(
      'angularComponentPreview',
      'Component Preview',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        // Additional security: restrict webview capabilities
        localResourceRoots: []
      }
    );

    // Set HTML content using the builder
    this.panel.webview.html = this.getWebviewContent(state);

    // Handle messages from webview with proper disposal
    const messageDisposable = this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      undefined,
      context.subscriptions
    );
    this.disposables.push(messageDisposable);

    // Handle panel disposal
    const disposeDisposable = this.panel.onDidDispose(() => {
      this.handleDisposal();
    });
    this.disposables.push(disposeDisposable);
  }

  /**
   * Register a callback to be called when the user confirms the preview.
   */
  onConfirm(callback: (state: PreviewState) => void): void {
    this.onConfirmCallback = callback;
  }

  /**
   * Register a callback to be called when the user cancels the preview.
   */
  onCancel(callback: () => void): void {
    this.onCancelCallback = callback;
  }

  /**
   * Dispose of the webview and clean up resources.
   */
  dispose(): void {
    if (this.panel) {
      this.panel.dispose();
    }
    this.handleDisposal();
  }

  /**
   * Handle the disposal of the panel and clean up resources.
   */
  private handleDisposal(): void {
    this.panel = null;

    // Dispose all registered disposables
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];

    // Invoke cancel callback if registered
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }

    // Clear callbacks to prevent memory leaks
    this.onConfirmCallback = null;
    this.onCancelCallback = null;
  }

  /**
   * Handle incoming messages from the webview.
   * Uses type guards for type-safe message handling.
   */
  private handleMessage(message: unknown): void {
    // Validate message structure
    if (!isWebviewToExtensionMessage(message)) {
      console.warn('Received invalid message from webview:', message);
      return;
    }

    if (isConfirmMessage(message)) {
      this.handleConfirm();
    } else if (isCancelMessage(message)) {
      this.handleCancel();
    } else if (isUpdateComponentNameMessage(message)) {
      this.handleUpdateComponentName(message.value);
    } else if (isTogglePropertyMessage(message)) {
      this.handleToggleProperty(message.propertyType, message.propertyName);
    } else if (isUpdatePropertyTypeMessage(message)) {
      this.handleUpdatePropertyType(message.propertyType, message.propertyName, message.newType);
    } else if (isToggleLifecycleHookMessage(message)) {
      this.handleToggleLifecycleHook(message.hookName);
    } else if (isAddServiceMessage(message)) {
      this.handleAddService(message.serviceName, message.importPath);
    } else if (isRemoveServiceMessage(message)) {
      this.handleRemoveService(message.serviceName);
    }
  }

  private handleConfirm(): void {
    if (this.panel) {
      // Store callback before disposal clears it
      const callback = this.onConfirmCallback;
      const state = this.stateManager.getState();

      // Clear cancel callback to prevent it from being called during disposal
      this.onCancelCallback = null;

      this.panel.dispose();

      if (callback) {
        callback(state);
      }
    }
  }

  private handleCancel(): void {
    if (this.panel) {
      this.panel.dispose();
    }
    // onCancelCallback is called in handleDisposal
  }

  private handleUpdateComponentName(value: string): void {
    const isValid = this.stateManager.updateComponentName(value);
    if (isValid) {
      this.updateWebview();
    } else {
      this.sendMessage({
        command: 'validationError',
        field: 'componentName',
        message: 'Invalid component name. Use kebab-case (e.g., my-component)'
      });
    }
  }

  private handleToggleProperty(propertyType: 'input' | 'output' | 'model', propertyName: string): void {
    this.stateManager.toggleProperty(propertyType, propertyName);
    this.updateWebview();
  }

  private handleUpdatePropertyType(propertyType: 'input' | 'output' | 'model', propertyName: string, newType: string): void {
    this.stateManager.updatePropertyType(propertyType, propertyName, newType);
    this.updateWebview();
  }

  private handleToggleLifecycleHook(hookName: string): void {
    this.stateManager.toggleLifecycleHook(hookName);
    this.updateWebview();
  }

  private handleAddService(serviceName: string, importPath: string): void {
    this.stateManager.addService(serviceName, importPath);
    this.updateWebview();
  }

  private handleRemoveService(serviceName: string): void {
    this.stateManager.removeService(serviceName);
    this.updateWebview();
  }

  /**
   * Update the webview with the current state.
   */
  private updateWebview(): void {
    if (this.panel) {
      const state = this.stateManager.getState();
      this.sendMessage({ command: 'updateState', state });
    }
  }

  /**
   * Send a message to the webview.
   */
  private sendMessage(message: ExtensionToWebviewMessage): void {
    if (this.panel) {
      this.panel.webview.postMessage(message);
    }
  }

  /**
   * Generate the HTML content for the webview using the builder.
   */
  private getWebviewContent(state: PreviewState): string {
    const builder = new WebviewHtmlBuilder({ state });
    return builder.build();
  }
}
