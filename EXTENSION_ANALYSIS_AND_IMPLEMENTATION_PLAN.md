# Extension Analysis: ng-component-from-template

## What This Extension Does

Your VSCode extension is a **component extraction tool** for Angular that helps developers refactor templates by:

1. **Selecting template HTML** and automatically creating a new component from it
2. **Detecting bindings** via regex patterns to generate `@Input()` and `@Output()` properties
3. **Creating boilerplate files**: `.component.ts`, `.component.html`, and `.component.scss`
4. **Auto-wiring**: Replaces selected text with the new component's selector and adds it to parent imports (if standalone)
5. **Barrel exports**: Automatically adds the component to the nearest `index.ts` barrel file

The workflow is: Select HTML → Specify path/name → Component scaffolded → Template replaced with `<new-component></new-component>`

---

## Current Limitations

### 🔴 **1. Regex-Based Template Parsing**
**Location**: `core.ts:81-113`

The extension uses basic regex to detect bindings:
```typescript
const inputRegex = /\[(\w+)\]="(.+?)"/g;
const outputRegex = /\((\w+)\)="(.+?)"/g;
```

**Problems:**
- ❌ Doesn't handle two-way bindings: `[(ngModel)]="value"`
- ❌ Misses attribute bindings: `[attr.aria-label]="label"`
- ❌ Can't detect complex expressions or multiline attributes
- ❌ Doesn't parse structural directives properly: `*ngIf`, `*ngFor`

---

### 🔴 **2. No Modern Angular Signal Support**
**Location**: `utils.ts:197-239`

Generated components use **decorator-based APIs** from Angular 14-16:
```typescript
@Input({required: true}) myProp!: unknown;
@Output() myEvent = new EventEmitter<unknown>();
```

**Missing Modern Features (Angular 16+):**
- ❌ Signal inputs: `myProp = input.required<string>()`
- ❌ Signal outputs: `myEvent = output<string>()`
- ❌ Model inputs (two-way binding): `model = model.required<string>()`
- ❌ Computed signals and effects
- ❌ `viewChild()` / `contentChild()` queries

---

### 🔴 **3. Type Inference Gap**
**Location**: `utils.ts:248-253`

All generated properties are typed as `unknown`:
```typescript
@Input({required: true}) userName!: unknown;  // Should be string
@Output() itemClick = new EventEmitter<unknown>();  // Could infer type
```

**Why This Hurts DX:**
- Developers must manually update types after generation
- No analysis of parent component to infer types from usage
- Could analyze template expressions like `[count]="items.length"` → `number`

---

### 🔴 **4. No Template Dependency Detection**
**Location**: `core.ts:122-254`

When you extract a template using `*ngIf`, `*ngFor`, or pipes, the extension:
- ❌ Doesn't detect required Angular imports (`CommonModule`, `NgIf`, `AsyncPipe`, etc.)
- ❌ Doesn't detect custom directives/components used in the template
- ❌ Leaves `imports: []` empty, causing compilation errors

**Example:** Extracting `<div *ngIf="show">{{ date | date }}</div>` won't import `NgIf` or `DatePipe`

---

### 🔴 **5. NgModule Integration**
**Location**: `core.ts:256-300` & `extension.ts:91-95`

- ✅ Adds to standalone component imports automatically
- ❌ Shows passive-aggressive message for NgModule-based components:
  ```typescript
  "You have not migrated yet your components to standalone... Isn't it?!🤨"
  ```
- ❌ No option to add to NgModule `declarations` array

---

### 🟡 **6. Edge Cases & UX Issues**

- **No undo support**: Can't easily revert if component generation goes wrong
- **No preview**: Changes are applied immediately without confirmation
- **Hardcoded assumptions**: Always creates `.scss` files (what about CSS/LESS/styled-components?)
- **Dead code**: `addComponentToClientImports` function exists but is never called
- **Path handling**: Clipboard path detection might be unreliable

---

## What Would Revolutionize the DX? 🚀

### **1. Signal-First Code Generation**
**Impact: HIGH** | **Effort: MEDIUM**

Generate components using Angular's modern signal APIs by default:

```typescript
// Current (decorator-based)
@Input({required: true}) userName!: string;
@Output() userClick = new EventEmitter<User>();

// Modern (signal-based)
userName = input.required<string>();
userClick = output<User>();
```

**Benefits:**
- Aligns with Angular's future direction (signals are the future)
- Better performance (change detection optimization)
- More reactive programming patterns
- Automatic type inference with generics

**Implementation**: Add a setting to choose between decorator/signal modes, default to signals.

---

### **2. Smart Type Inference from Parent Component**
**Impact: HIGH** | **Effort: HIGH**

Analyze the parent component's TypeScript file to infer types:

```html
<!-- Parent template -->
<div [userName]="user.name" (itemClick)="handleClick($event)">
```

**The extension should:**
1. Parse parent component to find `user` type → infer `userName: string`
2. Analyze `handleClick()` signature → infer `itemClick: output<MouseEvent>()`
3. Generate properly typed component automatically

**Tech:** Use `ts-morph` (already in dependencies!) to traverse AST and resolve types

---

### **3. Template Dependency Auto-Import**
**Impact: HIGH** | **Effort: MEDIUM**

Parse the extracted HTML using `@angular/compiler` to detect:
- Structural directives (`*ngIf` → import `NgIf`)
- Pipes (`{{ value | async }}` → import `AsyncPipe`)
- Custom components/directives
- Generate proper `imports` array

```typescript
// Auto-generated based on template analysis
@Component({
  imports: [NgIf, AsyncPipe, MatButtonModule, MyCustomDirective],
  // ...
})
```

---

### **4. Two-Way Binding Detection**
**Impact: MEDIUM** | **Effort: LOW**

Detect `[(ngModel)]` patterns and generate **model inputs**:

```typescript
// Detected: [(selectedItem)]="item"
selectedItem = model.required<Item>();  // Generates both input and output
```

---

### **5. Interactive Preview Mode**
**Impact: MEDIUM** | **Effort: MEDIUM**

Before applying changes:
1. Show a diff view of what will be created/modified
2. Let users tweak component name, inputs/outputs, types
3. Option to add lifecycle hooks, services, etc.
4. "Generate" button to confirm

---

### **6. Configuration System**
**Impact: MEDIUM** | **Effort: LOW**

Add workspace settings:
```json
{
  "ngComponentFromTemplate.useSignals": true,
  "ngComponentFromTemplate.styleExtension": "scss",
  "ngComponentFromTemplate.changeDetection": "OnPush",
  "ngComponentFromTemplate.inferTypes": true,
  "ngComponentFromTemplate.addLifecycleHooks": ["ngOnInit"]
}
```

---

### **7. Context-Aware Suggestions**
**Impact: LOW** | **Effort: HIGH**

Use language models or heuristics to:
- Suggest better component names based on template content
- Recommend splitting into multiple components if template is complex
- Suggest which parts should be inputs vs internal state

---

## Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **Signal-based generation** | HIGH | MEDIUM | 🔥 **P0** |
| **Type inference** | HIGH | HIGH | 🔥 **P0** |
| **Template dependency detection** | HIGH | MEDIUM | 🔥 **P0** |
| **Two-way binding support** | MEDIUM | LOW | ⭐ **P1** |
| **Preview mode** | MEDIUM | MEDIUM | ⭐ **P1** |
| **Configuration system** | MEDIUM | LOW | ⭐ **P1** |
| **NgModule integration** | LOW | LOW | ✓ **P2** |
| **Context-aware suggestions** | LOW | HIGH | ✓ **P2** |

---

## Modern Angular Best Practices to Implement

1. **Signals everywhere**: Use `input()`, `output()`, `model()`, `computed()`, `effect()`
2. **Control flow syntax**: Support new `@if`, `@for`, `@switch` (Angular 17+)
3. **Resource API**: Detect `rxResource()` usage
4. **Defer blocks**: Handle `@defer` for lazy loading
5. **Host directives**: Offer to add common host directives

The **biggest DX revolution** would be combining **signal-first generation** + **smart type inference** + **template dependency detection**. This trinity would make the extension almost magical – developers select HTML, and a perfectly typed, fully imported component appears instantly.

---

# Step-by-Step Implementation Plan: Signal-First Code Generation

## Overview
Transform the extension to generate components using Angular's modern Signal APIs (`input()`, `output()`, `model()`) instead of decorator-based `@Input()` and `@Output()`.

---

## Phase 1: Setup & Configuration

### Step 1.1: Add Configuration Schema
**File**: `package.json`

Add extension settings to allow users to choose generation mode:

```json
{
  "contributes": {
    "configuration": {
      "title": "Angular Component From Template",
      "properties": {
        "ngComponentFromTemplate.useSignalApis": {
          "type": "boolean",
          "default": true,
          "description": "Generate components using Signal APIs (input/output) instead of decorators (@Input/@Output)"
        },
        "ngComponentFromTemplate.detectAngularVersion": {
          "type": "boolean",
          "default": true,
          "description": "Automatically detect Angular version and use appropriate APIs"
        },
        "ngComponentFromTemplate.minimumAngularVersion": {
          "type": "number",
          "default": 17,
          "description": "Minimum Angular version to use Signal APIs (14-19)"
        }
      }
    }
  }
}
```

**Why**: Gives users control and allows gradual migration for teams not on Angular 16+.

---

### Step 1.2: Create Configuration Helper
**File**: `src/config.ts` (new file)

```typescript
import * as vscode from 'vscode';

export interface ExtensionConfig {
  useSignalApis: boolean;
  detectAngularVersion: boolean;
  minimumAngularVersion: number;
}

export const getExtensionConfig = (): ExtensionConfig => {
  const config = vscode.workspace.getConfiguration('ngComponentFromTemplate');

  return {
    useSignalApis: config.get('useSignalApis', true),
    detectAngularVersion: config.get('detectAngularVersion', true),
    minimumAngularVersion: config.get('minimumAngularVersion', 17),
  };
};
```

