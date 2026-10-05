import { Failure, Success } from '@fundamentry/coproduct';
import { type Point } from '@fundamentry/stream';

import { Cache } from '#project/cache';
import { EndOfInput } from '#project/expectation';
import { Mismatch } from '#project/mismatch';
import { type Node } from '#project/tree';

import { Growth } from './Growth.js';
import { type Parser } from './Parser.js';

export class Context<Token> {
  readonly #start: Point<Token>;

  readonly #tasks: (() => void)[] = [];

  readonly #growths = new Cache<
    Parser.Parse<Token>,
    Map<number, Growth<Token>>
  >();

  #mismatch: Mismatch<Token>;

  #parsed?: Success<Node>;

  private constructor(start: Point<Token>) {
    this.#start = start;
    this.#mismatch = Mismatch.empty(start);
  }

  static run<Token>(
    start: Point<Token>,
    parse: Parser.Parse<Token>
  ): Parser.Parsed<Token> {
    const context = new Context(start);

    parse(start, context, {
      succeed: ({ value, rest }) => {
        if (rest.isAtEnd()) context.#parsed ??= new Success(value);
        else context.fail(Mismatch.expected(rest, new EndOfInput()));
      },
    });

    while (!context.#parsed) {
      const task = context.#tasks.pop();

      if (!task) break;

      task();
    }

    return context.#parsed ?? new Failure(context.#mismatch);
  }

  schedule(task: () => void): void {
    this.#tasks.push(task);
  }

  succeed<Value>(
    continuation: Parser.Continuation<Token, Value>,
    ...steps: readonly Point.Step<Token, Value>[]
  ): void {
    for (const step of steps.toReversed())
      this.schedule(() => continuation.succeed(step));
  }

  fail(mismatch: Mismatch<Token>, label?: Parser.Label<Token>): void {
    this.#mismatch = this.#mismatch.merge(
      label?.start.equals(mismatch.at())
        ? mismatch.relabel(label.expectation)
        : mismatch
    );
  }

  each<T>(items: Iterator<T>, visit: (item: T) => void): void {
    const pull = () => {
      const next = items.next();

      if (next.done) return;

      this.schedule(pull);
      visit(next.value);
    };

    this.schedule(pull);
  }

  grow(
    parse: Parser.Parse<Token>,
    point: Point<Token>,
    continuation: Parser.Continuation<Token>
  ): void {
    const growths = this.#growths.get(parse, () => new Map());
    const offset = point.distanceFrom(this.#start);
    const active = growths.get(offset);

    if (active) this.succeed(continuation, ...active.seed());
    else {
      const growth = new Growth(point);

      growths.set(offset, growth);
      growth.run(parse, this, continuation, () => growths.delete(offset));
    }
  }
}
