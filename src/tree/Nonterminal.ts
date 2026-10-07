import { Lens, Morphism } from '@fundamentry/category';

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

  static elements<Name extends string, Elements extends Node>(): Lens<
    Nonterminal<Name, Elements>,
    Elements
  > {
    return Lens.of(
      Morphism.of((node: Nonterminal<Name, Elements>) => node.#elements),
      Morphism.of(
        ([node, elements]: readonly [Nonterminal<Name, Elements>, Elements]) =>
          new Nonterminal(node.#rule, elements)
      )
    );
  }

  override map(transform: Node.Transform): Nonterminal<Name, Elements> {
    return new Nonterminal(this.#rule, transform(this.#elements));
  }

  rule(): Nonterminal.Rule<Name> {
    return this.#rule;
  }

  elements(): Elements {
    return this.#elements;
  }

  override children(): readonly [Elements] {
    return Object.freeze<[Elements]>([this.#elements]);
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
