import fs from 'fs';
import path from 'path';
import * as ts from 'typescript';
import * as vscode from 'vscode';
import { Component } from './models';
import { ValidatorFnLike } from './models/utils.types';
import { requiredValidator } from './validators';

export const askForNewComponentPathAsync = async () => {
  const path = await vscode.window.showInputBox({
    title: 'Path',
    placeHolder: 'Type the full path of the new component...',
    validateInput: requiredValidator,
    ignoreFocusOut: true,
  });
  return path as string;
};

export const askForNewComponentNameAsync = async () => {
  return await askQuestionAsync({
    title: 'Name',
    placeHolder:
      'Type the dash-case component name... (i.e. "my-new-awesome-invention")',
    validator: (text: string) =>
      text.match(/^[a-z]+(?:-[a-z]+)*$/)
        ? ''
        : 'Component name must be dash-case (i.e. my-table)',
  });
};

export const getHighlightedText = () => {
  const editor = vscode.window.activeTextEditor;

  const selection = editor?.selection;
  if (!selection) {
    console.log('No active editor detected. Aborting...');
    return '';
  }

  const selectionRange = new vscode.Range(
    selection.start.line,
    selection.start.character,
    selection.end.line,
    selection.end.character
  );
  const highlightedText = editor.document.getText(selectionRange);

  return highlightedText;
};

export const getHighlightedTextPathAsync = () => {
  const editor = vscode.window.activeTextEditor;

  const selection = editor?.selection;
  if (!selection) {
    console.log('No active editor detected. Aborting...');
    return '';
  }

  return editor.document.fileName;
};

export const replaceHighlightedTextWithAsync = async (
  replacingText: string
) => {
  const editor = vscode.window.activeTextEditor;

  const selection = editor?.selection;
  if (!selection) {
    console.log('No active editor detected. Aborting...');
    return '';
  }

  const selectionRange = new vscode.Range(
    selection.start.line,
    selection.start.character,
    selection.end.line,
    selection.end.character
  );

  try {
    await editor.edit((editBuilder) =>
      editBuilder.replace(selectionRange, replacingText)
    );
  } catch (error) {
    console.error(error);
    await showErrorAsync('An error occurred while replacing the text.');
  }
};

export async function askQuestionAsync(options: {
  title: string;
  placeHolder?: string;
  isRequired?: false;
  validator?: ValidatorFnLike;
}): Promise<string>;
export async function askQuestionAsync(options: {
  title: string;
  placeHolder?: string;
  isRequired: true;
  validator?: undefined;
}): Promise<string>;
export async function askQuestionAsync({
  title,
  placeHolder,
  isRequired,
  validator,
}: {
  title: string;
  placeHolder?: string;
  isRequired?: boolean;
  validator?: ValidatorFnLike;
}) {
  let validateInput = undefined;

  const shouldUseRequiredValidator = !!isRequired;
  const shouldUseExtraValidator = !isRequired && validator;

  if (shouldUseRequiredValidator) {
    validateInput = requiredValidator;
  } else if (shouldUseExtraValidator) {
    validateInput = validator;
  }

  const path = await vscode.window.showInputBox({
    title,
    placeHolder,
    validateInput,
    ignoreFocusOut: true,
  });
  return path as string;
}

export const showInfoAsync = async (text: string) =>
  await vscode.window.showInformationMessage(text);
export const showErrorAsync = async (text: string) =>
  await vscode.window.showErrorMessage(text);
export const showWarningAsync = async (text: string) =>
  await vscode.window.showWarningMessage(text);

export const isEmptyDirectoryAsync = async (path: string) => {
  showInfoAsync('Checking if the folder exists...');

  if (!path) {
    await showErrorAsync('');
    return true;
  }

  const folderName = path.split('/').pop();
  console.log(`Detected ${folderName} folderName`);

  const directory = await fs.promises.readdir(path);
  return directory?.length === 0;
};

export async function createFolderRecursivelyAsync(fullPath: string) {
  try {
    await fs.promises.mkdir(fullPath);
    return true;
  } catch (error) {
    console.error(error);
    await showErrorAsync(
      'Whoops... An error occurred while creating the component folder...'
    );
    return false;
  }
}

export const camelize = (text: string) => text.replace(/-\w/g, clearAndUpper);

export const pascalize = (text: string) =>
  text.replace(/(^\w|-\w)/g, clearAndUpper);
export const toComponentClassName = (dasherizedComponentName: string) =>
  `${pascalize(dasherizedComponentName).replace('-', '')}Component`;
