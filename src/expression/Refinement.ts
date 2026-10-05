import { type PartialIso } from '@fundamentry/category';

import { type Node } from '#project/tree';

import { type Expression } from './Expression.js';

export class Refinement<
  Token,
  Value extends Node,
  Refined extends Node,
> implements Expression<Token> {
  readonly #element: Expression<Token>;

  readonly #conversion: PartialIso<Value, Refined, string, string>;

  constructor(
    element: Expression<Token>,
    conversion: PartialIso<Value, Refined, string, string>
  ) {
    this.#element = element;
    this.#conversion = conversion;
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.refinement(this.#element, this.#conversion, input);
  }
}
