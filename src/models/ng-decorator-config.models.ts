// All these picked from sources of Ng16.2.0

/**
 * Supplies configuration metadata for an Angular component.
 *
 * @publicApi
 */
export declare interface Component extends Directive {
  /**
   * The change-detection strategy to use for this component.
   *
   * When a component is instantiated, Angular creates a change detector,
   * which is responsible for propagating the component's bindings.
   * The strategy is one of:
   * - `ChangeDetectionStrategy#OnPush` sets the strategy to `CheckOnce` (on demand).
   * - `ChangeDetectionStrategy#Default` sets the strategy to `CheckAlways`.
   */
  changeDetection?: ChangeDetectionStrategy;
  /**
   * Defines the set of injectable objects that are visible to its view DOM children.
   * See [example](#injecting-a-class-with-a-view-provider).
   *
   */
  viewProviders?: Provider[];
  /**
   * The module ID of the module that contains the component.
   * The component must be able to resolve relative URLs for templates and styles.
   * SystemJS exposes the `__moduleName` variable within each module.
   * In CommonJS, this can  be set to `module.id`.
   *
   * @deprecated This option does not have any effect. Will be removed in Angular v17.
   */
  moduleId?: string;
  /**
   * The relative path or absolute URL of a template file for an Angular component.
   * If provided, do not supply an inline template using `template`.
   *
   */
  templateUrl?: string;
  /**
   * An inline template for an Angular component. If provided,
   * do not supply a template file using `templateUrl`.
   *
   */
  template?: string;
  /**
   * One or more relative paths or absolute URLs for files containing CSS stylesheets to use
   * in this component.
   */
  styleUrls?: string[];
  /**
   * One or more inline CSS stylesheets to use
   * in this component.
   */
  styles?: string[];
  /**
   * One or more animation `trigger()` calls, containing
   * [`state()`](api/animations/state) and `transition()` definitions.
   * See the [Animations guide](/guide/animations) and animations API documentation.
   *
   */
  animations?: any[];
  /**
   * An encapsulation policy for the component's styling.
   * Possible values:
   * - `ViewEncapsulation.Emulated`: Apply modified component styles in order to emulate
   *                                 a native Shadow DOM CSS encapsulation behavior.
   * - `ViewEncapsulation.None`: Apply component styles globally without any sort of encapsulation.
   * - `ViewEncapsulation.ShadowDom`: Use the browser's native Shadow DOM API to encapsulate styles.
   *
   * If not supplied, the value is taken from the `CompilerOptions`
   * which defaults to `ViewEncapsulation.Emulated`.
   *
   * If the policy is `ViewEncapsulation.Emulated` and the component has no
   * {@link Component#styles styles} nor {@link Component#styleUrls styleUrls},
   * the policy is automatically switched to `ViewEncapsulation.None`.
   */
  encapsulation?: ViewEncapsulation;
  /**
   * Overrides the default interpolation start and end delimiters (`{{` and `}}`).
   */
  interpolation?: [string, string];
  /**
   * True to preserve or false to remove potentially superfluous whitespace characters
   * from the compiled template. Whitespace characters are those matching the `\s`
   * character class in JavaScript regular expressions. Default is false, unless
   * overridden in compiler options.
   */
  preserveWhitespaces?: boolean;
  /**
   * Angular components marked as `standalone` do not need to be declared in an NgModule. Such
   * components directly manage their own template dependencies (components, directives, and pipes
   * used in a template) via the imports property.
   *
   * More information about standalone components, directives, and pipes can be found in [this
   * guide](guide/standalone-components).
   */
  standalone?: boolean;
  /**
   * The imports property specifies the standalone component's template dependencies — those
   * directives, components, and pipes that can be used within its template. Standalone components
   * can import other standalone components, directives, and pipes as well as existing NgModules.
   *
   * This property is only available for standalone components - specifying it for components
   * declared in an NgModule generates a compilation error.
   *
   * More information about standalone components, directives, and pipes can be found in [this
   * guide](guide/standalone-components).
   */
  imports?: (Type<any> | ReadonlyArray<any>)[];
  /**
   * The set of schemas that declare elements to be allowed in a standalone component. Elements and
   * properties that are neither Angular components nor directives must be declared in a schema.
   *
   * This property is only available for standalone components - specifying it for components
   * declared in an NgModule generates a compilation error.
   *
   * More information about standalone components, directives, and pipes can be found in [this
   * guide](guide/standalone-components).
   */
  schemas?: SchemaMetadata[];
}

/**
 * Directive decorator and metadata.
 *
 * @Annotation
 * @publicApi
 */