---

### Step 1.3: Detect Angular Version
**File**: `src/angular-version-detector.ts` (new file)

```typescript
import fs from 'fs';
import path from 'path';
import { getCurrentWorkspaceAbsolutePath } from './utils';

export const detectAngularVersion = async (): Promise<number | null> => {
  try {
    const workspacePath = getCurrentWorkspaceAbsolutePath();
    const packageJsonPath = path.join(workspacePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(
      await fs.promises.readFile(packageJsonPath, 'utf-8')
    );

    const angularCore =
      packageJson.dependencies?.['@angular/core'] ||
      packageJson.devDependencies?.['@angular/core'];

    if (!angularCore) {
      return null;
    }

    // Extract major version from "^17.2.0" or "~16.1.0"
    const versionMatch = angularCore.match(/(\d+)\./);
    return versionMatch ? parseInt(versionMatch[1], 10) : null;
  } catch (error) {
    console.error('Error detecting Angular version:', error);
    return null;
  }
};

export const shouldUseSignalApis = async (
  userPreference: boolean,
  autoDetect: boolean,
  minVersion: number
): Promise<boolean> => {
  if (!userPreference) {
    return false; // User explicitly disabled signals
  }

  if (!autoDetect) {
    return true; // Use signals if user wants them and auto-detect is off
  }

  const version = await detectAngularVersion();

  // Signals were introduced in Angular 16, but fully stable in 17
  return version !== null && version >= minVersion;
};
```

**Why**: Prevents generating incompatible code for older Angular versions.

---

## Phase 2: Core Implementation

### Step 2.1: Create Signal Code Generation Module
**File**: `src/signal-generator.ts` (new file)

```typescript
export interface SignalInput {
  name: string;
  isRequired: boolean;
}

export interface SignalOutput {
  name: string;
}

export const generateSignalInputs = (inputs: SignalInput[]): string => {
  if (!inputs.length) return '';

  const lines = inputs.map(({ name, isRequired }) => {
    const fn = isRequired ? 'input.required' : 'input';
    return `${name} = ${fn}<unknown>();`;
  });

  return `// Inputs\n\t\t${lines.join('\n\t\t')}`;
};

export const generateSignalOutputs = (outputs: SignalOutput[]): string => {
  if (!outputs.length) return '';

  const lines = outputs.map(({ name }) => {
    return `${name} = output<unknown>();`;
  });

  return `// Outputs\n\t\t${lines.join('\n\t\t')}`;
};

export const generateDecoratorInputs = (inputs: SignalInput[]): string => {
  if (!inputs.length) return '';

  const lines = inputs.map(({ name, isRequired }) => {
    const decorator = isRequired
      ? `@Input({required: true})`
      : `@Input()`;
    const modifier = isRequired ? '!' : '';
    return `${decorator} ${name}${modifier}: unknown;`;
  });

  return `// Inputs\n\t\t${lines.join('\n\t\t')}`;
};

export const generateDecoratorOutputs = (outputs: SignalOutput[]): string => {
  if (!outputs.length) return '';

  const lines = outputs.map(({ name }) => {
    return `@Output() ${name} = new EventEmitter<unknown>();`;
  });

  return `// Outputs\n\t\t${lines.join('\n\t\t')}`;
};
```

---

### Step 2.2: Update Import Statement Generator
**File**: `src/import-generator.ts` (new file)

```typescript
export const generateImports = (
  hasInputs: boolean,
  hasOutputs: boolean,
  useSignals: boolean
): string => {
  const imports: string[] = ['ChangeDetectionStrategy', 'Component'];

  if (useSignals) {
    if (hasInputs) {
      imports.push('input');
    }
    if (hasOutputs) {
      imports.push('output');
    }
  } else {
    if (hasInputs) {
      imports.push('Input');
    }
    if (hasOutputs) {
      imports.push('Output', 'EventEmitter');
    }
  }

  return `import { ${imports.join(', ')} } from '@angular/core';`;
};
```

---

### Step 2.3: Refactor `createComponentTs` Function
**File**: `src/utils.ts`

Replace the existing `createComponentTs` function (lines 197-239) with this updated version:

```typescript
import {
  generateSignalInputs,
  generateSignalOutputs,
  generateDecoratorInputs,
  generateDecoratorOutputs,
  SignalInput,
  SignalOutput
} from './signal-generator';
import { generateImports } from './import-generator';
import { getExtensionConfig } from './config';
import { shouldUseSignalApis } from './angular-version-detector';

export const createComponentTs = async ({
  dasherizedComponentName,
  bindingProperties,
}: {
  dasherizedComponentName: string;
  bindingProperties: Map<'inputs' | 'outputs', string[]>;
}) => {
  const component = toComponentClassName(dasherizedComponentName);

  const config = getExtensionConfig();
  const useSignals = await shouldUseSignalApis(
    config.useSignalApis,
    config.detectAngularVersion,
    config.minimumAngularVersion
  );

  const inputProps = bindingProperties.get('inputs') || [];
  const outputProps = bindingProperties.get('outputs') || [];

  // Convert to signal format (all required by default for now)
  const signalInputs: SignalInput[] = inputProps.map(name => ({
    name,
    isRequired: true // You can enhance this later with smart detection
  }));

  const signalOutputs: SignalOutput[] = outputProps.map(name => ({ name }));

  const hasAnyInput = signalInputs.length > 0;
  const hasAnyOutput = signalOutputs.length > 0;

  const imports = generateImports(hasAnyInput, hasAnyOutput, useSignals);

  let inputs = '';
  let outputs = '';

  if (useSignals) {
    inputs = generateSignalInputs(signalInputs);
    outputs = generateSignalOutputs(signalOutputs);
  } else {
    inputs = generateDecoratorInputs(signalInputs);
    outputs = generateDecoratorOutputs(signalOutputs);
  }

  return `
  ${imports}

  @Component({
    standalone: true,
    imports: [],
    selector: '${dasherizedComponentName}',
    templateUrl: './${dasherizedComponentName}.component.html',
    styleUrls: ['./${dasherizedComponentName}.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  export class ${component} {
    ${inputs}

    ${outputs}
  }
  `.trim();
};
```

---

### Step 2.4: Update Function Signature in `core.ts`
**File**: `src/core.ts`

Update the call to `createComponentTs` to be async (line 41-62):

```typescript
export const createComponentTsFromSelectedTextAsync = async ({
  componentPath,
  dasherizedComponentName,
  bindingProperties,
}: {
  componentPath: string;
  dasherizedComponentName: string;
  bindingProperties: Map<'inputs' | 'outputs', string[]>;
}) => {
  const fullPath = path.join(
    componentPath,
    `${dasherizedComponentName}.component.ts`
  );

  // Now awaiting the async function
  const content = await createComponentTs({
    dasherizedComponentName,
    bindingProperties,
  });

  const hasFileCreationSucceeded = await createFileAsync(fullPath, content);
  return hasFileCreationSucceeded;
};
```

---

## Phase 3: Enhanced Features

### Step 3.1: Detect Two-Way Bindings for `model()`
**File**: `src/core.ts`

Update `detectComponentProperties` function to detect `[(ngModel)]` style bindings:

```typescript
export const detectComponentProperties: (
  template: string
) => Map<'inputs' | 'outputs' | 'models', string[]> = (template: string) => {
  if (!template) {
    showWarningAsync(
      'Cannot detect properties since the highlighted template is empty!'
    );
    return new Map();
  }

  const inputs: string[] = [];
  const outputs: string[] = [];
  const models: string[] = []; // NEW: for two-way bindings

  const inputRegex = /\[(\w+)\]="(.+?)"/g;
  const outputRegex = /\((\w+)\)="(.+?)"/g;
  const modelRegex = /\[\((\w+)\)\]="(.+?)"/g; // NEW: banana-in-a-box syntax

  let match;

  // First detect two-way bindings
  while ((match = modelRegex.exec(template)) !== null) {
    const model = match.at(1)!;
    models.push(model);
  }

  // Then detect regular inputs (skip if already in models)
  while ((match = inputRegex.exec(template)) !== null) {
    const input = match.at(1)!;
    if (!models.includes(input)) {
      inputs.push(input);
    }
  }

  // Detect outputs (skip if already in models)
  while ((match = outputRegex.exec(template)) !== null) {
    const output = match.at(1)!;
    if (!isBannedEvent(output) && !models.includes(output)) {
      outputs.push(output);
    }
  }

  return new Map([
    ['inputs', inputs],
    ['outputs', outputs],
    ['models', models],
  ]);
};
```

---

### Step 3.2: Generate `model()` for Two-Way Bindings
**File**: `src/signal-generator.ts`

Add model generation support:

```typescript
export interface SignalModel {
  name: string;
  isRequired: boolean;
}

