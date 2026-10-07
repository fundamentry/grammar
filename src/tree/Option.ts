import {
  FallibleMorphism,
  Morphism,
  Optional,
  Prism,
} from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
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

  static value<T extends Node>(): Prism<Option<T>, T, undefined> {
    return Prism.of(
      (option: Option<T>) =>
        option.#value ? new Success(option.#value) : new Failure(undefined),
      (value: T) => new Option(value)
    );
  }

  static valueFrom<T extends Node>(
    initial: T
  ): Optional<Option<T>, T, undefined> {
    return Optional.of(
      FallibleMorphism.of(option =>
        option.#value ? new Success(option.#value) : new Failure(undefined)
      ),
      Morphism.of(update =>
        Morphism.of(option => {
          const updated = update.apply(option.#value ?? initial);

          return option.#value || !updated.equals(initial)
            ? new Option(updated)
            : option;
        })
      )
    );
  }

  override map(transform: Node.Transform): Option<T> {
    return new Option(this.#value && transform(this.#value));
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
