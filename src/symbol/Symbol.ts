import { Prism } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { type CodePoint } from '@fundamentry/scalar';
import { type Stringable } from '@fundamentry/trait';

import { PrintMismatchError, SymbolMismatchError } from '#project/error';

export namespace Symbol {
  export type Element = CodePoint | Symbol | undefined | readonly Element[];
}

export abstract class Symbol<
  out Elements extends Symbol.Element = Symbol.Element,
> implements Stringable {
  readonly #elements: Elements;

  constructor(elements: Elements) {
    this.#elements = elements;

    if (!this.isValid(elements))
      throw new SymbolMismatchError(
        `'${this.toString()}' does not match ${this.constructor.name}`
      );
  }

  static prism<Elements extends Symbol.Element, S extends Symbol<Elements>>(
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

  toString(): string {
    return [this.#elements].flat(Infinity).join('');
  }
}