export const generateSignalModels = (models: SignalModel[]): string => {
  if (!models.length) return '';

  const lines = models.map(({ name, isRequired }) => {
    const fn = isRequired ? 'model.required' : 'model';
    return `${name} = ${fn}<unknown>();`;
  });

  return `// Two-way bindings\n\t\t${lines.join('\n\t\t')}`;
};
```

Update `generateImports`:

```typescript
export const generateImports = (
  hasInputs: boolean,
  hasOutputs: boolean,
  hasModels: boolean, // NEW
  useSignals: boolean
): string => {
  const imports: string[] = ['ChangeDetectionStrategy', 'Component'];

  if (useSignals) {
    if (hasInputs) imports.push('input');
    if (hasOutputs) imports.push('output');
    if (hasModels) imports.push('model'); // NEW
  } else {
    if (hasInputs) imports.push('Input');
    if (hasOutputs) imports.push('Output', 'EventEmitter');
    // For decorators, models are just Input + Output combo
  }

  return `import { ${imports.join(', ')} } from '@angular/core';`;
};
```

---

### Step 3.3: Update `createComponentTs` to Handle Models
**File**: `src/utils.ts`

```typescript
export const createComponentTs = async ({
  dasherizedComponentName,
  bindingProperties,
}: {
  dasherizedComponentName: string;
  bindingProperties: Map<'inputs' | 'outputs' | 'models', string[]>;
}) => {
  const component = toComponentClassName(dasherizedComponentName);

  const config = getExtensionConfig();
  const useSignals = await shouldUseSignalApis(
    config.useSignalApis,
    config.detectAngularVersion,
    config.minimumAngularVersion
  );

  const inputProps = bindingProperties.get('inputs') || [];
  const outputProps = bindingProperties.get('outputs') || [];
  const modelProps = bindingProperties.get('models') || []; // NEW

  const signalInputs: SignalInput[] = inputProps.map(name => ({
    name,
    isRequired: true
  }));

  const signalOutputs: SignalOutput[] = outputProps.map(name => ({ name }));

  const signalModels: SignalModel[] = modelProps.map(name => ({
    name,
    isRequired: true
  }));

  const hasAnyInput = signalInputs.length > 0;
  const hasAnyOutput = signalOutputs.length > 0;
  const hasAnyModel = signalModels.length > 0;

  const imports = generateImports(
    hasAnyInput,
    hasAnyOutput,
    hasAnyModel,
    useSignals
  );

  let inputs = '';
  let outputs = '';
  let models = '';

  if (useSignals) {
    inputs = generateSignalInputs(signalInputs);
    outputs = generateSignalOutputs(signalOutputs);
    models = generateSignalModels(signalModels);
  } else {
    inputs = generateDecoratorInputs(signalInputs);
    outputs = generateDecoratorOutputs(signalOutputs);
    // For decorators, models become input + output pair
    models = generateDecoratorModels(signalModels);
  }

  return `
  ${imports}

  @Component({
    standalone: true,
    imports: [],
    selector: '${dasherizedComponentName}',
    templateUrl: './${dasherizedComponentName}.component.html',
    styleUrls: ['./${dasherizedComponentName}.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  export class ${component} {
    ${inputs}

    ${outputs}

    ${models}
  }
  `.trim();
};
```

Add decorator model generator in `src/signal-generator.ts`:

```typescript
export const generateDecoratorModels = (models: SignalModel[]): string => {
  if (!models.length) return '';

  const lines = models.flatMap(({ name, isRequired }) => {
    const inputDecorator = isRequired ? '@Input({required: true})' : '@Input()';
    const modifier = isRequired ? '!' : '';
    return [
      `${inputDecorator} ${name}${modifier}: unknown;`,
      `@Output() ${name}Change = new EventEmitter<unknown>();`
    ];
  });

  return `// Two-way bindings\n\t\t${lines.join('\n\t\t')}`;
};
```

---

## Phase 4: Testing & Validation

### Step 4.1: Create Test Cases
**File**: `src/test/signal-generator.test.ts` (new file)

```typescript
import * as assert from 'assert';
import {
  generateSignalInputs,
  generateSignalOutputs,
  generateDecoratorInputs,
  generateDecoratorOutputs
} from '../signal-generator';

suite('Signal Generator Test Suite', () => {
  test('Generate signal inputs', () => {
    const result = generateSignalInputs([
      { name: 'userName', isRequired: true },
      { name: 'age', isRequired: false }
    ]);

    assert.ok(result.includes('userName = input.required<unknown>()'));
    assert.ok(result.includes('age = input<unknown>()'));
  });

  test('Generate signal outputs', () => {
    const result = generateSignalOutputs([
      { name: 'userClick' },
      { name: 'itemSelected' }
    ]);

    assert.ok(result.includes('userClick = output<unknown>()'));
    assert.ok(result.includes('itemSelected = output<unknown>()'));
  });

  test('Generate decorator inputs', () => {
    const result = generateDecoratorInputs([
      { name: 'userName', isRequired: true }
    ]);

    assert.ok(result.includes('@Input({required: true}) userName!: unknown'));
  });
});
```

---

### Step 4.2: Manual Testing Checklist

Create test scenarios in a sample Angular project:

1. **Test Signal Generation (Angular 17+)**:
   - Select template with `[userName]="user.name"`
   - Verify generated component uses `userName = input.required<unknown>()`
   - Verify imports include `input` from `@angular/core`

2. **Test Decorator Fallback (Angular 14-16)**:
   - Set `minimumAngularVersion` to 17 in a v16 project
   - Verify extension falls back to `@Input()` decorators

3. **Test Two-Way Bindings**:
   - Select template with `[(selectedItem)]="item"`
   - Verify generated component uses `selectedItem = model.required<unknown>()`

4. **Test Configuration**:
   - Toggle `useSignalApis` setting to false
   - Verify extension uses decorators even in Angular 17+

---

## Phase 5: Documentation & Polish

### Step 5.1: Update README
**File**: `README.md`

Add section:

```markdown
## Signal-Based Components

This extension generates components using Angular's modern **Signal APIs** by default (Angular 16+):

```typescript
// Generated with signals ✨
export class MyComponent {
  userName = input.required<string>();
  userClick = output<User>();
}
```

### Configuration

- `ngComponentFromTemplate.useSignalApis`: Enable/disable signal generation (default: `true`)
- `ngComponentFromTemplate.detectAngularVersion`: Auto-detect Angular version (default: `true`)
- `ngComponentFromTemplate.minimumAngularVersion`: Minimum version for signals (default: `17`)

### Compatibility

- **Angular 17+**: Full signal support (`input()`, `output()`, `model()`)
- **Angular 16**: Signal inputs/outputs only (no `model()`)
- **Angular 14-15**: Automatically falls back to `@Input()` / `@Output()` decorators
```

---

### Step 5.2: Add User Notifications
**File**: `src/extension.ts`

Add feedback when signal mode is enabled:

```typescript
import { getExtensionConfig } from './config';
import { shouldUseSignalApis } from './angular-version-detector';

export function activate(context: vscode.ExtensionContext) {
  const createComponentCommand = vscode.commands.registerCommand(
    'ng-component-from-template.createAngularComponent',
    async () => {
      const config = getExtensionConfig();
      const useSignals = await shouldUseSignalApis(
        config.useSignalApis,
        config.detectAngularVersion,
        config.minimumAngularVersion
      );

      // Show mode indicator
      const mode = useSignals ? 'Signal-based' : 'Decorator-based';
      console.log(`Generating component using ${mode} APIs`);

      // ... rest of the command logic
    }
  );
}
```

---

## Phase 6: Migration Guide

### Step 6.1: Create Migration Documentation
**File**: `MIGRATION.md` (new)

```markdown
# Migration Guide: Decorators → Signals

## Automatic Migration

The extension automatically detects your Angular version:
- **Angular 17+**: Uses signals by default
- **Angular 14-16**: Uses decorators by default

## Manual Override

To force decorator mode in Angular 17+:

1. Open VS Code Settings (`Cmd/Ctrl + ,`)
2. Search for "Angular Component From Template"
3. Uncheck "Use Signal Apis"

## Generated Code Comparison

### Before (Decorators)
```typescript
@Input({required: true}) userName!: string;
@Output() userClick = new EventEmitter<User>();
```

### After (Signals)
```typescript
userName = input.required<string>();
userClick = output<User>();
```

## Benefits

