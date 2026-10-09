import { type CodePoint } from '@fundamentry/scalar';

import { type Expression } from '#project/expression';
import { type Nonterminal } from '#project/tree';

import { type Routes } from './Routes.js';

export class Gaps implements Expression.Visitor<
  CodePoint,
  Routes.Rules,
  readonly string[]
> {
  static readonly #here: readonly string[] = [''];

  readonly #targets: readonly Nonterminal.Rule<string>[];

  constructor(targets: readonly Nonterminal.Rule<string>[]) {
    this.#targets = targets;
  }

  from(expression: Expression<CodePoint>): readonly string[] {
    return expression.accept(this, new Set()).map(gap => gap || '/');
  }

  terminal(): readonly string[] {
    return Gaps.#here;
  }

  concatenation(
    elements: readonly Expression<CodePoint>[],
    rules: Routes.Rules
  ): readonly string[] {
    return elements.some(element => element.accept(this, rules).length === 0)
      ? []
      : Gaps.#here;
  }

  alternation(
    alternatives: Expression.Alternatives<CodePoint>,
    rules: Routes.Rules
  ): readonly string[] {
    return alternatives.flatMap((alternative, index) =>
      alternative
        .accept(this, rules)
        .map(gap => `/choice[${String(index)}]${gap}`)
    );
  }

  optional(): readonly string[] {
    return ['/option'];
  }

  repetition(): readonly string[] {
    return Gaps.#here;
  }

  separated(): readonly string[] {
    return Gaps.#here;
  }

  label(
    element: Expression<CodePoint>,
    _: unknown,
    rules: Routes.Rules
  ): readonly string[] {
    return element.accept(this, rules);
  }

  rule(
    element: Expression<CodePoint>,
    rule: Nonterminal.Rule<string>,
    rules: Routes.Rules
  ): readonly string[] {
    if (this.#targets.includes(rule)) return [];

    return rules.has(rule)
      ? Gaps.#here
      : element
          .accept(this, new Set(rules).add(rule))
          .map(gap => `/${rule.name()}${gap}`);
  }

  reference(
    target: () => Expression<CodePoint>,
    rules: Routes.Rules
  ): readonly string[] {
    return target().accept(this, rules);
  }
}
