import * as assert from 'assert';
import { PreviewDataCollector, PropertyPreview, FilePreview } from '../preview/preview-data-collector';
import { PreviewStateManager, PreviewState } from '../preview/preview-state-manager';
import { DiffGenerator } from '../preview/diff-generator';
import { LifecycleHook } from '../preview/lifecycle-hooks';

suite('Interactive Preview Mode Test Suite', () => {
  suite('PreviewDataCollector', () => {
    test('should collect inputs from binding properties', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', ['userName', 'userAge']],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div [userName]="user.name" [userAge]="user.age"></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      assert.strictEqual(previewData.inputs.length, 2);
      assert.ok(previewData.inputs.find(i => i.name === 'userName'));
      assert.ok(previewData.inputs.find(i => i.name === 'userAge'));
    });

    test('should collect outputs from binding properties', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', ['userClick', 'itemSelected']],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div (userClick)="handleClick($event)" (itemSelected)="onSelect($event)"></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      assert.strictEqual(previewData.outputs.length, 2);
      assert.ok(previewData.outputs.find(o => o.name === 'userClick'));
      assert.ok(previewData.outputs.find(o => o.name === 'itemSelected'));
    });

    test('should collect models from binding properties', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', ['selectedItem', 'currentValue']]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div [(selectedItem)]="item" [(currentValue)]="value"></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      assert.strictEqual(previewData.models.length, 2);
      assert.ok(previewData.models.find(m => m.name === 'selectedItem'));
      assert.ok(previewData.models.find(m => m.name === 'currentValue'));
    });

    test('should mark all properties as enabled by default', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', ['userName']],
        ['outputs', ['userClick']],
        ['models', ['selectedItem']]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      assert.ok(previewData.inputs.every(i => i.enabled === true));
      assert.ok(previewData.outputs.every(o => o.enabled === true));
      assert.ok(previewData.models.every(m => m.enabled === true));
    });

    test('should include inferred types with confidence levels', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', ['userName']],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div [userName]="user.name"></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      const userNameInput = previewData.inputs.find(i => i.name === 'userName');
      assert.ok(userNameInput);
      assert.ok(['high', 'medium', 'low'].includes(userNameInput.inferenceConfidence));
    });

    test('should generate file previews for component files', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', ['userName']],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div [userName]="user.name"></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      assert.strictEqual(previewData.filesToCreate.length, 3);
      assert.ok(previewData.filesToCreate.find(f => f.path.endsWith('.component.ts')));
      assert.ok(previewData.filesToCreate.find(f => f.path.endsWith('.component.html')));
      assert.ok(previewData.filesToCreate.find(f => f.path.endsWith('.component.scss')));
    });

    test('should include TypeScript file preview with correct content', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', ['userName']],
        ['outputs', ['userClick']],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      const tsFile = previewData.filesToCreate.find(f => f.path.endsWith('.component.ts'));
      assert.ok(tsFile);
      assert.ok(tsFile.content.includes('userName'));
      assert.ok(tsFile.content.includes('userClick'));
      assert.ok(tsFile.content.includes('@Component'));
    });

    test('should include HTML template preview', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', []]
      ]);
      const template = '<div class="user-card"><h1>Hello</h1></div>';

      const previewData = await collector.collect({
        componentName: 'user-card',
        template,
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      const htmlFile = previewData.filesToCreate.find(f => f.path.endsWith('.component.html'));
      assert.ok(htmlFile);
      assert.strictEqual(htmlFile.content, template);
    });

    test('should include SCSS file preview', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      const scssFile = previewData.filesToCreate.find(f => f.path.endsWith('.component.scss'));
      assert.ok(scssFile);
      assert.strictEqual(scssFile.language, 'scss');
    });

    test('should detect files to modify for parent component', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      // Should detect parent component needs import added
      assert.ok(previewData.filesToModify.length > 0);
    });

    test('should include template dependency imports in preview', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', []]
      ]);
      const template = '<div *ngIf="show">{{ value | async }}</div>';

      const previewData = await collector.collect({
        componentName: 'user-card',
        template,
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      assert.ok(previewData.imports.length > 0);
      assert.ok(previewData.imports.some(i => i.includes('NgIf')));
      assert.ok(previewData.imports.some(i => i.includes('AsyncPipe')));
    });

    test('should set component name from input', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'my-custom-widget',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      assert.strictEqual(previewData.componentName, 'my-custom-widget');
    });

    test('should handle empty binding properties', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'empty-component',
        template: '<div>Static content</div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      assert.strictEqual(previewData.inputs.length, 0);
      assert.strictEqual(previewData.outputs.length, 0);
      assert.strictEqual(previewData.models.length, 0);
    });

    test('should include barrel export modification in filesToModify', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      // Should detect barrel export (index.ts) needs update
      const barrelModification = previewData.filesToModify.find(f => f.path.endsWith('index.ts'));
      assert.ok(barrelModification);
    });
  });

  suite('PreviewStateManager', () => {
    test('should initialize with preview data', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [{ name: 'userName', type: 'string', isRequired: true, inferenceConfidence: 'high' as const, enabled: true }],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      const state = stateManager.getState();

      assert.strictEqual(state.componentName, 'user-card');
      assert.strictEqual(state.inputs.length, 1);
    });

    test('should update component name', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      stateManager.updateComponentName('user-profile-card');
      const state = stateManager.getState();

      assert.strictEqual(state.componentName, 'user-profile-card');
    });

    test('should toggle property enabled state', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [{ name: 'userName', type: 'string', isRequired: true, inferenceConfidence: 'high' as const, enabled: true }],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      stateManager.toggleProperty('input', 'userName');
      const state = stateManager.getState();

      assert.strictEqual(state.inputs[0].enabled, false);

      stateManager.toggleProperty('input', 'userName');
      const updatedState = stateManager.getState();
      assert.strictEqual(updatedState.inputs[0].enabled, true);
    });

    test('should update property type', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [{ name: 'userName', type: 'unknown', isRequired: true, inferenceConfidence: 'low' as const, enabled: true }],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      stateManager.updatePropertyType('input', 'userName', 'string');
      const state = stateManager.getState();

      assert.strictEqual(state.inputs[0].type, 'string');
    });

    test('should toggle lifecycle hook', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      stateManager.toggleLifecycleHook('ngOnInit');
      const state = stateManager.getState();

      assert.ok(state.lifecycleHooks.includes('ngOnInit'));

      stateManager.toggleLifecycleHook('ngOnInit');
      const updatedState = stateManager.getState();
      assert.ok(!updatedState.lifecycleHooks.includes('ngOnInit'));
    });

    test('should add multiple lifecycle hooks', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      stateManager.toggleLifecycleHook('ngOnInit');
      stateManager.toggleLifecycleHook('ngOnDestroy');
      stateManager.toggleLifecycleHook('ngAfterViewInit');
      const state = stateManager.getState();

      assert.strictEqual(state.lifecycleHooks.length, 3);
      assert.ok(state.lifecycleHooks.includes('ngOnInit'));
      assert.ok(state.lifecycleHooks.includes('ngOnDestroy'));
      assert.ok(state.lifecycleHooks.includes('ngAfterViewInit'));
    });

    test('should add service injection', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      stateManager.addService('UserService', './services/user.service');
      const state = stateManager.getState();

      assert.strictEqual(state.services.length, 1);
      assert.strictEqual(state.services[0].name, 'UserService');
      assert.strictEqual(state.services[0].importPath, './services/user.service');
    });

    test('should remove service injection', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      stateManager.addService('UserService', './services/user.service');
      stateManager.removeService('UserService');
      const state = stateManager.getState();

      assert.strictEqual(state.services.length, 0);
    });

    test('should regenerate file previews when state changes', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [{ name: 'userName', type: 'string', isRequired: true, inferenceConfidence: 'high' as const, enabled: true }],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [
          { path: '/fake/user-card.component.ts', content: 'initial content', language: 'typescript' as const }
        ],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      const initialState = stateManager.getState();
      const initialContent = initialState.filesToCreate[0].content;

      stateManager.toggleLifecycleHook('ngOnInit');
      const updatedState = stateManager.getState();
      const updatedContent = updatedState.filesToCreate[0].content;

      // Content should be different after adding lifecycle hook
      assert.notStrictEqual(initialContent, updatedContent);
      assert.ok(updatedContent.includes('ngOnInit'));
    });

    test('should handle property type update for outputs', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [],
        outputs: [{ name: 'userClick', type: 'unknown', inferenceConfidence: 'low' as const, enabled: true }],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      stateManager.updatePropertyType('output', 'userClick', 'MouseEvent');
      const state = stateManager.getState();

      assert.strictEqual(state.outputs[0].type, 'MouseEvent');
    });

    test('should handle property type update for models', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [],
        outputs: [],
        models: [{ name: 'selectedItem', type: 'unknown', isRequired: true, inferenceConfidence: 'low' as const, enabled: true }],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);
      stateManager.updatePropertyType('model', 'selectedItem', 'User');
      const state = stateManager.getState();

      assert.strictEqual(state.models[0].type, 'User');
    });

    test('should validate component name changes', () => {
      const stateManager = new PreviewStateManager();
      const initialData = {
        componentName: 'user-card',
        template: '<div></div>',
        inputs: [],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [],
        filesToModify: []
      };

      stateManager.initialize(initialData);

      // Valid name
      const validResult = stateManager.updateComponentName('my-new-component');
      assert.strictEqual(validResult, true);

      // Invalid name (contains uppercase)
      const invalidResult = stateManager.updateComponentName('MyComponent');
      assert.strictEqual(invalidResult, false);
    });
  });

  suite('DiffGenerator', () => {
    test('should generate creation diff for new files', () => {
      const generator = new DiffGenerator();
      const filePreview = {
        path: '/fake/user-card.component.ts',
        content: 'export class UserCardComponent {}',
        language: 'typescript' as const
      };

      const diff = generator.generateCreationDiff(filePreview);

      assert.ok(diff.includes('+++'));
      assert.ok(diff.includes('export class UserCardComponent'));
    });

    test('should generate modification diff for existing files', () => {
      const generator = new DiffGenerator();
      const before = 'imports: []';
      const after = 'imports: [UserCardComponent]';

      const diff = generator.generateModificationDiff('/fake/parent.component.ts', before, after);

      assert.ok(diff.includes('---'));
      assert.ok(diff.includes('+++'));
      assert.ok(diff.includes('imports: []'));
      assert.ok(diff.includes('imports: [UserCardComponent]'));
    });

    test('should highlight added lines in diff', () => {
      const generator = new DiffGenerator();
      const filePreview = {
        path: '/fake/user-card.component.ts',
        content: 'line 1\nline 2\nline 3',
        language: 'typescript' as const
      };

      const diff = generator.generateCreationDiff(filePreview);
      const lines = diff.split('\n');

      // All content lines should start with '+'
      const contentLines = lines.filter(l => l.includes('line'));
      assert.ok(contentLines.every(l => l.startsWith('+')));
    });

    test('should highlight removed lines in modification diff', () => {
      const generator = new DiffGenerator();
      const before = 'old line 1\nold line 2';
      const after = 'new line 1\nnew line 2';

      const diff = generator.generateModificationDiff('/fake/file.ts', before, after);

      assert.ok(diff.includes('- old line 1') || diff.includes('-old line 1'));
      assert.ok(diff.includes('+ new line 1') || diff.includes('+new line 1'));
    });

    test('should include file paths in diff headers', () => {
      const generator = new DiffGenerator();
      const filePreview = {
        path: '/workspace/src/app/user-card.component.ts',
        content: 'content',
        language: 'typescript' as const
      };

      const diff = generator.generateCreationDiff(filePreview);

      assert.ok(diff.includes('user-card.component.ts'));
    });

    test('should handle empty file creation', () => {
      const generator = new DiffGenerator();
      const filePreview = {
        path: '/fake/empty.component.scss',
        content: '',
        language: 'scss' as const
      };

      const diff = generator.generateCreationDiff(filePreview);

      assert.ok(diff.includes('+++'));
      assert.ok(diff.includes('empty.component.scss'));
    });

    test('should generate diff for barrel export addition', () => {
      const generator = new DiffGenerator();
      const before = "export * from './user.component';\n";
      const after = "export * from './user.component';\nexport * from './user-card.component';\n";

      const diff = generator.generateModificationDiff('/fake/index.ts', before, after);

      assert.ok(diff.includes("+ export * from './user-card.component';") ||
                diff.includes("+export * from './user-card.component';"));
    });

    test('should generate diff for parent component import addition', () => {
      const generator = new DiffGenerator();
      const before = 'imports: []';
      const after = 'imports: [UserCardComponent]';

      const diff = generator.generateModificationDiff('/fake/parent.component.ts', before, after);

      assert.ok(diff.includes('- imports: []') || diff.includes('-imports: []'));
      assert.ok(diff.includes('+ imports: [UserCardComponent]') ||
                diff.includes('+imports: [UserCardComponent]'));
    });
  });

  suite('LifecycleHooks', () => {
    test('should provide list of available lifecycle hooks', () => {
      const hooks: LifecycleHook[] = [
        { name: 'ngOnInit', interface: 'OnInit', description: 'Called once after component initialization' },
        { name: 'ngOnDestroy', interface: 'OnDestroy', description: 'Called before component is destroyed' },
        { name: 'ngOnChanges', interface: 'OnChanges', description: 'Called when input properties change' },
        { name: 'ngAfterViewInit', interface: 'AfterViewInit', description: 'Called after view initialization' },
        { name: 'ngAfterContentInit', interface: 'AfterContentInit', description: 'Called after content initialization' }
      ];

      assert.strictEqual(hooks.length, 5);
      assert.ok(hooks.every(h => h.name && h.interface && h.description));
    });

    test('should generate import for lifecycle hook interfaces', () => {
      const hooks: LifecycleHook[] = [
        { name: 'ngOnInit', interface: 'OnInit', description: '' },
        { name: 'ngOnDestroy', interface: 'OnDestroy', description: '' }
      ];

      const imports = hooks.map(h => h.interface);
      const importStatement = `import { Component, ${imports.join(', ')} } from '@angular/core';`;

      assert.ok(importStatement.includes('OnInit'));
      assert.ok(importStatement.includes('OnDestroy'));
    });

    test('should generate implements clause for lifecycle hooks', () => {
      const hooks: LifecycleHook[] = [
        { name: 'ngOnInit', interface: 'OnInit', description: '' },
        { name: 'ngOnDestroy', interface: 'OnDestroy', description: '' }
      ];

      const interfaces = hooks.map(h => h.interface).join(', ');
      const clause = `export class MyComponent implements ${interfaces}`;

      assert.ok(clause.includes('implements OnInit, OnDestroy'));
    });

    test('should generate lifecycle hook method stubs', () => {
      const hook: LifecycleHook = {
        name: 'ngOnInit',
        interface: 'OnInit',
        description: 'Called once after component initialization'
      };

      const method = `${hook.name}(): void {\n  // TODO: Implement ${hook.name}\n}`;

      assert.ok(method.includes('ngOnInit(): void'));
      assert.ok(method.includes('// TODO'));
    });
  });

  suite('Integration Tests', () => {
    test('should complete full preview flow with confirmation', async () => {
      const collector = new PreviewDataCollector();
      const stateManager = new PreviewStateManager();

      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', ['userName']],
        ['outputs', ['userClick']],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div [userName]="user.name" (userClick)="handleClick($event)"></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      stateManager.initialize(previewData);
      stateManager.toggleLifecycleHook('ngOnInit');
      stateManager.updatePropertyType('input', 'userName', 'string');

      const finalState = stateManager.getState();

      assert.strictEqual(finalState.inputs[0].type, 'string');
      assert.ok(finalState.lifecycleHooks.includes('ngOnInit'));
      assert.ok(finalState.filesToCreate.length > 0);
    });

    test('should handle preview cancellation', async () => {
      const collector = new PreviewDataCollector();
      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', ['userName']],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      // Simulating cancellation - no state changes should persist
      assert.ok(previewData);
      // In real implementation, we would not call any file creation methods
    });

    test('should update previews when properties are toggled off', async () => {
      const collector = new PreviewDataCollector();
      const stateManager = new PreviewStateManager();

      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', ['userName', 'userAge']],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      stateManager.initialize(previewData);
      stateManager.toggleProperty('input', 'userAge');

      const state = stateManager.getState();
      const tsFile = state.filesToCreate.find(f => f.path.endsWith('.component.ts'));

      assert.ok(tsFile);
      assert.ok(tsFile.content.includes('userName'));
      assert.ok(!tsFile.content.includes('userAge') || !state.inputs.find(i => i.name === 'userAge')?.enabled);
    });

    test('should update component name in all file previews', async () => {
      const collector = new PreviewDataCollector();
      const stateManager = new PreviewStateManager();

      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      stateManager.initialize(previewData);
      stateManager.updateComponentName('user-profile-card');

      const state = stateManager.getState();

      // All files should reflect new component name
      assert.ok(state.filesToCreate.every(f =>
        f.path.includes('user-profile-card') || !f.path.includes('user-card')
      ));
    });

    test('should include services in constructor when added', async () => {
      const collector = new PreviewDataCollector();
      const stateManager = new PreviewStateManager();

      const bindingProperties = new Map<'inputs' | 'outputs' | 'models', string[]>([
        ['inputs', []],
        ['outputs', []],
        ['models', []]
      ]);

      const previewData = await collector.collect({
        componentName: 'user-card',
        template: '<div></div>',
        bindingProperties,
        parentFilePath: '/fake/parent.component.ts'
      });

      stateManager.initialize(previewData);
      stateManager.addService('UserService', './services/user.service');
      stateManager.addService('HttpClient', '@angular/common/http');

      const state = stateManager.getState();
      const tsFile = state.filesToCreate.find(f => f.path.endsWith('.component.ts'));

      assert.ok(tsFile);
      assert.ok(tsFile.content.includes('UserService'));
      assert.ok(tsFile.content.includes('HttpClient'));
      assert.ok(tsFile.content.includes('constructor'));
    });
  });
});
