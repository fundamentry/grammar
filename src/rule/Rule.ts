import { Codec } from '#project/codec';
import { type Node, Nonterminal } from '#project/tree';

import { Selection } from './Selection.js';

export namespace Rule {
  export type Value<R> = R extends { print(value: infer N): unknown }
    ? N
    : never;

  export type Of<N> =
    N extends Nonterminal<infer Name, infer Elements>
      ? Rule<Name, Elements>
      : never;
}

export class Rule<
  const Name extends string,
  Elements extends Node,
> extends Codec<Nonterminal<Name, Elements>> {
  readonly #name: Name;

  constructor(
    name: Name,
    body: (codec: typeof Codec.builder) => Codec<Elements>
  ) {
    super(
      Codec.named(
        () => this,
        () => body(Codec.builder)
      )
    );
    this.#name = name;
  }

  name(): Name {
    return this.#name;
  }

  node(elements: Elements): Nonterminal<Name, Elements> {
    return new Nonterminal(this, elements);
  }

  is(node: Node): node is Nonterminal<Name, Elements> {
    return node instanceof Nonterminal && node.rule() === this;
  }

  in<T extends Node>(tree: T): Selection<T, Nonterminal<Name, Elements>> {
    return Selection.of(tree, this);
  }
}
