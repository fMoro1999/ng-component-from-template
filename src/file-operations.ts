/**
 * File Operations Module
 *
 * Contains all file system-related operations such as:
 * - File creation and reading
 * - Directory operations
 * - Barrel file detection
 */

import fs from 'fs';
import path from 'path';
import { showErrorAsync, showInfoAsync } from './ui-interactions';

/**
 * Checks if a directory is empty
 */
export const isEmptyDirectoryAsync = async (dirPath: string): Promise<boolean> => {
  showInfoAsync('Checking if the folder exists...');

  if (!dirPath) {
    await showErrorAsync('');
    return true;
  }

  const folderName = dirPath.split('/').pop();
  console.log(`Detected ${folderName} folderName`);

  const directory = await fs.promises.readdir(dirPath);
  return directory?.length === 0;
};

/**
 * Creates a folder and all parent directories if they don't exist
 */
export async function createFolderRecursivelyAsync(fullPath: string): Promise<boolean> {
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

/**
 * Creates a file with the given content
 */
export const createFileAsync = async (filePath: string, content: string): Promise<boolean> => {
  const fileName = filePath.split('/').pop();
  const humanReadableErrorMessage = `${fileName}: error while creating the file...`;

  if (!filePath) {
    await showErrorAsync(humanReadableErrorMessage);
    return false;
  }

  try {
    await fs.promises.writeFile(filePath, content);
  } catch (error) {
    console.error(error);
    await showErrorAsync(humanReadableErrorMessage);
  }

  return true;
};

/**
 * Finds the first parent directory containing a barrel file (index.ts)
 */
export const findFirstBarrelPath = async (
  workingDirectory: string,
  searchedFile: string = 'index.ts',
  upperBoundPath: string = '/'
): Promise<string | undefined> => {
  while (workingDirectory !== upperBoundPath) {
    const parentFolderPath: string = path.dirname(workingDirectory);

    const pathOfPossibleBarrel = path.join(parentFolderPath, searchedFile);
    if (fs.existsSync(pathOfPossibleBarrel)) {
      return parentFolderPath;
    }

    workingDirectory = parentFolderPath;
  }

  return undefined;
};
