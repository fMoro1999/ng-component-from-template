import fs from 'fs';
import * as vscode from 'vscode';
import { ValidatorFnLike } from './types';
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

export const getHighlightedTextAsync = () => {
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
    showErrorAsync('');
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
    showErrorAsync(
      'Whoops... An error occurred while creating the component folder...'
    );
    return false;
  }
}

export const camelize = (text: string) => text.replace(/-\w/g, clearAndUpper);

export const pascalize = (text: string) =>
  text.replace(/(^\w|-\w)/g, clearAndUpper);

export const clearAndUpper = (text: string) =>
  text.replace(/-/, '').toUpperCase();

export const createFileAsync = async (path: string, content: string) => {
  const fileName = path.split('/').pop();
  const humanReadableErrorMessage = `${fileName}: error while creating the file...`;

  if (!path) {
    showErrorAsync(humanReadableErrorMessage);
    return false;
  }

  try {
    await fs.promises.writeFile(path, content);
  } catch (error) {
    console.error(error);
    showErrorAsync(humanReadableErrorMessage);
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
  let component = pascalize(dasherizedComponentName).replace('-', '');

  component = `${component}Component`;

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
