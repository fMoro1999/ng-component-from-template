import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Context information for creating a temporary component from a template
 */
export interface TemplateContext {
  /**
   * The template content to embed in the component
   */
  templateContent: string;

  /**
   * URI of the component file (if available)
   */
  componentUri?: vscode.Uri;

  /**
   * Whether this is an inline template or external template file
   */
  isInlineTemplate: boolean;

  /**
   * Path to the parent component (if available)
   */
  parentComponentPath?: string;
}

/**
 * Manages temporary template documents for Angular Language Service (ALS) analysis.
 * Creates temporary component files that can be analyzed by ALS to get accurate
 * type information and dependency resolution.
 */
export class TemplateDocumentManager {
  /**
   * Set of URIs for files created by this manager instance
   */
  private createdFiles: Set<vscode.Uri> = new Set();

  /**
   * Creates a temporary component file with the provided template content.
   * The file is created in .vscode/tmp/ directory with a unique timestamp-based filename.
   *
   * @param context - The template context containing template content and metadata
   * @returns URI of the created temporary component file
   */
  async createTemporaryComponent(context: TemplateContext): Promise<vscode.Uri> {
    const workspaceRoot = this.getWorkspaceRoot();
    const tmpDir = path.join(workspaceRoot, '.vscode', 'tmp');

    // Ensure the temporary directory exists
    await this.ensureDirectoryExists(tmpDir);

    // Generate unique filename using timestamp and random suffix
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const filename = `als-temp-${timestamp}-${random}.component.ts`;
    const filePath = path.join(tmpDir, filename);

    // Generate component code with embedded template
    const componentCode = await this.embedTemplateInComponent(context.templateContent);

    // Write the file
    await fs.promises.writeFile(filePath, componentCode, 'utf-8');

    // Create URI and track it
    const uri = vscode.Uri.file(filePath);
    this.createdFiles.add(uri);

    return uri;
  }

  /**
   * Generates a standalone Angular component with the template embedded inline.
   * This creates valid TypeScript code that can be analyzed by the Angular Language Service.
   *
   * @param template - The template content to embed
   * @returns The complete component code as a string
   */
  async embedTemplateInComponent(template: string): Promise<string> {
    // Escape backticks and backslashes in template for template literal
    const escapedTemplate = template
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');

    const componentCode = `import { Component } from '@angular/core';

@Component({
  selector: 'app-als-temp',
  standalone: true,
  template: \`${escapedTemplate}\`,
})
export class AlsTempComponent {}
`;

    return componentCode;
  }

  /**
   * Calculates the position of an expression within a template.
   * This is useful for mapping positions between the temporary component and the original template.
   *
   * @param expression - The expression to find in the template
   * @param templateContent - The template content to search
   * @returns The position (line and character) of the expression, or (0,0) if not found
   */
  calculatePositionInTemplate(
    expression: string,
    templateContent: string
  ): vscode.Position {
    // Find the index of the expression in the template
    const index = templateContent.indexOf(expression);

    if (index === -1) {
      // Expression not found, return default position
      return new vscode.Position(0, 0);
    }

    // Calculate line and character from index
    const lines = templateContent.substring(0, index).split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;

    return new vscode.Position(line, character);
  }

  /**
   * Cleans up a specific temporary file.
   * Removes the file from the filesystem and from the tracked files set.
   *
   * @param uri - The URI of the file to cleanup
   */
  async cleanup(uri: vscode.Uri): Promise<void> {
    try {
      // Check if file exists before attempting to delete
      if (fs.existsSync(uri.fsPath)) {
        await fs.promises.unlink(uri.fsPath);
      }

      // Remove from tracked files
      this.createdFiles.delete(uri);
    } catch (error) {
      // Silently handle errors - file might already be deleted or inaccessible
      // This ensures cleanup is always safe to call
      console.debug(`Failed to cleanup file ${uri.fsPath}:`, error);
    }
  }

  /**
   * Cleans up all temporary files created by this manager instance.
   * This should be called when the manager is no longer needed to prevent file leaks.
   */
  async cleanupAll(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    // Create cleanup promises for all tracked files
    for (const uri of this.createdFiles) {
      cleanupPromises.push(this.cleanup(uri));
    }

    // Wait for all cleanups to complete
    await Promise.all(cleanupPromises);

    // Clear the set
    this.createdFiles.clear();
  }

  /**
   * Gets the workspace root directory.
   * Falls back to process.cwd() if no workspace is open.
   *
   * @returns The absolute path to the workspace root
   */
  private getWorkspaceRoot(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders && workspaceFolders.length > 0) {
      return workspaceFolders[0].uri.fsPath;
    }

    // Fallback to current working directory
    return process.cwd();
  }

  /**
   * Ensures a directory exists, creating it if necessary.
   *
   * @param dirPath - The directory path to ensure exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      // Directory doesn't exist, create it recursively
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }
}
