import { type Point } from '@fundamentry/stream';

import { type Expression } from '#project/expression';

import { type Context } from './Context.js';
import { type Continuation } from './Continuation.js';
import { Growth } from './Growth.js';
import { Memo } from './Memo.js';
import { type Parser } from './Parser.js';

export namespace Column {
  export interface Rule<in out Token> {
    readonly expression: Expression<Token>;
    readonly parse: Parser.Parse<Token>;
    readonly corners: ReadonlySet<Expression<Token>>;
  }
}

export class Column<in out Token> {
  readonly #context: Context<Token>;

  readonly #point: Point<Token>;

  readonly #memos = new Map<Expression<Token>, Memo<Token>>();

  readonly #growths = new Map<Expression<Token>, Growth<Token>>();

  constructor(context: Context<Token>, point: Point<Token>) {
    this.#context = context;
    this.#point = point;
  }

  recall(rule: Column.Rule<Token>, continuation: Continuation<Token>): void {
    const begin: Memo.Source<Token> = next => {
      if (rule.corners.has(rule.expression)) this.#grow(rule, next);
      else rule.parse(this.#point, this.#context, next);
    };
    const growth = this.#growths.get(rule.expression);
    const memo = this.#memos.get(rule.expression);

    if (growth) this.#context.succeed(continuation, growth.seed());
    else if (memo) memo.attend(continuation);
    else if (rule.corners.isDisjointFrom(this.#growths))
      this.#memoize(rule.expression, begin).attend(continuation);
    else begin(continuation);
  }

  #memoize(
    expression: Expression<Token>,
    source: Memo.Source<Token>
  ): Memo<Token> {
    const memo = new Memo(this.#context, this.#point);

    this.#memos.set(expression, memo);

    memo.fill(source);

    return memo;
  }

  #grow(
    { expression, parse }: Column.Rule<Token>,
    continuation: Continuation<Token>
  ): void {
    const growth = new Growth(this.#context, this.#point);

    this.#growths.set(expression, growth);

    growth.run(parse, continuation, () => this.#growths.delete(expression));
  }
}
