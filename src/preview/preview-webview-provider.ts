import * as vscode from 'vscode';
import { PreviewState, PreviewStateManager } from './preview-state-manager';
import { DiffGenerator } from './diff-generator';
import { AVAILABLE_LIFECYCLE_HOOKS } from './lifecycle-hooks';

export class PreviewWebviewProvider {
  private panel: vscode.WebviewPanel | null = null;
  private stateManager: PreviewStateManager;
  private diffGenerator: DiffGenerator;
  private onConfirmCallback: ((state: PreviewState) => void) | null = null;
  private onCancelCallback: (() => void) | null = null;

  constructor(stateManager: PreviewStateManager) {
    this.stateManager = stateManager;
    this.diffGenerator = new DiffGenerator();
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
        retainContextWhenHidden: true
      }
    );

    // Set HTML content
    this.panel.webview.html = this.getWebviewContent(state);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      undefined,
      context.subscriptions
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = null;
      if (this.onCancelCallback) {
        this.onCancelCallback();
      }
    });
  }

  onConfirm(callback: (state: PreviewState) => void): void {
    this.onConfirmCallback = callback;
  }

  onCancel(callback: () => void): void {
    this.onCancelCallback = callback;
  }

  private handleMessage(message: any): void {
    switch (message.command) {
      case 'confirm':
        if (this.panel) {
          this.panel.dispose();
        }
        if (this.onConfirmCallback) {
          this.onConfirmCallback(this.stateManager.getState());
        }
        break;

      case 'cancel':
        if (this.panel) {
          this.panel.dispose();
        }
        if (this.onCancelCallback) {
          this.onCancelCallback();
        }
        break;

      case 'updateComponentName':
        const isValid = this.stateManager.updateComponentName(message.value);
        if (isValid) {
          this.updateWebview();
        } else {
          this.sendMessage({ command: 'validationError', field: 'componentName', message: 'Invalid component name. Use kebab-case (e.g., my-component)' });
        }
        break;

      case 'toggleProperty':
        this.stateManager.toggleProperty(message.propertyType, message.propertyName);
        this.updateWebview();
        break;

      case 'updatePropertyType':
        this.stateManager.updatePropertyType(message.propertyType, message.propertyName, message.newType);
        this.updateWebview();
        break;

      case 'toggleLifecycleHook':
        this.stateManager.toggleLifecycleHook(message.hookName);
        this.updateWebview();
        break;

      case 'addService':
        this.stateManager.addService(message.serviceName, message.importPath);
        this.updateWebview();
        break;

      case 'removeService':
        this.stateManager.removeService(message.serviceName);
        this.updateWebview();
        break;
    }
  }

  private updateWebview(): void {
    if (this.panel) {
      const state = this.stateManager.getState();
      this.sendMessage({ command: 'updateState', state });
    }
  }

  private sendMessage(message: any): void {
    if (this.panel) {
      this.panel.webview.postMessage(message);
    }
  }

  private getWebviewContent(state: PreviewState): string {
    const tsFile = state.filesToCreate.find(f => f.path.endsWith('.component.ts'));
    const htmlFile = state.filesToCreate.find(f => f.path.endsWith('.component.html'));
    const scssFile = state.filesToCreate.find(f => f.path.endsWith('.component.scss'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Preview</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }

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

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 10px;
      color: var(--vscode-foreground);
    }

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

    .empty-state {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }

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
  </style>
</head>
<body>
  <div class="header">
    <h1>Component Preview</h1>
    <div class="actions">
      <button class="secondary" onclick="cancel()">Cancel</button>
      <button onclick="confirm()">Generate Component</button>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Component Name</div>
    <input
      type="text"
      class="component-name-input"
      value="${state.componentName}"
      oninput="updateComponentName(this.value)"
      placeholder="my-component"
    />
  </div>

  ${state.inputs.length > 0 ? `
  <div class="section">
    <div class="section-title">Inputs (${state.inputs.filter(i => i.enabled).length}/${state.inputs.length})</div>
    <div class="property-list">
      ${state.inputs.map(input => `
        <div class="property-item ${input.enabled ? '' : 'disabled'}">
          <input
            type="checkbox"
            class="property-checkbox"
            ${input.enabled ? 'checked' : ''}
            onchange="toggleProperty('input', '${input.name}')"
          />
          <span class="property-name">${input.name}</span>
          <input
            type="text"
            class="property-type"
            value="${input.type}"
            oninput="updatePropertyType('input', '${input.name}', this.value)"
            ${!input.enabled ? 'disabled' : ''}
          />
          <span class="confidence-badge confidence-${input.inferenceConfidence}">${input.inferenceConfidence.toUpperCase()}</span>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${state.outputs.length > 0 ? `
  <div class="section">
    <div class="section-title">Outputs (${state.outputs.filter(o => o.enabled).length}/${state.outputs.length})</div>
    <div class="property-list">
      ${state.outputs.map(output => `
        <div class="property-item ${output.enabled ? '' : 'disabled'}">
          <input
            type="checkbox"
            class="property-checkbox"
            ${output.enabled ? 'checked' : ''}
            onchange="toggleProperty('output', '${output.name}')"
          />
          <span class="property-name">${output.name}</span>
          <input
            type="text"
            class="property-type"
            value="${output.type}"
            oninput="updatePropertyType('output', '${output.name}', this.value)"
            ${!output.enabled ? 'disabled' : ''}
          />
          <span class="confidence-badge confidence-${output.inferenceConfidence}">${output.inferenceConfidence.toUpperCase()}</span>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${state.models.length > 0 ? `
  <div class="section">
    <div class="section-title">Two-Way Bindings (${state.models.filter(m => m.enabled).length}/${state.models.length})</div>
    <div class="property-list">
      ${state.models.map(model => `
        <div class="property-item ${model.enabled ? '' : 'disabled'}">
          <input
            type="checkbox"
            class="property-checkbox"
            ${model.enabled ? 'checked' : ''}
            onchange="toggleProperty('model', '${model.name}')"
          />
          <span class="property-name">${model.name}</span>
          <input
            type="text"
            class="property-type"
            value="${model.type}"
            oninput="updatePropertyType('model', '${model.name}', this.value)"
            ${!model.enabled ? 'disabled' : ''}
          />
          <span class="confidence-badge confidence-${model.inferenceConfidence}">${model.inferenceConfidence.toUpperCase()}</span>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Lifecycle Hooks</div>
    <div class="lifecycle-hooks">
      ${AVAILABLE_LIFECYCLE_HOOKS.map(hook => `
        <div class="hook-item">
          <input
            type="checkbox"
            class="hook-checkbox"
            id="hook-${hook.name}"
            ${state.lifecycleHooks.includes(hook.name) ? 'checked' : ''}
            onchange="toggleLifecycleHook('${hook.name}')"
          />
          <label class="hook-label" for="hook-${hook.name}" title="${hook.description}">${hook.name}</label>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">File Previews</div>
    <div class="file-preview">
      <div class="file-tabs">
        <button class="file-tab active" onclick="showFile('ts')">TypeScript</button>
        <button class="file-tab" onclick="showFile('html')">HTML</button>
        <button class="file-tab" onclick="showFile('scss')">SCSS</button>
      </div>
      <div class="file-content" id="file-content-ts">
        <pre><code>${this.escapeHtml(tsFile?.content || '')}</code></pre>
      </div>
      <div class="file-content" id="file-content-html" style="display: none;">
        <pre><code>${this.escapeHtml(htmlFile?.content || '')}</code></pre>
      </div>
      <div class="file-content" id="file-content-scss" style="display: none;">
        <pre><code>${this.escapeHtml(scssFile?.content || '<empty file>')}</code></pre>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function confirm() {
      vscode.postMessage({ command: 'confirm' });
    }

    function cancel() {
      vscode.postMessage({ command: 'cancel' });
    }

    function updateComponentName(value) {
      vscode.postMessage({ command: 'updateComponentName', value });
    }

    function toggleProperty(propertyType, propertyName) {
      vscode.postMessage({ command: 'toggleProperty', propertyType, propertyName });
    }

    function updatePropertyType(propertyType, propertyName, newType) {
      vscode.postMessage({ command: 'updatePropertyType', propertyType, propertyName, newType });
    }

    function toggleLifecycleHook(hookName) {
      vscode.postMessage({ command: 'toggleLifecycleHook', hookName });
    }

    function showFile(fileType) {
      // Hide all
      document.getElementById('file-content-ts').style.display = 'none';
      document.getElementById('file-content-html').style.display = 'none';
      document.getElementById('file-content-scss').style.display = 'none';

      // Update tabs
      document.querySelectorAll('.file-tab').forEach(tab => tab.classList.remove('active'));

      // Show selected
      document.getElementById('file-content-' + fileType).style.display = 'block';
      event.target.classList.add('active');
    }

    // Listen for state updates from extension
    window.addEventListener('message', event => {
      const message = event.data;
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
  </script>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
