import { type Expression } from './Expression.js';

export class Alternation<Token> implements Expression<Token> {
  readonly #alternatives: readonly [Expression<Token>, Expression<Token>];

  constructor(alternatives: readonly [Expression<Token>, Expression<Token>]) {
    this.#alternatives = Object.freeze([...alternatives]);
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.alternation(this.#alternatives, input);
  }
}
