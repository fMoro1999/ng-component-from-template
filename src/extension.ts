// The module 'vscode' contains the VS Code extensibility API
import fs from 'fs';
import * as vscode from 'vscode';
import {
  createComponentTemplateFromSelectedTextAsync,
  createComponentTsFromSelectedTextAsync,
  createEmptyComponentScssAsync,
  detectComponentProperties,
} from './core';
import {
  askForNewComponentNameAsync,
  askForNewComponentPathAsync,
  createFolderRecursivelyAsync,
  getCurrentWorkspaceAbsolutePath,
  getHighlightedTextAsync,
  isPathLike,
  readTextFromClipboardAsync,
  showInfoAsync,
} from './utils';

import path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const createComponentCommand = vscode.commands.registerCommand(
    'ng-component-from-template.createAngularComponent',
    async () => {
      const textFromClipboard = await readTextFromClipboardAsync();
      const shouldAskToUseCopiedPath =
        textFromClipboard && isPathLike(textFromClipboard);

      let usePathFromClipboard = false;
      if (shouldAskToUseCopiedPath) {
        const prompt = await vscode.window.showInformationMessage(
          `It seems you have already copied a potential path (${textFromClipboard}).
          Do you want to use it as destination path for the new component?`,
          'Yes',
          'No'
        );
        usePathFromClipboard = prompt === 'Yes';
      }

      const relativeComponentPath = usePathFromClipboard
        ? textFromClipboard
        : await askForNewComponentPathAsync();

      const componentPath = path.join(
        getCurrentWorkspaceAbsolutePath(),
        relativeComponentPath
      );

      const dasherizedComponentName: string =
        await askForNewComponentNameAsync();
      const template: string = getHighlightedTextAsync();
      const bindingProperties: Map<'inputs' | 'outputs', string[]> =
        detectComponentProperties(template);

      const componentFolderPath = path.join(
        componentPath,
        dasherizedComponentName
      );
      const alreadyExists = fs.existsSync(componentFolderPath);
      if (!alreadyExists) {
        console.log('Path does not exist. Will create it for you! ;)');
        const hasFolderCreationSucceeded = await createFolderRecursivelyAsync(
          componentFolderPath
        );
        if (!hasFolderCreationSucceeded) {
          return false;
        }
      }

      await createComponentTemplateFromSelectedTextAsync({
        componentPath: componentFolderPath,
        dasherizedComponentName,
        template,
      });
      await createComponentTsFromSelectedTextAsync({
        componentPath: componentFolderPath,
        dasherizedComponentName,
        bindingProperties,
      });
      await createEmptyComponentScssAsync({
        componentPath: componentFolderPath,
        dasherizedComponentName,
      });

      await showInfoAsync(`Done.
      Enjoy!`);
    }
  );

  context.subscriptions.push(createComponentCommand);
}
