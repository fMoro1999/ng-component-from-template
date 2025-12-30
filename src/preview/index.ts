// Main orchestrator - primary entry point
export { PreviewModeOrchestrator, PreviewModeResult } from './preview-mode-orchestrator';

// Data collection
export { PreviewDataCollector, PropertyPreview, FilePreview, FileModification, PreviewData, CollectOptions } from './preview-data-collector';

// State management
export { PreviewStateManager, PreviewState, ServiceInjection } from './preview-state-manager';

// Webview provider
export { PreviewWebviewProvider } from './preview-webview-provider';

// Webview message types
export {
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
  ConfirmMessage,
  CancelMessage,
  UpdateComponentNameMessage,
  TogglePropertyMessage,
  UpdatePropertyTypeMessage,
  ToggleLifecycleHookMessage,
  AddServiceMessage,
  RemoveServiceMessage,
  UpdateStateMessage,
  ValidationErrorMessage,
  isWebviewToExtensionMessage,
} from './webview-messages';

// Webview builders
export { WebviewHtmlBuilder, WebviewStyleBuilder, WebviewScriptBuilder, HtmlEscaper } from './webview-builders';

// Diff generation
export { DiffGenerator } from './diff-generator';

// Lifecycle hooks
export { LifecycleHook, AVAILABLE_LIFECYCLE_HOOKS, generateLifecycleHookImports, generateLifecycleHookImplements, generateLifecycleHookMethods } from './lifecycle-hooks';