- ✅ Better TypeScript inference
- ✅ Simpler syntax
- ✅ Future-proof (Angular's direction)
- ✅ Better performance with signal-based change detection
```

---

## Implementation Checklist

```markdown
### Phase 1: Setup ✓
- [ ] Add configuration schema to package.json
- [ ] Create config.ts helper
- [ ] Implement angular-version-detector.ts
- [ ] Test version detection

### Phase 2: Core ✓
- [ ] Create signal-generator.ts module
- [ ] Create import-generator.ts module
- [ ] Refactor createComponentTs to async
- [ ] Update core.ts to await async calls
- [ ] Test basic signal generation

### Phase 3: Enhancement ✓
- [ ] Add two-way binding detection
- [ ] Implement model() generation
- [ ] Update all type signatures
- [ ] Test model generation

### Phase 4: Testing ✓
- [ ] Write unit tests
- [ ] Manual testing in Angular 14, 16, 17, 18 projects
- [ ] Edge case testing
- [ ] Performance testing

### Phase 5: Polish ✓
- [ ] Update README.md
- [ ] Add user notifications
- [ ] Create example GIFs/videos
- [ ] Update CHANGELOG

### Phase 6: Release ✓
- [ ] Version bump
- [ ] Create migration guide
- [ ] Test in production
- [ ] Publish to marketplace
```

---

## Expected Outcome

After completing these steps, your extension will:

1. ✅ **Generate signal-based components by default** in Angular 16+
2. ✅ **Automatically detect Angular version** and use appropriate APIs
3. ✅ **Support two-way bindings** with `model()`
4. ✅ **Provide configuration options** for teams with mixed preferences
5. ✅ **Gracefully fallback** to decorators in older Angular versions

**Estimated Implementation Time**: 8-12 hours for an experienced developer

---

# Step-by-Step Implementation Plan: Smart Type Inference from Parent Component

## Overview
Implement intelligent type inference by analyzing the parent component's TypeScript code to automatically determine the correct types for inputs and outputs, eliminating the need for manual type refinement.

---

## Phase 1: Foundation & Analysis

### Step 1.1: Add Configuration for Type Inference
**File**: `package.json`

Add configuration option to enable/disable type inference:

```json
{
  "contributes": {
    "configuration": {
      "title": "Angular Component From Template",
      "properties": {
        "ngComponentFromTemplate.inferTypes": {
          "type": "boolean",
          "default": true,
          "description": "Automatically infer input/output types from parent component usage"
        },
        "ngComponentFromTemplate.fallbackToUnknown": {
          "type": "boolean",
          "default": true,
          "description": "Fall back to 'unknown' type when inference fails"
        }
      }
    }
  }
}
```

---

### Step 1.2: Create Type Inference Engine
**File**: `src/type-inference/type-inference-engine.ts` (new file)

```typescript
import { Project, SourceFile, Type, Node, SyntaxKind } from 'ts-morph';
import { showWarningAsync } from '../utils';

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
  private project: Project;
  
  constructor() {
    this.project = new Project({
      tsConfigFilePath: this.findTsConfigPath(),
      skipAddingFilesFromTsConfig: false,
    });
  }

  /**
   * Infer types for all detected bindings
   */
  async inferTypes(context: TypeInferenceContext): Promise<Map<string, InferredType>> {
    const results = new Map<string, InferredType>();
    
    try {
      const sourceFile = this.project.addSourceFileAtPath(context.parentTsFilePath);
      
      for (const [propertyName, bindingExpression] of context.templateBindings) {
        const inferredType = await this.inferTypeFromExpression(
          sourceFile,
          propertyName,
          bindingExpression
        );
        results.set(propertyName, inferredType);
      }
    } catch (error) {
      console.error('Type inference error:', error);
      await showWarningAsync('Failed to infer types from parent component');
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
      if (!classDeclaration) return defaultResult;

      // Parse expression path (e.g., "user.name" -> ["user", "name"])
      const expressionParts = expression.split('.');
      const rootProperty = expressionParts[0];

      // Find the root property in the component
      const property = classDeclaration.getProperty(rootProperty);
      if (!property) {
        // Try to find in constructor parameters or lifecycle hooks
        return this.inferFromAlternativeSources(classDeclaration, expression);
      }

      // Get the type of the property
      let currentType = property.getType();
      
      // Traverse the property chain
      for (let i = 1; i < expressionParts.length; i++) {
        const part = expressionParts[i];
        const properties = currentType.getProperties();
        const nextProperty = properties.find(p => p.getName() === part);
        
        if (!nextProperty) {
          return defaultResult;
        }
        
        currentType = nextProperty.getValueDeclaration()?.getType() || currentType;
      }

      // Get the string representation of the type
      const typeText = this.simplifyTypeText(currentType.getText());

      return {
        propertyName,
        type: typeText,
        isInferred: true,
        confidence: 'high',
      };
    } catch (error) {
      console.error(`Error inferring type for ${propertyName}:`, error);
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
      if (!methodMatch) return defaultResult;

      const methodName = methodMatch[1];
      const classDeclaration = sourceFile.getClasses()[0];
      if (!classDeclaration) return defaultResult;

      // Find the method
      const method = classDeclaration.getMethod(methodName);
      if (!method) return defaultResult;

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
      const typeText = this.simplifyTypeText(paramType.getText());

      return {
        propertyName,
        type: typeText,
        isInferred: true,
        confidence: 'high',
      };
    } catch (error) {
      console.error(`Error inferring output type for ${propertyName}:`, error);
      return defaultResult;
    }
  }

  /**
   * Try to infer from constructor parameters, getters, or computed properties
   */
  private inferFromAlternativeSources(
    classDeclaration: any,
    expression: string
  ): InferredType {
    // Check constructor parameters
    const constructor = classDeclaration.getConstructors()[0];
    if (constructor) {
      const params = constructor.getParameters();
      const expressionRoot = expression.split('.')[0];
      
      for (const param of params) {
        if (param.getName() === expressionRoot) {
          const type = param.getType();
          return {
            propertyName: expressionRoot,
            type: this.simplifyTypeText(type.getText()),
            isInferred: true,
            confidence: 'medium',
          };
        }
      }
    }

    return {
      propertyName: expression,
      type: 'unknown',
      isInferred: false,
      confidence: 'low',
    };
  }

  /**
   * Simplify complex type text for better readability
   */
  private simplifyTypeText(typeText: string): string {
    // Remove "import(...)" paths
    typeText = typeText.replace(/import\([^)]+\)\./g, '');
    
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
   * Find tsconfig.json in workspace
   */
  private findTsConfigPath(): string | undefined {
    // This will be implemented to search for tsconfig.json
    // For now, return undefined to use default TypeScript compiler options
    return undefined;
  }
}
```

---

### Step 1.3: Create Binding Expression Parser
**File**: `src/type-inference/binding-parser.ts` (new file)

```typescript
/**
 * Parse template bindings to extract expressions for type inference
 */
export interface BindingInfo {
  propertyName: string;
  expression: string;
  bindingType: 'input' | 'output' | 'model';
}

export class BindingParser {
  /**
   * Parse template HTML and extract binding expressions
   * Example: <div [userName]="user.name" (click)="handleClick($event)">
   */
  parseTemplate(template: string): BindingInfo[] {
    const bindings: BindingInfo[] = [];

    // Parse input bindings: [prop]="expression"
    const inputRegex = /\[(\w+)\]="([^"]+)"/g;
    let match;
    
    while ((match = inputRegex.exec(template)) !== null) {
      bindings.push({
        propertyName: match[1],
        expression: match[2],
        bindingType: 'input',
      });
    }

    // Parse output bindings: (event)="expression"
    const outputRegex = /\((\w+)\)="([^"]+)"/g;
    
    while ((match = outputRegex.exec(template)) !== null) {
      bindings.push({
        propertyName: match[1],
        expression: match[2],
        bindingType: 'output',
      });
    }

    // Parse two-way bindings: [(prop)]="expression"
    const modelRegex = /\[\((\w+)\)\]="([^"]+)"/g;
    
    while ((match = modelRegex.exec(template)) !== null) {
      bindings.push({
        propertyName: match[1],
        expression: match[2],
        bindingType: 'model',
      });
    }

    return bindings;
  }

  /**
   * Create a map of property names to expressions for type inference
   */
  createBindingMap(bindings: BindingInfo[]): Map<string, string> {
    const map = new Map<string, string>();
    
    for (const binding of bindings) {
      map.set(binding.propertyName, binding.expression);
    }
    
    return map;
  }
}
```

---

## Phase 2: Integration with Code Generation

### Step 2.1: Update Signal Generator to Use Inferred Types
**File**: `src/signal-generator.ts`

Update interfaces to include inferred types:

```typescript
export interface SignalInput {
  name: string;
  isRequired: boolean;
  inferredType?: string; // NEW: Optional inferred type
}

export interface SignalOutput {
  name: string;
  inferredType?: string; // NEW: Optional inferred type
}

export const generateSignalInputs = (inputs: SignalInput[]): string => {
  if (!inputs.length) return '';

  const lines = inputs.map(({ name, isRequired, inferredType }) => {
    const fn = isRequired ? 'input.required' : 'input';
    const type = inferredType || 'unknown';
    return `${name} = ${fn}<${type}>();`;
  });

  return `// Inputs\n\t\t${lines.join('\n\t\t')}`;
};

export const generateSignalOutputs = (outputs: SignalOutput[]): string => {
  if (!outputs.length) return '';

  const lines = outputs.map(({ name, inferredType }) => {
    const type = inferredType || 'unknown';
    return `${name} = output<${type}>();`;
  });

  return `// Outputs\n\t\t${lines.join('\n\t\t')}`;
};

export const generateDecoratorInputs = (inputs: SignalInput[]): string => {
  if (!inputs.length) return '';

  const lines = inputs.map(({ name, isRequired, inferredType }) => {
    const decorator = isRequired 
      ? `@Input({required: true})` 
      : `@Input()`;
    const modifier = isRequired ? '!' : '';
    const type = inferredType || 'unknown';
    return `${decorator} ${name}${modifier}: ${type};`;
  });

  return `// Inputs\n\t\t${lines.join('\n\t\t')}`;
};

export const generateDecoratorOutputs = (outputs: SignalOutput[]): string => {
  if (!outputs.length) return '';

  const lines = outputs.map(({ name, inferredType }) => {
    const type = inferredType || 'unknown';
    return `@Output() ${name} = new EventEmitter<${type}>();`;
  });

  return `// Outputs\n\t\t${lines.join('\n\t\t')}`;
};
```

---

### Step 2.2: Create Type Inference Orchestrator
**File**: `src/type-inference/type-inference-orchestrator.ts` (new file)

```typescript
import { TypeInferenceEngine, InferredType } from './type-inference-engine';
import { BindingParser } from './binding-parser';
import { getHighlightedTextPathAsync } from '../utils';
import { SignalInput, SignalOutput } from '../signal-generator';

export class TypeInferenceOrchestrator {
  private engine: TypeInferenceEngine;
  private parser: BindingParser;

  constructor() {
    this.engine = new TypeInferenceEngine();
    this.parser = new BindingParser();
  }

  /**
   * Main orchestration method: parse template, infer types, and enrich property definitions
   */
  async enrichPropertiesWithTypes(
    template: string,
    inputNames: string[],
    outputNames: string[]
  ): Promise<{
    inputs: SignalInput[];
    outputs: SignalOutput[];
  }> {
    try {
      // Parse template to get binding expressions
      const bindings = this.parser.parseTemplate(template);
      const bindingMap = this.parser.createBindingMap(bindings);

      // Get parent component file path
      const parentFilePath = getHighlightedTextPathAsync();
      const parentTsPath = parentFilePath.replace('.html', '.ts');

      // Infer types
      const inferredTypes = await this.engine.inferTypes({
        parentTsFilePath: parentTsPath,
        templateBindings: bindingMap,
      });

      // Enrich inputs with inferred types
      const enrichedInputs: SignalInput[] = inputNames.map(name => ({
        name,
        isRequired: true,
        inferredType: inferredTypes.get(name)?.type || 'unknown',
      }));

      // Enrich outputs with inferred types
      const enrichedOutputs: SignalOutput[] = outputNames.map(name => ({
        name,
        inferredType: inferredTypes.get(name)?.type || 'unknown',
      }));

      return {
        inputs: enrichedInputs,
        outputs: enrichedOutputs,
      };
    } catch (error) {
      console.error('Type inference orchestration failed:', error);
      
      // Fallback: return properties without inferred types
      return {
        inputs: inputNames.map(name => ({ name, isRequired: true })),
        outputs: outputNames.map(name => ({ name })),
      };
    }
  }
}
```

---

### Step 2.3: Update `createComponentTs` to Use Type Inference
**File**: `src/utils.ts`

Modify the `createComponentTs` function:

```typescript
import { TypeInferenceOrchestrator } from './type-inference/type-inference-orchestrator';
import { getExtensionConfig } from './config';