export declare interface Directive {
  /**
   * The CSS selector that identifies this directive in a template
   * and triggers instantiation of the directive.
   *
   * Declare as one of the following:
   *
   * - `element-name`: Select by element name.
   * - `.class`: Select by class name.
   * - `[attribute]`: Select by attribute name.
   * - `[attribute=value]`: Select by attribute name and value.
   * - `:not(sub_selector)`: Select only if the element does not match the `sub_selector`.
   * - `selector1, selector2`: Select if either `selector1` or `selector2` matches.
   *
   * Angular only allows directives to apply on CSS selectors that do not cross
   * element boundaries.
   *
   * For the following template HTML, a directive with an `input[type=text]` selector,
   * would be instantiated only on the `<input type="text">` element.
   *
   * ```html
   * <form>
   *   <input type="text">
   *   <input type="radio">
   * <form>
   * ```
   *
   */
  selector?: string;
  /**
   * Enumerates the set of data-bound input properties for a directive
   *
   * Angular automatically updates input properties during change detection.
   * The `inputs` property accepts either strings or object literals that configure the directive
   * properties that should be exposed as inputs.
   *
   * When an object literal is passed in, the `name` property indicates which property on the
   * class the input should write to, while the `alias` determines the name under
   * which the input will be available in template bindings. The `required` property indicates that
   * the input is required which will trigger a compile-time error if it isn't passed in when the
   * directive is used.
   *
   * When a string is passed into the `inputs` array, it can have a format of `'name'` or
   * `'name: alias'` where `name` is the property on the class that the directive should write
   * to, while the `alias` determines the name under which the input will be available in
   * template bindings. String-based input definitions are assumed to be optional.
   *
   * @usageNotes
   *
   * The following example creates a component with two data-bound properties.
   *
   * ```typescript
   * @Component({
   *   selector: 'bank-account',
   *   inputs: ['bankName', {name: 'id', alias: 'account-id'}],
   *   template: `
   *     Bank Name: {{bankName}}
   *     Account Id: {{id}}
   *   `
   * })
   * class BankAccount {
   *   bankName: string;
   *   id: string;
   * }
   * ```
   *
   */
  inputs?: (
    | {
        name: string;
        alias?: string;
        required?: boolean;
        transform?: (value: any) => any;
      }
    | string
  )[];
  /**
   * Enumerates the set of event-bound output properties.
   *
   * When an output property emits an event, an event handler attached to that event
   * in the template is invoked.
   *
   * The `outputs` property defines a set of `directiveProperty` to `alias`
   * configuration:
   *
   * - `directiveProperty` specifies the component property that emits events.
   * - `alias` specifies the DOM property the event handler is attached to.
   *
   * @usageNotes
   *
   * ```typescript
   * @Component({
   *   selector: 'child-dir',
   *   outputs: [ 'bankNameChange' ],
   *   template: `<input (input)="bankNameChange.emit($event.target.value)" />`
   * })
   * class ChildDir {
   *  bankNameChange: EventEmitter<string> = new EventEmitter<string>();
   * }
   *
   * @Component({
   *   selector: 'main',
   *   template: `
   *     {{ bankName }} <child-dir (bankNameChange)="onBankNameChange($event)"></child-dir>
   *   `
   * })
   * class MainComponent {
   *  bankName: string;
   *
   *   onBankNameChange(bankName: string) {
   *     this.bankName = bankName;
   *   }
   * }
   * ```
   *
   */
  outputs?: string[];
  /**
   * Configures the [injector](guide/glossary#injector) of this
   * directive or component with a [token](guide/glossary#di-token)
   * that maps to a [provider](guide/glossary#provider) of a dependency.
   */
  providers?: Provider[];
  /**
   * Defines the name that can be used in the template to assign this directive to a variable.
   *
   * @usageNotes
   *
   * ```ts
   * @Directive({
   *   selector: 'child-dir',
   *   exportAs: 'child'
   * })
   * class ChildDir {
   * }
   *
   * @Component({
   *   selector: 'main',
   *   template: `<child-dir #c="child"></child-dir>`
   * })
   * class MainComponent {
   * }
   * ```
   *
   */
  exportAs?: string;
  /**
   * Configures the queries that will be injected into the directive.
   *
   * Content queries are set before the `ngAfterContentInit` callback is called.
   * View queries are set before the `ngAfterViewInit` callback is called.
   *
   * @usageNotes
   *
   * The following example shows how queries are defined
   * and when their results are available in lifecycle hooks:
   *
   * ```ts
   * @Component({
   *   selector: 'someDir',
   *   queries: {
   *     contentChildren: new ContentChildren(ChildDirective),
   *     viewChildren: new ViewChildren(ChildDirective)
   *   },
   *   template: '<child-directive></child-directive>'
   * })
   * class SomeDir {
   *   contentChildren: QueryList<ChildDirective>,
   *   viewChildren: QueryList<ChildDirective>
   *
   *   ngAfterContentInit() {
   *     // contentChildren is set
   *   }
   *
   *   ngAfterViewInit() {
   *     // viewChildren is set
   *   }
   * }
   * ```
   *
   * @Annotation
   */
  queries?: {
    [key: string]: any;
  };
  /**
   * Maps class properties to host element bindings for properties,
   * attributes, and events, using a set of key-value pairs.
   *
   * Angular automatically checks host property bindings during change detection.
   * If a binding changes, Angular updates the directive's host element.
   *
   * When the key is a property of the host element, the property value is
   * propagated to the specified DOM property.
   *
   * When the key is a static attribute in the DOM, the attribute value
   * is propagated to the specified property in the host element.
   *
   * For event handling:
   * - The key is the DOM event that the directive listens to.
   * To listen to global events, add the target to the event name.
   * The target can be `window`, `document` or `body`.
   * - The value is the statement to execute when the event occurs. If the
   * statement evaluates to `false`, then `preventDefault` is applied on the DOM
   * event. A handler method can refer to the `$event` local variable.
   *
   */
  host?: {
    [key: string]: string;
  };
  /**
   * When present, this directive/component is ignored by the AOT compiler.
   * It remains in distributed code, and the JIT compiler attempts to compile it
   * at run time, in the browser.
   * To ensure the correct behavior, the app must import `@angular/compiler`.
   */
  jit?: true;
  /**
   * Angular directives marked as `standalone` do not need to be declared in an NgModule. Such
   * directives don't depend on any "intermediate context" of an NgModule (ex. configured
   * providers).
   *
   * More information about standalone components, directives, and pipes can be found in [this
   * guide](guide/standalone-components).
   */
  standalone?: boolean;
  /**
   * Standalone directives that should be applied to the host whenever the directive is matched.
   * By default, none of the inputs or outputs of the host directives will be available on the host,
   * unless they are specified in the `inputs` or `outputs` properties.
   *
   * You can additionally alias inputs and outputs by putting a colon and the alias after the
   * original input or output name. For example, if a directive applied via `hostDirectives`
   * defines an input named `menuDisabled`, you can alias this to `disabled` by adding
   * `'menuDisabled: disabled'` as an entry to `inputs`.
   */
  hostDirectives?: (
    | Type<unknown>
    | {
        directive: Type<unknown>;
        inputs?: string[];
        outputs?: string[];
      }
  )[];
}