export const clearAndUpper = (text: string) =>
  text.replace(/-/, '').toUpperCase();

export const createFileAsync = async (path: string, content: string) => {
  const fileName = path.split('/').pop();
  const humanReadableErrorMessage = `${fileName}: error while creating the file...`;

  if (!path) {
    await showErrorAsync(humanReadableErrorMessage);
    return false;
  }

  try {
    await fs.promises.writeFile(path, content);
  } catch (error) {
    console.error(error);
    await showErrorAsync(humanReadableErrorMessage);
  }

  return true;
};

export const createComponentTs = ({
  dasherizedComponentName,
  bindingProperties,
}: {
  dasherizedComponentName: string;
  bindingProperties: Map<'inputs' | 'outputs', string[]>;
}) => {
  const component = toComponentClassName(dasherizedComponentName);

  const inputProps = bindingProperties.get('inputs');
  const hasAnyInput = !!inputProps?.length;
  let inputs = '';
  if (hasAnyInput) {
    inputs = stringifyInputProps(inputProps);
  }

  const outputsProperties = bindingProperties.get('outputs');
  const hasAnyOutput = !!outputsProperties?.length;
  let outputs = '';
  if (hasAnyOutput) {
    outputs = stringifyOutputProps(outputsProperties);
  }

  return `
  import { ChangeDetectionStrategy, Component${inputs ? ', Input' : ''}${
    outputs ? ', Output, EventEmitter ' : ''
  }} from '@angular/core';

  @Component({
    standalone: true,
    imports: [],
    selector: '${dasherizedComponentName}',
    templateUrl: './${dasherizedComponentName}.component.html',
    styleUrls: ['./${dasherizedComponentName}.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  export class ${component} {
    ${inputs}

    ${outputs}
  }
  `;
};

export const stringifyOutputProps = (outputsProperties: string[]) =>
  uniquesOf(outputsProperties).reduce(
    (accumulator, current) =>
      accumulator + `@Output() ${current} = new EventEmitter<unknown>();\n\t\t`,
    '// Outputs\n\t\t'
  ) ?? '';

export const stringifyInputProps = (outputsProperties: string[]) =>
  uniquesOf(outputsProperties).reduce(
    (accumulator, current) =>
      accumulator + `@Input({required: true}) ${current}!: unknown;\n\t\t`,
    '// Inputs\n\t\t'
  ) ?? '';

export const getCurrentWorkspaceAbsolutePath = () =>
  vscode.workspace.workspaceFolders!.at(0)!.uri.path;

export const readTextFromClipboardAsync = async () =>
  await vscode.env.clipboard.readText();

export const isPathLike = (text: string) => text.match(/^(.+)\/([^\/]+)$/);

export const uniquesOf = <T extends string | number | boolean>(
  items: T[] | null
) => Array.from(new Set(items ?? []));

export const findFirstBarrelPath = async (
  workingDirectory: string,
  searchedFile: string = 'index.ts',
  upperBoundPath: string = '/'
) => {
  while (workingDirectory !== upperBoundPath) {
    const parentFolderPath: string = getParentFolderPath(workingDirectory);

    const pathOfPossibleBarrel = path.join(parentFolderPath, searchedFile);
    if (fs.existsSync(pathOfPossibleBarrel)) {
      return parentFolderPath;
    }

    workingDirectory = parentFolderPath;
  }

  return undefined;
};

export const getParentFolderPath = (pathName: string) => path.dirname(pathName);

export const getComponentDecoratorConfig = async (tsFilePath: string) => {
  if (!fs.existsSync(tsFilePath)) {
    throw new Error(
      'The specified file cannot be opened. It seems it does not exist...'
    );
  }

  let file: fs.promises.FileHandle | null = null;
  file = await fs.promises.open(tsFilePath);

  const openedFile = await file.read();
  const { buffer } = openedFile;
  const fileContent = buffer.toString();
  if (!fileContent) {
    throw new Error('The file is empty. Cannot parse the content...');
  }

  const componentDecoratorConfig = await parseComponentDeclarationConfiguration(
    fileContent
  );
  const isComponent = !!componentDecoratorConfig;
  if (!isComponent) {
    throw new Error(
      'It seems the consumer file is not an actual component.. We did not found any @Component decorator'
    );
  }

  return componentDecoratorConfig;
};

