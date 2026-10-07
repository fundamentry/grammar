import { Lens, Morphism } from '@fundamentry/category';

import { Node } from './Node.js';
import { Sequence } from './Sequence.js';

export class Repetition<out A extends Node> extends Node {
  readonly #sequence: Sequence<readonly A[]>;

  constructor(elements: readonly A[]) {
    super();

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

  static elements<A extends Node>(): Lens<Repetition<A>, readonly A[]> {
    return Lens.of(
      Morphism.of((repetition: Repetition<A>) =>
        repetition.#sequence.elements()
      ),
      Morphism.of(
        ([, elements]: readonly [Repetition<A>, readonly A[]]) =>
          new Repetition(elements)
      )
    );
  }

  override map(transform: Node.Transform): Repetition<A> {
    return new Repetition(this.elements().map(transform));
  }

  elements(): readonly A[] {
    return this.#sequence.elements();
  }

  override children(): readonly A[] {
    return this.elements();
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Repetition && this.#sequence.equals(other.#sequence)
    );
  }

  override toString(): string {
    return this.#sequence.toString();
  }
}
