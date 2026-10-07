import { Lens, Morphism, Prism } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';

import { Node } from './Node.js';

export namespace Choice {
  export type Alternative<T extends readonly Node[]> = {
    readonly [I in keyof T]: readonly [
      index: I extends `${infer N extends number}` ? N : number,
      value: T[I],
    ];
  }[number];

  export type Cases<T extends readonly Node[], R> = {
    readonly [I in keyof T]: (value: T[I]) => R;
  };
}

export class Choice<T extends readonly Node[]> extends Node {
  readonly #index: number;

  readonly #value: T[number];

  constructor(...[index, value]: Choice.Alternative<T>) {
    super();

    this.#index = index;
    this.#value = value;
  }

  static [Symbol.hasInstance]<S extends Node>(
    this: abstract new (...args: never) => S,
    value: unknown
  ): value is S {
    return (
      value instanceof Object &&
      #index in value &&
      Function.prototype[Symbol.hasInstance].call(this, value)
    );
  }

  static alternative<T extends readonly Node[], const I extends Node.Index<T>>(
    index: I
  ): Prism<Choice<T>, T[I], undefined>;

  static alternative(
    index: number
  ): Prism<Choice<readonly Node[]>, Node, undefined> {
    return Prism.of(
      (choice: Choice<readonly Node[]>) =>
        choice.#index === index
          ? new Success(choice.#value)
          : new Failure(undefined),
      (value: Node) => new Choice<readonly Node[]>(index, value)
    );
  }

  static alternativeOr<
    T extends readonly Node[],
    const I extends Node.Index<T>,
  >(index: I, fallback: T[I]): Lens<Choice<T>, T[I]>;

  static alternativeOr(
    index: number,
    fallback: Node
  ): Lens<Choice<readonly Node[]>, Node> {
    return Lens.of(
      Morphism.of(choice =>
        choice.#index === index ? choice.#value : fallback
      ),
      Morphism.of(([choice, value]) =>
        choice.#index === index || !value.equals(fallback)
          ? new Choice(index, value)
          : choice
      )
    );
  }

  override map(transform: Node.Transform): Choice<T>;

  override map(transform: Node.Transform): Choice<readonly Node[]> {
    return new Choice(this.#index, transform(this.#value));
  }

  index(): number {
    return this.#index;
  }

  value(): T[number] {
    return this.#value;
  }

  match<R>(cases: Choice.Cases<T, R>): R;

  match<R>(cases: readonly ((value: T[number]) => R)[]): R {
    const handle = cases[this.#index];

    if (!handle)
      throw new RangeError(
        `No case for alternative ${String(this.#index)} of ${String(cases.length)}`
      );

    return handle(this.#value);
  }

  override children(): readonly [T[number]] {
    return Object.freeze<[T[number]]>([this.#value]);
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Choice &&
      this.#index === other.#index &&
      this.#value.equals(other.#value)
    );
  }

  override toString(): string {
    return String(this.#value);
  }
}
