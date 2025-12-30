/**
 * Utils - Barrel File
 *
 * This file re-exports all utilities from focused modules for backward compatibility.
 * New code should import directly from the specific modules:
 * - ./ui-interactions - VS Code UI operations
 * - ./file-operations - File system utilities
 * - ./path-resolution - Path utilities and workspace operations
 * - ./string-utilities - String manipulation helpers
 * - ./template-generators - Component template generation
 * - ./ast-utilities - AST manipulation helpers
 */

// UI Interactions
export {
  askForNewComponentNameAsync,
  askForNewComponentPathAsync,
  askQuestionAsync,
  getHighlightedText,
  getHighlightedTextPathAsync,
  readTextFromClipboardAsync,
  replaceHighlightedTextWithAsync,
  showErrorAsync,
  showInfoAsync,
  showWarningAsync,
} from './ui-interactions';

// File Operations
export {
  createFileAsync,
  createFolderRecursivelyAsync,
  findFirstBarrelPath,
  isEmptyDirectoryAsync,
} from './file-operations';

// Path Resolution
export {
  getCurrentWorkspaceAbsolutePath,
  getParentFolderPath,
  isPathLike,
} from './path-resolution';

// String Utilities
export {
  camelize,
  clearAndUpper,
  pascalize,
  toComponentClassName,
  uniquesOf,
} from './string-utilities';

// Template Generators
export {
  createComponentTsAsync,
  stringifyInputProps,
  stringifyOutputProps,
} from './template-generators';

// AST Utilities
export {
  addComponentToClientImportsAsync,
  getComponentDecoratorConfigAsync,
  parseJsonArgumentOfComponentDecoratorAsync,
} from './ast-utilities';
