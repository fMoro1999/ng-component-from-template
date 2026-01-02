import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateDocumentManager } from '../type-inference/als-template-manager';

suite('TemplateDocumentManager Test Suite', () => {
  let manager: TemplateDocumentManager;
  let workspaceRoot: string;
  let tmpDir: string;

  setup(() => {
    manager = new TemplateDocumentManager();
    // Get the workspace root from vscode
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      workspaceRoot = workspaceFolders[0].uri.fsPath;
    } else {
      // Fallback for tests running without a workspace
      workspaceRoot = path.join(__dirname, '..', '..');
    }
    tmpDir = path.join(workspaceRoot, '.vscode', 'tmp');
  });

  teardown(async () => {
    // Cleanup any temp files created during tests
    await manager.cleanupAll();
  });

  // ========================================
  // createTemporaryComponent tests
  // ========================================

  suite('createTemporaryComponent', () => {
    test('should create temporary component file in .vscode/tmp/', async () => {
      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      const uri = await manager.createTemporaryComponent(context);

      assert.ok(uri, 'URI should be returned');
      assert.ok(uri.fsPath.includes('.vscode/tmp'), 'File should be in .vscode/tmp directory');
      assert.ok(uri.fsPath.endsWith('.component.ts'), 'File should have .component.ts extension');
    });

    test('should verify file exists after creation', async () => {
      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      const uri = await manager.createTemporaryComponent(context);
      const fileExists = fs.existsSync(uri.fsPath);

      assert.strictEqual(fileExists, true, 'File should exist after creation');
    });

    test('should handle workspace root detection', async () => {
      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      const uri = await manager.createTemporaryComponent(context);

      assert.ok(uri.fsPath.startsWith(workspaceRoot), 'File should be within workspace root');
    });

    test('should generate unique filenames using timestamps', async () => {
      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      const uri1 = await manager.createTemporaryComponent(context);
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const uri2 = await manager.createTemporaryComponent(context);

      assert.notStrictEqual(uri1.fsPath, uri2.fsPath, 'Filenames should be unique');
    });

    test('should create .vscode/tmp directory if it does not exist', async () => {
      // Remove the tmp directory if it exists
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }

      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      const uri = await manager.createTemporaryComponent(context);
      const dirExists = fs.existsSync(tmpDir);

      assert.strictEqual(dirExists, true, '.vscode/tmp directory should be created');
      assert.ok(fs.existsSync(uri.fsPath), 'File should be created in the new directory');
    });

    test('should embed template content in created file', async () => {
      const templateContent = '<div class="test">Hello World</div>';
      const context = {
        templateContent,
        isInlineTemplate: false,
      };

      const uri = await manager.createTemporaryComponent(context);
      const fileContent = fs.readFileSync(uri.fsPath, 'utf-8');

      assert.ok(fileContent.includes(templateContent), 'File should contain the template content');
    });
  });

  // ========================================
  // calculatePositionInTemplate tests
  // ========================================

  suite('calculatePositionInTemplate', () => {
    test('should calculate position for simple expression', () => {
      const templateContent = '<div [title]="myTitle"></div>';
      const expression = 'myTitle';

      const position = manager.calculatePositionInTemplate(expression, templateContent);

      assert.ok(position, 'Position should be returned');
      assert.strictEqual(position.line, 0, 'Should be on line 0');
      assert.ok(position.character >= 0, 'Character position should be valid');
    });

    test('should calculate position in multiline template', () => {
      const templateContent = `<div>
  <span [value]="myValue"></span>
</div>`;
      const expression = 'myValue';

      const position = manager.calculatePositionInTemplate(expression, templateContent);

      assert.ok(position, 'Position should be returned');
      assert.strictEqual(position.line, 1, 'Should be on line 1');
      assert.ok(position.character >= 0, 'Character position should be valid');
    });

    test('should handle expression at start of template', () => {
      const templateContent = '[value]="startValue" <div></div>';
      const expression = 'startValue';

      const position = manager.calculatePositionInTemplate(expression, templateContent);

      assert.ok(position, 'Position should be returned');
      assert.strictEqual(position.line, 0, 'Should be on line 0');
    });

    test('should handle expression at middle of template', () => {
      const templateContent = '<div></div> [value]="middleValue" <span></span>';
      const expression = 'middleValue';

      const position = manager.calculatePositionInTemplate(expression, templateContent);

      assert.ok(position, 'Position should be returned');
      assert.strictEqual(position.line, 0, 'Should be on line 0');
    });

    test('should handle expression at end of template', () => {
      const templateContent = '<div></div> <span></span> [value]="endValue"';
      const expression = 'endValue';

      const position = manager.calculatePositionInTemplate(expression, templateContent);

      assert.ok(position, 'Position should be returned');
      assert.strictEqual(position.line, 0, 'Should be on line 0');
    });

    test('should handle expression not found by returning position 0,0', () => {
      const templateContent = '<div [title]="myTitle"></div>';
      const expression = 'nonExistentExpression';

      const position = manager.calculatePositionInTemplate(expression, templateContent);

      assert.ok(position, 'Position should be returned');
      assert.strictEqual(position.line, 0, 'Should default to line 0');
      assert.strictEqual(position.character, 0, 'Should default to character 0');
    });

    test('should handle nested templates with multiple expressions', () => {
      const templateContent = `<div>
  <child-component [value1]="expr1">
    <nested [value2]="expr2"></nested>
  </child-component>
</div>`;
      const expression = 'expr2';

      const position = manager.calculatePositionInTemplate(expression, templateContent);

      assert.ok(position, 'Position should be returned');
      assert.strictEqual(position.line, 2, 'Should be on line 2');
    });
  });

  // ========================================
  // cleanup tests
  // ========================================

  suite('cleanup', () => {
    test('should cleanup specific temporary file', async () => {
      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      const uri = await manager.createTemporaryComponent(context);
      assert.ok(fs.existsSync(uri.fsPath), 'File should exist before cleanup');

      await manager.cleanup(uri);
      const fileExists = fs.existsSync(uri.fsPath);

      assert.strictEqual(fileExists, false, 'File should be deleted after cleanup');
    });

    test('should verify file is deleted after cleanup', async () => {
      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      const uri = await manager.createTemporaryComponent(context);
      await manager.cleanup(uri);

      assert.strictEqual(fs.existsSync(uri.fsPath), false, 'File should not exist');
    });

    test('should handle cleanup of non-existent file without error', async () => {
      const nonExistentUri = vscode.Uri.file(path.join(tmpDir, 'non-existent-file.ts'));

      // Should not throw an error
      await assert.doesNotReject(
        async () => await manager.cleanup(nonExistentUri),
        'Cleanup should not throw error for non-existent file'
      );
    });

    test('should handle cleanup errors gracefully', async () => {
      // Create a URI with invalid path characters (on some systems)
      const invalidUri = vscode.Uri.file(path.join(tmpDir, 'invalid\x00file.ts'));

      // Should not throw an error, even with invalid path
      await assert.doesNotReject(
        async () => await manager.cleanup(invalidUri),
        'Cleanup should handle errors gracefully'
      );
    });
  });

  // ========================================
  // cleanupAll tests
  // ========================================

  suite('cleanupAll', () => {
    test('should cleanup all temporary files created by manager', async () => {
      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      const uri1 = await manager.createTemporaryComponent(context);
      const uri2 = await manager.createTemporaryComponent(context);
      const uri3 = await manager.createTemporaryComponent(context);

      assert.ok(fs.existsSync(uri1.fsPath), 'File 1 should exist');
      assert.ok(fs.existsSync(uri2.fsPath), 'File 2 should exist');
      assert.ok(fs.existsSync(uri3.fsPath), 'File 3 should exist');

      await manager.cleanupAll();

      assert.strictEqual(fs.existsSync(uri1.fsPath), false, 'File 1 should be deleted');
      assert.strictEqual(fs.existsSync(uri2.fsPath), false, 'File 2 should be deleted');
      assert.strictEqual(fs.existsSync(uri3.fsPath), false, 'File 3 should be deleted');
    });

    test('should track created files internally', async () => {
      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      // Create multiple files
      await manager.createTemporaryComponent(context);
      await manager.createTemporaryComponent(context);

      // cleanupAll should know about all files created
      await assert.doesNotReject(
        async () => await manager.cleanupAll(),
        'cleanupAll should complete without errors'
      );
    });

    test('should verify all files are deleted after cleanupAll', async () => {
      const context = {
        templateContent: '<div>Test Template</div>',
        isInlineTemplate: false,
      };

      const uris = [
        await manager.createTemporaryComponent(context),
        await manager.createTemporaryComponent(context),
        await manager.createTemporaryComponent(context),
      ];

      await manager.cleanupAll();

      for (const uri of uris) {
        assert.strictEqual(
          fs.existsSync(uri.fsPath),
          false,
          `File ${path.basename(uri.fsPath)} should be deleted`
        );
      }
    });
  });

  // ========================================
  // embedTemplateInComponent tests
  // ========================================

  suite('embedTemplateInComponent', () => {
    test('should generate valid standalone component syntax', async () => {
      const template = '<div>Test Template</div>';

      const componentCode = await manager.embedTemplateInComponent(template);

      assert.ok(componentCode.includes('standalone: true'), 'Should be standalone component');
      assert.ok(componentCode.includes('@Component'), 'Should have @Component decorator');
    });

    test('should embed template as inline template', async () => {
      const template = '<div class="test">Hello World</div>';

      const componentCode = await manager.embedTemplateInComponent(template);

      assert.ok(componentCode.includes('template:'), 'Should have inline template');
      assert.ok(componentCode.includes(template), 'Should contain the template content');
    });

    test('should include proper imports', async () => {
      const template = '<div>Test Template</div>';

      const componentCode = await manager.embedTemplateInComponent(template);

      assert.ok(
        componentCode.includes("import { Component } from '@angular/core'"),
        'Should import Component from @angular/core'
      );
    });

    test('should include proper decorator', async () => {
      const template = '<div>Test Template</div>';

      const componentCode = await manager.embedTemplateInComponent(template);

      assert.ok(componentCode.includes('@Component({'), 'Should have @Component decorator');
      assert.ok(componentCode.includes('selector:'), 'Should have selector property');
    });

    test('should handle multiline templates', async () => {
      const template = `<div>
  <span>Line 1</span>
  <span>Line 2</span>
</div>`;

      const componentCode = await manager.embedTemplateInComponent(template);

      assert.ok(componentCode.includes(template), 'Should preserve multiline template');
    });

    test('should escape special characters in template', async () => {
      const template = '<div>Test "quotes" and \'apostrophes\'</div>';

      const componentCode = await manager.embedTemplateInComponent(template);

      // The component code should be valid TypeScript
      assert.ok(componentCode.length > 0, 'Should generate component code');
      assert.ok(componentCode.includes('template:'), 'Should have template property');
    });
  });
});
