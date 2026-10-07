import { Morphism, type Optic, Optional, Prism } from '@fundamentry/category';

import { type Node } from './Node.js';
import { Option } from './Option.js';
import { Repetition } from './Repetition.js';

export class Focus<T extends Node, A> implements Iterable<A> {
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

  [Symbol.iterator](): IteratorObject<A> {
    return this.values();
  }

  find(): A | undefined {
    const [first] = this.values();

    return first;
  }

  set(value: A): T {
    return this.modify(() => value);
  }

  modify(update: (value: A) => A): T {
    const modified = this.#optic.modify(Morphism.of(update));

    return Focus.#rewrite(this.#tree, (node, rewrite) =>
      this.#is(node) ? modified.apply(node) : node.map(rewrite)
    );
  }

  remove(): T {
    const targets = new Set<unknown>(this.values());

    const holds = (node: Node): boolean =>
      targets.has(node) ||
      (!(node instanceof Option || node instanceof Repetition) &&
        node.children().some(holds));

    const option = (node: Option<Node>, rewrite: Node.Transform) =>
      targets.has(node) || node.children().some(holds)
        ? new Option()
        : node.map(rewrite);

    const repetition = (node: Repetition<Node>, rewrite: Node.Transform) =>
      new Repetition(
        targets.has(node)
          ? []
          : node
              .elements()
              .filter(element => !holds(element))
              .map(element => rewrite(element))
      );

    return Focus.#rewrite(this.#tree, (node, rewrite) => {
      if (node instanceof Option) return option(node, rewrite);

      return node instanceof Repetition
        ? repetition(node, rewrite)
        : node.map(rewrite);
    });
  }

  static #rewrite<T extends Node>(
    tree: T,
    step: (node: Node, rewrite: Node.Transform) => Node
  ): T {
    function rewrite<N extends Node>(node: N): N;

    function rewrite(node: Node): Node {
      return step(node, rewrite);
    }

    return rewrite(tree);
  }
}
