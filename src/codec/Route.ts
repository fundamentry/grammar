import { Optional } from '@fundamentry/category';
import { type Result, Success } from '@fundamentry/coproduct';

import { Data } from '#project/data';
import { type Node, Nonterminal } from '#project/tree';

import { type Move } from './Move.js';
import { type Slots } from './Slots.js';
import { type Steps } from './Steps.js';

export class Route<
  R extends Nonterminal.Rule<string> = Nonterminal.Rule<string>,
> extends Data {
  readonly #moves: readonly Move[];

  readonly #target: R;

  private constructor(moves: readonly Move[], target: R) {
    super();

    this.#moves = moves;
    this.#target = target;
  }

  static to<R extends Nonterminal.Rule<string>>(target: R): Route<R> {
    return new Route([], target);
  }

  after(move: Move): Route<R> {
    return new Route([move, ...this.#moves], this.#target);
  }

  target(): R {
    return this.#target;
  }

  admits(node: Node): boolean {
    return node instanceof Nonterminal && node.rule() === this.#target;
  }

  fits(node: Node): boolean {
    const fits = (current: Node, [move, ...rest]: readonly Move[]): boolean =>
      !move ||
      move.preview(current).match({
        onSuccess: next => fits(next, rest),
        onFailure: () => !move.blocks(current),
      });

    return fits(node, this.#moves);
  }

  optic(slots: Slots): Steps.Step {
    return this.#through(move => move.step(slots));
  }

  preview(node: Node): Result<Node, unknown> {
    return this.#moves.reduce<Result<Node, unknown>>(
      (result, move) => result.flatMap(current => move.preview(current)),
      new Success(node)
    );
  }

  choose(slots: Slots): Steps.Step {
    return this.#through(move => move.choose(slots));
  }

  excludes(other: Route<R>): boolean {
    return this.#moves.some(
      (move, index) =>
        move.excludes(other.#moves[index]) && this.#shares(other, index)
    );
  }

  alternates(other: Route<R>): boolean {
    const last = this.#moves.length - 1;

    return (
      other.#moves.length === this.#moves.length &&
      this.#shares(other, last) &&
      Boolean(this.#moves.at(-1)?.excludes(other.#moves.at(-1)))
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

  #through(step: (move: Move) => Steps.Step): Steps.Step {
    return this.#moves.reduce<Steps.Step>(
      (optic, move) => optic.andThen(step(move)),
      Optional.id<Node>()
    );
  }

  #shares(other: Route<R>, length: number): boolean {
    return this.#moves
      .slice(0, length)
      .every((move, index) => move.equals(other.#moves[index]));
  }
}
