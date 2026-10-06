import { type Nonterminal } from '#project/tree';

import { type Expression } from './Expression.js';

export class Rule<Token> implements Expression<Token> {
  readonly #element: Expression<Token>;

  readonly #rule: () => Nonterminal.Rule<string>;

  constructor(
    element: Expression<Token>,
    rule: () => Nonterminal.Rule<string>
  ) {
    this.#element = element;
    this.#rule = rule;
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.rule(this.#element, this.#rule(), input);
  }
}
