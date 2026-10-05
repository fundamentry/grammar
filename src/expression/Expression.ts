import { type PartialIso } from '@fundamentry/category';
import { type Range } from '@fundamentry/range';
import { type Integer } from '@fundamentry/scalar';

import { type Expectation } from '#project/expectation';
import { type Node } from '#project/tree';

export interface Expression<Token> {
  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output;
}

export namespace Expression {
  export interface Visitor<Token, Input, Output> {
    terminal<Value extends Node>(
      conversion: PartialIso<Token, Value, unknown, string>,
      expectation: Expectation,
      input: Input
    ): Output;

    concatenation(elements: readonly Expression<Token>[], input: Input): Output;

    alternation(
      alternatives: readonly [Expression<Token>, Expression<Token>],
      input: Input
    ): Output;

    optional(element: Expression<Token>, input: Input): Output;

    repetition(
      element: Expression<Token>,
      bounds: Range<Integer>,
      input: Input
    ): Output;

    refinement<Value extends Node, Refined extends Node>(
      element: Expression<Token>,
      conversion: PartialIso<Value, Refined, string, string>,
      input: Input
    ): Output;

    label(
      element: Expression<Token>,
      expectation: Expectation,
      input: Input
    ): Output;

    rule(element: Expression<Token>, name: string, input: Input): Output;

    reference(target: () => Expression<Token>, input: Input): Output;
  }
}
