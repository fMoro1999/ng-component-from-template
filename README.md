# Angular Component From Template

You are probably asking to yourself...

## Why the hell did I bump in here?!

## Why should I install another s\*\*\*\*y vscode extension?

You will answer by yourself in a couple of moments; <strong>just let me explain!</strong>
How many times you said "I will split my gigantic Angular component into smaller ones later, I promise..."?

If the answer is "never", or just "sometimes", there are two possible scenarios

1. You are literally perfect. You do not even know what procrastination is
2. As 90% of programmers, you are lazy. That's it 🤭

Now that only real Angular devs are here, let's deep dive into what this extension deals with.

## Features

**Effortlessly extract components from your templates** with modern Angular best practices:

- **Interactive Preview Mode**: Review and customize your component before generation with a beautiful preview UI
- **Select HTML** in your template and scaffold a complete component instantly
- **Auto-detect bindings**: `[inputs]`, `(outputs)`, and `[(models)]` are automatically detected
- **Smart type inference**: Automatically infers types from parent component using TypeScript analysis
- **Angular Language Service integration**: Delegates template dependency resolution to Angular Language Service via VS Code quick fixes for automatic, future-proof import detection
- **Signal-first generation**: Components are generated using Angular's modern Signal APIs (`input()`, `output()`, `model()`) by default
- **Smart imports**: Automatically adds new components to parent component imports (for standalone components)
- **Barrel exports**: Adds component to nearest `index.ts` barrel file
- **Template replacement**: Selected HTML is replaced with the new component selector
- **Clipboard path support**: Copy a path and the extension will offer to use it as destination

### Signal-Based Components

This extension generates components using Angular's modern **Signal APIs** by default (Angular 16+):

```typescript
// ✨ Generated with Signal APIs and Smart Type Inference
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  standalone: true,
  imports: [],
  selector: 'user-card',
  templateUrl: './user-card.component.html',
  styleUrls: ['./user-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  // Inputs (types inferred from parent component)
  userName = input.required<string>();
  userAge = input.required<number>();

  // Outputs (types inferred from event handlers)
  userClick = output<MouseEvent>();
}
```

**For older Angular versions** (14-15) or when disabled, the extension falls back to decorator-based APIs:

```typescript
// 📦 Decorator-based (fallback) with Smart Type Inference
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';

@Component({
  standalone: true,
  imports: [],
  selector: 'user-card',
  templateUrl: './user-card.component.html',
  styleUrls: ['./user-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  // Inputs (types inferred from parent component)
  @Input({ required: true }) userName!: string;
  @Input({ required: true }) userAge!: number;

  // Outputs (types inferred from event handlers)
  @Output() userClick = new EventEmitter<MouseEvent>();
}
```

## Requirements

- **VS Code** 1.84.0 or higher
- **Angular** 14+ (recommended: 17+ for full Signal API support)

## How to Use

1. **Select template HTML** in your Angular component template file
2. **Right-click** and choose `Create component from highlighted text` (or use command palette)
3. **Enter the destination path** for the new component (or use clipboard path if available)
4. **Enter component name** in dash-case format (e.g., `user-profile-card`)
5. **Review the preview** (if enabled) - see below for details
6. **Done!** Your component is scaffolded and wired up automatically

### Example Workflow

**Before** - In `app.component.html`:

```html
<div class="user-profile">
  <h2 [textContent]="userName" (click)="handleUserClick()"></h2>
  <p>Age: {{ userAge }}</p>
</div>
```

**After** - Select the div, run the command:

New files created:

- `user-profile/user-profile.component.ts`
- `user-profile/user-profile.component.html`
- `user-profile/user-profile.component.scss`

Your template is replaced with:

```html
<user-profile></user-profile>
```

## Interactive Preview Mode

Before generating your component, the extension shows an **interactive preview panel** where you can review and customize everything:

### Preview Features

**Component Name Editor:**
- Edit the component name before generation
- Real-time validation (must be kebab-case)
- All file paths update automatically

**Property Management:**
- **Toggle properties on/off**: Uncheck inputs/outputs you don't need
- **Edit types inline**: Click on any type to modify it (e.g., change `unknown` to `string`)
- **Confidence indicators**: Each property shows HIGH/MEDIUM/LOW confidence badges based on type inference accuracy

**Lifecycle Hooks:**
- Add lifecycle hooks with checkboxes: `ngOnInit`, `ngOnDestroy`, `ngAfterViewInit`, etc.
- Methods are automatically generated with proper signatures
- Interfaces are automatically added to the implements clause

