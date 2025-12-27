import fs from 'fs';
import path from 'path';
import { getCurrentWorkspaceAbsolutePath } from './utils';

export const detectAngularVersion = async (): Promise<number | null> => {
  try {
    const workspacePath = getCurrentWorkspaceAbsolutePath();
    const packageJsonPath = path.join(workspacePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(
      await fs.promises.readFile(packageJsonPath, 'utf-8')
    );

    const angularCore =
      packageJson.dependencies?.['@angular/core'] ||
      packageJson.devDependencies?.['@angular/core'];

    if (!angularCore) {
      return null;
    }

    // Extract major version from "^17.2.0" or "~16.1.0"
    const versionMatch = angularCore.match(/(\d+)\./);
    return versionMatch ? parseInt(versionMatch[1], 10) : null;
  } catch (error) {
    console.error('Error detecting Angular version:', error);
    return null;
  }
};

export const shouldUseSignalApis = async (
  userPreference: boolean,
  autoDetect: boolean,
  minVersion: number
): Promise<boolean> => {
  if (!userPreference) {
    return false; // User explicitly disabled signals
  }

  if (!autoDetect) {
    return true; // Use signals if user wants them and auto-detect is off
  }

  const version = await detectAngularVersion();

  // Signals were introduced in Angular 16, but fully stable in 17
  return version !== null && version >= minVersion;
};
