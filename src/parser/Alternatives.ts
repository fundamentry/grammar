import { type Point } from '@fundamentry/stream';

import { type Expectation } from '#project/expectation';
import { Choice, type Node } from '#project/tree';

import { type Context } from './Context.js';
import { type Continuation } from './Continuation.js';
import { Frontier } from './Frontier.js';
import { type Parser } from './Parser.js';
import { Segments } from './Segments.js';

export namespace Alternatives {
  export interface Branch<in out Token> {
    readonly compiled: Parser.Compiled<Token>;
    readonly wrap: (value: Node) => Node;
  }
}

export class Alternatives<in out Token> {
  readonly #branches: readonly Alternatives.Branch<Token>[];

  private constructor(branches: readonly Alternatives.Branch<Token>[]) {
    this.#branches = branches;
  }

  static of<Token>(
    alternatives: readonly Parser.Compiled<Token>[]
  ): Alternatives<Token> {
    return new Alternatives(
      alternatives.flatMap((compiled, index) =>
        (compiled.alternatives
          ? compiled.alternatives.#branches
          : [{ compiled, wrap: (value: Node) => value }]
        ).map(branch => ({
          compiled: branch.compiled,
          wrap: (value: Node) => new Choice(index, branch.wrap(value)),
        }))
      )
    );
  }

  starts(token?: Token): boolean {
    return this.#branches.some(({ compiled: { starts } }) => starts(token));
  }

  expected(): readonly Expectation[] {
    return this.#branches.flatMap(({ compiled: { expected } }) => expected);
  }

  from(
    point: Point<Token>,
    context: Context<Token>,
    continuation: Continuation<Token>
  ): void {
    const token = point.peek();

    context.each(
      new Segments(
        this.#branches,
        ({ compiled: { starts, nullable } }) => nullable || starts(token)
      )[Symbol.iterator](),
      segment =>
        segment.accepted
          ? Alternatives.#explore(segment.item, point, context, continuation)
          : Alternatives.#skip(segment.items, point, context, continuation)
    );
  }

  static #skip<Token>(
    branches: readonly Alternatives.Branch<Token>[],
    point: Point<Token>,
    context: Context<Token>,
    continuation: Continuation<Token>
  ): void {
    context.fail(
      continuation.relabel(
        Frontier.expected(
          point,
          ...branches.flatMap(({ compiled: { expected } }) => expected)
        )
      )
    );
  }

  static #explore<Token>(
    { compiled, wrap }: Alternatives.Branch<Token>,
    point: Point<Token>,
    context: Context<Token>,
    continuation: Continuation<Token>
  ): void {
    compiled.parse(point, context, continuation.map(wrap));
  }
}
