import fs from 'fs';
import path from 'path';
import { Project, SourceFile } from 'ts-morph';
import { Logger, getGlobalLogger } from './logger';

export interface InferredType {
  propertyName: string;
  type: string;
  isInferred: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface TypeInferenceContext {
  parentTsFilePath: string;
  templateBindings: Map<string, string>; // property name -> binding expression
}

export class TypeInferenceEngine {
  private project: Project | null = null;
  private logger: Logger;
  private externalProject?: Project;

  constructor(logger?: Logger, project?: Project) {
    this.logger = logger || getGlobalLogger();
    this.externalProject = project;
  }

  /**
   * Initialize ts-morph project
   */
  private initializeProject(filePath: string): void {
    // If external project provided (e.g., for testing), use it
    if (this.externalProject) {
      this.project = this.externalProject;
      return;
    }

    if (this.project) {
      return;
    }

    const workspaceRoot = this.findWorkspaceRoot(filePath);
    const tsConfigPath = this.findTsConfigPath(workspaceRoot);

    this.project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
    });
  }

  /**
   * Infer types for all detected bindings
   */
  async inferTypesAsync(
    context: TypeInferenceContext
  ): Promise<Map<string, InferredType>> {
    const results = new Map<string, InferredType>();

    try {
      this.initializeProject(context.parentTsFilePath);

      // For in-memory projects, check if file exists in project
      // For real projects, check filesystem
      let sourceFile: SourceFile | undefined;

      if (this.externalProject) {
        // In-memory project: get existing source file
        sourceFile = this.project!.getSourceFile(context.parentTsFilePath);
        if (!sourceFile) {
          this.logger.warn(`File not found: ${context.parentTsFilePath}`);
          // Return unknown for all bindings
          for (const [propertyName] of context.templateBindings) {
            results.set(propertyName, {
              propertyName,
              type: 'unknown',
              isInferred: false,
              confidence: 'low',
            });
          }
          return results;
        }
      } else {
        // Real filesystem project: check if file exists first
        if (!fs.existsSync(context.parentTsFilePath)) {
          this.logger.warn(`File not found: ${context.parentTsFilePath}`);
          // Return unknown for all bindings
          for (const [propertyName] of context.templateBindings) {
            results.set(propertyName, {
              propertyName,
              type: 'unknown',
              isInferred: false,
              confidence: 'low',
            });
          }
          return results;
        }

        sourceFile = this.project!.addSourceFileAtPath(
          context.parentTsFilePath
        );
      }

      for (const [
        propertyName,
        bindingExpression,
      ] of context.templateBindings) {
        const inferredType = await this.inferTypeFromExpression(
          sourceFile,
          propertyName,
          bindingExpression
        );
        results.set(propertyName, inferredType);
      }
    } catch (error) {
      this.logger.error('Type inference error:', error);
      // Return unknown for all bindings on error
      for (const [propertyName] of context.templateBindings) {
        results.set(propertyName, {
          propertyName,
          type: 'unknown',
          isInferred: false,
          confidence: 'low',
        });
      }
    }

    return results;
  }

  /**
   * Infer type from a binding expression like "user.name" or "handleClick($event)"
   */
  private async inferTypeFromExpression(
    sourceFile: SourceFile,
    propertyName: string,
    expression: string
  ): Promise<InferredType> {
    // For inputs: analyze the expression (e.g., "user.name")
    if (!expression.includes('(')) {
      return this.inferInputType(sourceFile, propertyName, expression);
    }

    // For outputs: analyze the method signature
    return this.inferOutputType(sourceFile, propertyName, expression);
  }

  /**
   * Infer input type from template expression
   * Example: [userName]="user.name" -> analyze type of user.name
   */
  private inferInputType(
    sourceFile: SourceFile,
    propertyName: string,
    expression: string
  ): InferredType {
    const defaultResult: InferredType = {
      propertyName,
      type: 'unknown',
      isInferred: false,
      confidence: 'low',
    };

    try {
      // Get the component class
      const classDeclaration = sourceFile.getClasses()[0];
      if (!classDeclaration) {
        return defaultResult;
      }

      // Parse expression path (e.g., "user.name" -> ["user", "name"])
      const expressionParts = expression.trim().split('.');
      const rootProperty = expressionParts[0];

      // Find the root property in the component
      let property = classDeclaration.getProperty(rootProperty);

      if (!property) {
        // Try to find in constructor parameters
        const constructor = classDeclaration.getConstructors()[0];
        if (constructor) {
          const param = constructor.getParameter(rootProperty);
          if (param) {
            let currentType = param.getType();

            // Traverse the property chain
            for (let i = 1; i < expressionParts.length; i++) {
              const part = expressionParts[i];
              const properties = currentType.getProperties();
              const nextProperty = properties.find((p) => p.getName() === part);

              if (!nextProperty) {
                return defaultResult;
              }

              const valueDeclaration = nextProperty.getValueDeclaration();
              if (valueDeclaration) {
                currentType = valueDeclaration.getType();
              } else {
                return defaultResult;
              }
            }

            const typeText = this.getFullTypeText(currentType);
            return {
              propertyName,
              type: typeText,
              isInferred: true,
              confidence: 'medium',
            };
          }
        }
        return defaultResult;
      }

      // Get the type of the property
      let currentType = property.getType();

      // For root property with no chaining, check if there's an explicit type annotation
      if (expressionParts.length === 1) {
        const typeNode = property.getTypeNode();
        if (typeNode) {
          const typeText = this.simplifyTypeText(typeNode.getText());
          return {
            propertyName,
            type: typeText,
            isInferred: true,
            confidence: 'high',
          };
        }
      }

      // Traverse the property chain
      for (let i = 1; i < expressionParts.length; i++) {
        const part = expressionParts[i];
        const properties = currentType.getProperties();
        const nextProperty = properties.find((p) => p.getName() === part);

        if (!nextProperty) {
          return defaultResult;
        }

        const valueDeclaration = nextProperty.getValueDeclaration();
        if (valueDeclaration) {
          currentType = valueDeclaration.getType();
        } else {
          return defaultResult;
        }
      }

      // Get the string representation of the type
      let typeText = this.getFullTypeText(currentType);

      return {
        propertyName,
        type: typeText,
        isInferred: true,
        confidence: 'high',
      };
    } catch (error) {
      this.logger.error(`Error inferring type for ${propertyName}:`, error);
      return defaultResult;
    }
  }

  /**
   * Infer output type from method signature
   * Example: (click)="handleClick($event)" -> analyze handleClick parameter type
   */
  private inferOutputType(
    sourceFile: SourceFile,
    propertyName: string,
    expression: string
  ): InferredType {
    const defaultResult: InferredType = {
      propertyName,
      type: 'unknown',
      isInferred: false,
      confidence: 'low',
    };

    try {
      // Extract method name from expression like "handleClick($event)"
      const methodMatch = expression.match(/^(\w+)\(/);
      if (!methodMatch) {
        return defaultResult;
      }

      const methodName = methodMatch[1];
      const classDeclaration = sourceFile.getClasses()[0];
      if (!classDeclaration) {
        return defaultResult;
      }

      // Find the method
      const method = classDeclaration.getMethod(methodName);
      if (!method) {
        return defaultResult;
      }

      // Get first parameter type (usually the event)
      const parameters = method.getParameters();
      if (parameters.length === 0) {
        return {
          propertyName,
          type: 'void',
          isInferred: true,
          confidence: 'high',
        };
      }

      const firstParam = parameters[0];
      const paramType = firstParam.getType();
      const typeText = this.getFullTypeText(paramType);

      return {
        propertyName,
        type: typeText,
        isInferred: true,
        confidence: 'high',
      };
    } catch (error) {
      this.logger.error(`Error inferring output type for ${propertyName}:`, error);
      return defaultResult;
    }
  }

  /**
   * Get full type text including nullable and undefined types
   */
  private getFullTypeText(type: any): string {
    let typeText = type.getText();

    // Check if type is nullable or has undefined
    if (type.isUnion()) {
      const unionTypes = type.getUnionTypes();
      const typeStrings = unionTypes.map((t: any) => t.getText());
      typeText = typeStrings.join(' | ');
    }

    return this.simplifyTypeText(typeText);
  }

  /**
   * Simplify complex type text for better readability
   */
  private simplifyTypeText(typeText: string): string {
    // Remove "import(...)" paths
    typeText = typeText.replace(/import\([^)]+\)\./g, '');

    // Normalize boolean unions
    if (typeText === 'false | true' || typeText === 'true | false') {
      typeText = 'boolean';
    }

    // Simplify common types
    const simplifications: Record<string, string> = {
      'string | null | undefined': 'string | null',
      'number | null | undefined': 'number | null',
      'boolean | null | undefined': 'boolean | null',
    };

    for (const [complex, simple] of Object.entries(simplifications)) {
      typeText = typeText.replace(complex, simple);
    }

    return typeText;
  }

  /**
   * Find workspace root directory
   */
  private findWorkspaceRoot(filePath: string): string {
    let currentDir = path.dirname(filePath);

    // Look for package.json
    while (currentDir !== '/') {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    return path.dirname(filePath);
  }

  /**
   * Find tsconfig.json in workspace
   */
  private findTsConfigPath(workspaceRoot: string): string | undefined {
    const possiblePaths = [
      path.join(workspaceRoot, 'tsconfig.json'),
      path.join(workspaceRoot, 'tsconfig.app.json'),
      path.join(workspaceRoot, 'src', 'tsconfig.json'),
    ];

    for (const tsConfigPath of possiblePaths) {
      if (fs.existsSync(tsConfigPath)) {
        return tsConfigPath;
      }
    }

    return undefined;
  }
}
