import { DirectiveDetector, DetectedDirective } from './directive-detector';
import { PipeDetector, DetectedPipe } from './pipe-detector';
import { ComponentDetector, DetectedComponent } from './component-detector';

export interface TemplateDependencies {
  directives: DetectedDirective[];
  pipes: DetectedPipe[];
  components: DetectedComponent[];
}

export class TemplateDependencyAnalyzer {
  private directiveDetector: DirectiveDetector;
  private pipeDetector: PipeDetector;
  private componentDetector: ComponentDetector;

  constructor() {
    this.directiveDetector = new DirectiveDetector();
    this.pipeDetector = new PipeDetector();
    this.componentDetector = new ComponentDetector();
  }

  analyze(template: string): TemplateDependencies {
    return {
      directives: this.directiveDetector.detectDirectives(template),
      pipes: this.pipeDetector.detectPipes(template),
      components: this.componentDetector.detectComponents(template),
    };
  }
}