**File Previews:**
- **TypeScript tab**: Preview the generated `.component.ts` file with all your customizations
- **HTML tab**: Preview the template file
- **SCSS tab**: Preview the stylesheet file
- Real-time updates as you make changes

**Action Buttons:**
- **Generate Component**: Apply all changes and create the component
- **Cancel**: Abort without creating anything

### Preview Mode Screenshot

The preview panel provides a professional interface with:
- Syntax-highlighted code previews
- VSCode-native styling that adapts to your theme
- Responsive layout for different screen sizes
- Keyboard-friendly navigation

### Disabling Preview Mode

If you prefer the direct generation flow (no preview), disable it in settings:

```json
{
  "ngComponentFromTemplate.enablePreviewMode": false
}
```

With preview mode disabled, components are generated immediately after entering the name.

## Extension Settings

This extension contributes the following settings:

### `ngComponentFromTemplate.useSignalApis`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Generate components using Signal APIs (`input()`, `output()`, `model()`) instead of decorators (`@Input()`, `@Output()`)

### `ngComponentFromTemplate.detectAngularVersion`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Automatically detect Angular version from `package.json` and use appropriate APIs

### `ngComponentFromTemplate.minimumAngularVersion`

- **Type**: `number`
- **Default**: `17`
- **Description**: Minimum Angular version required to use Signal APIs (14-19)

### `ngComponentFromTemplate.changeDetectionStrategy`

- **Type**: `string`
- **Default**: `OnPush`
- **Description**: The default CD synchronization strategy

### `ngComponentFromTemplate.useAngularLanguageService`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Delegate template dependency resolution to Angular Language Service. When enabled, ALS automatically resolves and imports required directives, pipes, and components via VS Code Quick Fixes. Falls back to built-in detection if ALS is unavailable.

### `ngComponentFromTemplate.enablePreviewMode`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Show interactive preview before generating component. When enabled, you can review and modify inputs/outputs, types, lifecycle hooks, and file contents before creation. Disable for direct generation without preview.

### Configuring Settings

**Via VS Code UI:**

1. Open Settings (`Cmd/Ctrl + ,`)
2. Search for "Angular Component From Template"
3. Adjust settings as needed

**Via `settings.json`:**

```json
{
  "ngComponentFromTemplate.useSignalApis": true,
  "ngComponentFromTemplate.detectAngularVersion": true,
  "ngComponentFromTemplate.changeDetectionStrategy": "OnPush",
  "ngComponentFromTemplate.minimumAngularVersion": 17,
  "ngComponentFromTemplate.useAngularLanguageService": true,
  "ngComponentFromTemplate.enablePreviewMode": true
}
```

## Compatibility

| Angular Version   | Signal APIs               | Decorator APIs | Two-way Bindings (`model()`) |
| ----------------- | ------------------------- | -------------- | ---------------------------- |
| **Angular 17+**   | ✅ Full Support           | ✅ Supported   | ✅ Full Support              |
| **Angular 16**    | ✅ `input()` / `output()` | ✅ Supported   | ⚠️ Not Available             |
| **Angular 14-15** | ❌ Not Available          | ✅ Supported   | ❌ Not Available             |

The extension **automatically detects** your Angular version and uses the appropriate generation strategy.

## Features Deep Dive

### Smart Type Inference

The extension uses **TypeScript AST analysis** (via ts-morph) to automatically infer types from your parent component:

**Input Property Type Inference:**
- Analyzes binding expressions like `[userName]="user.name"`
- Traverses property chains to determine the exact type
- Supports nested properties: `employee.company.address.city` → `string`
- Handles nullable types: `selectedUser: User | null` → `User | null`
- Supports union types: `status: 'active' | 'inactive'` → `'active' | 'inactive'`

**Output Event Type Inference:**
- Analyzes event handler method signatures
- Infers parameter types from method definitions: `handleClick(event: MouseEvent)` → `MouseEvent`
- Supports custom event types and complex parameters

**Model Binding Type Inference (Angular 17+):**
- Automatically infers types for two-way bindings: `[(value)]="selectedItem"`
- Supports the same type inference features as inputs
- Generates `model()` signals with correct types

**Custom Type Import Extraction:**
- Automatically detects custom types used in bindings
- Extracts import statements from parent component
- Adds necessary imports to generated component
- Works with interfaces, classes, enums, and type aliases

**Type Inference Confidence Levels:**
- **High**: Type inferred from explicit type annotations or property chains
- **Medium**: Type inferred from constructor parameters
- **Low**: Fallback heuristics (e.g., properties containing "name" → `string`)

**Examples:**

