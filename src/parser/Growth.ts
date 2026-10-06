import { type Point } from '@fundamentry/stream';

import { type Node } from '#project/tree';

import { type Context } from './Context.js';
import { type Continuation } from './Continuation.js';
import { Matches } from './Matches.js';
import { type Parser } from './Parser.js';

export class Growth<in out Token> {
  readonly #context: Context<Token>;

  readonly #point: Point<Token>;

  readonly #matches: Matches<Token>;

  readonly #fresh: Point.Step<Token, Node>[] = [];

  #seed: readonly Point.Step<Token, Node>[] = [];

  constructor(context: Context<Token>, point: Point<Token>) {
    this.#context = context;
    this.#point = point;
    this.#matches = new Matches(point);
  }

  run(
    parse: Parser.Parse<Token>,
    continuation: Continuation<Token>,
    done: () => void
  ): void {
    const finish = () => {
      done();

      this.#context.succeed(continuation, this.#longestFirst());
    };

    const pass = () =>
      this.#context.after(
        () =>
          parse(
            this.#point,
            this.#context,
            continuation.with(step => {
              if (this.#matches.add(step)) this.#fresh.push(step);
            })
          ),
        () => {
          this.#advance();

          if (this.#seed.length > 0) pass();
          else finish();
        }
      );

    pass();
  }

  seed(): readonly Point.Step<Token, Node>[] {
    return this.#seed;
  }

  #advance(): void {
    this.#seed = this.#fresh.splice(0);
  }

  #longestFirst(): readonly Point.Step<Token, Node>[] {
    return this.#matches
      .steps()
      .toSorted(({ rest: left }, { rest: right }) => right.compareTo(left));
  }
}
