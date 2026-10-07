import { Optional } from '@fundamentry/category';
import { type CodePoint } from '@fundamentry/scalar';

import { type Expression } from '#project/expression';
import { type Node, type Nonterminal } from '#project/tree';

import { Steps } from './Steps.js';

export namespace Routes {
  export type Rules = ReadonlySet<Nonterminal.Rule<string>>;

  export type Defaults = (expression: Expression<CodePoint>) => Steps.Fallback;
}

export class Routes implements Expression.Visitor<
  CodePoint,
  Routes.Rules,
  readonly Steps.Step[]
> {
  readonly #target: Nonterminal.Rule<string>;

  readonly #defaults: Routes.Defaults;

  constructor(target: Nonterminal.Rule<string>, defaults: Routes.Defaults) {
    this.#target = target;
    this.#defaults = defaults;
  }

  from(expression: Expression<CodePoint>): readonly Steps.Step[] {
    return expression.accept(this, new Set());
  }

  only(expression: Expression<CodePoint>): Steps.Step {
    const routes = this.from(expression);
    const [route] = routes;

    if (!route || routes.length > 1)
      throw new RangeError(
        `${String(routes.length)} routes lead to ${this.#target.name()}`
      );

    return route;
  }

  terminal(): readonly Steps.Step[] {
    return [];
  }

  concatenation(
    elements: readonly Expression<CodePoint>[],
    rules: Routes.Rules
  ): readonly Steps.Step[] {
    return elements.flatMap((element, index) =>
      element.accept(this, rules).map(route => Steps.at(index).andThen(route))
    );
  }

  alternation(
    alternatives: Expression.Alternatives<CodePoint>,
    rules: Routes.Rules
  ): readonly Steps.Step[] {
    return alternatives.flatMap((alternative, index) =>
      alternative
        .accept(this, rules)
        .map(route =>
          Steps.alternative(index, this.#defaults(alternative)).andThen(route)
        )
    );
  }

  optional(
    element: Expression<CodePoint>,
    rules: Routes.Rules
  ): readonly Steps.Step[] {
    return element
      .accept(this, rules)
      .map(route => Steps.value(this.#defaults(element)).andThen(route));
  }

  repetition(): readonly Steps.Step[] {
    return [];
  }

  label(
    element: Expression<CodePoint>,
    _: unknown,
    rules: Routes.Rules
  ): readonly Steps.Step[] {
    return element.accept(this, rules);
  }

  rule(
    element: Expression<CodePoint>,
    rule: Nonterminal.Rule<string>,
    rules: Routes.Rules
  ): readonly Steps.Step[] {
    if (rule === this.#target) return [Optional.id<Node>()];

    return rules.has(rule)
      ? []
      : element
          .accept(this, new Set(rules).add(rule))
          .map(route => Steps.elements().andThen(route));
  }

  reference(
    target: () => Expression<CodePoint>,
    rules: Routes.Rules
  ): readonly Steps.Step[] {
    return target().accept(this, rules);
  }
}
