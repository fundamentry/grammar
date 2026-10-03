import { type Equatable, type Stringable } from '@fundamentry/trait';

import { type Node } from './Node.js';
import { Sequence } from './Sequence.js';

export class Repetition<out A extends Node>
  implements Equatable<unknown>, Stringable
{
  readonly #sequence: Sequence<readonly A[]>;

  constructor(elements: readonly A[]) {
    this.#sequence = new Sequence(elements);
  }

  static [Symbol.hasInstance]<S extends Repetition<Node>>(
    this: abstract new (...args: never) => S,
    value: unknown
  ): value is S {
    return (
      value instanceof Object &&
      #sequence in value &&
      Function.prototype[Symbol.hasInstance].call(this, value)
    );
  }

  elements(): readonly A[] {
    return this.#sequence.elements();
  }

  equals(other: unknown): boolean {
    return (
      other instanceof Repetition && this.#sequence.equals(other.#sequence)
    );
  }

  toString(): string {
    return this.#sequence.toString();
  }
}
