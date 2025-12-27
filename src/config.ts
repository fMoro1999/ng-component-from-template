import * as vscode from 'vscode';
import { ChangeDetectionStrategy } from './models';

export interface ExtensionConfig {
  useSignalApis: boolean;
  changeDetectionStrategy: ChangeDetectionStrategy;
  detectAngularVersion: boolean;
  minimumAngularVersion: number;
}

export const getExtensionConfig = (): ExtensionConfig => {
  const config = vscode.workspace.getConfiguration('ngComponentFromTemplate');

  return {
    useSignalApis: config.get('useSignalApis', true),
    changeDetectionStrategy: config.get(
      'changeDetectionStrategy',
      ChangeDetectionStrategy.OnPush
    ),
    detectAngularVersion: config.get('detectAngularVersion', true),
    minimumAngularVersion: config.get('minimumAngularVersion', 17),
  };
};
