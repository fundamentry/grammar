import { Prism } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { type Equatable, type Stringable } from '@fundamentry/trait';

import { PrintMismatchError, SymbolMismatchError } from '#project/error';
import { type Node } from '#project/tree';

export abstract class Symbol<out Elements extends Node = Node>
  implements Equatable<unknown>, Stringable
{
  readonly #elements: Elements;

  constructor(elements: Elements) {
    this.#elements = elements;

    if (!this.isValid(elements))
      throw new SymbolMismatchError(
        `'${this.toString()}' does not match ${this.constructor.name}`
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

  static prism<Elements extends Node, S extends Symbol<Elements>>(
    this: new (elements: Elements) => S
  ): Prism<Elements, S, string> {
    return Prism.of(
      elements => {
        try {
          return new Success(new this(elements));
        } catch (error) {
          if (error instanceof SymbolMismatchError)
            return new Failure(error.message);

          throw error;
        }
      },
      symbol => {
        if (!(symbol instanceof this))
          throw new PrintMismatchError(
            `'${String(symbol)}' is not ${this.name}`
          );

        return symbol.#elements;
      }
    );
  }

  protected abstract isValid(elements: Elements): boolean;

  protected elements(): Elements {
    return this.#elements;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof Symbol &&
      this.constructor === other.constructor &&
      this.#elements.equals(other.#elements)
    );
  }

  toString(): string {
    return this.#elements.toString();
  }
}
