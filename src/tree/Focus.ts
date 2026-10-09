import { Morphism, type Optic, Optional } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';

import { type Node } from './Node.js';
import { Option } from './Option.js';
import { Repetition } from './Repetition.js';
import { View } from './View.js';

export class Focus<T extends Node, A> extends View<A> {
  readonly #tree: T;

  readonly #modify: (update: Morphism<A, A>) => T;

  private constructor(
    tree: T,
    values: () => IteratorObject<A>,
    modify: (update: Morphism<A, A>) => T
  ) {
    super(values);

    this.#tree = tree;
    this.#modify = modify;
  }

  static of<T extends Node, F extends Node>(
    tree: T,
    is: (node: Node) => node is F
  ): Focus<T, F> {
    return Focus.#root(tree).within(is);
  }

  focus<B>(optic: Optic<Optic.Kind, A, B, unknown>): Focus<T, B> {
    const optional = Optional.id<A>().andThen(optic);

    return new Focus(
      this.#tree,
      () =>
        this.values().flatMap(value =>
          optional.preview(value).match<readonly B[]>({
            onSuccess: part => [part],
            onFailure: () => [],
          })
        ),
      update => this.#modify(optional.modify(update))
    );
  }

  within<N extends Node, F extends Node>(
    this: Focus<T, N>,
    is: (node: Node) => node is F
  ): Focus<T, F> {
    return new Focus(
      this.#tree,
      () => this.values().flatMap(value => value.outermost(is)),
      update =>
        this.#modify(
          Morphism.of(value =>
            Focus.#rewrite(value, (node, rewrite) =>
              is(node) ? update.apply(node) : node.map(rewrite)
            )
          )
        )
    );
  }

  set(value: A): T {
    return this.modify(() => value);
  }

  modify(update: (value: A) => A): T {
    return this.#modify(Morphism.of(update));
  }

  remove(): Result<T, readonly Node[]> {
    const targets = new Set<unknown>(this.values());
    const lost: Node[] = [];

    const holds = (node: Node): boolean =>
      targets.has(node) ||
      (!(node instanceof Option || node instanceof Repetition) &&
        node.children().some(holds));

    const loose = (node: Node): readonly Node[] => {
      if (targets.has(node)) return [];

      return node instanceof Option || node instanceof Repetition
        ? [node].filter(part => part.children().length > 0)
        : node.children().flatMap(loose);
    };

    const option = (node: Option<Node>, rewrite: Node.Transform) => {
      if (targets.has(node)) return new Option();

      if (!node.children().some(holds)) return node.map(rewrite);

      lost.push(...node.children().flatMap(loose));

      return new Option();
    };

    const kept = (element: Node) => {
      if (!holds(element)) return true;

      lost.push(...loose(element));

      return false;
    };

    const repetition = (
      node: Repetition<Node, Node>,
      rewrite: Node.Transform
    ) =>
      targets.has(node) ? new Repetition([]) : node.filter(kept).map(rewrite);

    const tree = Focus.#rewrite(this.#tree, (node, rewrite) => {
      if (node instanceof Option) return option(node, rewrite);

      return node instanceof Repetition
        ? repetition(node, rewrite)
        : node.map(rewrite);
    });

    return lost.length > 0 ? new Failure(lost) : new Success(tree);
  }

  static #root<T extends Node>(tree: T): Focus<T, Node> {
    return new Focus<T, Node>(
      tree,
      () => [tree].values(),
      update => Focus.#rewrite(tree, node => update.apply(node))
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
