import * as assert from 'assert';
import {
  isWebviewToExtensionMessage,
  isConfirmMessage,
  isCancelMessage,
  isUpdateComponentNameMessage,
  isTogglePropertyMessage,
  isUpdatePropertyTypeMessage,
  isToggleLifecycleHookMessage,
  isAddServiceMessage,
  isRemoveServiceMessage,
  WebviewToExtensionMessage,
} from '../preview/webview-messages';

suite('Webview Messages Test Suite', () => {
  suite('isWebviewToExtensionMessage', () => {
    test('should return true for confirm message', () => {
      const message = { command: 'confirm' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should return true for cancel message', () => {
      const message = { command: 'cancel' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should return true for updateComponentName message', () => {
      const message = { command: 'updateComponentName', value: 'test' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should return true for toggleProperty message', () => {
      const message = { command: 'toggleProperty', propertyType: 'input', propertyName: 'test' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should return true for updatePropertyType message', () => {
      const message = { command: 'updatePropertyType', propertyType: 'input', propertyName: 'test', newType: 'string' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should return true for toggleLifecycleHook message', () => {
      const message = { command: 'toggleLifecycleHook', hookName: 'ngOnInit' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should return true for addService message', () => {
      const message = { command: 'addService', serviceName: 'UserService', importPath: './user.service' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should return true for removeService message', () => {
      const message = { command: 'removeService', serviceName: 'UserService' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should return false for null', () => {
      assert.strictEqual(isWebviewToExtensionMessage(null), false);
    });

    test('should return false for undefined', () => {
      assert.strictEqual(isWebviewToExtensionMessage(undefined), false);
    });

    test('should return false for string', () => {
      assert.strictEqual(isWebviewToExtensionMessage('string'), false);
    });

    test('should return false for number', () => {
      assert.strictEqual(isWebviewToExtensionMessage(123), false);
    });

    test('should return false for empty object', () => {
      assert.strictEqual(isWebviewToExtensionMessage({}), false);
    });

    test('should return false for object without command', () => {
      assert.strictEqual(isWebviewToExtensionMessage({ type: 'something' }), false);
    });

    test('should return false for unknown command', () => {
      assert.strictEqual(isWebviewToExtensionMessage({ command: 'unknownCommand' }), false);
    });

    test('should return false for non-string command', () => {
      assert.strictEqual(isWebviewToExtensionMessage({ command: 123 }), false);
    });
  });

  suite('isConfirmMessage', () => {
    test('should return true for confirm message', () => {
      const message: WebviewToExtensionMessage = { command: 'confirm' };
      assert.strictEqual(isConfirmMessage(message), true);
    });

    test('should return false for cancel message', () => {
      const message: WebviewToExtensionMessage = { command: 'cancel' };
      assert.strictEqual(isConfirmMessage(message), false);
    });

    test('should return false for other messages', () => {
      const message: WebviewToExtensionMessage = { command: 'updateComponentName', value: 'test' };
      assert.strictEqual(isConfirmMessage(message), false);
    });
  });

  suite('isCancelMessage', () => {
    test('should return true for cancel message', () => {
      const message: WebviewToExtensionMessage = { command: 'cancel' };
      assert.strictEqual(isCancelMessage(message), true);
    });

    test('should return false for confirm message', () => {
      const message: WebviewToExtensionMessage = { command: 'confirm' };
      assert.strictEqual(isCancelMessage(message), false);
    });

    test('should return false for other messages', () => {
      const message: WebviewToExtensionMessage = { command: 'updateComponentName', value: 'test' };
      assert.strictEqual(isCancelMessage(message), false);
    });
  });

  suite('isUpdateComponentNameMessage', () => {
    test('should return true for updateComponentName message', () => {
      const message: WebviewToExtensionMessage = { command: 'updateComponentName', value: 'new-name' };
      assert.strictEqual(isUpdateComponentNameMessage(message), true);
    });

    test('should return false for other messages', () => {
      const message: WebviewToExtensionMessage = { command: 'confirm' };
      assert.strictEqual(isUpdateComponentNameMessage(message), false);
    });
  });

  suite('isTogglePropertyMessage', () => {
    test('should return true for toggleProperty message', () => {
      const message: WebviewToExtensionMessage = {
        command: 'toggleProperty',
        propertyType: 'input',
        propertyName: 'userName',
      };
      assert.strictEqual(isTogglePropertyMessage(message), true);
    });

    test('should return false for other messages', () => {
      const message: WebviewToExtensionMessage = { command: 'confirm' };
      assert.strictEqual(isTogglePropertyMessage(message), false);
    });
  });

  suite('isUpdatePropertyTypeMessage', () => {
    test('should return true for updatePropertyType message', () => {
      const message: WebviewToExtensionMessage = {
        command: 'updatePropertyType',
        propertyType: 'input',
        propertyName: 'userName',
        newType: 'string',
      };
      assert.strictEqual(isUpdatePropertyTypeMessage(message), true);
    });

    test('should return false for other messages', () => {
      const message: WebviewToExtensionMessage = { command: 'confirm' };
      assert.strictEqual(isUpdatePropertyTypeMessage(message), false);
    });
  });

  suite('isToggleLifecycleHookMessage', () => {
    test('should return true for toggleLifecycleHook message', () => {
      const message: WebviewToExtensionMessage = {
        command: 'toggleLifecycleHook',
        hookName: 'ngOnInit',
      };
      assert.strictEqual(isToggleLifecycleHookMessage(message), true);
    });

    test('should return false for other messages', () => {
      const message: WebviewToExtensionMessage = { command: 'confirm' };
      assert.strictEqual(isToggleLifecycleHookMessage(message), false);
    });
  });

  suite('isAddServiceMessage', () => {
    test('should return true for addService message', () => {
      const message: WebviewToExtensionMessage = {
        command: 'addService',
        serviceName: 'UserService',
        importPath: './services/user.service',
      };
      assert.strictEqual(isAddServiceMessage(message), true);
    });

    test('should return false for other messages', () => {
      const message: WebviewToExtensionMessage = { command: 'confirm' };
      assert.strictEqual(isAddServiceMessage(message), false);
    });
  });

  suite('isRemoveServiceMessage', () => {
    test('should return true for removeService message', () => {
      const message: WebviewToExtensionMessage = {
        command: 'removeService',
        serviceName: 'UserService',
      };
      assert.strictEqual(isRemoveServiceMessage(message), true);
    });

    test('should return false for other messages', () => {
      const message: WebviewToExtensionMessage = { command: 'confirm' };
      assert.strictEqual(isRemoveServiceMessage(message), false);
    });
  });

  suite('Type Guard Combinations', () => {
    test('all type guards should be mutually exclusive', () => {
      const messages: WebviewToExtensionMessage[] = [
        { command: 'confirm' },
        { command: 'cancel' },
        { command: 'updateComponentName', value: 'test' },
        { command: 'toggleProperty', propertyType: 'input', propertyName: 'test' },
        { command: 'updatePropertyType', propertyType: 'input', propertyName: 'test', newType: 'string' },
        { command: 'toggleLifecycleHook', hookName: 'ngOnInit' },
        { command: 'addService', serviceName: 'Test', importPath: './test' },
        { command: 'removeService', serviceName: 'Test' },
      ];

      const guards = [
        isConfirmMessage,
        isCancelMessage,
        isUpdateComponentNameMessage,
        isTogglePropertyMessage,
        isUpdatePropertyTypeMessage,
        isToggleLifecycleHookMessage,
        isAddServiceMessage,
        isRemoveServiceMessage,
      ];

      for (const message of messages) {
        let matchCount = 0;
        for (const guard of guards) {
          if (guard(message)) {
            matchCount++;
          }
        }
        assert.strictEqual(
          matchCount,
          1,
          `Message with command '${message.command}' matched ${matchCount} guards instead of exactly 1`
        );
      }
    });

    test('all messages should be valid WebviewToExtensionMessage', () => {
      const messages = [
        { command: 'confirm' },
        { command: 'cancel' },
        { command: 'updateComponentName', value: 'test' },
        { command: 'toggleProperty', propertyType: 'input', propertyName: 'test' },
        { command: 'updatePropertyType', propertyType: 'input', propertyName: 'test', newType: 'string' },
        { command: 'toggleLifecycleHook', hookName: 'ngOnInit' },
        { command: 'addService', serviceName: 'Test', importPath: './test' },
        { command: 'removeService', serviceName: 'Test' },
      ];

      for (const message of messages) {
        assert.strictEqual(
          isWebviewToExtensionMessage(message),
          true,
          `Message with command '${message.command}' should be valid`
        );
      }
    });
  });

  suite('Edge Cases', () => {
    test('should handle message with extra properties', () => {
      const message = { command: 'confirm', extraProp: 'value' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should handle message with null value', () => {
      const message = { command: 'updateComponentName', value: null };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should handle message with empty string value', () => {
      const message = { command: 'updateComponentName', value: '' };
      assert.strictEqual(isWebviewToExtensionMessage(message), true);
    });

    test('should handle property type variations', () => {
      const propertyTypes: Array<'input' | 'output' | 'model'> = ['input', 'output', 'model'];
      for (const propertyType of propertyTypes) {
        const message = {
          command: 'toggleProperty' as const,
          propertyType,
          propertyName: 'test',
        };
        assert.strictEqual(
          isTogglePropertyMessage(message),
          true,
          `Should accept propertyType: ${propertyType}`
        );
      }
    });
  });
});
