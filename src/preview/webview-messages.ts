/**
 * Type definitions for webview-extension message contracts.
 * Uses TypeScript discriminated unions for type safety.
 */

// Messages sent FROM webview TO extension
export type WebviewToExtensionMessage =
  | ConfirmMessage
  | CancelMessage
  | UpdateComponentNameMessage
  | TogglePropertyMessage
  | UpdatePropertyTypeMessage
  | ToggleLifecycleHookMessage
  | AddServiceMessage
  | RemoveServiceMessage;

export interface ConfirmMessage {
  command: 'confirm';
}

export interface CancelMessage {
  command: 'cancel';
}

export interface UpdateComponentNameMessage {
  command: 'updateComponentName';
  value: string;
}

export interface TogglePropertyMessage {
  command: 'toggleProperty';
  propertyType: 'input' | 'output' | 'model';
  propertyName: string;
}

export interface UpdatePropertyTypeMessage {
  command: 'updatePropertyType';
  propertyType: 'input' | 'output' | 'model';
  propertyName: string;
  newType: string;
}

export interface ToggleLifecycleHookMessage {
  command: 'toggleLifecycleHook';
  hookName: string;
}

export interface AddServiceMessage {
  command: 'addService';
  serviceName: string;
  importPath: string;
}

export interface RemoveServiceMessage {
  command: 'removeService';
  serviceName: string;
}

// Messages sent FROM extension TO webview
export type ExtensionToWebviewMessage =
  | UpdateStateMessage
  | ValidationErrorMessage;

export interface UpdateStateMessage {
  command: 'updateState';
  state: unknown; // PreviewState type - imported where used to avoid circular dependencies
}

export interface ValidationErrorMessage {
  command: 'validationError';
  field: string;
  message: string;
}

// Type guard functions for message validation
export function isWebviewToExtensionMessage(message: unknown): message is WebviewToExtensionMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const msg = message as { command?: unknown };
  return typeof msg.command === 'string' && [
    'confirm',
    'cancel',
    'updateComponentName',
    'toggleProperty',
    'updatePropertyType',
    'toggleLifecycleHook',
    'addService',
    'removeService'
  ].includes(msg.command);
}

export function isConfirmMessage(message: WebviewToExtensionMessage): message is ConfirmMessage {
  return message.command === 'confirm';
}

export function isCancelMessage(message: WebviewToExtensionMessage): message is CancelMessage {
  return message.command === 'cancel';
}

export function isUpdateComponentNameMessage(message: WebviewToExtensionMessage): message is UpdateComponentNameMessage {
  return message.command === 'updateComponentName';
}

export function isTogglePropertyMessage(message: WebviewToExtensionMessage): message is TogglePropertyMessage {
  return message.command === 'toggleProperty';
}

export function isUpdatePropertyTypeMessage(message: WebviewToExtensionMessage): message is UpdatePropertyTypeMessage {
  return message.command === 'updatePropertyType';
}

export function isToggleLifecycleHookMessage(message: WebviewToExtensionMessage): message is ToggleLifecycleHookMessage {
  return message.command === 'toggleLifecycleHook';
}

export function isAddServiceMessage(message: WebviewToExtensionMessage): message is AddServiceMessage {
  return message.command === 'addService';
}

export function isRemoveServiceMessage(message: WebviewToExtensionMessage): message is RemoveServiceMessage {
  return message.command === 'removeService';
}
