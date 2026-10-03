import { type Equatable, type Stringable } from '@fundamentry/trait';

import { type Node } from './Node.js';

export class Option<out T extends Node>
  implements Equatable<unknown>, Stringable
{
  readonly #value?: T;

  constructor(value?: T) {
    this.#value = value;
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
