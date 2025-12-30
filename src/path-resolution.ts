/**
 * Path Resolution Module
 *
 * Contains path utilities and workspace-related operations such as:
 * - Workspace path detection
 * - Path validation and parsing
 * - Parent folder resolution
 */

import path from 'path';
import * as vscode from 'vscode';

/**
 * Gets the absolute path of the current VS Code workspace
 */
export const getCurrentWorkspaceAbsolutePath = (): string => {
  try {
    return vscode.workspace.workspaceFolders?.at(0)?.uri.path || '';
  } catch (error) {
    // VSCode API not available (e.g., during tests)
    return '';
  }
};

/**
 * Checks if a string looks like a file path
 */
export const isPathLike = (text: string): RegExpMatchArray | null =>
  text.match(/^(.+)\/([^\/]+)$/);

/**
 * Gets the parent folder path of a given path
 */
export const getParentFolderPath = (pathName: string): string => path.dirname(pathName);
