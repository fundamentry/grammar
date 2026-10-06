import { type Point } from '@fundamentry/stream';

import { type Expectation } from '#project/expectation';
import { type Node } from '#project/tree';

import { type Frontier } from './Frontier.js';

export namespace Continuation {
  export interface Label<out Token> {
    readonly start: Point<Token>;
    readonly expectation: Expectation;
  }
}

export class Continuation<in out Token, in Value = Node> {
  readonly #succeed: (step: Point.Step<Token, Value>) => void;

  readonly #label?: Continuation.Label<Token>;

  private constructor(
    succeed: (step: Point.Step<Token, Value>) => void,
    label?: Continuation.Label<Token>
  ) {
    this.#succeed = succeed;
    this.#label = label;
  }

  static of<Token, Value = Node>(
    succeed: (step: Point.Step<Token, Value>) => void
  ): Continuation<Token, Value> {
    return new Continuation(succeed);
  }

  succeed(step: Point.Step<Token, Value>): void {
    this.#succeed(step);
  }

  with<Next>(
    succeed: (step: Point.Step<Token, Next>) => void
  ): Continuation<Token, Next> {
    return new Continuation(succeed, this.#label);
  }

  map<From>(map: (value: From) => Value): Continuation<Token, From> {
    return this.with(({ value, rest }) =>
      this.#succeed({ value: map(value), rest })
    );
  }

  labelled(
    point: Point<Token>,
    expectation: Expectation
  ): Continuation<Token, Value> {
    return this.#label?.start.equals(point)
      ? this
      : new Continuation(this.#succeed, { start: point, expectation });
  }

  relabel(frontier: Frontier<Token>): Frontier<Token> {
    return this.#label?.start.equals(frontier.at())
      ? frontier.relabel(this.#label.expectation)
      : frontier;
  }
}
