import { Morphism, type Optic, Optional, Prism } from '@fundamentry/category';

import { type Node } from './Node.js';

export class Selection<T extends Node, A> {
  readonly #tree: T;

  readonly #is: (node: Node) => boolean;

  readonly #focus: Optional<Node, A, unknown>;

  private constructor(
    tree: T,
    is: (node: Node) => boolean,
    focus: Optional<Node, A, unknown>
  ) {
    this.#tree = tree;
    this.#is = is;
    this.#focus = focus;
  }

  static of<T extends Node, F extends Node>(
    tree: T,
    is: (node: Node) => node is F
  ): Selection<T, F> {
    return new Selection(
      tree,
      is,
      Optional.id<Node>().andThen(Prism.fromPredicate(is, () => undefined))
    );
  }

  focus<B>(optic: Optic<Optic.Kind, A, B, unknown>): Selection<T, B> {
    return new Selection(this.#tree, this.#is, this.#focus.andThen(optic));
  }

  values(): IteratorObject<A> {
    return this.#tree.outermost(this.#is).flatMap(found =>
      this.#focus.preview(found).match<readonly A[]>({
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
    const modified = this.#focus.modify(Morphism.of(update));

    function rewrite<N extends Node>(node: N): N;

    function rewrite(node: Node): Node {
      return is(node) ? modified.apply(node) : node.map(rewrite);
    }

    return rewrite(this.#tree);
  }
}
