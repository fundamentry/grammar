import { type Equatable, type Stringable } from '@fundamentry/trait';

import { type Node } from './Node.js';

export class Sequence<out T extends readonly Node[]>
  implements Equatable<unknown>, Stringable
{
  readonly #elements: T;

  constructor(elements: T) {
    this.#elements = Object.freeze(elements);
  }

  static [Symbol.hasInstance](
    value: unknown
  ): value is Sequence<readonly Node[]> {
    return value instanceof Object && #elements in value;
  }

  elements(): T {
    return this.#elements;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof Sequence &&
      this.#elements.length === other.#elements.length &&
      this.#elements.every((node, index) => node.equals(other.#elements[index]))
    );
  }

  toString(): string {
    return this.#elements.join('');
  }
}
