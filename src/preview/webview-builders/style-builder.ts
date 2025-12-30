/**
 * WebviewStyleBuilder - Generates CSS styles for the preview webview.
 * Extracted from preview-webview-provider.ts for better separation of concerns.
 */
export class WebviewStyleBuilder {
  /**
   * Generate the complete CSS stylesheet for the webview.
   */
  build(): string {
    return `
    ${this.buildBaseStyles()}
    ${this.buildHeaderStyles()}
    ${this.buildButtonStyles()}
    ${this.buildSectionStyles()}
    ${this.buildInputStyles()}
    ${this.buildPropertyStyles()}
    ${this.buildLifecycleHookStyles()}
    ${this.buildFilePreviewStyles()}
    ${this.buildServiceStyles()}
    `.trim();
  }

  private buildBaseStyles(): string {
    return `
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    `;
  }

  private buildHeaderStyles(): string {
    return `
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    h1 {
      margin: 0;
      font-size: 24px;
    }

    .actions {
      display: flex;
      gap: 10px;
    }
    `;
  }

  private buildButtonStyles(): string {
    return `
    button {
      padding: 8px 16px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
    }

    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    button.secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    button.secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }
    `;
  }

  private buildSectionStyles(): string {
    return `
    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 10px;
      color: var(--vscode-foreground);
    }

    .empty-state {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
    `;
  }

  private buildInputStyles(): string {
    return `
    .component-name-input {
      width: 100%;
      padding: 6px 8px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
    }
    `;
  }

  private buildPropertyStyles(): string {
    return `
    .property-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .property-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
    }

    .property-item.disabled {
      opacity: 0.5;
    }

    .property-checkbox {
      cursor: pointer;
    }

    .property-name {
      flex: 1;
      font-family: var(--vscode-editor-font-family);
      font-size: 13px;
    }

    .property-type {
      flex: 1;
      padding: 4px 8px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }

    .confidence-badge {
      padding: 2px 6px;
      border-radius: 2px;
      font-size: 10px;
      font-weight: 600;
    }

    .confidence-high {
      background-color: #10b981;
      color: white;
    }

    .confidence-medium {
      background-color: #f59e0b;
      color: white;
    }

    .confidence-low {
      background-color: #6b7280;
      color: white;
    }
    `;
  }

  private buildLifecycleHookStyles(): string {
    return `
    .lifecycle-hooks {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
    }

    .hook-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hook-checkbox {
      cursor: pointer;
    }

    .hook-label {
      font-size: 13px;
      cursor: pointer;
    }
    `;
  }

  private buildFilePreviewStyles(): string {
    return `
    .file-preview {
      margin-bottom: 20px;
    }

    .file-tabs {
      display: flex;
      gap: 2px;
      margin-bottom: 10px;
    }

    .file-tab {
      padding: 8px 16px;
      background-color: var(--vscode-tab-inactiveBackground);
      color: var(--vscode-tab-inactiveForeground);
      border: none;
      cursor: pointer;
      font-size: 13px;
    }

    .file-tab.active {
      background-color: var(--vscode-tab-activeBackground);
      color: var(--vscode-tab-activeForeground);
    }

    .file-content {
      padding: 12px;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
      overflow-x: auto;
    }

    pre {
      margin: 0;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      line-height: 1.5;
    }
    `;
  }

  private buildServiceStyles(): string {
    return `
    .service-input {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .service-input input {
      flex: 1;
      padding: 6px 8px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-size: 13px;
    }

    .service-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .service-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
    }

    .service-remove {
      padding: 4px 8px;
      font-size: 11px;
    }
    `;
  }
}
