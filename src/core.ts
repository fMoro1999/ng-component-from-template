import path from 'path';
import { createComponentTs, createFileAsync, showWarningAsync } from './utils';

export const createComponentTemplateFromSelectedTextAsync = async ({
  componentPath,
  dasherizedComponentName,
  template,
}: {
  componentPath: string;
  dasherizedComponentName: string;
  template: string;
}) => {
  const fullPath = path.join(
    componentPath,
    `${dasherizedComponentName}.component.html`
  );
  const hasFileCreationSucceeded = await createFileAsync(fullPath, template);
  return hasFileCreationSucceeded;
};

export const createComponentTsFromSelectedTextAsync = async ({
  componentPath,
  dasherizedComponentName,
  bindingProperties,
}: {
  componentPath: string;
  dasherizedComponentName: string;
  bindingProperties: Map<'inputs' | 'outputs', string[]>;
}) => {
  const fullPath = path.join(
    componentPath,
    `${dasherizedComponentName}.component.ts`
  );

  const content = createComponentTs({
    dasherizedComponentName,
    bindingProperties,
  });

  const hasFileCreationSucceeded = await createFileAsync(fullPath, content);
  return hasFileCreationSucceeded;
};

export const createEmptyComponentScssAsync = async ({
  componentPath,
  dasherizedComponentName,
}: {
  componentPath: string;
  dasherizedComponentName: string;
}) => {
  const fullPath = path.join(
    componentPath,
    `${dasherizedComponentName}.component.scss`
  );

  const content = `.${dasherizedComponentName} {}`;
  const hasFileCreationSucceeded = await createFileAsync(fullPath, content);
  return hasFileCreationSucceeded;
};

export const detectComponentProperties: (
  template: string
) => Map<'inputs' | 'outputs', string[]> = (template: string) => {
  if (!template) {
    showWarningAsync(
      'Cannot detect input since the highlighted template is empty!'
    );
    return new Map();
  }

  const inputs: string[] = [];
  const outputs: string[] = [];

  const inputRegex = /\[(\w+)\]="(.+?)"/g;
  const outputRegex = /\((\w+)\)="(.+?)"/g;

  let match;
  while ((match = inputRegex.exec(template)) !== null) {
    const input = match.at(1)!;
    inputs.push(input);
  }
  while ((match = outputRegex.exec(template)) !== null) {
    const output = match.at(1)!;
    outputs.push(output);
  }

  return new Map([
    ['inputs', inputs],
    ['outputs', outputs],
  ]);
};
