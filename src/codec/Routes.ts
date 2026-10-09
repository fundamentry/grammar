import { type CodePoint } from '@fundamentry/scalar';

import { type Expression } from '#project/expression';
import { type Nonterminal } from '#project/tree';

import { Move } from './Move.js';
import { Route } from './Route.js';
import { type Steps } from './Steps.js';

export namespace Routes {
  export type Rules = ReadonlySet<Nonterminal.Rule<string>>;

  export type Defaults = (expression: Expression<CodePoint>) => Steps.Fallback;
}

export class Routes implements Expression.Visitor<
  CodePoint,
  Routes.Rules,
  readonly Route[]
> {
  static readonly #alternatives = new Intl.ListFormat('en', {
    type: 'disjunction',
  });

  readonly #targets: Routes.Rules;

  readonly #defaults: Routes.Defaults;

  constructor(targets: Routes.Rules, defaults: Routes.Defaults) {
    this.#targets = targets;
    this.#defaults = defaults;
  }

  from(expression: Expression<CodePoint>): readonly Route[] {
    return expression.accept(this, new Set());
  }

  only(expression: Expression<CodePoint>): Route {
    const routes = this.exclusive(expression);
    const [route] = routes;

    if (!route || routes.length > 1)
      throw new RangeError(
        `${String(routes.length)} routes lead to ${this.#names()}`
      );

    return route;
  }

  exclusive(expression: Expression<CodePoint>): readonly Route[] {
    const routes = this.from(expression);
    const [first] = routes;

    if (!first) throw new RangeError(`0 routes lead to ${this.#names()}`);

    const [clash] = routes.flatMap((route: Route, index) =>
      routes
        .slice(index + 1)
        .filter(other => !route.excludes(other))
        .map(other => `${String(route)} and ${String(other)}`)
    );

    if (clash) throw new RangeError(`Routes ${clash} can meet in one tree`);

    return routes;
  }

  terminal(): readonly Route[] {
    return [];
  }

  concatenation(
    elements: readonly Expression<CodePoint>[],
    rules: Routes.Rules
  ): readonly Route[] {
    return elements.flatMap((element, index) =>
      element
        .accept(this, rules)
        .map(route => route.after(Move.sequence(index)))
    );
  }

  alternation(
    alternatives: Expression.Alternatives<CodePoint>,
    rules: Routes.Rules
  ): readonly Route[] {
    return alternatives.flatMap((alternative, index) =>
      alternative
        .accept(this, rules)
        .map(route =>
          route.after(Move.choice(index, this.#defaults(alternative)))
        )
    );
  }

  optional(
    element: Expression<CodePoint>,
    rules: Routes.Rules
  ): readonly Route[] {
    return element
      .accept(this, rules)
      .map(route => route.after(Move.option(this.#defaults(element))));
  }

  repetition(): readonly Route[] {
    return [];
  }

  label(
    element: Expression<CodePoint>,
    _: unknown,
    rules: Routes.Rules
  ): readonly Route[] {
    return element.accept(this, rules);
  }

  rule(
    element: Expression<CodePoint>,
    rule: Nonterminal.Rule<string>,
    rules: Routes.Rules
  ): readonly Route[] {
    if (this.#targets.has(rule)) return [Route.to(rule)];

    return rules.has(rule)
      ? []
      : element
          .accept(this, new Set(rules).add(rule))
          .map(route => route.after(Move.rule(rule.name())));
  }

  reference(
    target: () => Expression<CodePoint>,
    rules: Routes.Rules
  ): readonly Route[] {
    return target().accept(this, rules);
  }

  #names(): string {
    return Routes.#alternatives.format(
      Array.from(this.#targets, rule => rule.name())
    );
  }
}
