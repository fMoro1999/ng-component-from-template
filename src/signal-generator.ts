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

export interface SignalModel {
  name: string;
  isRequired: boolean;
}

export const generateSignalModels = (models: SignalModel[]): string => {
  if (!models.length) {
    return '';
  }

  const lines = models.map(({ name, isRequired }) => {
    const fn = isRequired ? 'model.required' : 'model';
    return `${name} = ${fn}<unknown>();`;
  });

  return `// Two-way bindings\n\t\t${lines.join('\n\t\t')}`;
};

export const generateDecoratorModels = (models: SignalModel[]): string => {
  if (!models.length) {
    return '';
  }

  const lines = models.flatMap(({ name, isRequired }) => {
    const inputDecorator = isRequired ? '@Input({required: true})' : '@Input()';
    const modifier = isRequired ? '!' : '';
    return [
      `${inputDecorator} ${name}${modifier}: unknown;`,
      `@Output() ${name}Change = new EventEmitter<unknown>();`,
    ];
  });

  return `// Two-way bindings\n\t\t${lines.join('\n\t\t')}`;
};
