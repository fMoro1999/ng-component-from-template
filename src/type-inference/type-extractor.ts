import * as vscode from 'vscode';

export interface ExtractedType {
  type: string;
  isNullable: boolean;
  isOptional: boolean;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * TypeExtractor parses VSCode hover markdown to extract TypeScript type information
 *
 * This class is responsible for:
 * - Parsing hover markdown from Angular Language Service
 * - Extracting type signatures from code blocks
 * - Normalizing type strings (removing import paths, simplifying unions)
 * - Determining nullable and optional type characteristics
 */
export class TypeExtractor {
  /**
   * Extract type information from a VSCode Hover result
   *
   * @param hover - VSCode Hover object containing type information
   * @returns Extracted type information or null if no type found
   */
  extractTypeFromHover(hover: vscode.Hover): ExtractedType | null {
    if (!hover || !hover.contents || hover.contents.length === 0) {
      return null;
    }

    // Try to extract type from each hover content
    for (const content of hover.contents) {
      const markdown = this.getMarkdownText(content);
      if (!markdown) {
        continue;
      }

      // Parse code block from markdown
      const codeBlock = this.parseMarkdownCodeBlock(markdown);
      if (!codeBlock) {
        continue;
      }

      // Extract type from signature
      const rawType = this.extractTypeFromSignature(codeBlock);
      if (!rawType) {
        continue;
      }

      // Normalize and analyze the type
      const normalizedType = this.normalizeTypeString(rawType);
      const isNullable = this.isNullableType(rawType);
      const isOptional = this.isOptionalType(codeBlock);

      return {
        type: normalizedType,
        isNullable,
        isOptional,
        confidence: 'high',
      };
    }

    return null;
  }

  /**
   * Parse markdown code block to extract type signature
   *
   * @param markdown - Markdown string potentially containing code blocks
   * @returns Code block content or null
   */
  parseMarkdownCodeBlock(markdown: string): string | null {
    if (!markdown) {
      return null;
    }

    // Match code blocks with optional language specifier
    // Patterns: ```typescript\ncode\n``` or ```\ncode\n```
    const codeBlockRegex = /```(?:typescript|ts)?\s*\n([\s\S]*?)\n```/;
    const match = markdown.match(codeBlockRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    return null;
  }

  /**
   * Normalize type string by removing import paths and simplifying
   *
   * @param rawType - Raw type string from TypeScript
   * @returns Normalized type string
   */
  normalizeTypeString(rawType: string): string {
    if (!rawType) {
      return 'unknown';
    }

    let normalized = rawType;

    // Remove import() paths: import("path/to/module").TypeName -> TypeName
    normalized = normalized.replace(/import\([^)]+\)\./g, '');

    // Simplify null | undefined unions to just null
    // string | null | undefined -> string | null
    normalized = normalized.replace(/\s*\|\s*undefined/g, '');

    // Clean up extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Extract type from a TypeScript signature
   *
   * Handles signatures like:
   * - (property) name: string
   * - (method) onClick(event: MouseEvent): void
   * - (property) count?: number
   *
   * @param signature - TypeScript signature string
   * @returns Extracted type string
   */
  extractTypeFromSignature(signature: string): string {
    if (!signature) {
      return '';
    }

    // Pattern 1: Property signature - (property) name: Type or name?: Type
    const propertyMatch = signature.match(/\(property\)\s+\w+\??\s*:\s*(.+)/);
    if (propertyMatch && propertyMatch[1]) {
      return propertyMatch[1].trim();
    }

    // Pattern 2: Method signature - extract first parameter type
    // (method) onClick(event: MouseEvent): void -> MouseEvent
    const methodMatch = signature.match(/\(method\)\s+\w+\s*\(\s*\w+\s*:\s*([^),]+)/);
    if (methodMatch && methodMatch[1]) {
      return methodMatch[1].trim();
    }

    // Pattern 3: Simple type annotation - name: Type or name?: Type
    const simpleMatch = signature.match(/\w+\??\s*:\s*(.+)/);
    if (simpleMatch && simpleMatch[1]) {
      return simpleMatch[1].trim();
    }

    return '';
  }

  /**
   * Get markdown text from various VSCode hover content formats
   *
   * @param content - VSCode hover content (string, MarkdownString, or MarkedString)
   * @returns Markdown text or null
   */
  private getMarkdownText(content: vscode.MarkdownString | vscode.MarkedString): string | null {
    if (typeof content === 'string') {
      return content;
    }

    // MarkdownString type
    if (content && typeof content === 'object' && 'value' in content) {
      return content.value;
    }

    return null;
  }

  /**
   * Check if type is nullable (contains null or undefined)
   *
   * @param typeString - Type string to check
   * @returns True if type is nullable
   */
  private isNullableType(typeString: string): boolean {
    return typeString.includes('| null') || typeString.includes('| undefined');
  }

  /**
   * Check if property is optional (has ? modifier)
   *
   * @param signature - TypeScript signature
   * @returns True if property is optional
   */
  private isOptionalType(signature: string): boolean {
    return signature.includes('?:') || signature.includes('? :');
  }
}
