export const generateNgCoreImports = (
  hasInputs: boolean,
  hasOutputs: boolean,
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
  } else {
    if (hasInputs) {
      imports.push('Input');
    }
    if (hasOutputs) {
      imports.push('Output', 'EventEmitter');
    }
  }

  return `import { ${imports.join(', ')} } from '@angular/core';`;
};
