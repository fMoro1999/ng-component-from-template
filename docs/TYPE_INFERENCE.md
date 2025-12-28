# Smart Type Inference System

## Overview

The Smart Type Inference system automatically determines TypeScript types for component inputs, outputs, and models by analyzing the parent component's TypeScript code and template bindings. This eliminates the need for manual type annotations when extracting components.

## Architecture

The type inference system is built around several key components:

```
┌─────────────────────────────────────────────────────────────┐
│                   TypeInferenceOrchestrator                  │
│  Coordinates the entire type inference workflow              │
└─────────────────────────────────────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
    ┌──────────┐    ┌──────────────┐  ┌────────────┐
    │ Binding  │    │    Type      │  │  Import    │
    │  Parser  │───▶│  Inference   │  │  Manager   │
    └──────────┘    │   Engine     │  └────────────┘
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Expression  │
                    │   Analyzer   │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Fallback   │
                    │   Strategy   │
                    └──────────────┘
```

## Components

### 1. BindingParser

**Purpose**: Extracts binding information from Angular templates.

**Location**: [`src/type-inference/binding-parser.ts`](../src/type-inference/binding-parser.ts)

**Responsibilities**:
- Parse HTML templates to extract property bindings `[prop]="expression"`
- Extract event bindings `(event)="handler()"`
- Detect two-way bindings `[(model)]="value"`
- Create a map of property names to binding expressions

**Example**:
```typescript
const parser = new BindingParser();
const bindings = parser.parseTemplate(`
  <div [userName]="user.name" (click)="handleClick($event)"></div>
`);
// Returns: [
//   { propertyName: 'userName', expression: 'user.name', bindingType: 'input' },
//   { propertyName: 'click', expression: 'handleClick($event)', bindingType: 'output' }
// ]
```

### 2. ExpressionAnalyzer

**Purpose**: Analyzes binding expressions to extract the root property name.

**Location**: [`src/type-inference/expression-analyzer.ts`](../src/type-inference/expression-analyzer.ts)

**Responsibilities**:
- Parse binding expressions (e.g., `user.name`, `items[0].title`)
- Extract the root variable/property name
- Handle array access, property chains, and method calls

**Supported Expression Types**:
- Simple properties: `userName` → `userName`
- Property chains: `user.name` → `user`
- Array access: `items[0]` → `items`
- Method calls: `getUser().name` → Extracts `getUser`

**Example**:
```typescript
const analyzer = new ExpressionAnalyzer();

analyzer.getRootPropertyName('user.name');           // 'user'
analyzer.getRootPropertyName('items[0].title');      // 'items'
analyzer.getRootPropertyName('handleClick($event)'); // 'handleClick'
```

### 3. TypeInferenceEngine

**Purpose**: Core type inference logic using TypeScript compiler API via ts-morph.

**Location**: [`src/type-inference/type-inference-engine.ts`](../src/type-inference/type-inference-engine.ts)

**Responsibilities**:
- Load and parse TypeScript source files
- Traverse property chains to determine types
- Analyze method signatures for output types
- Handle union types, nullable types, and generics
- Normalize type representations

**Type Inference Methods**:

#### Input Type Inference
```typescript
// Parent component
export class ParentComponent {
  user: { name: string; age: number } = { ... };
}

// Template: [userName]="user.name"
// Inference: 'user' → { name: string; age: number } → .name → string
```

#### Output Type Inference
```typescript
// Parent component
export class ParentComponent {
  handleClick(event: MouseEvent): void { }
}

// Template: (click)="handleClick($event)"
// Inference: handleClick → parameter[0] → MouseEvent
```

#### Model Type Inference
```typescript
// Parent component
export class ParentComponent {
  selectedItem: Product | null = null;
}

// Template: [(selectedItem)]="selectedItem"
// Inference: selectedItem → Product | null
```

**Confidence Levels**:
- **High**: Type from explicit annotations or type analysis
- **Medium**: Type from constructor parameters
- **Low**: Fallback heuristics (e.g., property name contains "name" → string)

