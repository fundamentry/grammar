import {
  FallibleMorphism,
  Lens,
  Morphism,
  Optional,
} from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';

import { Node } from './Node.js';
import { Sequence } from './Sequence.js';

export class Repetition<
  out A extends Node,
  out S extends Node = never,
> extends Node {
  readonly #sequence: Sequence<readonly A[]>;

  readonly #separators: Sequence<readonly S[]>;

  constructor(elements: readonly A[], separators: readonly S[] = []) {
    super();

    this.#sequence = new Sequence(elements);
    this.#separators = new Sequence(separators);
  }

  static [Symbol.hasInstance]<S extends Repetition<Node, Node>>(
    this: abstract new (...args: never) => S,
    value: unknown
  ): value is S {
    return (
      value instanceof Object &&
      #sequence in value &&
      Function.prototype[Symbol.hasInstance].call(this, value)
    );
  }

  static elements<A extends Node, S extends Node = never>(): Lens<
    Repetition<A, S>,
    readonly A[]
  > {
    return Lens.of(
      Morphism.of((repetition: Repetition<A, S>) =>
        repetition.#sequence.elements()
      ),
      Morphism.of(
        ([repetition, elements]: readonly [Repetition<A, S>, readonly A[]]) =>
          new Repetition(
            elements,
            repetition.separators().slice(0, Math.max(elements.length - 1, 0))
          )
      )
    );
  }

  static at<A extends Node, S extends Node = never>(
    index: number
  ): Optional<Repetition<A, S>, A, undefined> {
    return Optional.of(
      FallibleMorphism.of(repetition => {
        const element = repetition.elements().at(index);

        return element ? new Success(element) : new Failure(undefined);
      }),
      Morphism.of(update =>
        Morphism.of(repetition => {
          const element = repetition.elements().at(index);

          return element
            ? new Repetition(
                repetition.elements().with(index, update.apply(element)),
                repetition.separators()
              )
            : repetition;
        })
      )
    );
  }

  override map(transform: Node.Transform): Repetition<A, S> {
    return new Repetition(
      this.elements().map(transform),
      this.separators().map(transform)
    );
  }

  filter(keep: (element: A) => boolean): Repetition<A, S> {
    const separators = this.separators();
    const kept = this.elements().flatMap((element, index) =>
      keep(element) ? [{ element, index }] : []
    );

    return new Repetition(
      kept.map(({ element }) => element),
      kept.slice(1).flatMap(({ index }) => separators.slice(index - 1, index))
    );
  }

  inserted(
    index: number,
    element: A,
    separators: readonly S[]
  ): Repetition<A, S> {
    const count = this.elements().length;
    const at = Math.min(Math.max(index < 0 ? count + index : index, 0), count);
    const gap = count > 0 ? separators.slice(0, 1) : [];

    return new Repetition(
      this.elements().toSpliced(at, 0, element),
      this.separators().toSpliced(Math.max(at - 1, 0), 0, ...gap)
    );
  }

  elements(): readonly A[] {
    return this.#sequence.elements();
  }

  separators(): readonly S[] {
    return this.#separators.elements();
  }

  override children(): readonly (A | S)[] {
    const separators = this.separators();

    return this.elements().flatMap((element, index) => [
      element,
      ...separators.slice(index, index + 1),
    ]);
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Repetition &&
      this.#sequence.equals(other.#sequence) &&
      this.#separators.equals(other.#separators)
    );
  }

  override toString(): string {
    return this.children().join('');
  }
}
