import { Morphism, type Optional, type Prism } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';

import { type Mismatch } from '#project/mismatch';
import { type Focus, type Node, type Nonterminal } from '#project/tree';

import { Junction } from './Junction.js';
import { type Route } from './Route.js';
import { write, Writer } from './Writer.js';

export const members: unique symbol = Symbol('members');

export namespace Union {
  export interface Member extends Nonterminal.Rule<string> {
    is(node: Node): boolean;

    parse(input: string): Result<Node, Mismatch>;
  }

  export interface Targets<A extends Node> {
    [members](): readonly Member[];

    optic(): Prism<Node, A, unknown>;
  }
}

export class Union<A extends Node> {
  readonly #junction: Junction<Union.Member>;

  readonly #witness: Prism<Node, A, unknown>;

  constructor(
    routes: readonly Route<Union.Member>[],
    witness: Prism<Node, A, unknown>
  ) {
    this.#junction = new Junction(routes);
    this.#witness = witness;
  }

  optic(): Optional<Node, A, unknown> {
    return this.#junction.optic().andThen(this.#witness);
  }

  [write]<T extends Node>(
    place: Focus<T, Node>,
    update: (text: string) => string
  ): Result<T, Mismatch> {
    return new Writer(
      node =>
        this.#junction.along(node, (taken, value) =>
          this.#put(node, taken, update(String(value)))
        ) ??
        this.#junction.fitting(node, route =>
          Union.#create(node, route, update)
        ) ??
        new Success(node)
    ).write(place);
  }

  #put(
    node: Node,
    taken: Route<Union.Member>,
    text: string
  ): Result<Node, Mismatch> {
    return this.#junction
      .alternates(taken)
      .reduce(
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
