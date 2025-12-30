/**
 * WebviewHtmlBuilder - Generates HTML for the preview webview.
 * Extracted from preview-webview-provider.ts for better separation of concerns.
 */
import { PreviewState } from '../preview-state-manager';
import { PropertyPreview } from '../preview-data-collector';
import { AVAILABLE_LIFECYCLE_HOOKS } from '../lifecycle-hooks';
import { WebviewStyleBuilder } from './style-builder';
import { WebviewScriptBuilder } from './script-builder';

/**
 * Utility class for XSS protection through HTML escaping.
 */
export class HtmlEscaper {
  /**
   * Escape HTML special characters to prevent XSS attacks.
   * This method handles all HTML metacharacters that could be used for injection.
   */
  static escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Escape text for use in HTML attributes.
   * Includes additional escaping for attribute context.
   */
  static escapeAttribute(text: string): string {
    return HtmlEscaper.escape(text)
      .replace(/`/g, '&#96;')
      .replace(/\//g, '&#47;');
  }
}

export interface WebviewHtmlBuilderOptions {
  state: PreviewState;
}

export class WebviewHtmlBuilder {
  private state: PreviewState;
  private styleBuilder: WebviewStyleBuilder;
  private scriptBuilder: WebviewScriptBuilder;

  constructor(options: WebviewHtmlBuilderOptions) {
    this.state = options.state;
    this.styleBuilder = new WebviewStyleBuilder();
    this.scriptBuilder = new WebviewScriptBuilder();
  }

  /**
   * Build the complete HTML document for the webview.
   */
  build(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Preview</title>
  <style>
${this.styleBuilder.build()}
  </style>
</head>
<body>
${this.buildHeader()}
${this.buildComponentNameSection()}
${this.buildInputsSection()}
${this.buildOutputsSection()}
${this.buildModelsSection()}
${this.buildLifecycleHooksSection()}
${this.buildFilePreviewsSection()}
  <script>
${this.scriptBuilder.build()}
  </script>
</body>
</html>`;
  }

  private buildHeader(): string {
    return `
  <div class="header">
    <h1>Component Preview</h1>
    <div class="actions">
      <button class="secondary" onclick="cancel()">Cancel</button>
      <button onclick="confirm()">Generate Component</button>
    </div>
  </div>`;
  }

  private buildComponentNameSection(): string {
    const escapedName = HtmlEscaper.escapeAttribute(this.state.componentName);
    return `
  <div class="section">
    <div class="section-title">Component Name</div>
    <input
      type="text"
      class="component-name-input"
      value="${escapedName}"
      oninput="updateComponentName(this.value)"
      placeholder="my-component"
    />
  </div>`;
  }

  private buildInputsSection(): string {
    if (this.state.inputs.length === 0) {
      return '';
    }

    const enabledCount = this.state.inputs.filter(i => i.enabled).length;
    const totalCount = this.state.inputs.length;

    return `
  <div class="section">
    <div class="section-title">Inputs (${enabledCount}/${totalCount})</div>
    <div class="property-list">
      ${this.state.inputs.map(input => this.buildPropertyItem(input, 'input')).join('')}
    </div>
  </div>`;
  }

  private buildOutputsSection(): string {
    if (this.state.outputs.length === 0) {
      return '';
    }

    const enabledCount = this.state.outputs.filter(o => o.enabled).length;
    const totalCount = this.state.outputs.length;

    return `
  <div class="section">
    <div class="section-title">Outputs (${enabledCount}/${totalCount})</div>
    <div class="property-list">
      ${this.state.outputs.map(output => this.buildPropertyItem(output, 'output')).join('')}
    </div>
  </div>`;
  }

  private buildModelsSection(): string {
    if (this.state.models.length === 0) {
      return '';
    }

    const enabledCount = this.state.models.filter(m => m.enabled).length;
    const totalCount = this.state.models.length;

    return `
  <div class="section">
    <div class="section-title">Two-Way Bindings (${enabledCount}/${totalCount})</div>
    <div class="property-list">
      ${this.state.models.map(model => this.buildPropertyItem(model, 'model')).join('')}
    </div>
  </div>`;
  }

  private buildPropertyItem(property: PropertyPreview, propertyType: 'input' | 'output' | 'model'): string {
    const escapedName = HtmlEscaper.escapeAttribute(property.name);
    const escapedType = HtmlEscaper.escapeAttribute(property.type);
    const disabledClass = property.enabled ? '' : 'disabled';
    const checkedAttr = property.enabled ? 'checked' : '';
    const disabledAttr = property.enabled ? '' : 'disabled';

    return `
      <div class="property-item ${disabledClass}">
        <input
          type="checkbox"
          class="property-checkbox"
          ${checkedAttr}
          onchange="toggleProperty('${propertyType}', '${escapedName}')"
        />
        <span class="property-name">${HtmlEscaper.escape(property.name)}</span>
        <input
          type="text"
          class="property-type"
          value="${escapedType}"
          oninput="updatePropertyType('${propertyType}', '${escapedName}', this.value)"
          ${disabledAttr}
        />
        <span class="confidence-badge confidence-${property.inferenceConfidence}">${property.inferenceConfidence.toUpperCase()}</span>
      </div>`;
  }

  private buildLifecycleHooksSection(): string {
    return `
  <div class="section">
    <div class="section-title">Lifecycle Hooks</div>
    <div class="lifecycle-hooks">
      ${AVAILABLE_LIFECYCLE_HOOKS.map(hook => this.buildLifecycleHookItem(hook)).join('')}
    </div>
  </div>`;
  }

  private buildLifecycleHookItem(hook: { name: string; description: string }): string {
    const isChecked = this.state.lifecycleHooks.includes(hook.name);
    const checkedAttr = isChecked ? 'checked' : '';
    const escapedName = HtmlEscaper.escapeAttribute(hook.name);
    const escapedDescription = HtmlEscaper.escapeAttribute(hook.description);

    return `
      <div class="hook-item">
        <input
          type="checkbox"
          class="hook-checkbox"
          id="hook-${escapedName}"
          ${checkedAttr}
          onchange="toggleLifecycleHook('${escapedName}')"
        />
        <label class="hook-label" for="hook-${escapedName}" title="${escapedDescription}">${HtmlEscaper.escape(hook.name)}</label>
      </div>`;
  }

  private buildFilePreviewsSection(): string {
    const tsFile = this.state.filesToCreate.find(f => f.path.endsWith('.component.ts'));
    const htmlFile = this.state.filesToCreate.find(f => f.path.endsWith('.component.html'));
    const scssFile = this.state.filesToCreate.find(f => f.path.endsWith('.component.scss'));

    const tsContent = HtmlEscaper.escape(tsFile?.content || '');
    const htmlContent = HtmlEscaper.escape(htmlFile?.content || '');
    const scssContent = HtmlEscaper.escape(scssFile?.content || '<empty file>');

    return `
  <div class="section">
    <div class="section-title">File Previews</div>
    <div class="file-preview">
      <div class="file-tabs">
        <button class="file-tab active" onclick="showFile('ts')">TypeScript</button>
        <button class="file-tab" onclick="showFile('html')">HTML</button>
        <button class="file-tab" onclick="showFile('scss')">SCSS</button>
      </div>
      <div class="file-content" id="file-content-ts">
        <pre><code>${tsContent}</code></pre>
      </div>
      <div class="file-content" id="file-content-html" style="display: none;">
        <pre><code>${htmlContent}</code></pre>
      </div>
      <div class="file-content" id="file-content-scss" style="display: none;">
        <pre><code>${scssContent}</code></pre>
      </div>
    </div>
  </div>`;
  }
}
