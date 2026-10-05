import { type Expectation } from '#project/expectation';

import { type Expression } from './Expression.js';

export class Label<Token> implements Expression<Token> {
  readonly #element: Expression<Token>;

  readonly #expectation: Expectation;

  constructor(element: Expression<Token>, expectation: Expectation) {
    this.#element = element;
    this.#expectation = expectation;
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.label(this.#element, this.#expectation, input);
  }
}
