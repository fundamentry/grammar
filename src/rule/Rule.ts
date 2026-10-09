import { Codec, type Union } from '#project/codec';
import { type Node, Nonterminal, type View } from '#project/tree';

import { members, Rules } from './Rules.js';
import { select, Selection } from './Selection.js';

export namespace Rule {
  export interface Any {
    is(node: Node): boolean;

    in(tree: Node): View<Node>;

    [members](): readonly Union.Member[];
  }

  export type Selected<R> = R extends {
    is(node: Node): node is infer N extends Node;
  }
    ? N
    : never;

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

  static any<const R extends readonly Rule.Any[]>(...rules: R): Rules<R> {
    return new Rules(rules);
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
    return Selection[select](tree, this);
  }

  [members](): readonly Union.Member[] {
    return [this];
  }
}
