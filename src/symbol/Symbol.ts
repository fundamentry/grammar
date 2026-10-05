import { PartialIso } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';

import { type Codec } from '#project/codec';
import { SymbolMismatchError } from '#project/error';
import { Node } from '#project/tree';

export abstract class Symbol<out Elements extends Node = Node> extends Node {
  readonly #elements: Elements;

  constructor(elements: Elements) {
    super();

    this.#elements = elements;

    if (!this.isValid(elements))
      throw new SymbolMismatchError(
        `'${this.toString()}' does not match ${new.target.rule()}`
      );
  }

  static [globalThis.Symbol.hasInstance]<S extends Symbol>(
    this: abstract new (...args: never) => S,
    value: unknown
  ): value is S {
    return (
      value instanceof Object &&
      #elements in value &&
      Function.prototype[globalThis.Symbol.hasInstance].call(this, value)
    );
  }

  static rule(): string {
    return this.name;
  }

  static conversion<Elements extends Node, S extends Symbol<Elements>>(
    this: Codec.Constructor<Elements, S>
  ): PartialIso<Elements, S, string, string> {
    return PartialIso.of(
      elements => {
        try {
          return new Success(new this(elements));
        } catch (error) {
          if (error instanceof SymbolMismatchError)
            return new Failure(error.message);

          throw error;
        }
      },
      symbol =>
        symbol instanceof this
          ? new Success(symbol.#elements)
          : new Failure(`'${String(symbol)}' is not ${this.rule()}`)
    );
  }

  protected abstract isValid(elements: Elements): boolean;

  protected elements(): Elements {
    return this.#elements;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Symbol &&
      this.constructor === other.constructor &&
      this.#elements.equals(other.#elements)
    );
  }

  override toString(): string {
    return String(this.#elements);
  }
}
