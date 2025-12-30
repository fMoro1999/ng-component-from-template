import fs from 'fs';
import path from 'path';
import { getCurrentWorkspaceAbsolutePath } from './path-resolution';

/**
 * Angular version compatibility constants
 */
export const ANGULAR_VERSION_CONSTANTS = {
  /** Minimum version for Signal APIs (input(), output()) */
  SIGNAL_API_MIN_VERSION: 16,
  /** Minimum version for model() API (two-way binding signals) */
  MODEL_API_MIN_VERSION: 17,
  /** Minimum version where Signals are fully stable */
  SIGNAL_STABLE_VERSION: 17,
} as const;

/**
 * Extracts the major version number from an Angular version string.
 * Handles various formats:
 * - Exact: "17.2.0"
 * - Caret: "^17.2.0"
 * - Tilde: "~16.1.0"
 * - Range: ">=17.0.0"
 * - Pre-release: "17.0.0-rc.1", "18.0.0-next.5"
 * - Workspace protocol: "workspace:^17.2.0"
 * - Invalid/malformed strings
 *
 * @param versionString - The version string from package.json
 * @returns The major version number or null if parsing fails
 */
export const parseAngularVersion = (versionString: string): number | null => {
  if (!versionString || typeof versionString !== 'string') {
    return null;
  }

  // Remove workspace protocol prefix if present
  const cleanedVersion = versionString.replace(/^workspace:/, '');

  // Match the first occurrence of a major version number
  // This handles: ^17.2.0, ~16.1.0, >=17.0.0, 17.2.0, 17.0.0-rc.1, etc.
  const versionMatch = cleanedVersion.match(/(\d+)\.(\d+)/);
  if (!versionMatch) {
    return null;
  }

  const majorVersion = parseInt(versionMatch[1], 10);

  // Sanity check: Angular versions should be reasonable (14-99)
  if (isNaN(majorVersion) || majorVersion < 14 || majorVersion > 99) {
    return null;
  }

  return majorVersion;
};

/**
 * Attempts to find and read package.json from various locations.
 * Handles monorepo structures by searching parent directories.
 *
 * @param startPath - The starting directory path
 * @returns The parsed package.json content or null
 */
const findPackageJson = async (
  startPath: string
): Promise<Record<string, unknown> | null> => {
  let currentPath = startPath;
  const root = path.parse(currentPath).root;

  // Search up to 5 levels up for package.json (handles monorepo structures)
  for (let i = 0; i < 5 && currentPath !== root; i++) {
    const packageJsonPath = path.join(currentPath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content) as Record<string, unknown>;

        // Verify this package.json has @angular/core dependency
        const deps = packageJson.dependencies as Record<string, string> | undefined;
        const devDeps = packageJson.devDependencies as Record<string, string> | undefined;

        if (deps?.['@angular/core'] || devDeps?.['@angular/core']) {
          return packageJson;
        }
      } catch {
        // Invalid JSON, try parent directory
      }
    }

    currentPath = path.dirname(currentPath);
  }

  return null;
};

/**
 * Detects the Angular version from the workspace's package.json.
 * Handles various edge cases including monorepo structures.
 *
 * @returns The major Angular version number or null if detection fails
 */
export const detectAngularVersionAsync = async (): Promise<number | null> => {
  try {
    const workspacePath = getCurrentWorkspaceAbsolutePath();
    if (!workspacePath) {
      return null; // No workspace available (e.g., during tests)
    }

    const packageJson = await findPackageJson(workspacePath);
    if (!packageJson) {
      return null;
    }

    const deps = packageJson.dependencies as Record<string, string> | undefined;
    const devDeps = packageJson.devDependencies as Record<string, string> | undefined;

    const angularCore = deps?.['@angular/core'] || devDeps?.['@angular/core'];

    if (!angularCore) {
      return null;
    }

    return parseAngularVersion(angularCore);
  } catch {
    // Silently fail and return null - this is expected in test environments
    // or when VSCode workspace is not available
    return null;
  }
};

/**
 * Determines whether Signal APIs should be used based on configuration and Angular version.
 *
 * @param userPreference - Whether the user has enabled Signal APIs in settings
 * @param autoDetect - Whether to auto-detect Angular version
 * @param minVersion - Minimum Angular version required for Signals
 * @returns True if Signal APIs should be used
 */
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

/**
 * Determines whether the model() API is available for the detected Angular version.
 * The model() API for two-way binding with signals was introduced in Angular 17.
 *
 * @returns True if model() API is available
 */
export const isModelApiAvailableAsync = async (): Promise<boolean> => {
  const version = await detectAngularVersionAsync();
  return version !== null && version >= ANGULAR_VERSION_CONSTANTS.MODEL_API_MIN_VERSION;
};

/**
 * Gets detailed Angular version information for the current workspace.
 *
 * @returns Object with version details and feature availability
 */
export const getAngularVersionInfoAsync = async (): Promise<{
  version: number | null;
  supportsSignals: boolean;
  supportsModelApi: boolean;
  isStableSignals: boolean;
}> => {
  const version = await detectAngularVersionAsync();

  return {
    version,
    supportsSignals:
      version !== null &&
      version >= ANGULAR_VERSION_CONSTANTS.SIGNAL_API_MIN_VERSION,
    supportsModelApi:
      version !== null &&
      version >= ANGULAR_VERSION_CONSTANTS.MODEL_API_MIN_VERSION,
    isStableSignals:
      version !== null &&
      version >= ANGULAR_VERSION_CONSTANTS.SIGNAL_STABLE_VERSION,
  };
};
