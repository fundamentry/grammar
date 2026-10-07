import {
  FallibleMorphism,
  Morphism,
  Optional,
  Prism,
} from '@fundamentry/category';
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

  static alternativeFrom<
    T extends readonly Node[],
    const I extends Node.Index<T>,
  >(index: I, initial: T[I]): Optional<Choice<T>, T[I], undefined>;

  static alternativeFrom(
    index: number,
    initial: Node
  ): Optional<Choice<readonly Node[]>, Node, undefined> {
    return Optional.of(
      FallibleMorphism.of(choice =>
        choice.#index === index
          ? new Success(choice.#value)
          : new Failure(undefined)
      ),
      Morphism.of(update =>
        Morphism.of(choice => {
          const taken = choice.#index === index;
          const updated = update.apply(taken ? choice.#value : initial);

          return taken || !updated.equals(initial)
            ? new Choice<readonly Node[]>(index, updated)
            : choice;
        })
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