```typescript
// Parent component
import { Product } from '../models/product';
import { UserProfile } from '../types/user';

export class ParentComponent {
  user: UserProfile = { name: 'John', age: 30, role: 'admin' };
  items: Product[] = [];
  selectedItem: Product | null = null;
  status: 'pending' | 'approved' | 'rejected' = 'pending';

  handleClick(event: MouseEvent): void { }
  handleProductSelect(product: Product): void { }
}
```

Template selection:
```html
<div [userName]="user.name" [userAge]="user.age"
     [products]="items" [status]="status"
     [(selectedItem)]="selectedItem"
     (click)="handleClick($event)"
     (productSelect)="handleProductSelect($event)"></div>
```

Generated component with inferred types AND custom imports:
```typescript
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  model,
} from '@angular/core';
import { Product } from '../models/product';  // ← Auto-imported!

@Component({
  standalone: true,
  imports: [],
  selector: 'extracted-component',
  templateUrl: './extracted-component.component.html',
  styleUrls: ['./extracted-component.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtractedComponent {
  // Inputs with inferred types
  userName = input.required<string>();      // ← Inferred from user.name
  userAge = input.required<number>();       // ← Inferred from user.age
  products = input.required<Product[]>();   // ← Inferred from items + import added
  status = input.required<'pending' | 'approved' | 'rejected'>(); // ← Union type

  // Two-way bindings with inferred types
  selectedItem = model.required<Product | null>();  // ← Inferred from selectedItem

  // Outputs with inferred parameter types
  click = output<MouseEvent>();         // ← Inferred from handleClick parameter
  productSelect = output<Product>();    // ← Inferred from handleProductSelect parameter
}
```

### Binding Detection

The extension automatically detects:

- **Property bindings**: `[userName]="user.name"` → `userName = input.required<string>()`
- **Event bindings**: `(click)="handleClick($event)"` → `click = output<MouseEvent>()`
- **Two-way bindings**: `[(ngModel)]="value"` → `ngModel = model.required<string>()` (Angular 17+)
- **Native events are filtered out**: `(click)`, `(focus)`, etc. are not treated as custom outputs

### Template Dependency Auto-Detection via Angular Language Service

The extension uses a **hybrid approach** for import resolution: Angular Language Service (primary) with fallback detection (secondary).

#### Primary Mode: Angular Language Service (Recommended)

The extension leverages **Angular Language Service** (ALS) to automatically resolve and import required dependencies using VS Code's Quick Fix API.

**How it works:**

1. Component is generated with minimal `imports: []`
2. File is opened in VS Code
3. ALS analyzes the template and detects missing imports
4. Extension triggers VS Code Quick Fixes programmatically
5. ALS quick fixes are applied automatically to add imports

**What ALS resolves:**
- ✅ Angular Common directives: `*ngIf`, `*ngFor`, `*ngSwitch`, `[ngClass]`, `[ngStyle]`, `[(ngModel)]`
- ✅ Angular Common pipes: `async`, `date`, `uppercase`, `lowercase`, `currency`, `json`, etc.
- ✅ Custom library components (PrimeNG, Angular Material, etc.)
- ✅ Custom workspace pipes and directives
- ✅ Future Angular features (automatically supported as Angular evolves)

> ⚠️ **Fallback Note**: If ALS is unavailable, the extension uses best-effort heuristic detection limited to built-in Angular symbols. Custom components or pipes may require manual verification in fallback mode.

**Example:**

**Template:**
```html
<div *ngIf="show">
  <p>{{ data$ | async }}</p>
  <ul>
    <li *ngFor="let item of items">{{ item | uppercase }}</li>
  </ul>
</div>
```

**Generated Component (after ALS):**
```typescript
import { NgIf, NgFor, AsyncPipe, UpperCasePipe } from '@angular/common';

@Component({
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, UpperCasePipe],  // ← Auto-populated by ALS!
  // ...
})
```

#### Fallback Mode: Heuristic Detection (Best-Effort)

If Angular Language Service is not installed, unavailable, or fails to provide quick fixes, the extension falls back to **heuristic-based detection** for common Angular symbols.

**Important caveats:**
- ⚠️ **Best-effort only**: Accuracy is not guaranteed
- ⚠️ **Limited scope**: Only detects hardcoded Angular Common symbols (`@angular/common`)
- ⚠️ **No custom library support**: Cannot resolve PrimeNG, Material, etc.
- ⚠️ **Manual verification required**: User should verify imports for custom components/pipes
- ⚠️ **Regex-based**: May produce false positives/negatives on complex templates

