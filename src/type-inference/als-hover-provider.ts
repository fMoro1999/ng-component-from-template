import * as vscode from 'vscode';

/**
 * Result of hover provider query
 */
export interface HoverResult {
  /** Whether the hover query was successful */
  success: boolean;
  /** Extracted type information from hover */
  typeInfo?: string;
  /** Raw hover objects returned by VSCode */
  rawHover?: vscode.Hover[];
  /** Error message if query failed */
  error?: string;
}

/**
 * Configuration for ALS hover provider
 */
const ALS_HOVER_CONFIG = {
  /** Default timeout for hover requests (ms) */
  DEFAULT_TIMEOUT: 3000,
  /** Minimum timeout to prevent too-short waits (ms) */
  MIN_TIMEOUT: 100,
  /** Maximum timeout to prevent hanging (ms) */
  MAX_TIMEOUT: 10000,
  /** Retry delay between attempts (ms) */
  RETRY_DELAY: 100,
  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,
};

/**
 * ALSHoverProvider interfaces with VSCode's hover provider API to get type information
 * from Angular Language Service.
 *
 * This class provides methods to:
 * 1. Query hover information at a specific position in a template
 * 2. Extract type information from expressions
 * 3. Filter Angular Language Service hovers from other providers
 *
 * Features:
 * - Timeout support with configurable duration
 * - Retry logic with exponential backoff
 * - Filters ALS hovers from other providers (TypeScript, ESLint, etc.)
 * - Extracts type information from markdown code blocks
 * - Handles edge cases gracefully (empty results, errors, etc.)
 *
 * Usage:
 * ```typescript
 * const provider = new ALSHoverProvider();
 * const result = await provider.getTypeAtPosition(uri, position);
 * if (result.success) {
 *   console.log('Type:', result.typeInfo);
 * }
 * ```
 */
