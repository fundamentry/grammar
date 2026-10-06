import { type Point } from '@fundamentry/stream';

import { Visits } from './Visits.js';

export class Spans<in out Token> {
  readonly #point: Point<Token>;

  readonly #ends = new Visits<number>();

  constructor(point: Point<Token>) {
    this.#point = point;
  }

  visit(step: Point.Step<Token, unknown>): boolean {
    return this.#ends.visit(step.rest.distanceFrom(this.#point));
  }
}
