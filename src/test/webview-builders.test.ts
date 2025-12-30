import * as assert from 'assert';
import { WebviewHtmlBuilder, HtmlEscaper } from '../preview/webview-builders/html-builder';
import { WebviewStyleBuilder } from '../preview/webview-builders/style-builder';
import { WebviewScriptBuilder } from '../preview/webview-builders/script-builder';
import { PreviewState } from '../preview/preview-state-manager';

suite('Webview Builders Test Suite', () => {
  suite('HtmlEscaper', () => {
    suite('escape', () => {
      test('should escape ampersand', () => {
        assert.strictEqual(HtmlEscaper.escape('a & b'), 'a &amp; b');
      });

      test('should escape less than', () => {
        assert.strictEqual(HtmlEscaper.escape('<div>'), '&lt;div&gt;');
      });

      test('should escape greater than', () => {
        assert.strictEqual(HtmlEscaper.escape('a > b'), 'a &gt; b');
      });

      test('should escape double quotes', () => {
        assert.strictEqual(HtmlEscaper.escape('"hello"'), '&quot;hello&quot;');
      });

      test('should escape single quotes', () => {
        assert.strictEqual(HtmlEscaper.escape("'hello'"), '&#039;hello&#039;');
      });

      test('should escape multiple special characters', () => {
        const input = '<script>alert("xss")</script>';
        const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
        assert.strictEqual(HtmlEscaper.escape(input), expected);
      });

      test('should handle empty string', () => {
        assert.strictEqual(HtmlEscaper.escape(''), '');
      });

      test('should handle string without special characters', () => {
        assert.strictEqual(HtmlEscaper.escape('hello world'), 'hello world');
      });

      test('should escape all occurrences', () => {
        assert.strictEqual(HtmlEscaper.escape('a & b & c'), 'a &amp; b &amp; c');
      });
    });

    suite('escapeAttribute', () => {
      test('should escape all basic HTML characters', () => {
        const input = '<"&>';
        assert.ok(HtmlEscaper.escapeAttribute(input).includes('&lt;'));
        assert.ok(HtmlEscaper.escapeAttribute(input).includes('&quot;'));
        assert.ok(HtmlEscaper.escapeAttribute(input).includes('&amp;'));
        assert.ok(HtmlEscaper.escapeAttribute(input).includes('&gt;'));
      });

      test('should escape backticks', () => {
        assert.strictEqual(HtmlEscaper.escapeAttribute('`code`'), '&#96;code&#96;');
      });

      test('should escape forward slashes', () => {
        assert.strictEqual(HtmlEscaper.escapeAttribute('/path/to'), '&#47;path&#47;to');
      });

      test('should handle attribute injection attempt', () => {
        const input = '" onclick="alert(1)"';
        const escaped = HtmlEscaper.escapeAttribute(input);
        assert.ok(!escaped.includes('" onclick'));
      });
    });
  });

  suite('WebviewStyleBuilder', () => {
    let builder: WebviewStyleBuilder;

    setup(() => {
      builder = new WebviewStyleBuilder();
    });

    test('should generate CSS string', () => {
      const css = builder.build();
      assert.ok(typeof css === 'string');
      assert.ok(css.length > 0);
    });

    test('should include body styles', () => {
      const css = builder.build();
      assert.ok(css.includes('body'));
      assert.ok(css.includes('font-family'));
    });

    test('should include header styles', () => {
      const css = builder.build();
      assert.ok(css.includes('.header'));
    });

    test('should include button styles', () => {
      const css = builder.build();
      assert.ok(css.includes('button'));
      assert.ok(css.includes('.secondary'));
    });

    test('should include section styles', () => {
      const css = builder.build();
      assert.ok(css.includes('.section'));
      assert.ok(css.includes('.section-title'));
    });

    test('should include input styles', () => {
      const css = builder.build();
      assert.ok(css.includes('.component-name-input'));
    });

    test('should include property styles', () => {
      const css = builder.build();
      assert.ok(css.includes('.property-list'));
      assert.ok(css.includes('.property-item'));
      assert.ok(css.includes('.property-checkbox'));
      assert.ok(css.includes('.property-name'));
      assert.ok(css.includes('.property-type'));
    });

    test('should include confidence badge styles', () => {
      const css = builder.build();
      assert.ok(css.includes('.confidence-badge'));
      assert.ok(css.includes('.confidence-high'));
      assert.ok(css.includes('.confidence-medium'));
      assert.ok(css.includes('.confidence-low'));
    });

    test('should include lifecycle hook styles', () => {
      const css = builder.build();
      assert.ok(css.includes('.lifecycle-hooks'));
      assert.ok(css.includes('.hook-item'));
    });

    test('should include file preview styles', () => {
      const css = builder.build();
      assert.ok(css.includes('.file-preview'));
      assert.ok(css.includes('.file-tabs'));
      assert.ok(css.includes('.file-tab'));
      assert.ok(css.includes('.file-content'));
    });

    test('should include service styles', () => {
      const css = builder.build();
      assert.ok(css.includes('.service-input'));
      assert.ok(css.includes('.service-list'));
      assert.ok(css.includes('.service-item'));
    });

    test('should use VSCode theme variables', () => {
      const css = builder.build();
      assert.ok(css.includes('var(--vscode-'));
    });
  });

  suite('WebviewScriptBuilder', () => {
    let builder: WebviewScriptBuilder;

    setup(() => {
      builder = new WebviewScriptBuilder();
    });

    test('should generate JavaScript string', () => {
      const js = builder.build();
      assert.ok(typeof js === 'string');
      assert.ok(js.length > 0);
    });

    test('should initialize vscode API', () => {
      const js = builder.build();
      assert.ok(js.includes('acquireVsCodeApi()'));
    });

    test('should include confirm function', () => {
      const js = builder.build();
      assert.ok(js.includes('function confirm()'));
      assert.ok(js.includes("command: 'confirm'"));
    });

    test('should include cancel function', () => {
      const js = builder.build();
      assert.ok(js.includes('function cancel()'));
      assert.ok(js.includes("command: 'cancel'"));
    });

    test('should include updateComponentName function', () => {
      const js = builder.build();
      assert.ok(js.includes('function updateComponentName'));
      assert.ok(js.includes("command: 'updateComponentName'"));
    });

    test('should include toggleProperty function', () => {
      const js = builder.build();
      assert.ok(js.includes('function toggleProperty'));
      assert.ok(js.includes("command: 'toggleProperty'"));
    });

    test('should include updatePropertyType function', () => {
      const js = builder.build();
      assert.ok(js.includes('function updatePropertyType'));
      assert.ok(js.includes("command: 'updatePropertyType'"));
    });

    test('should include toggleLifecycleHook function', () => {
      const js = builder.build();
      assert.ok(js.includes('function toggleLifecycleHook'));
      assert.ok(js.includes("command: 'toggleLifecycleHook'"));
    });

    test('should include showFile function', () => {
      const js = builder.build();
      assert.ok(js.includes('function showFile'));
      assert.ok(js.includes("'file-content-ts'"));
      assert.ok(js.includes("'file-content-html'"));
      assert.ok(js.includes("'file-content-scss'"));
    });

    test('should include message listener', () => {
      const js = builder.build();
      assert.ok(js.includes("window.addEventListener('message'"));
      assert.ok(js.includes("case 'updateState'"));
      assert.ok(js.includes("case 'validationError'"));
    });

    test('should use postMessage for communication', () => {
      const js = builder.build();
      assert.ok(js.includes('vscode.postMessage'));
    });
  });

  suite('WebviewHtmlBuilder', () => {
    function createMinimalState(): PreviewState {
      return {
        componentName: 'test-component',
        template: '<div>Test</div>',
        inputs: [],
        outputs: [],
        models: [],
        imports: [],
        filesToCreate: [
          { path: '/test/test.component.ts', content: 'export class TestComponent {}', language: 'typescript' },
          { path: '/test/test.component.html', content: '<div>Test</div>', language: 'html' },
          { path: '/test/test.component.scss', content: '', language: 'scss' },
        ],
        filesToModify: [],
        lifecycleHooks: [],
        services: [],
      };
    }

    function createStateWithProperties(): PreviewState {
      return {
        ...createMinimalState(),
        inputs: [
          { name: 'userName', type: 'string', isRequired: true, inferenceConfidence: 'high', enabled: true },
          { name: 'userAge', type: 'number', isRequired: false, inferenceConfidence: 'medium', enabled: false },
        ],
        outputs: [
          { name: 'userClick', type: 'MouseEvent', inferenceConfidence: 'high', enabled: true },
        ],
        models: [
          { name: 'selectedItem', type: 'unknown', isRequired: true, inferenceConfidence: 'low', enabled: true },
        ],
        lifecycleHooks: ['ngOnInit', 'ngOnDestroy'],
      };
    }

    test('should build complete HTML document', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('<html lang="en">'));
      assert.ok(html.includes('<head>'));
      assert.ok(html.includes('<body>'));
      assert.ok(html.includes('</html>'));
    });

    test('should include CSS styles', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(html.includes('<style>'));
      assert.ok(html.includes('</style>'));
    });

    test('should include JavaScript', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(html.includes('<script>'));
      assert.ok(html.includes('</script>'));
    });

    test('should include header with title and buttons', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(html.includes('class="header"'));
      assert.ok(html.includes('Component Preview'));
      assert.ok(html.includes('Cancel'));
      assert.ok(html.includes('Generate Component'));
    });

    test('should include component name input', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(html.includes('class="component-name-input"'));
      assert.ok(html.includes('test-component'));
      assert.ok(html.includes('updateComponentName'));
    });

    test('should escape component name in attribute', () => {
      const state = createMinimalState();
      state.componentName = '<script>alert("xss")</script>';
      const builder = new WebviewHtmlBuilder({ state });
      const html = builder.build();

      assert.ok(!html.includes('<script>alert("xss")</script>'));
      assert.ok(html.includes('&lt;script&gt;'));
    });

    test('should render inputs section when inputs exist', () => {
      const builder = new WebviewHtmlBuilder({ state: createStateWithProperties() });
      const html = builder.build();

      assert.ok(html.includes('Inputs (1/2)'));
      assert.ok(html.includes('userName'));
      assert.ok(html.includes('userAge'));
    });

    test('should not render inputs section when empty', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(!html.includes('Inputs ('));
    });

    test('should render outputs section when outputs exist', () => {
      const builder = new WebviewHtmlBuilder({ state: createStateWithProperties() });
      const html = builder.build();

      assert.ok(html.includes('Outputs (1/1)'));
      assert.ok(html.includes('userClick'));
    });

    test('should not render outputs section when empty', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(!html.includes('Outputs ('));
    });

    test('should render models section when models exist', () => {
      const builder = new WebviewHtmlBuilder({ state: createStateWithProperties() });
      const html = builder.build();

      assert.ok(html.includes('Two-Way Bindings (1/1)'));
      assert.ok(html.includes('selectedItem'));
    });

    test('should not render models section when empty', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(!html.includes('Two-Way Bindings ('));
    });

    test('should render confidence badges', () => {
      const builder = new WebviewHtmlBuilder({ state: createStateWithProperties() });
      const html = builder.build();

      assert.ok(html.includes('confidence-high'));
      assert.ok(html.includes('confidence-medium'));
      assert.ok(html.includes('confidence-low'));
    });

    test('should render disabled properties correctly', () => {
      const builder = new WebviewHtmlBuilder({ state: createStateWithProperties() });
      const html = builder.build();

      // userAge is disabled
      assert.ok(html.includes('class="property-item disabled"'));
    });

    test('should render lifecycle hooks section', () => {
      const builder = new WebviewHtmlBuilder({ state: createStateWithProperties() });
      const html = builder.build();

      assert.ok(html.includes('Lifecycle Hooks'));
      assert.ok(html.includes('ngOnInit'));
      assert.ok(html.includes('ngOnDestroy'));
    });

    test('should check selected lifecycle hooks', () => {
      const builder = new WebviewHtmlBuilder({ state: createStateWithProperties() });
      const html = builder.build();

      // ngOnInit and ngOnDestroy should be checked
      assert.ok(html.includes('id="hook-ngOnInit"'));
      // The checked attribute should appear for selected hooks (after the id attribute)
      const ngOnInitStart = html.indexOf('id="hook-ngOnInit"');
      const ngOnInitSection = html.substring(
        ngOnInitStart,
        ngOnInitStart + 100
      );
      assert.ok(ngOnInitSection.includes('checked'));
    });

    test('should render file preview tabs', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(html.includes('TypeScript'));
      assert.ok(html.includes('HTML'));
      assert.ok(html.includes('SCSS'));
      assert.ok(html.includes("onclick=\"showFile('ts')\""));
      assert.ok(html.includes("onclick=\"showFile('html')\""));
      assert.ok(html.includes("onclick=\"showFile('scss')\""));
    });

    test('should render file contents', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(html.includes('id="file-content-ts"'));
      assert.ok(html.includes('id="file-content-html"'));
      assert.ok(html.includes('id="file-content-scss"'));
    });

    test('should escape file content for XSS protection', () => {
      const state = createMinimalState();
      state.filesToCreate[0].content = '<script>alert("xss")</script>';
      const builder = new WebviewHtmlBuilder({ state });
      const html = builder.build();

      // Content should be escaped
      assert.ok(html.includes('&lt;script&gt;'));
      assert.ok(!html.match(/<script>alert\("xss"\)<\/script>/));
    });

    test('should handle empty SCSS file', () => {
      const builder = new WebviewHtmlBuilder({ state: createMinimalState() });
      const html = builder.build();

      assert.ok(html.includes('&lt;empty file&gt;'));
    });
  });
});