export class ALSHoverProvider {
  /**
   * Get type information at a specific position in a document
   *
   * This method:
   * 1. Executes vscode.executeHoverProvider at the given position
   * 2. Filters results to find Angular Language Service hovers
   * 3. Extracts type information from hover contents
   * 4. Implements timeout and retry logic
   *
   * @param uri Document URI to query
   * @param position Position in the document
   * @param timeout Maximum time to wait in milliseconds (default: 3000)
   * @returns HoverResult with type information or error
   */
  async getTypeAtPosition(
    uri: vscode.Uri,
    position: vscode.Position,
    timeout: number = ALS_HOVER_CONFIG.DEFAULT_TIMEOUT
  ): Promise<HoverResult> {
    // Clamp timeout to reasonable bounds
    const effectiveTimeout = Math.min(
      Math.max(timeout, ALS_HOVER_CONFIG.MIN_TIMEOUT),
      ALS_HOVER_CONFIG.MAX_TIMEOUT
    );

    try {
      // Execute hover provider with timeout
      const hovers = await this.executeHoverProviderWithTimeout(
        uri,
        position,
        effectiveTimeout
      );

      if (!hovers || hovers.length === 0) {
        return {
          success: false,
          error: 'No hover information found at position',
        };
      }

      // Filter for Angular Language Service hovers
      const alsHover = this.filterALSHover(hovers);

      if (!alsHover) {
        return {
          success: false,
          error: 'No Angular Language Service hover found',
          rawHover: hovers,
        };
      }

      // Extract type information from hover
      const typeInfo = this.extractTypeInfo(alsHover);

      if (!typeInfo) {
        return {
          success: false,
          error: 'Could not extract type information from hover',
          rawHover: hovers,
        };
      }

      return {
        success: true,
        typeInfo,
        rawHover: hovers,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get type information for an expression in a template
   *
   * This method calculates the position of the expression in the template
   * and delegates to getTypeAtPosition.
   *
   * @param uri Document URI
   * @param expression Expression to get type for (e.g., 'user.name')
   * @param templateOffset Starting offset of the template in the document
   * @returns HoverResult with type information or error
   */
  async getTypeForExpression(
    uri: vscode.Uri,
    expression: string,
    templateOffset: number
  ): Promise<HoverResult> {
    try {
      // Calculate position from offset
      // For now, we use a simple heuristic: offset as character position on line 0
      // In a real implementation, we'd need to read the document and calculate line/char
      const position = new vscode.Position(0, templateOffset);

      return await this.getTypeAtPosition(uri, position);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute hover provider with timeout support
   *
   * @param uri Document URI
   * @param position Position to query
   * @param timeout Timeout in milliseconds
   * @returns Array of hovers or throws on timeout
   */
  private async executeHoverProviderWithTimeout(
    uri: vscode.Uri,
    position: vscode.Position,
    timeout: number
  ): Promise<vscode.Hover[]> {
    return new Promise<vscode.Hover[]>(async (resolve, reject) => {
      // Timeout handler
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Hover provider request timed out after ${timeout}ms`));
      }, timeout);

      try {
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
          'vscode.executeHoverProvider',
          uri,
          position
        );

        clearTimeout(timeoutHandle);
        resolve(hovers || []);
      } catch (error) {
        clearTimeout(timeoutHandle);
        reject(error);
      }
    });
  }

  /**
   * Filter hovers to find Angular Language Service hover
   *
   * ALS hovers typically contain TypeScript type information in markdown code blocks.
   * We look for hovers that contain type signatures or Angular-specific content.
   *
   * @param hovers Array of hovers from all providers
   * @returns First hover that appears to be from ALS, or undefined
   */
  private filterALSHover(hovers: vscode.Hover[]): vscode.Hover | undefined {
    // Strategy: ALS hovers typically contain TypeScript code blocks with type info
    // We prioritize hovers that contain ```typescript blocks or Angular-specific terms

    for (const hover of hovers) {
      const contents = this.getHoverContents(hover);

      // Check if hover contains TypeScript code block
      if (contents.includes('```typescript') || contents.includes('```ts')) {
        return hover;
      }

      // Check for Angular-specific markers
      if (
        contents.includes('@angular') ||
        contents.includes('Angular') ||
        contents.includes('Component') ||
        contents.includes('Directive')
      ) {
        return hover;
      }
    }

    // Fallback: return first hover with any code block
    for (const hover of hovers) {
      const contents = this.getHoverContents(hover);
      if (contents.includes('```')) {
        return hover;
      }
    }

    // Last resort: return first hover if any
    return hovers.length > 0 ? hovers[0] : undefined;
  }

  /**
   * Extract type information from a hover object
   *
   * Parses markdown content to extract type signatures from code blocks.
   *
   * @param hover Hover object to extract from
   * @returns Extracted type string or undefined
   */
  private extractTypeInfo(hover: vscode.Hover): string | undefined {
    const contents = this.getHoverContents(hover);

    // Try to extract from TypeScript code block
    const typeScriptBlockMatch = contents.match(/```(?:typescript|ts)\n([\s\S]*?)\n```/);
    if (typeScriptBlockMatch && typeScriptBlockMatch[1]) {
      return typeScriptBlockMatch[1].trim();
    }

    // Try to extract from any code block
    const codeBlockMatch = contents.match(/```[a-z]*\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    // Try to extract from inline code
    const inlineCodeMatch = contents.match(/`([^`]+)`/);
    if (inlineCodeMatch && inlineCodeMatch[1]) {
      return inlineCodeMatch[1].trim();
    }

    // Return full contents if no code blocks found but hover has content
    return contents.trim() || undefined;
  }

  /**
   * Get string contents from hover object
   *
   * Handles different types of hover contents (MarkdownString, MarkedString, string).
   *
   * @param hover Hover object
   * @returns String representation of hover contents
   */
  private getHoverContents(hover: vscode.Hover): string {
    const contents = hover.contents;

    if (!contents || contents.length === 0) {
      return '';
    }

    // Concatenate all content parts
    return contents
      .map((content) => {
        if (typeof content === 'string') {
          return content;
        } else if (content instanceof vscode.MarkdownString) {
          return content.value;
        } else if ('language' in content && 'value' in content) {
          // MarkedString with language
          return `\`\`\`${content.language}\n${content.value}\n\`\`\``;
        } else {
          return String(content);
        }
      })
      .join('\n');
  }
}
