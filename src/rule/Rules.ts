import { Focus, type Node } from '#project/tree';

export class Rules<A extends Node> {
  readonly #is: (node: Node) => node is A;

  constructor(is: (node: Node) => node is A) {
    this.#is = is;
  }

  is(node: Node): node is A {
    return this.#is(node);
  }

  in<T extends Node>(tree: T): Focus<T, A> {
    return Focus.of(tree, this.#is);
  }
}