export const addComponentToClientImports = async (tsFilePath: string) => {
  if (!fs.existsSync(tsFilePath)) {
    await showErrorAsync(
      `Something went wrong... ${tsFilePath} was not found. Aborting...`
    );
    return;
  }

  let file: fs.promises.FileHandle | null = null;
  try {
    file = await fs.promises.open(tsFilePath);
  } catch (error) {
    console.error(error);
    await showErrorAsync(
      'An error occurred while opening the requested file... See the console for more info.'
    );
    return;
  }

  try {
    const openedFile = await file.read();
    const { buffer } = openedFile;
    const fileContent = buffer.toString();
    const componentDecoratorConfig =
      await parseComponentDeclarationConfiguration(fileContent);
    const isComponent = !!componentDecoratorConfig;
    if (!isComponent) {
      await showErrorAsync(
        'It seems the consumer file is not an actual component.. We did not found any @Component decorator'
      );
      return;
    }
    const isStandalone =
      'standalone' in componentDecoratorConfig &&
      componentDecoratorConfig.standalone;

    if (isStandalone) {
      // const { imports } = componentDecoratorConfig;
      // if (Array.isArray(imports)) {
      //   imports.push();
      // }
    } else {
    }
  } catch (error) {
    console.error(error);
    await showErrorAsync(
      `Something went wrong while opening the requested file (${tsFilePath}). Aborting...`
    );
  } finally {
    await file.close();
  }
};

const parseComponentDeclarationConfiguration = async (content: string) => {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    content,
    ts.ScriptTarget.Latest
  );

  const parsedDecoratorArgs: Partial<Component> | undefined =
    await parseJsonArgumentOfComponentDecorator(sourceFile);

  if (!parsedDecoratorArgs || !Object.keys(parsedDecoratorArgs).length) {
    throw new Error(
      `No classes decorated with @Component found in file ${sourceFile.fileName}`
    );
  }

  return parsedDecoratorArgs;
};

function findDecoratorCallExpressionByName(
  sourceFile: ts.SourceFile,
  decoratorName = 'Component'
): ts.CallExpression | undefined {
  const noResult = undefined;

  const firstClassNode: ts.ClassDeclaration | undefined =
    sourceFile.statements.find(
      (statement): statement is ts.ClassDeclaration =>
        statement.kind === ts.SyntaxKind.ClassDeclaration
    );

  if (!firstClassNode) {
    return noResult;
  }

  const decorators = ts.getDecorators(firstClassNode);
  if (!decorators?.length) {
    return noResult;
  }

  const componentDecorator: ts.CallExpression | undefined = decorators
    .map(({ expression }) => expression)
    .filter(ts.isCallExpression)
    .find((expression) => {
      const { expression: identifier } = expression;
      const isIdentifier = ts.isIdentifier(identifier);
      const hasMatchingDecoratorName =
        isIdentifier && identifier.text === decoratorName;
      return hasMatchingDecoratorName;
    });

  return componentDecorator;
}

export const parseJsonArgumentOfComponentDecorator = async (
  sourceFile: ts.SourceFile
) => {
  const decoratorCallExpression: ts.CallExpression | undefined =
    findDecoratorCallExpressionByName(sourceFile);

  const noResult = undefined;
  if (!decoratorCallExpression) {
    return noResult;
  }

  const args: ts.NodeArray<ts.Expression> = decoratorCallExpression.arguments;
  if (!args.length) {
    await showWarningAsync(
      'No arguments for component decorator detected. Aborting...'
    );
    return noResult;
  }

  const firstArg = args.at(0)!;

  if (!ts.isObjectLiteralExpression(firstArg)) {
    await showWarningAsync(
      'First argument of component decorator is not an object. Aborting...'
    );
    return noResult;
  }

  const { properties } = firstArg;
  const result: Record<string, unknown> = properties.reduce(
    (acc, property) =>
      accumulateComponentConfigKeyValuePairs(property, sourceFile, acc),
    {}
  );

  return result as Partial<Component>;
};

const accumulateComponentConfigKeyValuePairs = (
  property: ts.ObjectLiteralElementLike,
  sourceFile: ts.SourceFile,
  acc: {}
) => {
  const { name } = property;
  const propName = (name as unknown as { text: string }).text;
  let value;

  let initializer = null;
  if ('initializer' in property) {
    initializer = property.initializer;
  }

  if (initializer && ts.isArrayLiteralExpression(initializer)) {
    value = initializer.elements.map((element) =>
      'text' in element ? element.text : undefined
    );
  } else if (initializer && 'text' in initializer) {
    value = initializer.text;
  } else {
    const toParse = initializer?.getText(sourceFile) ?? '';
    try {
      value = JSON.parse(toParse);
    } catch {
      value = toParse;
    }
  }

  return { ...acc, [propName]: value };
};
