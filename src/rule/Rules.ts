import { Prism } from '@fundamentry/category';

import { type Union } from '#project/codec';
import { Focus, type Node } from '#project/tree';

import { type Rule } from './Rule.js';

export const members: unique symbol = Symbol('members');

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
}
