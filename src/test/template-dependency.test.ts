import * as assert from 'assert';
import { DirectiveDetector } from '../template-dependency/directive-detector';
import { PipeDetector } from '../template-dependency/pipe-detector';
import { ComponentDetector } from '../template-dependency/component-detector';
import { TemplateDependencyAnalyzer } from '../template-dependency/template-dependency-analyzer';
import { DependencyImportGenerator } from '../template-dependency/import-generator';

suite('Template Dependency Detection Test Suite', () => {
  suite('DirectiveDetector', () => {
    let detector: DirectiveDetector;

    setup(() => {
      detector = new DirectiveDetector();
    });

    test('should detect *ngIf directive', () => {
      const template = '<div *ngIf="show">Content</div>';
      const result = detector.detectDirectives(template);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'NgIf');
      assert.strictEqual(result[0].module, '@angular/common');
      assert.strictEqual(result[0].isCustom, false);
    });

    test('should detect *ngFor directive', () => {
      const template = '<li *ngFor="let item of items">{{ item }}</li>';
      const result = detector.detectDirectives(template);

      assert.strictEqual(result.length, 1);
      assert.ok(result.some((d) => d.name === 'NgFor'));
    });

    test('should detect *ngSwitch directive', () => {
      const template = `
        <div [ngSwitch]="condition">
          <p *ngSwitchCase="'a'">A</p>
          <p *ngSwitchDefault>Default</p>
        </div>
      `;
      const result = detector.detectDirectives(template);

      assert.ok(result.some((d) => d.name === 'NgSwitch'));
    });

    test('should detect [ngClass] directive', () => {
      const template = '<div [ngClass]="classes">Content</div>';
      const result = detector.detectDirectives(template);

      assert.ok(result.some((d) => d.name === 'NgClass'));
    });

    test('should detect [ngStyle] directive', () => {
      const template = '<div [ngStyle]="styles">Content</div>';
      const result = detector.detectDirectives(template);

      assert.ok(result.some((d) => d.name === 'NgStyle'));
    });

    test('should detect [(ngModel)] directive', () => {
      const template = '<input [(ngModel)]="value" />';
      const result = detector.detectDirectives(template);

      assert.ok(result.some((d) => d.name === 'NgModel'));
    });

    test('should detect multiple directives', () => {
      const template = `
        <div *ngIf="show" [ngClass]="classes">
          <li *ngFor="let item of items">{{ item }}</li>
        </div>
      `;
      const result = detector.detectDirectives(template);

      assert.ok(result.length >= 3);
      assert.ok(result.some((d) => d.name === 'NgIf'));
      assert.ok(result.some((d) => d.name === 'NgFor'));
      assert.ok(result.some((d) => d.name === 'NgClass'));
    });

    test('should not duplicate directives', () => {
      const template = `
        <div *ngIf="show1">Content 1</div>
        <div *ngIf="show2">Content 2</div>
      `;
      const result = detector.detectDirectives(template);

      const ngIfCount = result.filter((d) => d.name === 'NgIf').length;
      assert.strictEqual(ngIfCount, 1);
    });

    test('should return empty array for template without directives', () => {
      const template = '<div>Plain content</div>';
      const result = detector.detectDirectives(template);

      assert.strictEqual(result.length, 0);
    });
  });

  suite('PipeDetector', () => {
    let detector: PipeDetector;

    setup(() => {
      detector = new PipeDetector();
    });

    test('should detect async pipe', () => {
      const template = '<div>{{ data$ | async }}</div>';
      const result = detector.detectPipes(template);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'AsyncPipe');
      assert.strictEqual(result[0].module, '@angular/common');
      assert.strictEqual(result[0].isCustom, false);
    });

    test('should detect date pipe', () => {
      const template = '<div>{{ now | date }}</div>';
      const result = detector.detectPipes(template);

      assert.strictEqual(result.length, 1);
      assert.ok(result.some((p) => p.name === 'DatePipe'));
    });

    test('should detect date pipe with parameters', () => {
      const template = '<div>{{ now | date:"short" }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'DatePipe'));
    });

    test('should detect uppercase pipe', () => {
      const template = '<div>{{ text | uppercase }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'UpperCasePipe'));
    });

    test('should detect lowercase pipe', () => {
      const template = '<div>{{ text | lowercase }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'LowerCasePipe'));
    });

    test('should detect currency pipe', () => {
      const template = '<div>{{ price | currency }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'CurrencyPipe'));
    });

    test('should detect percent pipe', () => {
      const template = '<div>{{ value | percent }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'PercentPipe'));
    });

    test('should detect json pipe', () => {
      const template = '<div>{{ data | json }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'JsonPipe'));
    });

    test('should detect slice pipe', () => {
      const template = '<div>{{ text | slice:0:10 }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'SlicePipe'));
    });

    test('should detect multiple pipes in chain', () => {
      const template = '<div>{{ text | uppercase | slice:0:10 }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.length >= 2);
      assert.ok(result.some((p) => p.name === 'UpperCasePipe'));
      assert.ok(result.some((p) => p.name === 'SlicePipe'));
    });

    test('should detect custom pipes', () => {
      const template = '<div>{{ value | customPipe }}</div>';
      const result = detector.detectPipes(template);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'CustomPipe');
      assert.strictEqual(result[0].isCustom, true);
    });

    test('should handle custom pipe with camelCase name', () => {
      const template = '<div>{{ value | myCustomFilter }}</div>';
      const result = detector.detectPipes(template);

      assert.strictEqual(result[0].name, 'MyCustomFilterPipe');
      assert.strictEqual(result[0].isCustom, true);
    });

    test('should not duplicate pipes', () => {
      const template = `
        <div>{{ data1 | async }}</div>
        <div>{{ data2 | async }}</div>
      `;
      const result = detector.detectPipes(template);

      const asyncCount = result.filter((p) => p.name === 'AsyncPipe').length;
      assert.strictEqual(asyncCount, 1);
    });

    test('should return empty array for template without pipes', () => {
      const template = '<div>{{ plainText }}</div>';
      const result = detector.detectPipes(template);

      assert.strictEqual(result.length, 0);
    });
  });

  suite('ComponentDetector', () => {
    let detector: ComponentDetector;

    setup(() => {
      detector = new ComponentDetector();
    });

    test('should detect custom component with app prefix', () => {
      const template = '<app-user-card [user]="user"></app-user-card>';
      const result = detector.detectComponents(template);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].selector, 'app-user-card');
      assert.strictEqual(result[0].isCustom, true);
    });

    test('should detect Material components', () => {
      const template = '<mat-button>Click</mat-button>';
      const result = detector.detectComponents(template);

      assert.strictEqual(result.length, 1);
      assert.ok(result.some((c) => c.selector === 'mat-button'));
    });

    test('should detect self-closing custom components', () => {
      const template = '<app-icon name="search" />';
      const result = detector.detectComponents(template);

      assert.ok(result.some((c) => c.selector === 'app-icon'));
    });

    test('should ignore native HTML elements', () => {
      const template = `
        <div>
          <p><span>Text</span></p>
          <button>Click</button>
          <input type="text" />
        </div>
      `;
      const result = detector.detectComponents(template);

      assert.strictEqual(result.length, 0);
    });

    test('should detect multiple custom components', () => {
      const template = `
        <app-header></app-header>
        <app-content>
          <app-sidebar></app-sidebar>
        </app-content>
        <app-footer></app-footer>
      `;
      const result = detector.detectComponents(template);

      assert.ok(result.length >= 4);
      assert.ok(result.some((c) => c.selector === 'app-header'));
      assert.ok(result.some((c) => c.selector === 'app-content'));
      assert.ok(result.some((c) => c.selector === 'app-sidebar'));
      assert.ok(result.some((c) => c.selector === 'app-footer'));
    });

    test('should not duplicate components', () => {
      const template = `
        <app-card></app-card>
        <app-card></app-card>
        <app-card></app-card>
      `;
      const result = detector.detectComponents(template);

      const cardCount = result.filter((c) => c.selector === 'app-card').length;
      assert.strictEqual(cardCount, 1);
    });

    test('should handle components with attributes', () => {
      const template = '<app-button [disabled]="true" (click)="onClick()">Submit</app-button>';
      const result = detector.detectComponents(template);

      assert.ok(result.some((c) => c.selector === 'app-button'));
    });
  });

  suite('TemplateDependencyAnalyzer - Integration', () => {
    let analyzer: TemplateDependencyAnalyzer;

    setup(() => {
      analyzer = new TemplateDependencyAnalyzer();
    });

    test('should analyze template with only directives', () => {
      const template = '<div *ngIf="show" [ngClass]="classes">Content</div>';
      const result = analyzer.analyze(template);

      assert.ok(result.directives.length >= 2);
      assert.strictEqual(result.pipes.length, 0);
      assert.strictEqual(result.components.length, 0);
    });

    test('should analyze template with only pipes', () => {
      const template = '<div>{{ data$ | async }}</div>';
      const result = analyzer.analyze(template);

      assert.strictEqual(result.directives.length, 0);
      assert.strictEqual(result.pipes.length, 1);
      assert.strictEqual(result.components.length, 0);
    });

    test('should analyze template with only custom components', () => {
      const template = '<app-card [data]="data"></app-card>';
      const result = analyzer.analyze(template);

      assert.strictEqual(result.directives.length, 0);
      assert.strictEqual(result.pipes.length, 0);
      assert.strictEqual(result.components.length, 1);
    });

    test('should analyze complex template with mixed dependencies', () => {
      const template = `
        <div *ngIf="show" [ngClass]="classes">
          <p>{{ date | date:"short" }}</p>
          <app-custom-component [data]="data$ | async"></app-custom-component>
        </div>
      `;

      const result = analyzer.analyze(template);

      assert.ok(result.directives.some((d) => d.name === 'NgIf'));
      assert.ok(result.directives.some((d) => d.name === 'NgClass'));
      assert.ok(result.pipes.some((p) => p.name === 'DatePipe'));
      assert.ok(result.pipes.some((p) => p.name === 'AsyncPipe'));
      assert.ok(result.components.some((c) => c.selector === 'app-custom-component'));
    });

    test('should analyze real-world template', () => {
      const template = `
        <div class="container" *ngIf="user$ | async as user">
          <h1>{{ user.name | uppercase }}</h1>
          <p>{{ user.createdAt | date:'medium' }}</p>

          <ul *ngIf="user.items.length > 0">
            <li *ngFor="let item of user.items">
              {{ item.title }} - {{ item.price | currency }}
            </li>
          </ul>

          <app-user-avatar [user]="user"></app-user-avatar>
          <mat-button (click)="save()">Save</mat-button>
        </div>
      `;

      const result = analyzer.analyze(template);

      // Directives
      assert.ok(result.directives.some((d) => d.name === 'NgIf'));
      assert.ok(result.directives.some((d) => d.name === 'NgFor'));

      // Pipes
      assert.ok(result.pipes.some((p) => p.name === 'AsyncPipe'));
      assert.ok(result.pipes.some((p) => p.name === 'UpperCasePipe'));
      assert.ok(result.pipes.some((p) => p.name === 'DatePipe'));
      assert.ok(result.pipes.some((p) => p.name === 'CurrencyPipe'));

      // Components
      assert.ok(result.components.some((c) => c.selector === 'app-user-avatar'));
      assert.ok(result.components.some((c) => c.selector === 'mat-button'));
    });

    test('should return empty dependencies for plain HTML', () => {
      const template = '<div><p>Plain text</p></div>';
      const result = analyzer.analyze(template);

      assert.strictEqual(result.directives.length, 0);
      assert.strictEqual(result.pipes.length, 0);
      assert.strictEqual(result.components.length, 0);
    });
  });

  suite('DependencyImportGenerator', () => {
    let generator: DependencyImportGenerator;

    setup(() => {
      generator = new DependencyImportGenerator();
    });

    test('should generate import for single directive', () => {
      const dependencies = {
        directives: [{ name: 'NgIf', module: '@angular/common', isCustom: false }],
        pipes: [],
        components: [],
      };

      const result = generator.generateImports(dependencies);

      assert.ok(result.includes("import { NgIf } from '@angular/common';"));
    });

    test('should generate import for single pipe', () => {
      const dependencies = {
        directives: [],
        pipes: [{ name: 'AsyncPipe', module: '@angular/common', isCustom: false }],
        components: [],
      };

      const result = generator.generateImports(dependencies);

      assert.ok(result.includes("import { AsyncPipe } from '@angular/common';"));
    });

    test('should combine multiple Angular common imports', () => {
      const dependencies = {
        directives: [
          { name: 'NgIf', module: '@angular/common', isCustom: false },
          { name: 'NgFor', module: '@angular/common', isCustom: false },
        ],
        pipes: [
          { name: 'AsyncPipe', module: '@angular/common', isCustom: false },
          { name: 'DatePipe', module: '@angular/common', isCustom: false },
        ],
        components: [],
      };

      const result = generator.generateImports(dependencies);

      assert.ok(result.includes("import {"));
      assert.ok(result.includes("NgIf"));
      assert.ok(result.includes("NgFor"));
      assert.ok(result.includes("AsyncPipe"));
      assert.ok(result.includes("DatePipe"));
      assert.ok(result.includes("} from '@angular/common';"));
    });

    test('should generate imports array for component decorator', () => {
      const dependencies = {
        directives: [{ name: 'NgIf', module: '@angular/common', isCustom: false }],
        pipes: [{ name: 'AsyncPipe', module: '@angular/common', isCustom: false }],
        components: [],
      };

      const result = generator.generateImportsArray(dependencies);

      assert.ok(result.includes('NgIf'));
      assert.ok(result.includes('AsyncPipe'));
      assert.ok(result.startsWith('['));
      assert.ok(result.endsWith(']'));
    });

    test('should return empty array string for no dependencies', () => {
      const dependencies = {
        directives: [],
        pipes: [],
        components: [],
      };

      const result = generator.generateImportsArray(dependencies);

      assert.strictEqual(result, '[]');
    });

    test('should not duplicate imports', () => {
      const dependencies = {
        directives: [
          { name: 'NgIf', module: '@angular/common', isCustom: false },
          { name: 'NgIf', module: '@angular/common', isCustom: false },
        ],
        pipes: [],
        components: [],
      };

      const result = generator.generateImports(dependencies);

      const matches = result.match(/NgIf/g);
      assert.strictEqual(matches?.length, 1);
    });

    test('should return empty string when no imports needed', () => {
      const dependencies = {
        directives: [],
        pipes: [],
        components: [],
      };

      const result = generator.generateImports(dependencies);

      assert.strictEqual(result, '');
    });
  });

  // Edge case tests for improved robustness
  suite('Edge Cases - DirectiveDetector', () => {
    let detector: DirectiveDetector;

    setup(() => {
      detector = new DirectiveDetector();
    });

    test('should ignore directives in HTML comments', () => {
      const template = `
        <!-- Example: *ngIf="condition" -->
        <div>No directives here</div>
      `;
      const result = detector.detectDirectives(template);
      assert.strictEqual(result.length, 0);
    });

    test('should handle multiline attribute syntax', () => {
      const template = `
        <div
          *ngIf="condition"
          [ngClass]="classes">
          Content
        </div>
      `;
      const result = detector.detectDirectives(template);

      assert.ok(result.some((d) => d.name === 'NgIf'));
      assert.ok(result.some((d) => d.name === 'NgClass'));
    });

    test('should detect NgModel with correct module (forms)', () => {
      const template = '<input [(ngModel)]="value" />';
      const result = detector.detectDirectives(template);

      const ngModel = result.find((d) => d.name === 'NgModel');
      assert.ok(ngModel);
      assert.strictEqual(ngModel.module, '@angular/forms');
    });

    test('should handle whitespace variations in attribute brackets', () => {
      const template = '<div [ ngClass ]="classes">Content</div>';
      const result = detector.detectDirectives(template);

      assert.ok(result.some((d) => d.name === 'NgClass'));
    });

    test('should detect ngModelChange event binding', () => {
      const template = '<input [ngModel]="value" (ngModelChange)="onChange($event)" />';
      const result = detector.detectDirectives(template);

      assert.ok(result.some((d) => d.name === 'NgModel'));
    });

    test('should detect NgTemplateOutlet', () => {
      const template = '<ng-container [ngTemplateOutlet]="myTemplate"></ng-container>';
      const result = detector.detectDirectives(template);

      assert.ok(result.some((d) => d.name === 'NgTemplateOutlet'));
    });
  });

  suite('Edge Cases - PipeDetector', () => {
    let detector: PipeDetector;

    setup(() => {
      detector = new PipeDetector();
    });

    test('should NOT detect pipes in logical OR expressions', () => {
      const template = '<div>{{ value || defaultValue }}</div>';
      const result = detector.detectPipes(template);

      // Should not detect "defaultValue" as a pipe
      assert.strictEqual(result.length, 0);
    });

    test('should handle pipes in property bindings', () => {
      const template = '<div [title]="value | uppercase">Content</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'UpperCasePipe'));
    });

    test('should handle pipes in structural directive expressions', () => {
      const template = '<div *ngIf="items$ | async as items">{{ items.length }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'AsyncPipe'));
    });

    test('should ignore pipes in HTML comments', () => {
      const template = `
        <!-- Use: {{ value | date }} -->
        <div>No pipes here</div>
      `;
      const result = detector.detectPipes(template);
      assert.strictEqual(result.length, 0);
    });

    test('should handle complex chained pipes with parameters', () => {
      const template = '<div>{{ date | date:"yyyy-MM-dd" | uppercase | slice:0:4 }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'DatePipe'));
      assert.ok(result.some((p) => p.name === 'UpperCasePipe'));
      assert.ok(result.some((p) => p.name === 'SlicePipe'));
    });

    test('should handle pipes with single quotes around expression', () => {
      const template = "<div [attr.title]='value | json'>Content</div>";
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'JsonPipe'));
    });

    test('should detect titlecase pipe', () => {
      const template = '<div>{{ name | titlecase }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'TitleCasePipe'));
    });

    test('should detect keyvalue pipe', () => {
      const template = '<div *ngFor="let item of map | keyvalue">{{ item.key }}</div>';
      const result = detector.detectPipes(template);

      assert.ok(result.some((p) => p.name === 'KeyValuePipe'));
    });
  });

  suite('Edge Cases - ComponentDetector', () => {
    let detector: ComponentDetector;

    setup(() => {
      detector = new ComponentDetector();
    });

    test('should ignore ng-template', () => {
      const template = '<ng-template #myTemplate>Content</ng-template>';
      const result = detector.detectComponents(template);

      assert.strictEqual(result.length, 0);
    });

    test('should ignore ng-container', () => {
      const template = '<ng-container *ngIf="show">Content</ng-container>';
      const result = detector.detectComponents(template);

      assert.strictEqual(result.length, 0);
    });

    test('should ignore ng-content', () => {
      const template = '<ng-content select="[header]"></ng-content>';
      const result = detector.detectComponents(template);

      assert.strictEqual(result.length, 0);
    });

    test('should ignore SVG elements', () => {
      const template = `
        <svg>
          <path d="M0,0 L10,10"></path>
          <circle cx="5" cy="5" r="3"></circle>
          <rect width="10" height="10"></rect>
        </svg>
      `;
      const result = detector.detectComponents(template);

      assert.strictEqual(result.length, 0);
    });

    test('should ignore components in HTML comments', () => {
      const template = `
        <!-- <app-hidden-component></app-hidden-component> -->
        <div>Plain content</div>
      `;
      const result = detector.detectComponents(template);

      assert.strictEqual(result.length, 0);
    });

    test('should detect PrimeNG components', () => {
      const template = '<p-button label="Click me"></p-button>';
      const result = detector.detectComponents(template);

      assert.ok(result.some((c) => c.selector === 'p-button'));
    });

    test('should detect NG-ZORRO components', () => {
      const template = '<nz-select [(ngModel)]="value"></nz-select>';
      const result = detector.detectComponents(template);

      assert.ok(result.some((c) => c.selector === 'nz-select'));
    });

    test('should detect CDK components', () => {
      const template = '<cdk-virtual-scroll-viewport></cdk-virtual-scroll-viewport>';
      const result = detector.detectComponents(template);

      assert.ok(result.some((c) => c.selector === 'cdk-virtual-scroll-viewport'));
    });

    test('should handle nested components correctly', () => {
      const template = `
        <app-outer>
          <app-inner>
            <app-deepest></app-deepest>
          </app-inner>
        </app-outer>
      `;
      const result = detector.detectComponents(template);

      assert.strictEqual(result.length, 3);
      assert.ok(result.some((c) => c.selector === 'app-outer'));
      assert.ok(result.some((c) => c.selector === 'app-inner'));
      assert.ok(result.some((c) => c.selector === 'app-deepest'));
    });

    test('should handle component with complex multiline attributes', () => {
      const template = `
        <app-complex
          [prop1]="value1"
          [prop2]="value2"
          (event1)="handler1($event)"
          (event2)="handler2($event)"
          #myRef>
          Content
        </app-complex>
      `;
      const result = detector.detectComponents(template);

      assert.ok(result.some((c) => c.selector === 'app-complex'));
    });
  });

  suite('Edge Cases - TemplateDependencyAnalyzer', () => {
    let analyzer: TemplateDependencyAnalyzer;

    setup(() => {
      analyzer = new TemplateDependencyAnalyzer();
    });

    test('should handle empty template', () => {
      const template = '';
      const result = analyzer.analyze(template);

      assert.strictEqual(result.directives.length, 0);
      assert.strictEqual(result.pipes.length, 0);
      assert.strictEqual(result.components.length, 0);
    });

    test('should handle template with only whitespace', () => {
      const template = '   \n\t\n   ';
      const result = analyzer.analyze(template);

      assert.strictEqual(result.directives.length, 0);
      assert.strictEqual(result.pipes.length, 0);
      assert.strictEqual(result.components.length, 0);
    });

    test('should handle template with only comments', () => {
      const template = `
        <!-- Comment 1 -->
        <!--
          Multi-line comment
          with *ngIf="test" | date
        -->
      `;
      const result = analyzer.analyze(template);

      assert.strictEqual(result.directives.length, 0);
      assert.strictEqual(result.pipes.length, 0);
      assert.strictEqual(result.components.length, 0);
    });

    test('should handle extremely nested template', () => {
      const template = `
        <div *ngIf="level1">
          <div *ngIf="level2">
            <div *ngIf="level3">
              <div *ngIf="level4">
                <div *ngIf="level5">
                  {{ value | uppercase | lowercase }}
                  <app-deep-component></app-deep-component>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      const result = analyzer.analyze(template);

      // Should only detect NgIf once despite multiple uses
      const ngIfCount = result.directives.filter((d) => d.name === 'NgIf').length;
      assert.strictEqual(ngIfCount, 1);

      // Should detect both pipes
      assert.ok(result.pipes.some((p) => p.name === 'UpperCasePipe'));
      assert.ok(result.pipes.some((p) => p.name === 'LowerCasePipe'));

      // Should detect the component
      assert.ok(result.components.some((c) => c.selector === 'app-deep-component'));
    });

    test('should handle mixed single and double quotes', () => {
      const template = `
        <div *ngIf='show'>
          <span [title]="tooltip | uppercase">{{ value | date:'short' }}</span>
        </div>
      `;
      const result = analyzer.analyze(template);

      assert.ok(result.directives.some((d) => d.name === 'NgIf'));
      assert.ok(result.pipes.some((p) => p.name === 'UpperCasePipe'));
      assert.ok(result.pipes.some((p) => p.name === 'DatePipe'));
    });
  });
});
