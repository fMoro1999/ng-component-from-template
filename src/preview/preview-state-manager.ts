import * as path from 'path';
import { PreviewData, PropertyPreview, FilePreview } from './preview-data-collector';
import { generateLifecycleHookMethods, generateLifecycleHookImports, generateLifecycleHookImplements } from './lifecycle-hooks';

export interface ServiceInjection {
  name: string;
  importPath: string;
}

export interface PreviewState extends PreviewData {
  lifecycleHooks: string[];
  services: ServiceInjection[];
}

export class PreviewStateManager {
  private state: PreviewState | null = null;

  initialize(previewData: PreviewData): void {
    this.state = {
      ...previewData,
      lifecycleHooks: [],
      services: []
    };
  }

  getState(): PreviewState {
    if (!this.state) {
      throw new Error('PreviewStateManager not initialized');
    }
    return { ...this.state };
  }

  updateComponentName(newName: string): boolean {
    if (!this.state) {
      return false;
    }

    // Validate component name (must be kebab-case)
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(newName)) {
      return false;
    }

    this.state.componentName = newName;
    this.regenerateFilePreviews();
    return true;
  }

  toggleProperty(propertyType: 'input' | 'output' | 'model', propertyName: string): void {
    if (!this.state) {
      return;
    }

    const propertyArray = this.getPropertyArray(propertyType);
    const property = propertyArray.find(p => p.name === propertyName);

    if (property) {
      property.enabled = !property.enabled;
      this.regenerateFilePreviews();
    }
  }

  updatePropertyType(propertyType: 'input' | 'output' | 'model', propertyName: string, newType: string): void {
    if (!this.state) {
      return;
    }

    const propertyArray = this.getPropertyArray(propertyType);
    const property = propertyArray.find(p => p.name === propertyName);

    if (property) {
      property.type = newType;
      this.regenerateFilePreviews();
    }
  }

  toggleLifecycleHook(hookName: string): void {
    if (!this.state) {
      return;
    }

    const index = this.state.lifecycleHooks.indexOf(hookName);
    if (index > -1) {
      this.state.lifecycleHooks.splice(index, 1);
    } else {
      this.state.lifecycleHooks.push(hookName);
    }

    this.regenerateFilePreviews();
  }

  addService(serviceName: string, importPath: string): void {
    if (!this.state) {
      return;
    }

    this.state.services.push({ name: serviceName, importPath });
    this.regenerateFilePreviews();
  }

  removeService(serviceName: string): void {
    if (!this.state) {
      return;
    }

    const index = this.state.services.findIndex(s => s.name === serviceName);
    if (index > -1) {
      this.state.services.splice(index, 1);
      this.regenerateFilePreviews();
    }
  }

  private getPropertyArray(propertyType: 'input' | 'output' | 'model'): PropertyPreview[] {
    if (!this.state) {
      return [];
    }

    switch (propertyType) {
      case 'input':
        return this.state.inputs;
      case 'output':
        return this.state.outputs;
      case 'model':
        return this.state.models;
    }
  }

  private regenerateFilePreviews(): void {
    if (!this.state) {
      return;
    }

    // Find the TypeScript file and regenerate it
    const tsFileIndex = this.state.filesToCreate.findIndex(f => f.path.endsWith('.component.ts'));
    if (tsFileIndex > -1) {
      const newContent = this.generateComponentTsContent();
      this.state.filesToCreate[tsFileIndex] = {
        ...this.state.filesToCreate[tsFileIndex],
        path: this.state.filesToCreate[tsFileIndex].path.replace(/[^/]+\.component\.ts$/, `${this.state.componentName}.component.ts`),
        content: newContent
      };
    }

    // Update HTML file path
    const htmlFileIndex = this.state.filesToCreate.findIndex(f => f.path.endsWith('.component.html'));
    if (htmlFileIndex > -1) {
      this.state.filesToCreate[htmlFileIndex] = {
        ...this.state.filesToCreate[htmlFileIndex],
        path: this.state.filesToCreate[htmlFileIndex].path.replace(/[^/]+\.component\.html$/, `${this.state.componentName}.component.html`)
      };
    }

    // Update SCSS file path
    const scssFileIndex = this.state.filesToCreate.findIndex(f => f.path.endsWith('.component.scss'));
    if (scssFileIndex > -1) {
      this.state.filesToCreate[scssFileIndex] = {
        ...this.state.filesToCreate[scssFileIndex],
        path: this.state.filesToCreate[scssFileIndex].path.replace(/[^/]+\.component\.scss$/, `${this.state.componentName}.component.scss`)
      };
    }
  }

  private generateComponentTsContent(): string {
    if (!this.state) {
      return '';
    }

    const componentClassName = this.toComponentClassName(this.state.componentName);

    // Generate imports
    const imports: string[] = ['ChangeDetectionStrategy', 'Component'];

    // Add input/output/model imports
    const enabledInputs = this.state.inputs.filter(i => i.enabled);
    const enabledOutputs = this.state.outputs.filter(o => o.enabled);
    const enabledModels = this.state.models.filter(m => m.enabled);

    if (enabledInputs.length > 0) {
      imports.push('input');
    }
    if (enabledOutputs.length > 0) {
      imports.push('output');
    }
    if (enabledModels.length > 0) {
      imports.push('model');
    }

    // Add lifecycle hook imports
    if (this.state.lifecycleHooks.length > 0) {
      const hookImports = generateLifecycleHookImports(this.state.lifecycleHooks);
      if (hookImports) {
        imports.push(hookImports);
      }
    }

    // Add SimpleChanges if ngOnChanges is selected
    if (this.state.lifecycleHooks.includes('ngOnChanges')) {
      imports.push('SimpleChanges');
    }

    const importStatement = `import { ${imports.join(', ')} } from '@angular/core';`;

    // Generate service imports
    const serviceImports = this.state.services.map(s =>
      `import { ${s.name} } from '${s.importPath}';`
    ).join('\n');

    // Generate properties
    const inputsCode = enabledInputs.map(i =>
      `\t${i.name} = input${i.isRequired ? '.required' : ''}<${i.type}>();`
    ).join('\n\t');

    const outputsCode = enabledOutputs.map(o =>
      `\t${o.name} = output<${o.type}>();`
    ).join('\n\t');

    const modelsCode = enabledModels.map(m =>
      `\t${m.name} = model${m.isRequired ? '.required' : ''}<${m.type}>();`
    ).join('\n\t');

    // Generate constructor if services are injected
    const constructor = this.state.services.length > 0
      ? `\n\tconstructor(\n${this.state.services.map(s => `\t\tprivate ${this.toLowerCamelCase(s.name)}: ${s.name}`).join(',\n')}\n\t) {}`
      : '';

    // Generate lifecycle hook methods
    const lifecycleMethodsCode = generateLifecycleHookMethods(this.state.lifecycleHooks);

    // Generate implements clause
    const implementsClause = this.state.lifecycleHooks.length > 0
      ? ` ${generateLifecycleHookImplements(this.state.lifecycleHooks)}`
      : '';

    // Assemble the component
    return `${importStatement}
${serviceImports ? serviceImports + '\n' : ''}
@Component({
\tstandalone: true,
\timports: ${this.state.imports.length > 0 ? `[${this.state.imports.join(', ')}]` : '[]'},
\tselector: '${this.state.componentName}',
\ttemplateUrl: './${this.state.componentName}.component.html',
\tstyleUrls: ['./${this.state.componentName}.component.scss'],
\tchangeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${componentClassName}${implementsClause} {
${inputsCode ? '\t// Inputs\n\t' + inputsCode + '\n\n' : ''}${outputsCode ? '\t// Outputs\n\t' + outputsCode + '\n\n' : ''}${modelsCode ? '\t// Models\n\t' + modelsCode + '\n\n' : ''}${constructor}${lifecycleMethodsCode ? '\n\n\t' + lifecycleMethodsCode : ''}
}`.trim();
  }

  private toComponentClassName(dasherizedName: string): string {
    const parts = dasherizedName.split('-');
    const pascalCase = parts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    return `${pascalCase}Component`;
  }

  private toLowerCamelCase(name: string): string {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }
}
