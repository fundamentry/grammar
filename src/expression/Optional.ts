import { type Expression } from './Expression.js';

export class Optional<Token> implements Expression<Token> {
  readonly #element: Expression<Token>;

  constructor(element: Expression<Token>) {
    this.#element = element;
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.optional(this.#element, input);
  }
}