**When fallback is used:**
The extension will show an info message:
> "Fallback import detection applied (N imports added). Install 'Angular Language Service' extension for automatic, accurate import resolution. Please verify imports manually for custom components/pipes."

**Recommendation:** Install the [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template) extension for the best experience.

**Why this matters:**
By delegating to Angular Language Service, this extension avoids brittle heuristics, remains compatible with future Angular versions, and provides reliable, maintainable import resolution. Fallback detection is applied automatically if ALS is unavailable, but ALS integration is strongly recommended for production use.

### Standalone Component Support

For standalone components, the extension:

- Detects if the parent component is standalone
- Automatically adds the new component to the parent's `imports` array
- Uses `ts-morph` to safely modify TypeScript files
- Fixes missing imports automatically

### Barrel File Integration

The extension searches up the directory tree for `index.ts` barrel files and automatically adds:

```typescript
export { UserCardComponent } from './user-card/user-card.component';
```

### File Generation

Each component creates three files:

- **`.component.ts`**: TypeScript class with detected inputs/outputs
- **`.component.html`**: Extracted HTML template
- **`.component.scss`**: Empty stylesheet with component class selector

All components are generated with:

- `standalone: true`
- `changeDetection: ChangeDetectionStrategy.OnPush`
- Proper imports based on Signal/Decorator mode

## Known Limitations

- **Type inference edge cases**: Complex expressions (ternary operators, method chains, pipe transforms) may fall back to `unknown` (but can be edited in preview mode)
- **NgModule components**: Limited support (shows info message instead of auto-wiring)
- **Regex-based parsing**: Complex multiline attributes may not be detected
- **Multiple custom types**: Only types from the parent component's imports are extracted (not transitive dependencies)
- **Template dependency resolution**: Requires Angular Language Service extension for full automation. Fallback heuristic detection is applied automatically if ALS is unavailable, but is limited to built-in Angular symbols and may require manual verification for custom components or pipes

## Roadmap

- [ ] Advanced type inference for complex expressions (ternary, pipes, method chains)
- [x] Auto-import custom types from inferred signatures ✅ **Completed in v0.1.0**
- [x] Model binding type inference ✅ **Completed in v0.1.0**
- [x] Angular Language Service integration for template dependencies ✅ **Completed in v0.1.0**
- [x] Interactive Preview Mode ✅ **Completed in v0.1.0**
- [ ] Support for CSS/Less/styled-components
- [ ] NgModule integration improvements
- [ ] Multi-pass ALS quick fix optimization
- [ ] Service injection selector in preview mode

## Release Notes

### 0.1.0 (Upcoming)

**New Features:**

- 🎨 **Interactive Preview Mode**: Beautiful preview UI before component generation
  - Review and modify inputs, outputs, and models
  - Edit types inline with confidence indicators (HIGH/MEDIUM/LOW)
  - Toggle properties on/off
  - Add lifecycle hooks (ngOnInit, ngOnDestroy, etc.) with checkboxes
  - Live file previews (TypeScript, HTML, SCSS) with syntax highlighting
  - Edit component name with real-time validation
  - Cancel or confirm generation
  - Can be disabled for direct generation workflow
- 🎯 **Smart Type Inference**: Automatically infer types from parent component using TypeScript AST analysis
  - Supports nested properties, union types, nullable types, and generics
  - Analyzes event handler signatures for output types
  - **Model binding type inference** for two-way bindings
  - High-confidence inference with fallback strategies
- 📦 **Custom Type Import Extraction**: Automatically extracts and adds import statements for custom types
  - Detects custom interfaces, classes, enums, and type aliases
  - Preserves relative import paths from parent component
  - Works seamlessly with inferred types
- 🔧 **Angular Language Service Integration**: Delegates template dependency resolution to ALS via VS Code Quick Fixes
  - Uses public VS Code APIs (`vscode.executeCodeActionProvider`)
  - Automatically resolves Angular Common directives and pipes
  - Supports custom library imports (PrimeNG, Material, etc.)
  - Future-proof against Angular version changes
  - Falls back to built-in detection if ALS unavailable
  - Multi-pass quick fix application for chained dependencies
- 🎨 Signal-based component generation (Angular 16+)
- 🔄 Two-way binding detection with `model()`
- 🔍 Automatic Angular version detection
- ⚙️ Configuration system for customization
- 📚 Comprehensive test suite (136 passing tests - 86 core + 50 preview mode)
- 📖 Improved documentation

### 0.0.2

- Added icon to package manifest
- Fixed dependencies

### 0.0.1

Initial release

---

## Contributing

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/fMoro1999/ng-component-from-template).

---

**Enjoy! ❤️‍🔥**
