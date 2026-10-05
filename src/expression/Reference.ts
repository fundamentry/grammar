import { type Expression } from './Expression.js';

export class Reference<Token> implements Expression<Token> {
  readonly #define: () => Expression<Token>;

  #target?: Expression<Token>;

  constructor(define: () => Expression<Token>) {
    this.#define = define;
  }

  target(): Expression<Token> {
    this.#target ??= this.#define();

    return this.#target;
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.reference(() => this.target(), input);
  }
}
