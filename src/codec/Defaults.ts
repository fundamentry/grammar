import { Failure, type Result, Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { type CodePoint, type Integer } from '@fundamentry/scalar';

import { Characters, type Expectation, Named } from '#project/expectation';
import { type Expression } from '#project/expression';
import { type Nonterminal } from '#project/tree';

export namespace Defaults {
  export type Text = Result<string, Expectation>;

  export type Rules = ReadonlySet<Nonterminal.Rule<string>>;
}

export class Defaults implements Expression.Visitor<
  CodePoint,
  Defaults.Rules,
  Defaults.Text
> {
  text(expression: Expression<CodePoint>): Defaults.Text {
    return expression.accept(this, new Set());
  }

  terminal(_: unknown, expectation: Expectation): Defaults.Text {
    const first =
      expectation instanceof Characters
        ? expectation.ranges().span().lowerEndpoint()
        : undefined;

    return first &&
      expectation.equals(
        new Characters(RangeSet.from([Range.singleton(first)]))
      )
      ? new Success(String(first))
      : new Failure(expectation);
  }

  concatenation(
    elements: readonly Expression<CodePoint>[],
    rules: Defaults.Rules
  ): Defaults.Text {
    return elements.reduce<Defaults.Text>(
      (text, element) =>
        text.flatMap(prefix =>
          element.accept(this, rules).map(suffix => prefix + suffix)
        ),
      new Success('')
    );
  }

  alternation(
    [first, ...others]: Expression.Alternatives<CodePoint>,
    rules: Defaults.Rules
  ): Defaults.Text {
    const shorter = (text: Defaults.Text, other: Defaults.Text) =>
      text.ok() && !(other.ok() && other.value().length < text.value().length)
        ? text
        : other.orElse(() => text);

    return others.reduce<Defaults.Text>(
      (text, other) => shorter(text, other.accept(this, rules)),
      first.accept(this, rules)
    );
  }

  optional(): Defaults.Text {
    return new Success('');
  }

  repetition(
    element: Expression<CodePoint>,
    bounds: Range<Integer>,
    rules: Defaults.Rules
  ): Defaults.Text {
    const minimum = bounds.canonical().lowerEndpoint()?.value() ?? 0;

    return minimum
      ? element.accept(this, rules).map(text => text.repeat(minimum))
      : new Success('');
  }

  separated(
    _: unknown,
    __: unknown,
    ___: unknown,
    expansion: Expression<CodePoint>,
    rules: Defaults.Rules
  ): Defaults.Text {
    return expansion.accept(this, rules);
  }

  label(
    element: Expression<CodePoint>,
    _: unknown,
    rules: Defaults.Rules
  ): Defaults.Text {
    return element.accept(this, rules);
  }

  rule(
    element: Expression<CodePoint>,
    rule: Nonterminal.Rule<string>,
    rules: Defaults.Rules
  ): Defaults.Text {
    return rules.has(rule)
      ? new Failure(new Named(rule.name()))
      : element.accept(this, new Set(rules).add(rule));
  }

  reference(
    target: () => Expression<CodePoint>,
    rules: Defaults.Rules
  ): Defaults.Text {
    return target().accept(this, rules);
  }
}