### 4. FallbackStrategy

**Purpose**: Provides type inference when AST analysis is not possible.

**Location**: [`src/type-inference/fallback-strategy.ts`](../src/type-inference/fallback-strategy.ts)

**Responsibilities**:
- Heuristic-based type guessing
- Property name pattern matching
- Default to `unknown` when no pattern matches

**Heuristics**:
```typescript
// Property name patterns
'name' | 'title' | 'description' → string
'count' | 'age' | 'price' → number
'isActive' | 'hasPermission' → boolean
'date' | 'createdAt' → Date
'items' | 'users' | 'products' → unknown[] (array suffix detected)
```

### 5. ImportManager

**Purpose**: Extracts and generates import statements for custom types.

**Location**: [`src/type-inference/import-manager.ts`](../src/type-inference/import-manager.ts)

**Responsibilities**:
- Identify custom types (non-primitive, non-built-in)
- Search parent component imports for type definitions
- Generate import statements with correct module paths
- Handle named imports

**Custom Type Detection**:
```typescript
// Primitives (ignored)
string, number, boolean, unknown, any, void

// Built-ins (ignored)
Date, Array, Promise, Observable

// Custom types (extracted)
User, Product, OrderStatus, FormData (custom)
```

**Example**:
```typescript
// Parent component
import { Product } from '../models/product';
import { OrderStatus } from '../types/order';

// Inferred type: Product[]
// Generated import: import { Product } from '../models/product';
```

### 6. InferenceReporter

**Purpose**: Reports type inference results to the user.

**Location**: [`src/type-inference/inference-reporter.ts`](../src/type-inference/inference-reporter.ts)

**Responsibilities**:
- Generate detailed inference reports
- Display confidence levels
- Log results to console
- Provide user feedback via VS Code notifications

**Report Format**:
```
Type Inference Report:

✓ userName: string [HIGH]
✓ userAge: number [HIGH]
✓ products: Product[] [HIGH]
✗ complexProp: unknown [LOW]
```

### 7. TypeInferenceOrchestrator

**Purpose**: Coordinates all components to perform end-to-end type inference.

**Location**: [`src/type-inference/type-inference-orchestrator.ts`](../src/type-inference/type-inference-orchestrator.ts)

**Responsibilities**:
- Orchestrate the complete type inference workflow
- Integrate all sub-components
- Handle errors and fallbacks
- Return enriched type information

**Workflow**:
```typescript
async enrichPropertiesWithTypesFromFileAsync(
  template: string,
  inputNames: string[],
  outputNames: string[],
  modelNames: string[],
  parentTsFilePath: string
): Promise<TypeInferenceResult>
```

**Steps**:
1. Parse template to extract bindings
2. Infer types for each binding using TypeInferenceEngine
3. Enrich input/output/model properties with inferred types
4. Extract custom type imports using ImportManager
5. Generate detailed report using InferenceReporter
6. Return complete result with types and imports

## Type Inference Flow

### Complete Example

**Parent Component** (`app.component.ts`):
```typescript
import { Component } from '@angular/core';
import { Product } from './models/product';

export class AppComponent {
  products: Product[] = [];
  selectedProduct: Product | null = null;
  userName: string = 'John';

  handleProductClick(product: Product): void {
    console.log('Product clicked:', product);
  }
}
```

**Template Selection** (`app.component.html`):
```html
<div [products]="products"
     [(selectedProduct)]="selectedProduct"
     [userName]="userName"
     (productClick)="handleProductClick($event)">
</div>
```

**Type Inference Process**:

1. **BindingParser** extracts:
   - Input: `products` → `products`
   - Model: `selectedProduct` → `selectedProduct`
   - Input: `userName` → `userName`
   - Output: `productClick` → `handleProductClick($event)`

2. **ExpressionAnalyzer** identifies root properties:
   - `products` → `products`
   - `selectedProduct` → `selectedProduct`
   - `userName` → `userName`
   - `handleProductClick($event)` → `handleProductClick`

