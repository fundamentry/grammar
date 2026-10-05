import { type Expression } from './Expression.js';

export class Concatenation<Token> implements Expression<Token> {
  readonly #elements: readonly Expression<Token>[];

  constructor(elements: readonly Expression<Token>[]) {
    this.#elements = Object.freeze([...elements]);
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.concatenation(this.#elements, input);
  }
}
