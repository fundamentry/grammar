import { type PartialIso } from '@fundamentry/category';
import { type Range } from '@fundamentry/range';
import { type CodePoint, type Integer } from '@fundamentry/scalar';

import { type Expectation, Quoted, Characters } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Label,
  Optional,
  Repetition,
  Separated,
} from '#project/expression';
import { type Node } from '#project/tree';

export class Caseless implements Expression.Visitor<
  CodePoint,
  Expression<CodePoint>,
  Expression<CodePoint>
> {
  readonly #characters: (characters: Characters) => Expression<CodePoint>;

  constructor(characters: (characters: Characters) => Expression<CodePoint>) {
    this.#characters = characters;
  }

  rewrite(expression: Expression<CodePoint>): Expression<CodePoint> {
    return expression.accept(this, expression);
  }

  terminal<Value extends Node>(
    _: PartialIso<CodePoint, Value, unknown, string>,
    expectation: Expectation,
    original: Expression<CodePoint>
  ): Expression<CodePoint> {
    return expectation instanceof Characters
      ? this.#characters(expectation.caseless())
      : original;
  }

  concatenation(
    elements: readonly Expression<CodePoint>[]
  ): Expression<CodePoint> {
    return new Concatenation(elements.map(element => this.rewrite(element)));
  }

  alternation([
    first,
    ...others
  ]: Expression.Alternatives<CodePoint>): Expression<CodePoint> {
    return new Alternation([
      this.rewrite(first),
      ...others.map(other => this.rewrite(other)),
    ]);
  }

  optional(element: Expression<CodePoint>): Expression<CodePoint> {
    return new Optional(this.rewrite(element));
  }

  repetition(
    element: Expression<CodePoint>,
    bounds: Range<Integer>
  ): Expression<CodePoint> {
    return new Repetition(this.rewrite(element), bounds);
  }

  separated(
    element: Expression<CodePoint>,
    separator: Expression<CodePoint>,
    bounds: Range<Integer>
  ): Expression<CodePoint> {
    return new Separated(
      this.rewrite(element),
      this.rewrite(separator),
      bounds
    );
  }

  label(
    element: Expression<CodePoint>,
    expectation: Expectation
  ): Expression<CodePoint> {
    return new Label(
      this.rewrite(element),
      expectation instanceof Quoted ? expectation.caseless() : expectation
    );
  }

  rule(
    _: Expression<CodePoint>,
    __: unknown,
    original: Expression<CodePoint>
  ): Expression<CodePoint> {
    return original;
  }

  reference(
    _: () => Expression<CodePoint>,
    original: Expression<CodePoint>
  ): Expression<CodePoint> {
    return original;
  }
}
