// The module 'vscode' contains the VS Code extensibility API
import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { getExtensionConfig } from './config';
import {
  addToClientImportsIfStandaloneAsync,
  addToDeclaringModuleExportsAsync,
  createComponentTemplateFromSelectedTextAsync,
  createComponentTsFromSelectedTextAsync,
  createEmptyComponentScssAsync,
  detectComponentMetadata,
  replaceHighlightedTextAsync,
} from './core';
import { createFolderRecursivelyAsync } from './file-operations';
import {
  applyALSQuickFixes,
  applyFallbackImports,
  isALSAvailable,
  likelyHasMissingImports,
} from './language-service';
import { getCurrentWorkspaceAbsolutePath, isPathLike } from './path-resolution';
import { PreviewModeOrchestrator } from './preview';
import {
  askForNewComponentNameAsync,
  askForNewComponentPathAsync,
  getHighlightedText,
  getHighlightedTextPathAsync,
  readTextFromClipboardAsync,
  showInfoAsync,
} from './ui-interactions';

/**
 * Parameters for generating component files
 */
interface GenerateComponentFilesParams {
  componentPath: string;
  componentName: string;
  template: string;
  bindingProperties: Map<'inputs' | 'outputs' | 'models', string[]>;
}

/**
 * Generates all component files (HTML, TS, SCSS), updates parent component,
 * and applies ALS quick fixes if enabled.
 *
 * This shared function eliminates duplication between preview and non-preview modes.
 */
async function generateComponentFilesAsync({
  componentPath,
  componentName,
  template,
  bindingProperties,
}: GenerateComponentFilesParams): Promise<boolean> {
  const componentFolderPath = path.join(componentPath, componentName);

  // Create folder if it doesn't exist
  const alreadyExists = fs.existsSync(componentFolderPath);
  if (!alreadyExists) {
    console.log('Path does not exist. Will create it for you! ;)');
    const hasFolderCreationSucceeded = await createFolderRecursivelyAsync(
      componentFolderPath
    );
    if (!hasFolderCreationSucceeded) {
      return false;
    }
  }

  // Generate component files
  await createComponentTemplateFromSelectedTextAsync({
    componentPath: componentFolderPath,
    dasherizedComponentName: componentName,
    template,
  });

  const { success: tsCreated, filePath: componentTsPath } =
    await createComponentTsFromSelectedTextAsync({
      componentPath: componentFolderPath,
      dasherizedComponentName: componentName,
      bindingProperties,
      template,
    });

  await createEmptyComponentScssAsync({
    componentPath: componentFolderPath,
    dasherizedComponentName: componentName,
  });

  // Update parent component
  await replaceHighlightedTextAsync(componentName);
  await addToDeclaringModuleExportsAsync(componentName, componentFolderPath);
  await addToClientImportsIfStandaloneAsync(componentName);

  // Apply ALS quick fixes if enabled
  if (tsCreated) {
    await applyALSQuickFixesIfEnabled(componentTsPath, template);
  }

  await showInfoAsync('Enjoy!');
  return true;
}