/**
 * The strategy that the default change detector uses to detect changes.
 * When set, takes effect the next time change detection is triggered.
 *
 * @see {@link ChangeDetectorRef#usage-notes Change detection usage}
 *
 * @publicApi
 */
export enum ChangeDetectionStrategy {
  /**
   * Use the `CheckOnce` strategy, meaning that automatic change detection is deactivated
   * until reactivated by setting the strategy to `Default` (`CheckAlways`).
   * Change detection can still be explicitly invoked.
   * This strategy applies to all child directives and cannot be overridden.
   */
  OnPush = 'OnPush',
  /**
   * Use the default `CheckAlways` strategy, in which change detection is automatic until
   * explicitly deactivated.
   */
  Default = 'Default',
}

/**
 * Describes how the `Injector` should be configured.
 * @see ["Dependency Injection Guide"](guide/dependency-injection).
 *
 * @see {@link StaticProvider}
 *
 * @publicApi
 */
export declare type Provider = Type<any> | any[];

export declare interface Type<T> extends Function {
  new (...args: any[]): T;
}

/**
 * Defines the CSS styles encapsulation policies for the {@link Component} decorator's
 * `encapsulation` option.
 *
 * See {@link Component#encapsulation encapsulation}.
 *
 * @usageNotes
 * ### Example
 *
 * {@example core/ts/metadata/encapsulation.ts region='longform'}
 *
 * @publicApi
 */
export declare enum ViewEncapsulation {
  /**
   * Emulates a native Shadow DOM encapsulation behavior by adding a specific attribute to the
   * component's host element and applying the same attribute to all the CSS selectors provided
   * via {@link Component#styles styles} or {@link Component#styleUrls styleUrls}.
   *
   * This is the default option.
   */
  Emulated = 0,
  /**
   * Doesn't provide any sort of CSS style encapsulation, meaning that all the styles provided
   * via {@link Component#styles styles} or {@link Component#styleUrls styleUrls} are applicable
   * to any HTML element of the application regardless of their host Component.
   */
  None = 2,
  /**
   * Uses the browser's native Shadow DOM API to encapsulate CSS styles, meaning that it creates
   * a ShadowRoot for the component's host element which is then used to encapsulate
   * all the Component's styling.
   */
  ShadowDom = 3,
}

/**
 * A schema definition associated with an NgModule.
 *
 * @see {@link NgModule}
 * @see {@link CUSTOM_ELEMENTS_SCHEMA}
 * @see {@link NO_ERRORS_SCHEMA}
 *
 * @param name The name of a defined schema.
 *
 * @publicApi
 */
export declare interface SchemaMetadata {
  name: string;
}
