import { type Equatable, type Stringable } from '@fundamentry/trait';

import { type Node } from './Node.js';

export class Option<out T extends Node>
  implements Equatable<unknown>, Stringable
{
  readonly #value?: T;

  constructor(value?: T) {
    this.#value = value;
  }

  static [Symbol.hasInstance]<S extends Option<Node>>(
    this: abstract new (...args: never) => S,
    value: unknown
  ): value is S {
    return (
      value instanceof Object &&
      #value in value &&
      Function.prototype[Symbol.hasInstance].call(this, value)
    );
  }

  value(): T | undefined {
    return this.#value;
  }

  elements(): readonly T[] {
    return Object.freeze(this.#value === undefined ? [] : [this.#value]);
  }

  equals(other: unknown): boolean {
    if (!(other instanceof Option)) return false;

    return this.#value === undefined
      ? other.#value === undefined
      : this.#value.equals(other.#value);
  }

  toString(): string {
    return this.#value?.toString() ?? '';
  }
}