export const createComponentTs = async ({
  dasherizedComponentName,
  bindingProperties,
  template, // NEW: Pass the template for type inference
}: {
  dasherizedComponentName: string;
  bindingProperties: Map<'inputs' | 'outputs' | 'models', string[]>;
  template: string;
}) => {
  const component = toComponentClassName(dasherizedComponentName);
  const config = getExtensionConfig();
  
  const useSignals = await shouldUseSignalApis(
    config.useSignalApis,
    config.detectAngularVersion,
    config.minimumAngularVersion
  );

  const inputProps = bindingProperties.get('inputs') || [];
  const outputProps = bindingProperties.get('outputs') || [];
  const modelProps = bindingProperties.get('models') || [];

  // NEW: Infer types if enabled
  let signalInputs: SignalInput[];
  let signalOutputs: SignalOutput[];

  if (config.inferTypes) {
    const orchestrator = new TypeInferenceOrchestrator();
    const enriched = await orchestrator.enrichPropertiesWithTypes(
      template,
      inputProps,
      outputProps
    );
    signalInputs = enriched.inputs;
    signalOutputs = enriched.outputs;
  } else {
    // Fallback to unknown types
    signalInputs = inputProps.map(name => ({
      name,
      isRequired: true,
    }));
    signalOutputs = outputProps.map(name => ({ name }));
  }

  const signalModels: SignalModel[] = modelProps.map(name => ({
    name,
    isRequired: true,
  }));

  const hasAnyInput = signalInputs.length > 0;
  const hasAnyOutput = signalOutputs.length > 0;
  const hasAnyModel = signalModels.length > 0;

  const imports = generateImports(
    hasAnyInput,
    hasAnyOutput,
    hasAnyModel,
    useSignals
  );

  let inputs = '';
  let outputs = '';
  let models = '';

  if (useSignals) {
    inputs = generateSignalInputs(signalInputs);
    outputs = generateSignalOutputs(signalOutputs);
    models = generateSignalModels(signalModels);
  } else {
    inputs = generateDecoratorInputs(signalInputs);
    outputs = generateDecoratorOutputs(signalOutputs);
    models = generateDecoratorModels(signalModels);
  }

  return `
  ${imports}

  @Component({
    standalone: true,
    imports: [],
    selector: '${dasherizedComponentName}',
    templateUrl: './${dasherizedComponentName}.component.html',
    styleUrls: ['./${dasherizedComponentName}.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  export class ${component} {
    ${inputs}

    ${outputs}

    ${models}
  }
  `.trim();
};
```

---

### Step 2.4: Update Core to Pass Template to createComponentTs
**File**: `src/core.ts`

```typescript
export const createComponentTsFromSelectedTextAsync = async ({
  componentPath,
  dasherizedComponentName,
  bindingProperties,
  template, // NEW: Accept template parameter
}: {
  componentPath: string;
  dasherizedComponentName: string;
  bindingProperties: Map<'inputs' | 'outputs' | 'models', string[]>;
  template: string;
}) => {
  const fullPath = path.join(
    componentPath,
    `${dasherizedComponentName}.component.ts`
  );

  const content = await createComponentTs({
    dasherizedComponentName,
    bindingProperties,
    template, // Pass template for type inference
  });

  const hasFileCreationSucceeded = await createFileAsync(fullPath, content);
  return hasFileCreationSucceeded;
};
```

Update the extension.ts call:

```typescript
await createComponentTsFromSelectedTextAsync({
  componentPath: componentFolderPath,
  dasherizedComponentName,
  bindingProperties,
  template, // Pass the template
});
```

---

## Phase 3: Advanced Type Inference

### Step 3.1: Handle Complex Expressions
**File**: `src/type-inference/expression-analyzer.ts` (new file)

```typescript
import { SourceFile, Type } from 'ts-morph';

/**
 * Analyze complex template expressions
 */
export class ExpressionAnalyzer {
  /**
   * Analyze ternary expressions: user ? user.name : 'Guest'
   */
  analyzeTernary(expression: string, sourceFile: SourceFile): string {
    // Extract the truthy part of the ternary
    const match = expression.match(/\?\s*([^:]+)\s*:/);
    if (!match) return 'unknown';
    
    // Analyze the type of the truthy value
    // This would require deeper AST analysis
    return 'string'; // Simplified
  }

  /**
   * Analyze array access: users[0]
   */
  analyzeArrayAccess(expression: string, sourceFile: SourceFile): string {
    const arrayName = expression.split('[')[0];
    // Find array type and extract element type
    // Would need to traverse type system
    return 'unknown';
  }

  /**
   * Analyze method calls: getUser().name
   */
  analyzeMethodChain(expression: string, sourceFile: SourceFile): string {
    // Parse method chain and resolve return types
    return 'unknown';
  }

  /**
   * Analyze pipe expressions: date | date:'short'
   */
  analyzePipeExpression(expression: string): string {
    // Extract base expression before pipe
    const baseExpression = expression.split('|')[0].trim();
    return baseExpression;
  }
}
```

---

### Step 3.2: Add Import Management for Inferred Types
**File**: `src/type-inference/import-manager.ts` (new file)

```typescript
import { SourceFile } from 'ts-morph';

export interface TypeImport {
  typeName: string;
  modulePath: string;
}

/**
 * Manage imports needed for inferred types
 */
export class ImportManager {
  /**
   * Extract imports needed for inferred types
   */
  extractNeededImports(
    inferredTypes: Map<string, string>,
    parentSourceFile: SourceFile
  ): TypeImport[] {
    const imports: TypeImport[] = [];
    
    for (const [_, typeText] of inferredTypes) {
      // Check if type is a custom interface/class
      if (this.isCustomType(typeText)) {
        const importInfo = this.findImportForType(typeText, parentSourceFile);
        if (importInfo) {
          imports.push(importInfo);
        }
      }
    }
    
    return imports;
  }

  /**
   * Check if type is custom (not primitive or built-in)
   */
  private isCustomType(typeText: string): boolean {
    const primitives = ['string', 'number', 'boolean', 'unknown', 'any', 'void'];
    const builtIns = ['Date', 'Array', 'Promise', 'Observable'];
    
    return !primitives.includes(typeText) && !builtIns.some(b => typeText.includes(b));
  }

