import { isBannedEvent } from '../constants';

/**
 * Parse template bindings to extract expressions for type inference
 */
export interface BindingInfo {
  propertyName: string;
  expression: string;
  bindingType: 'input' | 'output' | 'model';
}

export class BindingParser {
  /**
   * Parse template HTML and extract binding expressions
   * Example: <div [userName]="user.name" (click)="handleClick($event)">
   */
  parseTemplate(template: string): BindingInfo[] {
    const bindings: BindingInfo[] = [];

    // Parse two-way bindings first: [(prop)]="expression"
    const modelRegex = /\[\((\w+)\)\]="([^"]+)"/g;
    let match: RegExpExecArray | null;

    while ((match = modelRegex.exec(template)) !== null) {
      bindings.push({
        propertyName: match[1],
        expression: match[2],
        bindingType: 'model',
      });
    }

    // Parse input bindings: [prop]="expression"
    // Support property names with dots and hyphens (e.g., class.my-class, attr.aria-label)
    const inputRegex = /\[([a-zA-Z0-9._-]+)\]="([^"]+)"/g;

    while ((match = inputRegex.exec(template)) !== null) {
      const propertyName = match[1];
      const expression = match[2];

      // Skip if already captured as model
      const alreadyModel = bindings.some(
        (b) => b.bindingType === 'model' && b.propertyName === propertyName
      );
      if (!alreadyModel) {
        bindings.push({
          propertyName,
          expression,
          bindingType: 'input',
        });
      }
    }

    // Parse output bindings: (event)="expression"
    const outputRegex = /\((\w+)\)="([^"]+)"/g;

    while ((match = outputRegex.exec(template)) !== null) {
      const propertyName = match[1];
      const expression = match[2];

      // Skip if already captured as model
      const alreadyModel = bindings.some(
        (b) => b.bindingType === 'model' && b.propertyName === propertyName
      );
      if (!alreadyModel && !isBannedEvent(propertyName)) {
        bindings.push({
          propertyName,
          expression,
          bindingType: 'output',
        });
      }
    }

    return bindings;
  }

  /**
   * Create a map of property names to expressions for type inference
   */
  createBindingMap(bindings: BindingInfo[]): Map<string, string> {
    const map = new Map<string, string>();

    for (const binding of bindings) {
      map.set(binding.propertyName, binding.expression);
    }

    return map;
  }
}
