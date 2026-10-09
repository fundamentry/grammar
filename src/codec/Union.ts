import {
  FallibleMorphism,
  Morphism,
  Optional,
  type Prism,
} from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';

import { type Mismatch } from '#project/mismatch';
import { type Focus, type Node, type Nonterminal } from '#project/tree';

import { type Route } from './Route.js';
import { type Steps } from './Steps.js';
import { write, Writer } from './Writer.js';

export const members: unique symbol = Symbol('members');

export namespace Union {
  export interface Member extends Nonterminal.Rule<string> {
    parse(input: string): Result<Node, Mismatch>;
  }

  export interface Targets<A extends Node> {
    [members](): readonly Member[];

    optic(): Prism<Node, A, unknown>;
  }
}

export class Union<A extends Node> {
  readonly #routes: readonly Route<Union.Member>[];

  readonly #witness: Prism<Node, A, unknown>;

  constructor(
    routes: readonly Route<Union.Member>[],
    witness: Prism<Node, A, unknown>
  ) {
    this.#routes = routes;
    this.#witness = witness;
  }

  optic(): Optional<Node, A, unknown> {
    return this.#routed().andThen(this.#witness);
  }

  #routed(): Steps.Step {
    const admitted = (routes: readonly Route<Union.Member>[], value: Node) => {
      const [taken] = routes;
      const form = routes.find(route => route.admits(value));

      if (!form)
        throw new RangeError(
          `'${String(value)}' cannot take the place of ${String(taken)}`
        );

      return form;
    };

    const replace = (node: Node, taken: Route<Union.Member>, value: Node) =>
      admitted([taken, ...this.#alternates(taken)], value)
        .choose()
        .set(node, value);

    const create = (
      node: Node,
      route: Route<Union.Member>,
      update: Morphism<Node, Node>
    ) =>
      route
        .optic()
        .modify(
          Morphism.of(value => {
            const created = update.apply(value);

            admitted([route], created);

            return created;
          })
        )
        .apply(node);

    return Optional.of(
      FallibleMorphism.of(
        node =>
          this.#along(node, (_, value) => new Success(value)) ??
          new Failure(undefined)
      ),
      Morphism.of(update =>
        Morphism.of(
          node =>
            this.#along(node, (taken, value) =>
              replace(node, taken, update.apply(value))
            ) ??
            this.#fitting(node, route => create(node, route, update)) ??
            node
        )
      )
    );
  }

  [write]<T extends Node>(
    place: Focus<T, Node>,
    update: (text: string) => string
  ): Result<T, Mismatch> {
    return new Writer(
      node =>
        this.#along(node, (taken, value) =>
          this.#put(node, taken, update(String(value)))
        ) ??
        this.#fitting(node, route => Union.#create(node, route, update)) ??
        new Success(node)
    ).write(place);
  }

  #along<R>(
    node: Node,
    visit: (taken: Route<Union.Member>, value: Node) => R
  ): R | undefined {
    return this.#routes
      .values()
      .flatMap((route: Route<Union.Member>) =>
        route
          .optic()
          .preview(node)
          .match({
            onSuccess: value => [visit(route, value)],
            onFailure: () => [],
          })
      )
      .find(() => true);
  }

  #fitting<R>(
    node: Node,
    visit: (route: Route<Union.Member>) => R
  ): R | undefined {
    return this.#routes
      .values()
      .filter((route: Route<Union.Member>) => route.fits(node))
      .map(visit)
      .find(() => true);
  }

  #alternates(taken: Route<Union.Member>): readonly Route<Union.Member>[] {
    return this.#routes.filter(route => taken.alternates(route));
  }

  #put(
    node: Node,
    taken: Route<Union.Member>,
    text: string
  ): Result<Node, Mismatch> {
    return this.#alternates(taken).reduce(
      (result, route) =>
        result.orElse(mismatch =>
          Union.#take(node, route, text).orElse(() => new Failure(mismatch))
        ),
      Union.#take(node, taken, text)
    );
  }

  static #create(
    node: Node,
    route: Route<Union.Member>,
    update: (text: string) => string
  ): Result<Node, Mismatch> {
    return new Writer(value =>
      route.target().parse(update(String(value)))
    ).write({
      modify: rewrite => route.optic().modify(Morphism.of(rewrite)).apply(node),
    });
  }

  static #take(
    node: Node,
    route: Route<Union.Member>,
    text: string
  ): Result<Node, Mismatch> {
    return route
      .target()
      .parse(text)
      .map(parsed => route.choose().set(node, parsed));
  }
}
