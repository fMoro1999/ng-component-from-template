import fs from 'fs';
import path from 'path';
import { getCurrentWorkspaceAbsolutePath } from './path-resolution';

export const detectAngularVersionAsync = async (): Promise<number | null> => {
  try {
    const workspacePath = getCurrentWorkspaceAbsolutePath();
    if (!workspacePath) {
      return null; // No workspace available (e.g., during tests)
    }
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
    // Silently fail and return null - this is expected in test environments
    // or when VSCode workspace is not available
    return null;
  }
};

export const shouldUseSignalApisAsync = async (
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

  const version = await detectAngularVersionAsync();

  // Signals were introduced in Angular 16, but fully stable in 17
  return version !== null && version >= minVersion;
};
