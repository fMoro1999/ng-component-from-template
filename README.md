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
- **Signal-first generation**: Components are generated using Angular's modern Signal APIs (`input()`, `output()`, `model()`) by default
- **Smart imports**: Automatically adds new components to parent component imports (for standalone components)
- **Barrel exports**: Adds component to nearest `index.ts` barrel file
- **Template replacement**: Selected HTML is replaced with the new component selector
- **Clipboard path support**: Copy a path and the extension will offer to use it as destination

### Signal-Based Components

This extension generates components using Angular's modern **Signal APIs** by default (Angular 16+):

```typescript
// ✨ Generated with Signal APIs
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
  // Inputs
  userName = input.required<unknown>();
  userAge = input.required<unknown>();

  // Outputs
  userClick = output<unknown>();
}
```

**For older Angular versions** (14-15) or when disabled, the extension falls back to decorator-based APIs:

```typescript
// 📦 Decorator-based (fallback)
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
  // Inputs
  @Input({ required: true }) userName!: unknown;
  @Input({ required: true }) userAge!: unknown;

  // Outputs
  @Output() userClick = new EventEmitter<unknown>();
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

### Binding Detection

The extension automatically detects:

- **Property bindings**: `[userName]="user.name"` → `userName = input.required<unknown>()`
- **Event bindings**: `(click)="handleClick()"` → `click = output<unknown>()`
- **Two-way bindings**: `[(ngModel)]="value"` → `ngModel = model.required<unknown>()` (Angular 16+)
- **Native events are filtered out**: `(click)`, `(focus)`, etc. are not treated as outputs

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

- Type inference: All properties are typed as `unknown` (manual refinement needed)
- Template dependencies: Directives/pipes used in template must be manually imported
- NgModule components: Limited support (shows info message instead of auto-wiring)
- Regex-based parsing: Complex multiline attributes may not be detected

## Roadmap

- [ ] Smart type inference from parent component
- [ ] Template dependency auto-detection (`*ngIf`, pipes, etc.)
- [ ] Preview mode before generation
- [ ] Support for CSS/Less/styled-components
- [ ] NgModule integration improvements

## Release Notes

### 0.1.0 (Upcoming)

**New Features:**

- Signal-based component generation (Angular 16+)
- Two-way binding detection with `model()`
- Automatic Angular version detection
- Configuration system for customization
- Improved documentation

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
