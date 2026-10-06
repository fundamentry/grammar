import { type Point } from '@fundamentry/stream';

import { Mismatch } from '#project/mismatch';

export class Failures<in out Token> {
  #mismatch: Mismatch<Token>;

  constructor(origin: Point<Token>) {
    this.#mismatch = Mismatch.empty(origin);
  }

  fail(mismatch: Mismatch<Token>): void {
    this.#mismatch = this.#mismatch.merge(mismatch);
  }

  mismatch(): Mismatch<Token> {
    return this.#mismatch;
  }
}
