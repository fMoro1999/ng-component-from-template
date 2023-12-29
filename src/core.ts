import path from 'path';
import {
  Node,
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  ts,
} from 'ts-morph';
import { Component, Type } from './models';
import {
  createComponentTs,
  createFileAsync,
  findFirstBarrelPath,
  getComponentDecoratorConfig,
  getHighlightedTextPathAsync as getHighlightedTextPath,
  replaceHighlightedTextWithAsync,
  showErrorAsync,
  showInfoAsync,
  showWarningAsync,
  toComponentClassName,
} from './utils';

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

export const replaceHighlightedText = async (
  dasherizedComponentName: string
) => {
  const componentSelector = `<${dasherizedComponentName}></${dasherizedComponentName}>`;
  await replaceHighlightedTextWithAsync(componentSelector);
};

export const addToClientImportsIfStandalone = async (
  dasherizedComponentName: string
) => {
  const componentClassName = toComponentClassName(dasherizedComponentName);
  // #1
  // Get the current editor selection file path
  const currentFilePath = getHighlightedTextPath();
  const tsFilePath = currentFilePath.replace('.html', '.ts');

  // #2
  // Check from its .ts file if it is a standalone component
  let componentDecoratorConfig: Partial<Component> | undefined;
  try {
    componentDecoratorConfig = await getComponentDecoratorConfig(tsFilePath);
  } catch (error) {
    console.error(error);
    await showWarningAsync(
      'An error occurred while checking if the client component is standalone. Cannot add new component to the imports...'
    );
    return;
  }

  if (!componentDecoratorConfig) {
    await showWarningAsync(
      `It seems the client component is not actually a component...Cannot proceed to add ${dasherizedComponentName} to its imports...}!`
    );
    return;
  }

  const isStandalone =
    'standalone' in componentDecoratorConfig &&
    componentDecoratorConfig.standalone;

  // #3
  // If yes, push into - if it is already declared in the @Component decorator config - the `imports` array;
  if (isStandalone) {
    // If the imports array does not exists, then add it!
    const componentImports = componentDecoratorConfig.imports ?? [];
    // Add the new input
    componentImports.push(componentClassName as unknown as Type<any>);

    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(tsFilePath);
    if (!sourceFile) {
      await showErrorAsync(`Cannot find ${tsFilePath} - Aborting`);
      return;
    }

    const dasherizedComponentName = path
      .parse(tsFilePath)
      .name.replace('.component', '');
    const classes = sourceFile.getClasses();

    if (!classes.length) {
      await showErrorAsync(`No classes detected from ${tsFilePath} - Aborting`);
      return;
    }

    const clientComponentClassName = toComponentClassName(
      dasherizedComponentName
    );

    const clientComponentClass = classes.find(
      (classDeclaration) =>
        classDeclaration.getName() === clientComponentClassName
    );

    if (!clientComponentClass) {
      await showErrorAsync(
        `No class found for ${dasherizedComponentName} - Aborting`
      );
      return;
    }

    const componentDecorator = clientComponentClass.getDecorator('Component');

    if (!componentDecorator) {
      await showErrorAsync(
        `No @Component decorator found for ${dasherizedComponentName} - Aborting`
      );
      return;
    }

    const componentDecoratorArgs: Node<ts.Node>[] =
      componentDecorator.getArguments();

    if (!componentDecoratorArgs.length) {
      await showErrorAsync(
        `No arguments found for @Component decorator for ${dasherizedComponentName} - Aborting`
      );
      return;
    }

    const componentConfig = componentDecoratorArgs.at(
      0
    ) as ObjectLiteralExpression;

    componentConfig.getProperties();
    const importsArray = componentConfig.getProperty('imports') as
      | PropertyAssignment
      | undefined;

    const initializer = importsArray?.getInitializer();
    if (!importsArray) {
      // Create a new property declaration
      await showInfoAsync(
        `It seems your standalone component does not declare yet the imports component configuration property.
        Unfortunately, this case has not been covered yet 🥺💔`
      );
      return;
    } else if (initializer) {
      const oldValues = initializer
        .getText()
        .replace(/(\[|\]|\s|\\n)*/g, '')
        .split(',')
        .filter(Boolean);
      const newValue = [...(oldValues as string[]), componentClassName];
      const stringifiedNewValue = `[
        ${newValue.join(',\n\t')}
      ]`;
      initializer.replaceWithText(stringifiedNewValue);
    }

    sourceFile.fixMissingImports();
    sourceFile.formatText({ indentSize: 2 });
    await sourceFile.save();
  } else {
    // If not, just do nothing and return (maybe it is better to add it to its referring ngModule)
    await showInfoAsync(`You have not migrated yet your components to standalone... Isn't it?!🤨🤨🤨
    Standalone components were introduced with v.14;
    I suggest to you to migrate your component to standalone!`);
  }
};

export const addToDeclaringModuleExports = async (
  dasherizedComponentName: string,
  componentFolderPath: string
) => {
  if (!dasherizedComponentName) {
    console.warn(
      'Cannot add component to exports since the component name is null or empty!'
    );
    return;
  }

  if (!componentFolderPath) {
    console.warn(
      'Cannot add component to exports since the component folder path is null or empty!'
    );
    return;
  }

  const firstDeclaringBarrelFolderPath = await findFirstBarrelPath(
    componentFolderPath
  );
  if (!firstDeclaringBarrelFolderPath) {
    console.warn(
      'Cannot find a barrel file to add the component to exports! - Aborting'
    );
    return;
  }
  const barrelFilePath = path.join(firstDeclaringBarrelFolderPath, 'index.ts');

  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(barrelFilePath);

  const componentClassName = toComponentClassName(dasherizedComponentName);
  const moduleSpecifier = `./${path.relative(
    firstDeclaringBarrelFolderPath,
    `${componentFolderPath}/${dasherizedComponentName}.component`
  )}`;

  sourceFile.addExportDeclaration({
    namedExports: [componentClassName],
    moduleSpecifier,
  });

  await sourceFile.save();
};
