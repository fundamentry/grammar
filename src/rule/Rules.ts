import { Optional, Prism } from '@fundamentry/category';
import { Success } from '@fundamentry/coproduct';

import {
  type Codec,
  members,
  union,
  type Union,
  write,
  Writer,
} from '#project/codec';
import { Focus, type Node } from '#project/tree';

import { type Rule } from './Rule.js';
import { reach, type Selection } from './Selection.js';

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

  in<T extends Node>(tree: T): Focus<T, Rule.Selected<R[number]>> {
    return Focus.of(tree, node => this.is(node));
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

    return new Writer(
      node =>
        rules.find(rule => rule.is(node))?.parse(update(String(node))) ??
        new Success(node)
    ).write(place);
  }
}
