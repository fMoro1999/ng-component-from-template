/**
 * WebviewScriptBuilder - Generates JavaScript for the preview webview.
 * Extracted from preview-webview-provider.ts for better separation of concerns.
 */
export class WebviewScriptBuilder {
  /**
   * Generate the complete JavaScript for the webview.
   * This script handles all user interactions and communication with the extension.
   */
  build(): string {
    return `
    ${this.buildVsCodeApiInitialization()}
    ${this.buildActionHandlers()}
    ${this.buildPropertyHandlers()}
    ${this.buildFileTabHandlers()}
    ${this.buildMessageListener()}
    `.trim();
  }

  private buildVsCodeApiInitialization(): string {
    return `
    const vscode = acquireVsCodeApi();
    `;
  }

  private buildActionHandlers(): string {
    return `
    function confirm() {
      vscode.postMessage({ command: 'confirm' });
    }

    function cancel() {
      vscode.postMessage({ command: 'cancel' });
    }

    function updateComponentName(value) {
      vscode.postMessage({ command: 'updateComponentName', value: value });
    }
    `;
  }

  private buildPropertyHandlers(): string {
    return `
    function toggleProperty(propertyType, propertyName) {
      vscode.postMessage({ command: 'toggleProperty', propertyType: propertyType, propertyName: propertyName });
    }

    function updatePropertyType(propertyType, propertyName, newType) {
      vscode.postMessage({ command: 'updatePropertyType', propertyType: propertyType, propertyName: propertyName, newType: newType });
    }

    function toggleLifecycleHook(hookName) {
      vscode.postMessage({ command: 'toggleLifecycleHook', hookName: hookName });
    }
    `;
  }

  private buildFileTabHandlers(): string {
    return `
    function showFile(fileType) {
      // Hide all file content panels
      document.getElementById('file-content-ts').style.display = 'none';
      document.getElementById('file-content-html').style.display = 'none';
      document.getElementById('file-content-scss').style.display = 'none';

      // Update tab active state
      document.querySelectorAll('.file-tab').forEach(function(tab) {
        tab.classList.remove('active');
      });

      // Show selected file content
      document.getElementById('file-content-' + fileType).style.display = 'block';
      event.target.classList.add('active');
    }
    `;
  }

  private buildMessageListener(): string {
    return `
    // Listen for state updates from extension
    window.addEventListener('message', function(event) {
      var message = event.data;
      switch (message.command) {
        case 'updateState':
          // Reload the entire webview with new state
          location.reload();
          break;
        case 'validationError':
          alert(message.message);
          break;
      }
    });
    `;
  }
}
