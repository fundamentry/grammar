import { type Point } from '@fundamentry/stream';

import { type Node } from '#project/tree';

import { type Context } from './Context.js';
import { type Parser } from './Parser.js';
import { Visits } from './Visits.js';

export class Growth<Token> {
  readonly #point: Point<Token>;

  readonly #spans = new Visits<number>();

  readonly #steps: Point.Step<Token, Node>[] = [];

  #grown: Point.Step<Token, Node>[] = [];

  #seed: readonly Point.Step<Token, Node>[] = [];

  constructor(point: Point<Token>) {
    this.#point = point;
  }

  run(
    parse: Parser.Parse<Token>,
    context: Context<Token>,
    continuation: Parser.Continuation<Token>,
    done: () => void
  ): void {
    const finish = () => {
      done();

      context.succeed(continuation, ...this.steps());
    };

    const pass = () => {
      context.schedule(() => (this.grew() ? pass() : finish()));

      parse(this.#point, context, {
        label: continuation.label,
        succeed: step => this.absorb(step),
      });
    };

    pass();
  }

  seed(): readonly Point.Step<Token, Node>[] {
    return this.#seed;
  }

  absorb(step: Point.Step<Token, Node>): void {
    if (this.#spans.visit(step.rest.distanceFrom(this.#point)))
      this.#grown.push(step);
  }

  grew(): boolean {
    this.#seed = this.#grown;
    this.#steps.push(...this.#grown);
    this.#grown = [];

    return this.#seed.length > 0;
  }

  steps(): readonly Point.Step<Token, Node>[] {
    return this.#steps.toSorted((left, right) =>
      right.rest.compareTo(left.rest)
    );
  }
}
