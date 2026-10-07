import { type CodePoint } from '@fundamentry/scalar';

import { type Expression } from '#project/expression';

export class Parts implements Expression.Visitor<
  CodePoint,
  undefined,
  readonly Expression<CodePoint>[]
> {
  readonly #expression: Expression<CodePoint>;

  constructor(expression: Expression<CodePoint>) {
    this.#expression = expression;
  }

  at(index: number): Expression<CodePoint> {
    const part = this.#expression.accept(this, undefined)[index];

    if (!part) throw new RangeError(`No part at ${String(index)}`);

    return part;
  }

  terminal(): readonly Expression<CodePoint>[] {
    return [];
  }

  concatenation(
    elements: readonly Expression<CodePoint>[]
  ): readonly Expression<CodePoint>[] {
    return elements;
  }

  alternation(
    alternatives: Expression.Alternatives<CodePoint>
  ): readonly Expression<CodePoint>[] {
    return alternatives;
  }

  optional(element: Expression<CodePoint>): readonly Expression<CodePoint>[] {
    return [element];
  }

  repetition(element: Expression<CodePoint>): readonly Expression<CodePoint>[] {
    return [element];
  }

  label(element: Expression<CodePoint>): readonly Expression<CodePoint>[] {
    return element.accept(this, undefined);
  }

  rule(element: Expression<CodePoint>): readonly Expression<CodePoint>[] {
    return [element];
  }

  reference(
    target: () => Expression<CodePoint>
  ): readonly Expression<CodePoint>[] {
    return target().accept(this, undefined);
  }
}
