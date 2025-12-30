/**
 * String Utilities Module
 *
 * Contains string manipulation utilities such as:
 * - Case conversions (camelCase, PascalCase)
 * - Component naming helpers
 * - Array utilities
 */

/**
 * Helper function for case conversion
 */
export const clearAndUpper = (text: string): string =>
  text.replace(/-/, '').toUpperCase();

/**
 * Converts a dash-case string to camelCase
 */
export const camelize = (text: string): string =>
  text.replace(/-\w/g, clearAndUpper);

/**
 * Converts a dash-case string to PascalCase
 */
export const pascalize = (text: string): string =>
  text.replace(/(^\w|-\w)/g, clearAndUpper);

/**
 * Converts a dasherized component name to its class name
 * Example: 'my-component' -> 'MyComponentComponent'
 */
export const toComponentClassName = (dasherizedComponentName: string): string =>
  `${pascalize(dasherizedComponentName).replace('-', '')}Component`;

/**
 * Returns unique values from an array
 */
export const uniquesOf = <T extends string | number | boolean>(
  items: T[] | null
): T[] => Array.from(new Set(items ?? []));
