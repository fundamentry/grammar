import { type PartialIso } from '@fundamentry/category';

import { type Expectation } from '#project/expectation';
import { type Node } from '#project/tree';

import { type Expression } from './Expression.js';

export class Terminal<Token, Value extends Node> implements Expression<Token> {
  readonly #conversion: PartialIso<Token, Value, unknown, string>;

  readonly #expectation: Expectation;

  constructor(
    conversion: PartialIso<Token, Value, unknown, string>,
    expectation: Expectation
  ) {
    this.#conversion = conversion;
    this.#expectation = expectation;
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.terminal(this.#conversion, this.#expectation, input);
  }
}