export function activate(context: vscode.ExtensionContext) {
  const createComponentCommand = vscode.commands.registerCommand(
    'ng-component-from-template.createAngularComponent',
    async () => {
      const config = vscode.workspace.getConfiguration('ngComponentFromTemplate');
      const enablePreviewMode = config.get<boolean>('enablePreviewMode', true);

      const textFromClipboard = await readTextFromClipboardAsync();
      const shouldAskToUseCopiedPath =
        textFromClipboard && isPathLike(textFromClipboard);

      let usePathFromClipboard = false;
      if (shouldAskToUseCopiedPath) {
        const prompt = await vscode.window.showInformationMessage(
          `It seems you have already copied a potential path (${textFromClipboard}).
          Do you want to use it as destination path for the new component?`,
          'Yes',
          'No'
        );
        usePathFromClipboard = prompt === 'Yes';
      }

      const relativeComponentPath = usePathFromClipboard
        ? textFromClipboard
        : await askForNewComponentPathAsync();

      const componentPath = path.join(
        getCurrentWorkspaceAbsolutePath(),
        relativeComponentPath
      );

      const dasherizedComponentName: string =
        await askForNewComponentNameAsync();
      const template: string = getHighlightedText();
      const bindingProperties: Map<'inputs' | 'outputs' | 'models', string[]> =
        detectComponentMetadata(template);

      // Show preview mode if enabled
      if (enablePreviewMode) {
        const orchestrator = new PreviewModeOrchestrator();
        const parentFilePath = getHighlightedTextPathAsync();

        const previewResult = await orchestrator.showPreview(
          {
            componentName: dasherizedComponentName,
            template,
            bindingProperties,
            parentFilePath
          },
          context
        );

        // User cancelled the preview
        if (!previewResult.confirmed) {
          await showInfoAsync('Component generation cancelled.');
          return;
        }

        // Update component name and binding properties from preview state
        const finalState = previewResult.state!;
        const finalComponentName = finalState.componentName;

        // Update binding properties to only include enabled properties
        const updatedBindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
          ['inputs', finalState.inputs.filter(i => i.enabled).map(i => i.name)],
          ['outputs', finalState.outputs.filter(o => o.enabled).map(o => o.name)],
          ['models', finalState.models.filter(m => m.enabled).map(m => m.name)]
        ]);

        await generateComponentFilesAsync({
          componentPath,
          componentName: finalComponentName,
          template,
          bindingProperties: updatedBindingProperties,
        });
      } else {
        // Original flow without preview
        await generateComponentFilesAsync({
          componentPath,
          componentName: dasherizedComponentName,
          template,
          bindingProperties,
        });
      }
    }
  );

  context.subscriptions.push(createComponentCommand);
}

/**
 * Helper function to apply import resolution with ALS-first, fallback-secondary pipeline
 *
 * Pipeline:
 * 1. Primary: Try Angular Language Service (if enabled and available)
 * 2. Check: Verify if imports are still missing
 * 3. Fallback: Apply heuristic detection if needed
 * 4. User messaging: Inform about fallback usage
 *
 * This ensures robustness while maintaining correctness when ALS is available.
 */
async function applyALSQuickFixesIfEnabled(
  componentFilePath: string,
  template: string
): Promise<void> {
  const config = getExtensionConfig();
  const componentUri = vscode.Uri.file(componentFilePath);

  // If ALS integration is disabled, skip everything
  if (!config.useAngularLanguageService) {
    console.log('ALS integration disabled in settings');
    return;
  }

  // Step 1: Try Angular Language Service (Primary)
  if (isALSAvailable()) {
    console.log('ALS available - attempting Quick Fixes');

    const alsResult = await applyALSQuickFixes({
      componentUri,
      timeout: 2000,
      showProgress: true,
      passes: 2,
    });

    if (alsResult.success && alsResult.importsAdded > 0) {
      console.log(`ALS added ${alsResult.importsAdded} imports successfully`);
      return; // ALS succeeded, we're done
    }

    if (alsResult.success && alsResult.importsAdded === 0) {
      console.log('ALS returned no quick fixes');
      // Continue to fallback check
    }

    if (!alsResult.success) {
      console.warn(`ALS failed: ${alsResult.error}`);
      // Continue to fallback
    }
  } else {
    console.log('Angular Language Service not available');
  }

  // Step 2: Check if imports are likely missing
  const document = await vscode.workspace.openTextDocument(componentUri);
  const hasMissingImports = likelyHasMissingImports(document, template);

  if (!hasMissingImports) {
    console.log('No missing imports detected');
    return;
  }

  // Step 3: Apply fallback heuristic (best-effort)
  console.log('Applying fallback import detection...');

  const fallbackResult = await applyFallbackImports(componentUri, template);

  if (fallbackResult.applied) {
    // Inform user about fallback usage
    await showInfoAsync(
      `Fallback import detection applied (${fallbackResult.importsAdded} imports added). ` +
        `Install "Angular Language Service" extension for automatic, accurate import resolution. ` +
        `Please verify imports manually for custom components/pipes.`
    );
    console.log(
      `Fallback added ${fallbackResult.importsAdded} imports (best-effort)`
    );
  } else if (fallbackResult.warning) {
    console.warn(`Fallback warning: ${fallbackResult.warning}`);
  }
}
