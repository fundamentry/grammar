import { Node } from './Node.js';

export namespace Nonterminal {
  export interface Rule<Name extends string> {
    name(): Name;
  }
}

export class Nonterminal<
  const Name extends string,
  out Elements extends Node,
> extends Node {
  readonly #rule: Nonterminal.Rule<Name>;

  readonly #elements: Elements;

  constructor(rule: Nonterminal.Rule<Name>, elements: Elements) {
    super();

    this.#rule = rule;
    this.#elements = elements;
  }

  static [Symbol.hasInstance]<S extends Node>(
    this: abstract new (...args: never) => S,
    value: unknown
  ): value is S {
    return (
      value instanceof Object &&
      #rule in value &&
      Function.prototype[Symbol.hasInstance].call(this, value)
    );
  }

  rule(): Nonterminal.Rule<Name> {
    return this.#rule;
  }

  elements(): Elements {
    return this.#elements;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Nonterminal &&
      this.#rule === other.#rule &&
      this.#elements.equals(other.#elements)
    );
  }

  override toString(): string {
    return String(this.#elements);
  }
}
