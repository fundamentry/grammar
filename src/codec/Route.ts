import { Optional } from '@fundamentry/category';

import { Data } from '#project/data';
import { type Node, type Nonterminal } from '#project/tree';

import { type Move } from './Move.js';
import { type Steps } from './Steps.js';

export class Route extends Data {
  readonly #moves: readonly Move[];

  readonly #target: Nonterminal.Rule<string>;

  private constructor(
    moves: readonly Move[],
    target: Nonterminal.Rule<string>
  ) {
    super();

    this.#moves = moves;
    this.#target = target;
  }

  static to(target: Nonterminal.Rule<string>): Route {
    return new Route([], target);
  }

  after(move: Move): Route {
    return new Route([move, ...this.#moves], this.#target);
  }

  optic(): Steps.Step {
    return this.#moves.reduce<Steps.Step>(
      (optic, move) => optic.andThen(move.step()),
      Optional.id<Node>()
    );
  }

  excludes(other: Route): boolean {
    return this.#moves.some(
      (move, index) =>
        move.excludes(other.#moves[index]) && this.#shares(other, index)
    );
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Route &&
      this.#target === other.#target &&
      this.toString() === other.toString()
    );
  }

  override toString(): string {
    return `/${[...this.#moves, this.#target.name()].join('/')}`;
  }

  #shares(other: Route, length: number): boolean {
    return this.#moves
      .slice(0, length)
      .every((move, index) => move.equals(other.#moves[index]));
  }
}