  /**
   * Find import statement for a given type
   */
  private findImportForType(
    typeText: string,
    sourceFile: SourceFile
  ): TypeImport | null {
    const imports = sourceFile.getImportDeclarations();
    
    for (const importDecl of imports) {
      const namedImports = importDecl.getNamedImports();
      
      for (const namedImport of namedImports) {
        if (namedImport.getName() === typeText) {
          return {
            typeName: typeText,
            modulePath: importDecl.getModuleSpecifierValue(),
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Generate import statements for the new component
   */
  generateImportStatements(imports: TypeImport[]): string {
    if (imports.length === 0) return '';
    
    const lines = imports.map(
      ({ typeName, modulePath }) => `import { ${typeName} } from '${modulePath}';`
    );
    
    return lines.join('\n') + '\n';
  }
}
```

---

## Phase 4: Error Handling & Fallbacks

### Step 4.1: Add Graceful Degradation
**File**: `src/type-inference/fallback-strategy.ts` (new file)

```typescript
import { InferredType } from './type-inference-engine';

export class FallbackStrategy {
  /**
   * Determine fallback type based on expression patterns
   */
  inferFromExpression(expression: string): InferredType {
    // Heuristic-based type inference
    if (expression.includes('length') || expression.includes('count')) {
      return {
        propertyName: expression,
        type: 'number',
        isInferred: true,
        confidence: 'medium',
      };
    }

    if (expression.includes('name') || expression.includes('title') || expression.includes('text')) {
      return {
        propertyName: expression,
        type: 'string',
        isInferred: true,
        confidence: 'low',
      };
    }

    if (expression.includes('is') || expression.includes('has') || expression.includes('enabled')) {
      return {
        propertyName: expression,
        type: 'boolean',
        isInferred: true,
        confidence: 'low',
      };
    }

    if (expression.includes('Date') || expression.includes('date')) {
      return {
        propertyName: expression,
        type: 'Date',
        isInferred: true,
        confidence: 'low',
      };
    }

    return {
      propertyName: expression,
      type: 'unknown',
      isInferred: false,
      confidence: 'low',
    };
  }

  /**
   * Provide user with type inference confidence feedback
   */
  shouldWarnUser(inferredTypes: Map<string, InferredType>): boolean {
    const lowConfidenceCount = Array.from(inferredTypes.values())
      .filter(t => t.confidence === 'low').length;
    
    return lowConfidenceCount > inferredTypes.size * 0.5; // More than 50% low confidence
  }
}
```

---

### Step 4.2: Add User Feedback for Inference Results
**File**: `src/type-inference/inference-reporter.ts` (new file)

```typescript
import { InferredType } from './type-inference-engine';
import { showInfoAsync, showWarningAsync } from '../utils';

export class InferenceReporter {
  /**
   * Report type inference results to user
   */
  async reportResults(inferredTypes: Map<string, InferredType>): Promise<void> {
    const total = inferredTypes.size;
    const inferred = Array.from(inferredTypes.values()).filter(t => t.isInferred).length;
    const high = Array.from(inferredTypes.values()).filter(t => t.confidence === 'high').length;

    if (inferred === 0) {
      await showWarningAsync(
        'Could not infer any types. All properties will use "unknown" type.'
      );
      return;
    }

    if (high === total) {
      await showInfoAsync(
        `✅ Successfully inferred all ${total} types with high confidence!`
      );
    } else if (inferred === total) {
      await showInfoAsync(
        `✅ Inferred ${inferred}/${total} types (${high} with high confidence)`
      );
    } else {
      await showWarningAsync(
        `⚠️ Inferred ${inferred}/${total} types. ${total - inferred} remain as "unknown".`
      );
    }
  }

  /**
   * Generate a detailed report for debugging
   */
  generateDetailedReport(inferredTypes: Map<string, InferredType>): string {
    const lines: string[] = ['Type Inference Report:', ''];

    for (const [name, info] of inferredTypes) {
      const status = info.isInferred ? '✓' : '✗';
      const confidence = info.confidence.toUpperCase();
      lines.push(`${status} ${name}: ${info.type} [${confidence}]`);
    }

    return lines.join('\n');
  }
}
```

---

## Phase 5: Testing & Validation

### Step 5.1: Setup Test Infrastructure

**File**: `package.json` - Add test dependencies

```json
{
  "devDependencies": {
    "@types/mocha": "^10.0.6",
    "@types/node": "18.x",
    "mocha": "^10.2.0",
    "ts-morph": "^21.0.1",
    "typescript": "^5.3.2"
  }
}
```

---

### Step 5.2: Create Test Fixtures

**File**: `src/test/fixtures/test-components.ts` (new file)

```typescript
/**
 * Test fixture: Parent component with various property types
 */
export const PARENT_COMPONENT_SIMPLE = `
import { Component } from '@angular/core';

interface User {
  name: string;
  age: number;
  email: string;
  isActive: boolean;
}

@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
})
export class ParentComponent {
  user: User = {
    name: 'John Doe',
    age: 30,
    email: 'john@example.com',
    isActive: true,
  };

  items: string[] = ['item1', 'item2', 'item3'];
  count: number = 42;
  isEnabled: boolean = true;
  createdAt: Date = new Date();

  handleClick(event: MouseEvent): void {
    console.log('Clicked', event);
  }

  handleSubmit(event: SubmitEvent): void {
    console.log('Submitted', event);
  }

  handleCustom(data: { id: number; name: string }): void {
    console.log('Custom event', data);
  }
}
`;

/**
 * Test fixture: Component with nested properties
 */
export const PARENT_COMPONENT_NESTED = `
import { Component } from '@angular/core';

interface Address {
  street: string;
  city: string;
  zipCode: number;
}

interface Company {
  name: string;
  address: Address;
}

interface Employee {
  id: number;
  name: string;
  company: Company;
}

@Component({
  selector: 'app-nested',
  templateUrl: './nested.component.html',
})
export class NestedComponent {
  employee: Employee = {
    id: 1,
    name: 'Jane Smith',
    company: {
      name: 'ACME Corp',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        zipCode: 12345,
      },
    },
  };

  handleEmployeeClick(employee: Employee): void {
    console.log('Employee clicked', employee);
  }
}
`;

/**
 * Test fixture: Component with arrays and generics
 */
export const PARENT_COMPONENT_GENERICS = `
import { Component } from '@angular/core';
import { Observable } from 'rxjs';

interface Product {
  id: number;
  name: string;
  price: number;
}

@Component({
  selector: 'app-generics',
  templateUrl: './generics.component.html',
})
export class GenericsComponent {
  products: Product[] = [];
  products$: Observable<Product[]>;
  selectedProduct: Product | null = null;

  productMap: Map<number, Product> = new Map();
  productSet: Set<string> = new Set();

  handleProductSelect(product: Product): void {
    console.log('Selected', product);
  }

  handleProductsLoad(products: Product[]): void {
    console.log('Loaded', products);
  }
}
`;

/**
 * Test fixture: Component with signal-based properties (Angular 17+)
 */
export const PARENT_COMPONENT_SIGNALS = `
import { Component, signal, computed } from '@angular/core';

interface UserProfile {
  username: string;
  role: 'admin' | 'user' | 'guest';
}

@Component({
  selector: 'app-signals',
  templateUrl: './signals.component.html',
})
export class SignalsComponent {
  profile = signal<UserProfile>({ username: 'admin', role: 'admin' });
  count = signal<number>(0);
  isLoading = signal<boolean>(false);

  doubleCount = computed(() => this.count() * 2);

  handleProfileUpdate(profile: UserProfile): void {
    this.profile.set(profile);
  }
}
`;

/**
 * Test fixture: Component with union types and complex types
 */
export const PARENT_COMPONENT_COMPLEX = `
import { Component } from '@angular/core';

type Status = 'pending' | 'approved' | 'rejected';
type ID = string | number;

interface Task {
  id: ID;
  title: string;
  status: Status;
  priority: 1 | 2 | 3;
}

@Component({
  selector: 'app-complex',
  templateUrl: './complex.component.html',
})
export class ComplexComponent {
  task: Task = {
    id: '123',
    title: 'Test Task',
    status: 'pending',
    priority: 1,
  };

  statusOptions: Status[] = ['pending', 'approved', 'rejected'];

  optionalValue: string | null = null;
  undefinedValue: number | undefined = undefined;

  handleStatusChange(status: Status): void {
    console.log('Status changed', status);
  }

  handlePriorityChange(priority: 1 | 2 | 3): void {
    console.log('Priority changed', priority);
  }
}
`;
```

---

### Step 5.3: Create Test Utilities

**File**: `src/test/helpers/test-utils.ts` (new file)

```typescript
import { Project, SourceFile } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Helper to create temporary TypeScript files for testing
 */
export class TestFileCreator {
  private tempDir: string;
  private project: Project;

  constructor() {
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ng-test-'));
    this.project = new Project({
      compilerOptions: {
        target: 99, // ESNext
        module: 99, // ESNext
        strict: true,
        esModuleInterop: true,
      },
    });
  }

  /**
   * Create a temporary TypeScript file with given content
   */
  createTempFile(fileName: string, content: string): string {
    const filePath = path.join(this.tempDir, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create a source file in the ts-morph project
   */
  createSourceFile(fileName: string, content: string): SourceFile {
    const filePath = this.createTempFile(fileName, content);
    return this.project.addSourceFileAtPath(filePath);
  }

  /**
   * Clean up temporary files
   */
  cleanup(): void {
    try {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  getProject(): Project {
    return this.project;
  }
}

/**
 * Assert that inferred type matches expected type
 */
export function assertTypeEquals(
  actual: string,
  expected: string,
  message?: string
): void {
  // Normalize type strings for comparison
  const normalizeType = (type: string) => {
    return type
      .replace(/\s+/g, ' ')
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/\s*&\s*/g, ' & ')
      .trim();
  };

  const normalizedActual = normalizeType(actual);
  const normalizedExpected = normalizeType(expected);

  if (normalizedActual !== normalizedExpected) {
    throw new Error(
      message ||
        `Type mismatch:\n  Expected: ${normalizedExpected}\n  Actual:   ${normalizedActual}`
    );
  }
}

/**
 * Assert that type is one of the expected types (for union types)
 */
export function assertTypeIncludes(
  actual: string,
  expectedOptions: string[],
  message?: string
): void {
  const matches = expectedOptions.some(expected => {
    try {
      assertTypeEquals(actual, expected);
      return true;
    } catch {
      return false;
    }
  });

  if (!matches) {
    throw new Error(
      message ||
        `Type not in expected options:\n  Actual: ${actual}\n  Expected one of: ${expectedOptions.join(', ')}`
    );
  }
}
```

---

### Step 5.4: Create Comprehensive Test Suite

**File**: `src/test/type-inference.test.ts` (new file)

```typescript
import * as assert from 'assert';
import { TypeInferenceEngine, InferredType } from '../type-inference/type-inference-engine';
import { BindingParser, BindingInfo } from '../type-inference/binding-parser';
import { TypeInferenceOrchestrator } from '../type-inference/type-inference-orchestrator';
import { TestFileCreator, assertTypeEquals, assertTypeIncludes } from './helpers/test-utils';
import {
  PARENT_COMPONENT_SIMPLE,
  PARENT_COMPONENT_NESTED,
  PARENT_COMPONENT_GENERICS,
  PARENT_COMPONENT_SIGNALS,
  PARENT_COMPONENT_COMPLEX,
} from './fixtures/test-components';

suite('Type Inference Test Suite', () => {
  let fileCreator: TestFileCreator;

  setup(() => {
    fileCreator = new TestFileCreator();
  });

  teardown(() => {
    fileCreator.cleanup();
  });

  // ========================================
  // Binding Parser Tests
  // ========================================

  suite('BindingParser', () => {
    let parser: BindingParser;

    setup(() => {
      parser = new BindingParser();
    });

    test('should parse simple input binding', () => {
      const template = '<div [userName]="user.name"></div>';
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 1);
      assert.strictEqual(bindings[0].propertyName, 'userName');
      assert.strictEqual(bindings[0].expression, 'user.name');
      assert.strictEqual(bindings[0].bindingType, 'input');
    });

    test('should parse simple output binding', () => {
      const template = '<button (click)="handleClick($event)"></button>';
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 1);
      assert.strictEqual(bindings[0].propertyName, 'click');
      assert.strictEqual(bindings[0].expression, 'handleClick($event)');
      assert.strictEqual(bindings[0].bindingType, 'output');
    });

    test('should parse two-way binding', () => {
      const template = '<input [(ngModel)]="userName" />';
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 1);
      assert.strictEqual(bindings[0].propertyName, 'ngModel');
      assert.strictEqual(bindings[0].expression, 'userName');
      assert.strictEqual(bindings[0].bindingType, 'model');
    });

    test('should parse multiple bindings in one element', () => {
      const template = `
        <user-card
          [userName]="user.name"
          [userAge]="user.age"
          (userClick)="handleClick($event)"
          [(isActive)]="user.isActive">
        </user-card>
      `;
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 4);

      const inputBindings = bindings.filter(b => b.bindingType === 'input');
      const outputBindings = bindings.filter(b => b.bindingType === 'output');
      const modelBindings = bindings.filter(b => b.bindingType === 'model');

      assert.strictEqual(inputBindings.length, 2);
      assert.strictEqual(outputBindings.length, 1);
      assert.strictEqual(modelBindings.length, 1);
    });

    test('should parse complex expressions', () => {
      const template = `
        <div
          [count]="items.length"
          [isValid]="user.age > 18"
          [fullName]="user.firstName + ' ' + user.lastName"
          (submit)="handleSubmit(form.value)">
        </div>
      `;
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 4);
      assert.strictEqual(bindings[0].expression, 'items.length');
      assert.strictEqual(bindings[1].expression, 'user.age > 18');
      assert.strictEqual(bindings[2].expression, 'user.firstName + \' \' + user.lastName');
      assert.strictEqual(bindings[3].expression, 'handleSubmit(form.value)');
    });

    test('should handle multiline templates', () => {
      const template = `
        <div
          [userName]="user.name"
          [userAge]="user.age"
        >
          <span (click)="handleClick($event)"></span>
        </div>
      `;
      const bindings = parser.parseTemplate(template);

      assert.strictEqual(bindings.length, 3);
    });

    test('should create binding map correctly', () => {
      const bindings: BindingInfo[] = [
        { propertyName: 'userName', expression: 'user.name', bindingType: 'input' },
        { propertyName: 'userAge', expression: 'user.age', bindingType: 'input' },
        { propertyName: 'click', expression: 'handleClick($event)', bindingType: 'output' },
      ];

      const map = parser.createBindingMap(bindings);

      assert.strictEqual(map.size, 3);
      assert.strictEqual(map.get('userName'), 'user.name');
      assert.strictEqual(map.get('userAge'), 'user.age');
      assert.strictEqual(map.get('click'), 'handleClick($event)');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Simple Types
  // ========================================

  suite('TypeInferenceEngine - Simple Types', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile('simple.component.ts', PARENT_COMPONENT_SIMPLE);
    });

    test('should infer string type from string property', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['userName', 'user.name']]),
      });

      const inferred = result.get('userName');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'string');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer number type from number property', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['userAge', 'user.age']]),
      });

      const inferred = result.get('userAge');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'number');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer boolean type from boolean property', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['isActive', 'user.isActive']]),
      });

      const inferred = result.get('isActive');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'boolean');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer Date type from Date property', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['createdAt', 'createdAt']]),
      });

      const inferred = result.get('createdAt');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'Date');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer number from array.length', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['itemCount', 'items.length']]),
      });

      const inferred = result.get('itemCount');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'number');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer array type', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['items', 'items']]),
      });

      const inferred = result.get('items');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'string[]');
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Nested Types
  // ========================================

  suite('TypeInferenceEngine - Nested Types', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile('nested.component.ts', PARENT_COMPONENT_NESTED);
    });

    test('should infer type from nested property access (2 levels)', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['companyName', 'employee.company.name']]),
      });

      const inferred = result.get('companyName');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'string');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer type from deeply nested property access (3 levels)', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['city', 'employee.company.address.city']]),
      });

      const inferred = result.get('city');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'string');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer type from deeply nested number property', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['zipCode', 'employee.company.address.zipCode']]),
      });

      const inferred = result.get('zipCode');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'number');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer complex object type from intermediate property', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['company', 'employee.company']]),
      });

      const inferred = result.get('company');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Company'));
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Output Types
  // ========================================

  suite('TypeInferenceEngine - Output Types', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile('simple.component.ts', PARENT_COMPONENT_SIMPLE);
    });

    test('should infer MouseEvent from click handler', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['click', 'handleClick($event)']]),
      });

      const inferred = result.get('click');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'MouseEvent');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer SubmitEvent from submit handler', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['submit', 'handleSubmit($event)']]),
      });

      const inferred = result.get('submit');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'SubmitEvent');
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer custom object type from handler', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['custom', 'handleCustom($event)']]),
      });

      const inferred = result.get('custom');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('id') && inferred.type.includes('name'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer void for methods without parameters', async () => {
      const sourceFile = fileCreator.createSourceFile(
        'no-params.component.ts',
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'app-test' })
        export class TestComponent {
          handleNoParams(): void {
            console.log('No params');
          }
        }
        `
      );

      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['action', 'handleNoParams()']]),
      });

      const inferred = result.get('action');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assertTypeEquals(inferred.type, 'void');
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Generics
  // ========================================

  suite('TypeInferenceEngine - Generics and Arrays', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile('generics.component.ts', PARENT_COMPONENT_GENERICS);
    });

    test('should infer generic array type', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['products', 'products']]),
      });

      const inferred = result.get('products');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Product'));
      assert.ok(inferred.type.includes('[]'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer element type from array handler', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['productSelect', 'handleProductSelect($event)']]),
      });

      const inferred = result.get('productSelect');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Product'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer array type from array handler', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['productsLoad', 'handleProductsLoad($event)']]),
      });

      const inferred = result.get('productsLoad');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Product'));
      assert.ok(inferred.type.includes('[]'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer nullable type', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['selected', 'selectedProduct']]),
      });

      const inferred = result.get('selected');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('Product'));
      assert.ok(inferred.type.includes('null'));
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Complex Types
  // ========================================

  suite('TypeInferenceEngine - Complex Types', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile('complex.component.ts', PARENT_COMPONENT_COMPLEX);
    });

    test('should infer union type (string literal union)', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['status', 'task.status']]),
      });

      const inferred = result.get('status');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      // Should be: "pending" | "approved" | "rejected"
      assert.ok(inferred.type.includes('pending'));
      assert.ok(inferred.type.includes('approved'));
      assert.ok(inferred.type.includes('rejected'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer numeric literal union', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['priority', 'task.priority']]),
      });

      const inferred = result.get('priority');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      // Should be: 1 | 2 | 3
      assert.ok(inferred.type.includes('1'));
      assert.ok(inferred.type.includes('2'));
      assert.ok(inferred.type.includes('3'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer union type (string | number)', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['taskId', 'task.id']]),
      });

      const inferred = result.get('taskId');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('string') && inferred.type.includes('number'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer nullable type (string | null)', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['optional', 'optionalValue']]),
      });

      const inferred = result.get('optional');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('string'));
      assert.ok(inferred.type.includes('null'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer undefined type (number | undefined)', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['undefinedVal', 'undefinedValue']]),
      });

      const inferred = result.get('undefinedVal');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('number'));
      assert.ok(inferred.type.includes('undefined'));
      assert.strictEqual(inferred.confidence, 'high');
    });

    test('should infer type from union handler parameter', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['statusChange', 'handleStatusChange($event)']]),
      });

      const inferred = result.get('statusChange');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, true);
      assert.ok(inferred.type.includes('pending'));
      assert.ok(inferred.type.includes('approved'));
      assert.ok(inferred.type.includes('rejected'));
      assert.strictEqual(inferred.confidence, 'high');
    });
  });

  // ========================================
  // Type Inference Engine Tests - Error Cases
  // ========================================

  suite('TypeInferenceEngine - Error Handling', () => {
    let engine: TypeInferenceEngine;
    let sourceFile: any;

    setup(() => {
      engine = new TypeInferenceEngine();
      sourceFile = fileCreator.createSourceFile('simple.component.ts', PARENT_COMPONENT_SIMPLE);
    });

    test('should return unknown for non-existent property', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['nonExistent', 'doesNotExist']]),
      });

      const inferred = result.get('nonExistent');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, false);
      assertTypeEquals(inferred.type, 'unknown');
      assert.strictEqual(inferred.confidence, 'low');
    });

    test('should return unknown for invalid nested path', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['invalid', 'user.invalid.path']]),
      });

      const inferred = result.get('invalid');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, false);
      assertTypeEquals(inferred.type, 'unknown');
      assert.strictEqual(inferred.confidence, 'low');
    });

    test('should return unknown for non-existent method', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: sourceFile.getFilePath(),
        templateBindings: new Map([['action', 'nonExistentMethod($event)']]),
      });

      const inferred = result.get('action');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, false);
      assertTypeEquals(inferred.type, 'unknown');
      assert.strictEqual(inferred.confidence, 'low');
    });

    test('should handle invalid file path gracefully', async () => {
      const result = await engine.inferTypes({
        parentTsFilePath: '/invalid/path/to/file.ts',
        templateBindings: new Map([['test', 'value']]),
      });

      const inferred = result.get('test');
      assert.ok(inferred);
      assert.strictEqual(inferred.isInferred, false);
      assertTypeEquals(inferred.type, 'unknown');
    });
  });

  // ========================================
  // Type Inference Orchestrator Tests
  // ========================================

  suite('TypeInferenceOrchestrator - Integration', () => {
    let orchestrator: TypeInferenceOrchestrator;
    let sourceFile: any;

    setup(() => {
      orchestrator = new TypeInferenceOrchestrator();
      sourceFile = fileCreator.createSourceFile('simple.component.ts', PARENT_COMPONENT_SIMPLE);
    });

    test('should enrich inputs with inferred types', async () => {
      const template = '<div [userName]="user.name" [userAge]="user.age"></div>';
      const result = await orchestrator.enrichPropertiesWithTypes(
        template,
        ['userName', 'userAge'],
        []
      );

      assert.strictEqual(result.inputs.length, 2);

      const userNameInput = result.inputs.find(i => i.name === 'userName');
      assert.ok(userNameInput);
      assertTypeEquals(userNameInput.inferredType!, 'string');

      const userAgeInput = result.inputs.find(i => i.name === 'userAge');
      assert.ok(userAgeInput);
      assertTypeEquals(userAgeInput.inferredType!, 'number');
    });

    test('should enrich outputs with inferred types', async () => {
      const template = '<button (click)="handleClick($event)" (submit)="handleSubmit($event)"></button>';
      const result = await orchestrator.enrichPropertiesWithTypes(
        template,
        [],
        ['click', 'submit']
      );

      assert.strictEqual(result.outputs.length, 2);

      const clickOutput = result.outputs.find(o => o.name === 'click');
      assert.ok(clickOutput);
      assertTypeEquals(clickOutput.inferredType!, 'MouseEvent');

      const submitOutput = result.outputs.find(o => o.name === 'submit');
      assert.ok(submitOutput);
      assertTypeEquals(submitOutput.inferredType!, 'SubmitEvent');
    });

    test('should handle mixed inputs and outputs', async () => {
      const template = `
        <user-card
          [userName]="user.name"
          [isActive]="user.isActive"
          (userClick)="handleClick($event)">
        </user-card>
      `;
      const result = await orchestrator.enrichPropertiesWithTypes(
        template,
        ['userName', 'isActive'],
        ['userClick']
      );

      assert.strictEqual(result.inputs.length, 2);
      assert.strictEqual(result.outputs.length, 1);

      assertTypeEquals(result.inputs[0].inferredType!, 'string');
      assertTypeEquals(result.inputs[1].inferredType!, 'boolean');
      assertTypeEquals(result.outputs[0].inferredType!, 'MouseEvent');
    });

    test('should fallback to unknown on error', async () => {
      const template = '<div [invalid]="nonExistent.property"></div>';
      const result = await orchestrator.enrichPropertiesWithTypes(
        template,
        ['invalid'],
        []
      );

      assert.strictEqual(result.inputs.length, 1);
      assertTypeEquals(result.inputs[0].inferredType!, 'unknown');
    });
  });

  // ========================================
  // End-to-End Integration Tests
  // ========================================

  suite('End-to-End Type Inference', () => {
    test('should infer all types for complete component extraction', async () => {
      const sourceFile = fileCreator.createSourceFile(
        'e2e.component.ts',
        `
        import { Component } from '@angular/core';

        interface Product {
          id: number;
          name: string;
          price: number;
          inStock: boolean;
        }

        @Component({
          selector: 'app-e2e',
          templateUrl: './e2e.component.html',
        })
        export class E2EComponent {
          product: Product = {
            id: 1,
            name: 'Test Product',
            price: 99.99,
            inStock: true,
          };

          products: Product[] = [];

          handleProductClick(product: Product): void {
            console.log(product);
          }

          handlePriceChange(price: number): void {
            console.log(price);
          }
        }
        `
      );

      const template = `
        <div class="product-card">
          <h2 [textContent]="product.name"></h2>
          <span [class.in-stock]="product.inStock"></span>
          <p>ID: {{ product.id }}</p>
          <input
            [value]="product.price"
            (change)="handlePriceChange($event.target.value)" />
          <button (click)="handleProductClick(product)">Select</button>
        </div>
      `;

      const orchestrator = new TypeInferenceOrchestrator();
      const result = await orchestrator.enrichPropertiesWithTypes(
        template,
        ['textContent', 'class.in-stock', 'value'],
        ['change', 'click']
      );

      // Verify inputs
      const textContent = result.inputs.find(i => i.name === 'textContent');
      assert.ok(textContent);
      assertTypeEquals(textContent.inferredType!, 'string');

      const inStock = result.inputs.find(i => i.name === 'class.in-stock');
      assert.ok(inStock);
      assertTypeEquals(inStock.inferredType!, 'boolean');

      const value = result.inputs.find(i => i.name === 'value');
      assert.ok(value);
      assertTypeEquals(value.inferredType!, 'number');

      // Verify outputs
      const click = result.outputs.find(o => o.name === 'click');
      assert.ok(click);
      assert.ok(click.inferredType!.includes('Product'));

      const change = result.outputs.find(o => o.name === 'change');
      assert.ok(change);
      assertTypeEquals(change.inferredType!, 'number');
    });
  });
});
```

