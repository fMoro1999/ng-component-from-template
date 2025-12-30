/**
 * UI Interactions Module
 *
 * Contains all VS Code UI-related operations such as:
 * - Input boxes and dialogs
 * - Information/error/warning messages
 * - Editor text selection operations
 * - Clipboard access
 */

import * as vscode from 'vscode';
import { ValidatorFnLike } from './models/utils.types';
import { requiredValidator } from './validators';

/**
 * Prompts the user to enter a path for a new component
 */
export const askForNewComponentPathAsync = async (): Promise<string> => {
  const path = await vscode.window.showInputBox({
    title: 'Path',
    placeHolder: 'Type the full path of the new component...',
    validateInput: requiredValidator,
    ignoreFocusOut: true,
  });
  return path as string;
};

/**
 * Prompts the user to enter a name for a new component (dash-case)
 */
export const askForNewComponentNameAsync = async (): Promise<string> => {
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

/**
 * Gets the currently highlighted/selected text in the active editor
 */
export const getHighlightedText = (): string => {
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

/**
 * Gets the file path of the document containing the currently highlighted text
 */
export const getHighlightedTextPathAsync = (): string => {
  const editor = vscode.window.activeTextEditor;

  const selection = editor?.selection;
  if (!selection) {
    // Silently return empty string when no editor is active (e.g., during tests)
    return '';
  }

  return editor.document.fileName;
};

/**
 * Replaces the currently highlighted text with the provided text
 */
export const replaceHighlightedTextWithAsync = async (
  replacingText: string
): Promise<string> => {
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

  return '';
};

/**
 * Generic question prompt with optional validation
 */
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
}): Promise<string> {
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

/**
 * Shows an information message to the user
 */
export const showInfoAsync = async (text: string): Promise<string | undefined> =>
  await vscode.window.showInformationMessage(text);

/**
 * Shows an error message to the user
 */
export const showErrorAsync = async (text: string): Promise<string | undefined> =>
  await vscode.window.showErrorMessage(text);

/**
 * Shows a warning message to the user
 */
export const showWarningAsync = async (text: string): Promise<string | undefined> =>
  await vscode.window.showWarningMessage(text);

/**
 * Reads text from the system clipboard
 */
export const readTextFromClipboardAsync = async (): Promise<string> =>
  await vscode.env.clipboard.readText();