3. **TypeInferenceEngine** infers types:
   - `products`: Analyze `products` property → `Product[]`
   - `selectedProduct`: Analyze `selectedProduct` property → `Product | null`
   - `userName`: Analyze `userName` property → `string`
   - `productClick`: Analyze `handleProductClick` parameter → `Product`

4. **ImportManager** extracts imports:
   - `Product[]` requires `Product` → Extract `import { Product } from './models/product'`
   - `Product | null` requires `Product` → Already extracted
   - `Product` (output) requires `Product` → Already extracted

5. **Generated Component**:
```typescript
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  model,
} from '@angular/core';
import { Product } from './models/product';  // ← Auto-imported

@Component({
  standalone: true,
  imports: [],
  selector: 'product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  products = input.required<Product[]>();
  selectedProduct = model.required<Product | null>();
  userName = input.required<string>();

  productClick = output<Product>();
}
```

## Edge Cases and Limitations

### Supported Type Features

✅ **Primitive types**: `string`, `number`, `boolean`, `Date`
✅ **Union types**: `'active' | 'inactive'`, `string | number`
✅ **Nullable types**: `User | null`, `string | undefined`
✅ **Generic types**: `Product[]`, `Promise<User>`
✅ **Nested properties**: `user.profile.address.city` → `string`
✅ **Custom interfaces/classes**: `User`, `Product`, `OrderStatus`

### Not Yet Supported

❌ **Complex expressions**:
- Ternary operators: `condition ? value1 : value2`
- Method chains: `getUser().getName().toUpperCase()`
- Pipe transforms: `user | async`

❌ **Computed properties**:
- Array methods: `items.map(x => x.name)`
- Template expressions: `user.age + 1`

❌ **Transitive type dependencies**:
- Only types imported in parent component are extracted
- Types from nested dependencies require manual imports

### Fallback Behavior

When type inference fails, the system gracefully falls back to `unknown`:

```typescript
// Parent component
export class ParentComponent {
  getData() {
    return complexCalculation();  // No type annotation
  }
}

// Template: [data]="getData()"
// Inference: Cannot determine type → 'unknown'
// Generated: data = input.required<unknown>();
```

## Testing

The type inference system has comprehensive test coverage:

**Test Files**:
- [`src/test/type-inference.test.ts`](../src/test/type-inference.test.ts) - 43 passing tests

**Test Categories**:
1. **Binding Parser Tests**: Template parsing, binding extraction
2. **Simple Type Inference**: Primitives, arrays, dates
3. **Nested Property Inference**: Multi-level property chains
4. **Output Type Inference**: Event handler signatures
5. **Complex Type Inference**: Unions, generics, nullables
6. **Error Handling**: Invalid paths, non-existent properties
7. **Integration Tests**: End-to-end orchestrator tests

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: ts-morph Project instances are created only when needed
2. **Caching**: Type information is cached during a single inference session
3. **Early Exit**: Stop traversing when type is found
4. **Fallback Strategy**: Quick heuristics before expensive AST analysis

### Benchmark Results

For a typical component with 5 inputs and 3 outputs:
- **Binding Parsing**: ~5ms
- **Type Inference**: ~50-100ms (first run, includes file loading)
- **Import Extraction**: ~10ms
- **Total**: ~65-115ms

## Future Improvements

1. **Expression Evaluation**: Support for ternary operators, method chains
2. **Pipe Type Inference**: Analyze pipe transform signatures
3. **Template Reference Types**: Infer types from template variables
4. **Incremental Analysis**: Cache AST across multiple extractions
5. **Type Narrowing**: More sophisticated control flow analysis

## Contributing

When contributing to the type inference system:

1. **Add tests** for new features or bug fixes
2. **Update documentation** for architectural changes
3. **Use static imports only** (no dynamic `import()` calls)
4. **Maintain graceful fallbacks** (never throw errors to user)
5. **Consider performance** implications of AST traversal

## References

- [ts-morph Documentation](https://ts-morph.com/)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [Angular Signal APIs](https://angular.dev/guide/signals)
