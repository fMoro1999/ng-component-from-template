export const generateNgCoreImports = (
  hasInputs: boolean,
  hasOutputs: boolean,
  hasModels: boolean,
  useSignals: boolean
): string => {
  const imports: string[] = ['ChangeDetectionStrategy', 'Component'];

  if (useSignals) {
    if (hasInputs) {
      imports.push('input');
    }
    if (hasOutputs) {
      imports.push('output');
    }
    if (hasModels) {
      imports.push('model');
    }
  } else {
    if (hasInputs) {
      imports.push('Input');
    }
    if (hasOutputs) {
      imports.push('Output', 'EventEmitter');
    }
    // For decorators, models are just Input + Output combo
  }

  return `import { ${imports.join(', ')} } from '@angular/core';`;
};
