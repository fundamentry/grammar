import { Lens, Morphism } from '@fundamentry/category';

import { Node } from './Node.js';

export class Sequence<out T extends readonly Node[]> extends Node {
  readonly #elements: T;

  constructor(elements: T) {
    super();

    this.#elements = Object.freeze(elements);
  }

  static [Symbol.hasInstance]<S extends Sequence<readonly Node[]>>(
    this: abstract new (...args: never) => S,
    value: unknown
  ): value is S {
    return (
      value instanceof Object &&
      #elements in value &&
      Function.prototype[Symbol.hasInstance].call(this, value)
    );
  }

  static at<T extends readonly Node[], const I extends Node.Index<T>>(
    index: I
  ): Lens<Sequence<T>, T[I]> {
    return Lens.of(
      Morphism.of((sequence: Sequence<T>) => sequence.#elements[index]),
      Morphism.of(([sequence, element]: readonly [Sequence<T>, T[I]]) =>
        sequence.with(index, element)
      )
    );
  }

  with<I extends Node.Index<T>>(index: I, element: T[I]): Sequence<T>;

  with(index: number, element: Node): Sequence<readonly Node[]> {
    return new Sequence<readonly Node[]>(this.#elements.with(index, element));
  }

  override map(transform: Node.Transform): Sequence<T>;

  override map(transform: Node.Transform): Sequence<readonly Node[]> {
    return new Sequence(this.#elements.map(transform));
  }

  elements(): T {
    return this.#elements;
  }

  override children(): T {
    return this.#elements;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Sequence &&
      this.#elements.length === other.#elements.length &&
      this.#elements.every((node, index) => node.equals(other.#elements[index]))
    );
  }

  override toString(): string {
    return this.#elements.join('');
  }
}