---

### Step 5.2: Manual Testing Scenarios

Create test Angular projects with various scenarios:

1. **Simple Property Access**
   ```html
   <user-card [userName]="user.name" [age]="user.age"></user-card>
   ```
   Parent component:
   ```typescript
   user = { name: 'John', age: 30 };
   ```
   Expected: `userName: string`, `age: number`

2. **Method Call Events**
   ```html
   <button (click)="handleClick($event)"></button>
   ```
   Parent component:
   ```typescript
   handleClick(event: MouseEvent) { }
   ```
   Expected: `click: output<MouseEvent>()`

3. **Complex Expressions**
   ```html
   <div [isActive]="user.roles.includes('admin')"></div>
   ```
   Expected: `isActive: boolean`

4. **Array Access**
   ```html
   <item [data]="items[0]"></item>
   ```
   Expected: Infer element type from array

---

## Phase 6: Documentation & Polish

### Step 6.1: Update Configuration Documentation
**File**: `README.md`

Add section:

```markdown
## Smart Type Inference

The extension automatically infers types from your parent component's usage:

### Example

**Parent Component:**
```typescript
export class AppComponent {
  user = {
    name: 'John Doe',
    age: 30
  };

  handleUserClick(event: MouseEvent) {
    console.log('User clicked', event);
  }
}
```

**Template:**
```html
<user-card 
  [userName]="user.name" 
  [userAge]="user.age"
  (userClick)="handleUserClick($event)">
