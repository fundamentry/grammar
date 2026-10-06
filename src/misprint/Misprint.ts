import { Data } from '#project/data';

export namespace Misprint {
  export type Step =
    | {
        readonly node: 'sequence' | 'choice' | 'repetition';
        readonly index: number;
      }
    | { readonly node: 'option' | 'label' }
    | { readonly node: 'rule'; readonly name: string };
}

export class Misprint extends Data {
  readonly #path: readonly Misprint.Step[];

  readonly #message: string;

  constructor(path: readonly Misprint.Step[], message: string) {
    super();

    this.#path = path;
    this.#message = message;
  }

  path(): readonly Misprint.Step[] {
    return this.#path;
  }

  message(): string {
    return this.#message;
  }

  override equals(other: unknown): boolean {
    return other instanceof Misprint && this.toString() === other.toString();
  }

  override toString(): string {
    if (this.#path.length === 0) return this.#message;

    const steps = this.#path.map(step => {
      if ('index' in step) return `${step.node}[${String(step.index)}]`;
      if ('name' in step) return step.name;

      return step.node;
    });

    return `at /${steps.join('/')}: ${this.#message}`;
  }
}
