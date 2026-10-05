import { Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';

import { type Expression } from './Expression.js';

export class Repetition<Token> implements Expression<Token> {
  readonly #element: Expression<Token>;

  readonly #bounds: Range<Integer>;

  constructor(element: Expression<Token>, bounds: Range<Integer>) {
    const counts = bounds.intersection(Range.atLeast(Integer.of(0)));

    if (!counts || counts.canonical().isEmpty())
      throw new RangeError(`Invalid repetition bounds: ${String(bounds)}`);

    this.#element = element;
    this.#bounds = bounds;
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.repetition(this.#element, this.#bounds, input);
  }
}
