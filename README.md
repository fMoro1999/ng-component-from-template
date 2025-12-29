# Angular Component From Template

**Stop promising yourself you'll refactor that giant component "later."**

Select HTML, extract a fully-wired component in seconds. With smart type inference, interactive preview, and Angular Language Service integration.

## Features

- **One-click extraction** — Select HTML, scaffold a complete standalone component
- **Interactive Preview** — Review & customize inputs, outputs, types, and lifecycle hooks before generation
- **Smart Type Inference** — Automatically infers types from your parent component via TypeScript AST analysis
- **Signal-first** — Generates modern `input()`, `output()`, `model()` APIs (Angular 16+)
- **Angular Language Service Integration** — Auto-resolves directives, pipes, and imports
- **Zero config** — Works out of the box; customize when needed

## Quick Start

1. **Select** template HTML in your `.component.html`
2. **Right-click** → `Create component from highlighted text`
3. **Name** your component (e.g., `user-card`)
4. **Review** in the preview panel (optional)
5. **Done** — Component created, parent updated, imports resolved

**Before:**

```html
<div class="user-profile">
  <h2 [textContent]="userName" (click)="handleUserClick()"></h2>
  <p>Age: {{ userAge }}</p>
</div>
```

**After:**

```html
<user-profile
  [userName]="userName"
  (userClick)="handleUserClick()"
></user-profile>
```

## Generated Output

```typescript
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
  userName = input.required<string>(); // Type inferred from parent
  userAge = input.required<number>();
  userClick = output<MouseEvent>(); // Type inferred from handler
}
```

## Interactive Preview

Before generating, review everything in a beautiful preview panel:

- **Edit types inline** — Change `unknown` to `string` with a click
- **Toggle properties** — Include only what you need
- **Add lifecycle hooks** — `ngOnInit`, `ngOnDestroy`, etc.
- **Live file preview** — See TypeScript, HTML, and SCSS before creation
- **Confidence badges** — HIGH/MEDIUM/LOW indicators for inferred types

Disable with `"ngComponentFromTemplate.enablePreviewMode": false` for direct generation.

## Smart Type Inference

The extension analyzes your parent component to infer types automatically:

| Binding                       | Inference                               |
| ----------------------------- | --------------------------------------- |
| `[user]="currentUser"`        | Resolves `currentUser` type from parent |
| `[items]="products"`          | Preserves `Product[]` with auto-import  |
| `(select)="onSelect($event)"` | Infers from `onSelect(item: Product)`   |
| `[(value)]="selectedId"`      | Creates `model<number>()`               |

Custom types are **automatically imported** from the parent component.

## Angular Language Service Integration

Template dependencies are resolved via Angular Language Service:

```html
<div *ngIf="show">
  <span>{{ value | uppercase }}</span>
</div>
```

Automatically adds:

```typescript
imports: [NgIf, UpperCasePipe];
```

Works with Angular Common, PrimeNG, Angular Material, and your custom components.

> Falls back to heuristic detection if ALS is unavailable.

## Compatibility

| Angular   | Signal APIs | Decorator APIs | `model()` |
| --------- | ----------- | -------------- | --------- |
| **17+**   | Full        | Yes            | Full      |
| **16**    | Yes         | Yes            | No        |
| **14-15** | No          | Yes            | No        |

Version auto-detected from `package.json`.

## Settings

| Setting                     | Default  | Description                                    |
| --------------------------- | -------- | ---------------------------------------------- |
| `useSignalApis`             | `true`   | Use `input()`/`output()` instead of decorators |
| `detectAngularVersion`      | `true`   | Auto-detect Angular version                    |
| `minimumAngularVersion`     | `17`     | Minimum version for Signal APIs                |
| `changeDetectionStrategy`   | `OnPush` | Default change detection                       |
| `useAngularLanguageService` | `true`   | Use ALS for import resolution                  |
| `enablePreviewMode`         | `true`   | Show preview before generation                 |

## Requirements

- **VS Code** 1.84.0+
- **Angular** 14+ (17+ recommended for full Signal support)
- **Angular Language Service** extension (recommended)

## What Gets Created

- `component-name.component.ts` — Class with inputs/outputs
- `component-name.component.html` — Extracted template
- `component-name.component.scss` — Stylesheet scaffold

Plus:

- Parent component `imports` array updated
- Barrel file (`index.ts`) export added
- Original template replaced with new selector

## Known Limitations

- Complex expressions (ternary, pipes) may infer as `unknown` (editable in preview)
- NgModule components have limited auto-wiring
- ALS required for full import resolution accuracy

## Contributing

Found a bug? Have a feature request? [Open an issue on GitHub](https://github.com/fMoro1999/ng-component-from-template).

---

**Stop procrastinating. Start extracting ✨**
