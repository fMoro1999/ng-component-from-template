/**
 * AST Utilities Module
 *
 * Contains AST manipulation helpers for TypeScript code analysis:
 * - Component decorator parsing
 * - TypeScript source file operations
 */

import fs from 'fs';
import * as ts from 'typescript';
import { Component } from './models';
import { showErrorAsync, showWarningAsync } from './ui-interactions';

/**
 * Gets and parses the @Component decorator configuration from a TypeScript file
 */
export const getComponentDecoratorConfigAsync = async (tsFilePath: string): Promise<Partial<Component>> => {
  if (!fs.existsSync(tsFilePath)) {
    throw new Error(
      'The specified file cannot be opened. It seems it does not exist...'
    );
  }

  let file: fs.promises.FileHandle | null = null;
  file = await fs.promises.open(tsFilePath);

  const openedFile = await file.read();
  const { buffer } = openedFile;
  const fileContent = buffer.toString();
  if (!fileContent) {
    throw new Error('The file is empty. Cannot parse the content...');
  }

  const componentDecoratorConfig =
    await parseComponentDeclarationConfigurationAsync(fileContent);
  const isComponent = !!componentDecoratorConfig;
  if (!isComponent) {
    throw new Error(
      'It seems the consumer file is not an actual component.. We did not found any @Component decorator'
    );
  }

  return componentDecoratorConfig;
};

/**
 * Adds a component to the client's imports array (for standalone components)
 * Note: This function is partially implemented
 */
export const addComponentToClientImportsAsync = async (tsFilePath: string): Promise<void> => {
  if (!fs.existsSync(tsFilePath)) {
    await showErrorAsync(
      `Something went wrong... ${tsFilePath} was not found. Aborting...`
    );
    return;
  }

  let file: fs.promises.FileHandle | null = null;
  try {
    file = await fs.promises.open(tsFilePath);
  } catch (error) {
    console.error(error);
    await showErrorAsync(
      'An error occurred while opening the requested file... See the console for more info.'
    );
    return;
  }

  try {
    const openedFile = await file.read();
    const { buffer } = openedFile;
    const fileContent = buffer.toString();
    const componentDecoratorConfig =
      await parseComponentDeclarationConfigurationAsync(fileContent);
    const isComponent = !!componentDecoratorConfig;
    if (!isComponent) {
      await showErrorAsync(
        'It seems the consumer file is not an actual component.. We did not found any @Component decorator'
      );
      return;
    }
    const isStandalone =
      'standalone' in componentDecoratorConfig &&
      componentDecoratorConfig.standalone;

    if (isStandalone) {
      // Implementation for standalone component imports
      // const { imports } = componentDecoratorConfig;
      // if (Array.isArray(imports)) {
      //   imports.push();
      // }
    } else {
      // Non-standalone component handling
    }
  } catch (error) {
    console.error(error);
    await showErrorAsync(
      `Something went wrong while opening the requested file (${tsFilePath}). Aborting...`
    );
  } finally {
    await file.close();
  }
};

/**
 * Parses the component decorator configuration from TypeScript content
 */
const parseComponentDeclarationConfigurationAsync = async (content: string): Promise<Partial<Component>> => {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    content,
    ts.ScriptTarget.Latest
  );

  const parsedDecoratorArgs: Partial<Component> | undefined =
    await parseJsonArgumentOfComponentDecoratorAsync(sourceFile);

  if (!parsedDecoratorArgs || !Object.keys(parsedDecoratorArgs).length) {
    throw new Error(
      `No classes decorated with @Component found in file ${sourceFile.fileName}`
    );
  }

  return parsedDecoratorArgs;
};

/**
 * Finds a decorator call expression by name in a TypeScript source file
 */
function findDecoratorCallExpressionByName(
  sourceFile: ts.SourceFile,
  decoratorName = 'Component'
): ts.CallExpression | undefined {
  const noResult = undefined;

  const firstClassNode: ts.ClassDeclaration | undefined =
    sourceFile.statements.find(
      (statement): statement is ts.ClassDeclaration =>
        statement.kind === ts.SyntaxKind.ClassDeclaration
    );

  if (!firstClassNode) {
    return noResult;
  }

  const decorators = ts.getDecorators(firstClassNode);
  if (!decorators?.length) {
    return noResult;
  }

  const componentDecorator: ts.CallExpression | undefined = decorators
    .map(({ expression }) => expression)
    .filter(ts.isCallExpression)
    .find((expression) => {
      const { expression: identifier } = expression;
      const isIdentifier = ts.isIdentifier(identifier);
      const hasMatchingDecoratorName =
        isIdentifier && identifier.text === decoratorName;
      return hasMatchingDecoratorName;
    });

  return componentDecorator;
}

/**
 * Parses the JSON-like argument of a @Component decorator
 */
export const parseJsonArgumentOfComponentDecoratorAsync = async (
  sourceFile: ts.SourceFile
): Promise<Partial<Component> | undefined> => {
  const decoratorCallExpression: ts.CallExpression | undefined =
    findDecoratorCallExpressionByName(sourceFile);

  const noResult = undefined;
  if (!decoratorCallExpression) {
    return noResult;
  }

  const args: ts.NodeArray<ts.Expression> = decoratorCallExpression.arguments;
  if (!args.length) {
    await showWarningAsync(
      'No arguments for component decorator detected. Aborting...'
    );
    return noResult;
  }

  const firstArg = args.at(0)!;

  if (!ts.isObjectLiteralExpression(firstArg)) {
    await showWarningAsync(
      'First argument of component decorator is not an object. Aborting...'
    );
    return noResult;
  }

  const { properties } = firstArg;
  const result: Record<string, unknown> = properties.reduce(
    (acc, property) =>
      accumulateComponentConfigKeyValuePairs(property, sourceFile, acc),
    {}
  );

  return result as Partial<Component>;
};

/**
 * Accumulates key-value pairs from component decorator configuration
 */
const accumulateComponentConfigKeyValuePairs = (
  property: ts.ObjectLiteralElementLike,
  sourceFile: ts.SourceFile,
  acc: Record<string, unknown>
): Record<string, unknown> => {
  const { name } = property;
  const propName = (name as unknown as { text: string }).text;
  let value;

  let initializer = null;
  if ('initializer' in property) {
    initializer = property.initializer;
  }

  if (initializer && ts.isArrayLiteralExpression(initializer)) {
    value = initializer.elements.map((element) =>
      'text' in element ? element.text : undefined
    );
  } else if (initializer && 'text' in initializer) {
    value = initializer.text;
  } else {
    const toParse = initializer?.getText(sourceFile) ?? '';
    try {
      value = JSON.parse(toParse);
    } catch {
      value = toParse;
    }
  }

  return { ...acc, [propName]: value };
};
