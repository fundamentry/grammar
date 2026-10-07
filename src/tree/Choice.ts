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
