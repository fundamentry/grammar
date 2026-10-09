import { Failure, Success } from '@fundamentry/coproduct';
import { type Point } from '@fundamentry/stream';

import { Cache } from '#project/cache';
import { type Node } from '#project/tree';

import { Agenda } from './Agenda.js';
import { Column } from './Column.js';
import { Continuation } from './Continuation.js';
import { Failures } from './Failures.js';
import { type Frontier } from './Frontier.js';
import { type Parser } from './Parser.js';

export class Context<in out Token> {
  readonly #start: Point<Token>;

  readonly #failures: Failures<Token>;

  readonly #agenda: Agenda<Failures<Token>>;

  readonly #columns = new Cache<number, Column<Token>>(new Map());

  #parsed?: Success<Node>;

  private constructor(start: Point<Token>) {
    this.#start = start;
    this.#failures = new Failures(start);
    this.#agenda = new Agenda(this.#failures);
  }

  static run<Token>(
    start: Point<Token>,
    parse: Parser.Parse<Token>
  ): Parser.Parsed {
    const context = new Context(start);

    parse(
      start,
      context,
      Continuation.of(({ value }) => {
        context.#parsed ??= new Success(value);
        context.#agenda.clear();
      })
    );

    context.#agenda.drain();

    return (
      context.#parsed ??
      new Failure(context.#failures.frontier().mismatch(start))
    );
  }

  schedule(task: () => void): void {
    this.#agenda.schedule(task);
  }

  succeed<Value>(
    continuation: Continuation<Token, Value>,
    steps: readonly Point.Step<Token, Value>[]
  ): void {
    this.#agenda.each(steps.values(), step => continuation.succeed(step));
  }

  fail(frontier: Frontier<Token>): void {
    this.#agenda.scope().fail(frontier);
  }

  after(action: () => void, resume: () => void): void {
    this.#agenda.after(action, resume);
  }

  each<T>(items: Iterator<T>, visit: (item: T) => void): void {
    this.#agenda.each(items, visit);
  }

  within(failures: Failures<Token>, action: () => void): void {
    this.#agenda.within(failures, action);
  }

  recall(
    rule: Column.Rule<Token>,
    point: Point<Token>,
    continuation: Continuation<Token>
  ): void {
    this.#columns
      .get(point.distanceFrom(this.#start), () => new Column(this, point))
      .recall(rule, continuation);
  }
}