</user-card>
```

**Generated Component (with type inference):**
```typescript
export class UserCardComponent {
  // Types automatically inferred! ✨
  userName = input.required<string>();
  userAge = input.required<number>();
  userClick = output<MouseEvent>();
}
```

### Configuration

- `ngComponentFromTemplate.inferTypes`: Enable/disable type inference (default: `true`)
- `ngComponentFromTemplate.fallbackToUnknown`: Use 'unknown' when inference fails (default: `true`)

### Supported Inference Patterns

✅ Property access: `user.name` → `string`
✅ Method parameters: `handleClick($event)` → `MouseEvent`
✅ Array length: `items.length` → `number`
✅ Boolean expressions: `user.isAdmin` → `boolean`
⚠️ Complex expressions may fall back to `unknown`
```

---

### Step 6.2: Add User Guide for Type Inference
**File**: `TYPE_INFERENCE_GUIDE.md` (new)

```markdown
# Type Inference Guide

## How It Works

The extension analyzes your parent component's TypeScript code using the TypeScript Compiler API and `ts-morph` to infer types.

## Confidence Levels

- **High**: Direct property access or method signature analysis
- **Medium**: Inferred from constructor parameters or getters
- **Low**: Heuristic-based (property name patterns)

## Troubleshooting

### Types Showing as 'unknown'

1. Ensure your parent component is properly typed
2. Check that `tsconfig.json` is configured correctly
3. Verify the template expression is supported
4. Enable verbose logging: `"ngComponentFromTemplate.debugTypeInference": true`

### Incorrect Types

File an issue with:
- Parent component code
- Template HTML
- Expected vs actual inferred types
```

---

## Implementation Checklist

```markdown
### Phase 1: Foundation ✓
- [ ] Add configuration for type inference
- [ ] Create TypeInferenceEngine class
- [ ] Create BindingParser class
- [ ] Test basic type resolution with ts-morph

### Phase 2: Integration ✓
- [ ] Update signal/decorator generators with type parameters
- [ ] Create TypeInferenceOrchestrator
- [ ] Integrate with createComponentTs
- [ ] Update extension.ts to pass template

### Phase 3: Advanced Features ✓
- [ ] Handle complex expressions (ternary, array access)
- [ ] Add import management for custom types
- [ ] Support method chains
- [ ] Handle pipe expressions

### Phase 4: Error Handling ✓
- [ ] Implement fallback strategies
- [ ] Add heuristic-based inference
- [ ] Create user feedback system
- [ ] Add confidence scoring

### Phase 5: Testing ✓
- [ ] Write unit tests for type inference
- [ ] Create integration tests
- [ ] Manual testing with real Angular projects
- [ ] Edge case testing

### Phase 6: Documentation ✓
- [ ] Update README with type inference examples
- [ ] Create TYPE_INFERENCE_GUIDE.md
- [ ] Add troubleshooting section
- [ ] Document limitations
```

---

## Expected Outcome

After completing these steps, your extension will:

1. ✅ **Automatically infer types** from parent component usage
2. ✅ **Generate properly typed components** without manual refinement
3. ✅ **Support complex expressions** with graceful fallbacks
4. ✅ **Provide confidence feedback** to users
5. ✅ **Import custom types** automatically when needed

**Estimated Implementation Time**: 16-24 hours for an experienced developer

**Key Benefits:**
- Eliminates 90% of manual type refinement
- Reduces errors from incorrect types
- Dramatically improves DX and productivity
- Works seamlessly with Signal-based generation

**Example Before/After:**

**Before (manual type refinement needed):**
```typescript
userName = input.required<unknown>(); // Developer must change to <string>
userAge = input.required<unknown>();  // Developer must change to <number>
```

**After (with type inference):**
```typescript
userName = input.required<string>(); // ✨ Automatically inferred!
userAge = input.required<number>();  // ✨ Automatically inferred!
```
