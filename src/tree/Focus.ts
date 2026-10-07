import { Morphism, type Optic, Optional, Prism } from '@fundamentry/category';

import { type Node } from './Node.js';

export class Focus<T extends Node, A> {
  readonly #tree: T;

  readonly #is: (node: Node) => boolean;

  readonly #optic: Optional<Node, A, unknown>;

  private constructor(
    tree: T,
    is: (node: Node) => boolean,
    optic: Optional<Node, A, unknown>
  ) {
    this.#tree = tree;
    this.#is = is;
    this.#optic = optic;
  }

  static of<T extends Node, F extends Node>(
    tree: T,
    is: (node: Node) => node is F
  ): Focus<T, F> {
    return new Focus(
      tree,
      is,
      Optional.id<Node>().andThen(Prism.fromPredicate(is, () => undefined))
    );
  }

  focus<B>(optic: Optic<Optic.Kind, A, B, unknown>): Focus<T, B> {
    return new Focus(this.#tree, this.#is, this.#optic.andThen(optic));
  }

  values(): IteratorObject<A> {
    return this.#tree.outermost(this.#is).flatMap(found =>
      this.#optic.preview(found).match<readonly A[]>({
        onSuccess: value => [value],
        onFailure: () => [],
      })
    );
  }

  find(): A | undefined {
    const [first] = this.values();

    return first;
  }

  set(value: A): T {
    return this.modify(() => value);
  }

  modify(update: (value: A) => A): T {
    const is = this.#is;
    const modified = this.#optic.modify(Morphism.of(update));

    function rewrite<N extends Node>(node: N): N;

    function rewrite(node: Node): Node {
      return is(node) ? modified.apply(node) : node.map(rewrite);
    }

    return rewrite(this.#tree);
  }
}
