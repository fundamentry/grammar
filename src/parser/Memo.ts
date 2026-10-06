import { type Point } from '@fundamentry/stream';

import { type Context } from './Context.js';
import { Continuation } from './Continuation.js';
import { Failures } from './Failures.js';
import { Matches } from './Matches.js';

export namespace Memo {
  export type Source<in out Token> = (
    continuation: Continuation<Token>
  ) => void;
}

export class Memo<in out Token> {
  readonly #context: Context<Token>;

  readonly #matches: Matches<Token>;

  readonly #failures: Failures<Token>;

  readonly #waiting: Continuation<Token>[] = [];

  #settled = false;

  constructor(context: Context<Token>, point: Point<Token>) {
    this.#context = context;
    this.#matches = new Matches(point);
    this.#failures = new Failures(point);
  }

  fill(source: Memo.Source<Token>): void {
    this.#context.after(
      () =>
        this.#context.within(this.#failures, () =>
          source(Continuation.of(step => this.#matches.add(step)))
        ),
      () => this.#settle()
    );
  }

  attend(continuation: Continuation<Token>): void {
    if (this.#settled) this.#replay(continuation);
    else this.#waiting.push(continuation);
  }

  #settle(): void {
    this.#settled = true;

    this.#waiting.splice(0).forEach(continuation => this.#replay(continuation));
  }

  #replay(continuation: Continuation<Token>): void {
    this.#context.fail(continuation.relabel(this.#failures.mismatch()));

    this.#context.succeed(continuation, this.#matches.steps());
  }
}
