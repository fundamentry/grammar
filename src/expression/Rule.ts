import { type Expression } from './Expression.js';

export class Rule<Token> implements Expression<Token> {
  readonly #element: Expression<Token>;

  readonly #name: string;

  constructor(element: Expression<Token>, name: string) {
    this.#element = element;
    this.#name = name;
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.rule(this.#element, this.#name, input);
  }
}
