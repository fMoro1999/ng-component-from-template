export interface SignalInput {
  name: string;
  isRequired: boolean;
}

export interface SignalOutput {
  name: string;
}

export const generateSignalInputs = (inputs: SignalInput[]): string => {
  if (!inputs.length) {
    return '';
  }

  const lines = inputs.map(({ name, isRequired }) => {
    const fn = isRequired ? 'input.required' : 'input';
    return `${name} = ${fn}<unknown>();`;
  });

  return `// Inputs\n\t\t${lines.join('\n\t\t')}`;
};

export const generateSignalOutputs = (outputs: SignalOutput[]): string => {
  if (!outputs.length) {
    return '';
  }

  const lines = outputs.map(({ name }) => {
    return `${name} = output<unknown>();`;
  });

  return `// Outputs\n\t\t${lines.join('\n\t\t')}`;
};

export const generateDecoratorInputs = (inputs: SignalInput[]): string => {
  if (!inputs.length) {
    return '';
  }

  const lines = inputs.map(({ name, isRequired }) => {
    const decorator = isRequired ? `@Input({required: true})` : `@Input()`;
    const modifier = isRequired ? '!' : '';
    return `${decorator} ${name}${modifier}: unknown;`;
  });

  return `// Inputs\n\t\t${lines.join('\n\t\t')}`;
};

export const generateDecoratorOutputs = (outputs: SignalOutput[]): string => {
  if (!outputs.length) {
    return '';
  }

  const lines = outputs.map(({ name }) => {
    return `@Output() ${name} = new EventEmitter<unknown>();`;
  });

  return `// Outputs\n\t\t${lines.join('\n\t\t')}`;
};
