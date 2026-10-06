import { type Point } from '@fundamentry/stream';

import { Frontier } from './Frontier.js';

export class Failures<in out Token> {
  #frontier: Frontier<Token>;

  constructor(origin: Point<Token>) {
    this.#frontier = Frontier.empty(origin);
  }

  fail(frontier: Frontier<Token>): void {
    this.#frontier = this.#frontier.merge(frontier);
  }

  frontier(): Frontier<Token> {
    return this.#frontier;
  }
}
