export interface LifecycleHook {
  name: string;
  interface: string;
  description: string;
}

export const AVAILABLE_LIFECYCLE_HOOKS: LifecycleHook[] = [
  {
    name: 'ngOnInit',
    interface: 'OnInit',
    description: 'Called once after component initialization'
  },
  {
    name: 'ngOnDestroy',
    interface: 'OnDestroy',
    description: 'Called before component is destroyed'
  },
  {
    name: 'ngOnChanges',
    interface: 'OnChanges',
    description: 'Called when input properties change'
  },
  {
    name: 'ngAfterViewInit',
    interface: 'AfterViewInit',
    description: 'Called after view initialization'
  },
  {
    name: 'ngAfterContentInit',
    interface: 'AfterContentInit',
    description: 'Called after content initialization'
  },
  {
    name: 'ngAfterViewChecked',
    interface: 'AfterViewChecked',
    description: 'Called after every check of the view'
  },
  {
    name: 'ngAfterContentChecked',
    interface: 'AfterContentChecked',
    description: 'Called after every check of projected content'
  },
  {
    name: 'ngDoCheck',
    interface: 'DoCheck',
    description: 'Called during every change detection run'
  }
];

export function generateLifecycleHookImports(selectedHooks: string[]): string {
  const hooks = AVAILABLE_LIFECYCLE_HOOKS.filter(h => selectedHooks.includes(h.name));
  if (hooks.length === 0) {
    return '';
  }

  const interfaces = hooks.map(h => h.interface);
  return interfaces.join(', ');
}

export function generateLifecycleHookImplements(selectedHooks: string[]): string {
  const hooks = AVAILABLE_LIFECYCLE_HOOKS.filter(h => selectedHooks.includes(h.name));
  if (hooks.length === 0) {
    return '';
  }

  const interfaces = hooks.map(h => h.interface);
  return `implements ${interfaces.join(', ')}`;
}

export function generateLifecycleHookMethods(selectedHooks: string[]): string {
  const hooks = AVAILABLE_LIFECYCLE_HOOKS.filter(h => selectedHooks.includes(h.name));
  if (hooks.length === 0) {
    return '';
  }

  const methods = hooks.map(hook => {
    if (hook.name === 'ngOnChanges') {
      return `\t${hook.name}(changes: SimpleChanges): void {\n\t\t// TODO: Implement ${hook.name}\n\t}`;
    }
    return `\t${hook.name}(): void {\n\t\t// TODO: Implement ${hook.name}\n\t}`;
  });

  return methods.join('\n\n\t');
}
