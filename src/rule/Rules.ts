import { Optional, Prism } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';

import {
  type Codec,
  members,
  union,
  type Union,
  write,
  Writer,
} from '#project/codec';
import { type Focus, type Node } from '#project/tree';

import { type Rule } from './Rule.js';
import { reach, select, Selection } from './Selection.js';

export namespace Rules {
  export interface Owned {
    readonly rule: Union.Member;

    readonly node: Node;
  }
}

export class Rules<const R extends readonly Rule.Any[]> {
  readonly #rules: R;

  constructor(rules: R) {
    this.#rules = rules;
  }

  is(node: Node): node is Rule.Selected<R[number]> {
    return this.#rules.some(rule => rule.is(node));
  }

  optic(): Prism<Node, Rule.Selected<R[number]>, undefined> {
    return Prism.fromPredicate(
      node => this.is(node),
      () => undefined
    );
  }

  in<T extends Node>(
    tree: T
  ): Selection<T, Rule.Selected<R[number]>, Rules<R>> {
    return Selection[select](tree, this);
  }

  [members](): readonly Union.Member[] {
    return this.#rules.flatMap(rule => rule[members]());
  }

  [reach](
    routes: Selection.Routes
  ): Selection.Reached<Union<Rule.Selected<R[number]>>> {
    return { step: Optional.id(), grammar: routes[union](this) };
  }

  [write]<T extends Node>(
    place: Focus<T, Node>,
    update: (text: string) => string
  ): Codec.Parsed<T> {
    const rules = this[members]();

    const owned = (node: Node, rule?: Union.Member) =>
      rule ? new Success({ rule, node }) : new Failure(undefined);

    return new Writer(({ rule, node }: Rules.Owned) =>
      rule.parse(update(String(node))).map(parsed => ({ rule, node: parsed }))
    ).write(
      place.focus(
        Prism.of(
          node =>
            owned(
              node,
              rules.find(rule => rule.is(node))
            ),
          ({ node }) => node
        )
      )
    );
  }
}
