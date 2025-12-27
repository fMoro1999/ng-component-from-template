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

- **Select HTML** in your template and scaffold a complete component instantly
- **Auto-detect bindings**: `[inputs]`, `(outputs)`, and `[(models)]` are automatically detected
- **Smart type inference**: Automatically infers types from parent component using TypeScript analysis
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
5. **Done!** Your component is scaffolded and wired up automatically

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

### `ngComponentFromTemplate.changeDetectionStrategy

- **Type**: `string`
- **Default**: `OnPush`
- **Description**: The default CD synchronization strategy

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
  "ngComponentFromTemplate.minimumAngularVersion": 17
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

**Type Inference Confidence Levels:**
- **High**: Type inferred from explicit type annotations or property chains
- **Medium**: Type inferred from constructor parameters
- **Low**: Fallback heuristics (e.g., properties containing "name" → `string`)

**Examples:**

```typescript
// Parent component
export class ParentComponent {
  user: { name: string; age: number } = { name: 'John', age: 30 };
  items: Product[] = [];
  status: 'pending' | 'approved' | 'rejected' = 'pending';

  handleClick(event: MouseEvent): void { }
  handleSubmit(data: FormData): void { }
}
```

Template selection:
```html
<div [userName]="user.name" [userAge]="user.age"
     [products]="items" [status]="status"
     (click)="handleClick($event)"
     (submit)="handleSubmit($event)"></div>
```

Generated component with inferred types:
```typescript
export class ExtractedComponent {
  userName = input.required<string>();      // ← Inferred from user.name
  userAge = input.required<number>();       // ← Inferred from user.age
  products = input.required<Product[]>();   // ← Inferred from items
  status = input.required<'pending' | 'approved' | 'rejected'>(); // ← Union type

  click = output<MouseEvent>();    // ← Inferred from handleClick parameter
  submit = output<FormData>();     // ← Inferred from handleSubmit parameter
}
```

### Binding Detection

The extension automatically detects:

- **Property bindings**: `[userName]="user.name"` → `userName = input.required<string>()`
- **Event bindings**: `(click)="handleClick($event)"` → `click = output<MouseEvent>()`
- **Two-way bindings**: `[(ngModel)]="value"` → `ngModel = model.required<string>()` (Angular 17+)
- **Native events are filtered out**: `(click)`, `(focus)`, etc. are not treated as custom outputs

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

- **Type inference edge cases**: Complex expressions (ternary operators, method chains, pipe transforms) may fall back to `unknown`
- **Template dependencies**: Directives/pipes used in template must be manually imported
- **NgModule components**: Limited support (shows info message instead of auto-wiring)
- **Regex-based parsing**: Complex multiline attributes may not be detected
- **Type imports**: Custom types are inferred but imports must be manually added if needed

## Roadmap

- [ ] Advanced type inference for complex expressions (ternary, pipes, method chains)
- [ ] Auto-import custom types from inferred signatures
- [ ] Template dependency auto-detection (`*ngIf`, pipes, etc.)
- [ ] Preview mode before generation
- [ ] Support for CSS/Less/styled-components
- [ ] NgModule integration improvements

## Release Notes

### 0.1.0 (Upcoming)

**New Features:**

- 🎯 **Smart Type Inference**: Automatically infer types from parent component using TypeScript AST analysis
  - Supports nested properties, union types, nullable types, and generics
  - Analyzes event handler signatures for output types
  - High-confidence inference with fallback strategies
- 🎨 Signal-based component generation (Angular 16+)
- 🔄 Two-way binding detection with `model()`
- 🔍 Automatic Angular version detection
- ⚙️ Configuration system for customization
- 📚 Comprehensive test suite (44 passing tests)
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
