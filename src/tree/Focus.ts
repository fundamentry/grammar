import { Morphism, type Optic, Optional } from '@fundamentry/category';

import { type Node } from './Node.js';
import { Option } from './Option.js';
import { Repetition } from './Repetition.js';
import { View } from './View.js';

export namespace Focus {
  export type Narrow<T extends Node, A> = <B>(
    optic: Optic<Optic.Kind, A, B, unknown>
  ) => Focus<T, B>;
}

export class Focus<T extends Node, A> extends View<A> {
  readonly #tree: T;

  readonly #modify: (update: Morphism<A, A>) => T;

  readonly #narrow: Focus.Narrow<T, A>;

  private constructor(
    tree: T,
    values: () => IteratorObject<A>,
    modify: (update: Morphism<A, A>) => T,
    narrow: Focus.Narrow<T, A>
  ) {
    super(values);

    this.#tree = tree;
    this.#modify = modify;
    this.#narrow = narrow;
  }

  static of<T extends Node, F extends Node>(
    tree: T,
    is: (node: Node) => node is F
  ): Focus<T, F> {
    return Focus.#over(tree, is, Optional.id<F>());
  }

  focus<B>(optic: Optic<Optic.Kind, A, B, unknown>): Focus<T, B> {
    return this.#narrow(optic);
  }

  set(value: A): T {
    return this.modify(() => value);
  }

  modify(update: (value: A) => A): T {
    return this.#modify(Morphism.of(update));
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

  static #over<T extends Node, F extends Node, A>(
    tree: T,
    is: (node: Node) => node is F,
    optic: Optional<F, A, unknown>
  ): Focus<T, A> {
    return new Focus(
      tree,
      () =>
        tree.outermost(is).flatMap(found =>
          optic.preview(found).match<readonly A[]>({
            onSuccess: value => [value],
            onFailure: () => [],
          })
        ),
      update => {
        const modified = optic.modify(update);

        return Focus.#rewrite(tree, (node, rewrite) =>
          is(node) ? modified.apply(node) : node.map(rewrite)
        );
      },
      next => Focus.#over(tree, is, optic.andThen(next))
    );
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
