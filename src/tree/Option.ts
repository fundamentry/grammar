import { Equatable } from '@fundamentry/trait';

import { Node } from './Node.js';

export class Option<out T extends Node = never> extends Node {
  readonly #value?: T;

  constructor(value?: T) {
    super();

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

  override children(): readonly T[] {
    return this.elements();
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Option &&
      Equatable.equals<unknown>(this.#value, other.#value)
    );
  }

  override toString(): string {
    return this.#value === undefined ? '' : String(this.#value);
  }
}
