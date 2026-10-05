import { type Either } from '@fundamentry/coproduct';
import { Equatable } from '@fundamentry/trait';

import { Node } from './Node.js';

export namespace Choice {
  export type Of<T extends readonly [Node, Node, ...Node[]]> =
    T extends readonly [
      infer First extends Node,
      infer Second extends Node,
      ...infer Rest extends readonly Node[],
    ]
      ? Rest extends readonly [
          infer Third extends Node,
          ...infer More extends readonly Node[],
        ]
        ? Of<[Choice<First, Second>, Third, ...More]>
        : Choice<First, Second>
      : never;

  export type Merged<T> =
    T extends Choice<infer L, infer R> ? Merged<L> | Merged<R> : T;
}

export class Choice<out L extends Node, out R extends Node> extends Node {
  readonly #either: Either<L, R>;

  constructor(either: Either<L, R>) {
    super();

    this.#either = either;
  }

  static [Symbol.hasInstance]<S extends Choice<Node, Node>>(
    this: abstract new (...args: never) => S,
    value: unknown
  ): value is S {
    return (
      value instanceof Object &&
      #either in value &&
      Function.prototype[Symbol.hasInstance].call(this, value)
    );
  }

  either(): Either<L, R> {
    return this.#either;
  }

  value(): Choice.Merged<L | R> {
    const side: Node = this.#either.merge();

    return (side instanceof Choice ? side.value() : side) as Choice.Merged<
      L | R
    >;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Choice &&
      Equatable.equals<unknown>(this.#either, other.#either)
    );
  }

  override toString(): string {
    return String(this.#either.merge());
  }
}
